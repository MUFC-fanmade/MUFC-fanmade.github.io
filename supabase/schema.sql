create extension if not exists "pgcrypto";

revoke all on schema public from public;
grant usage on schema public to anon, authenticated, service_role;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_code text,
  display_name text not null,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists user_code text,
add column if not exists avatar_url text,
add column if not exists is_admin boolean not null default false;

create sequence if not exists public.profile_user_code_seq;

with numbered_profiles as (
  select
    id,
    row_number() over (order by created_at, id) as row_number
  from public.profiles
  where user_code is null
)
update public.profiles p
set user_code = 'user' || lpad(numbered_profiles.row_number::text, 3, '0')
from numbered_profiles
where p.id = numbered_profiles.id;

select setval(
  'public.profile_user_code_seq',
  greatest(
    coalesce((
      select max((regexp_match(user_code, '^user([0-9]+)$'))[1]::bigint)
      from public.profiles
      where user_code ~ '^user[0-9]+$'
    ), 0),
    1
  ),
  exists (
    select 1
    from public.profiles
    where user_code ~ '^user[0-9]+$'
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_user_code_key'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_user_code_key unique (user_code);
  end if;
end;
$$;

alter table public.profiles
alter column user_code set not null;

create table if not exists public.invite_codes (
  code text primary key,
  note text,
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invite_codes_code_length check (char_length(code) between 4 and 64)
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text check (char_length(description) <= 500),
  image_path text not null,
  image_url text not null,
  maidata_url text,
  track_url text,
  bg_url text,
  pv_url text,
  level text not null default 'lv_5',
  level_value text,
  song_title text,
  song_artist text,
  charter_name text,
  created_at timestamptz not null default now()
);

alter table public.submissions
drop constraint if exists submissions_user_id_key;

alter table public.submissions
add column if not exists maidata_url text,
add column if not exists track_url text,
add column if not exists bg_url text,
add column if not exists pv_url text,
add column if not exists level text not null default 'lv_5',
add column if not exists level_value text,
add column if not exists song_title text,
add column if not exists song_artist text,
add column if not exists charter_name text;

alter table public.submissions
alter column level set default 'lv_5';

alter table public.submissions
alter column image_path drop not null,
alter column image_url drop not null;

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score numeric(3, 1) not null check (score >= 1 and score <= 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.comments
add column if not exists parent_id uuid references public.comments(id) on delete cascade;

create table if not exists public.submission_votes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, user_id)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_admin = true
  );
$$;

create or replace function public.enforce_one_regular_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.profiles
    where id = new.user_id
      and is_admin = true
  ) then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  if exists (
    select 1
    from public.submissions
    where user_id = new.user_id
      and id <> new.id
  ) then
    raise exception '普通用户只能提交一张谱面。' using errcode = '23505';
  end if;

  return new;
end;
$$;

create or replace function public.validate_comment_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.parent_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.comments parent
    where parent.id = new.parent_id
      and parent.submission_id = new.submission_id
  ) then
    raise exception '回复的评论不属于当前谱面。' using errcode = '23503';
  end if;

  return new;
end;
$$;

drop trigger if exists submissions_enforce_one_regular_submission on public.submissions;
create trigger submissions_enforce_one_regular_submission
before insert or update of user_id on public.submissions
for each row execute function public.enforce_one_regular_submission();

drop trigger if exists ratings_touch_updated_at on public.ratings;
create trigger ratings_touch_updated_at
before update on public.ratings
for each row execute function public.touch_updated_at();

drop trigger if exists comments_touch_updated_at on public.comments;
create trigger comments_touch_updated_at
before update on public.comments
for each row execute function public.touch_updated_at();

drop trigger if exists comments_validate_parent on public.comments;
create trigger comments_validate_parent
before insert or update of parent_id, submission_id on public.comments
for each row execute function public.validate_comment_parent();

drop trigger if exists submission_votes_touch_updated_at on public.submission_votes;
create trigger submission_votes_touch_updated_at
before update on public.submission_votes
for each row execute function public.touch_updated_at();

drop view if exists public.submission_scores;
drop view if exists public.submission_comments;

create view public.submission_scores
as
with rating_counts as (
  select
    submission_id,
    count(id)::int as rating_count
  from public.ratings
  group by submission_id
),
vote_counts as (
  select
    submission_id,
    count(*) filter (where value = 1)::int as like_count,
    count(*) filter (where value = -1)::int as dislike_count
  from public.submission_votes
  group by submission_id
)
select
  s.id,
  coalesce(nullif(s.song_title, ''), s.title) as title,
  s.description,
  s.image_url,
  s.maidata_url,
  s.track_url,
  s.bg_url,
  s.pv_url,
  s.level,
  s.level_value,
  s.song_title,
  s.song_artist,
  s.charter_name,
  s.created_at,
  coalesce(rc.rating_count, 0) as rating_count,
  coalesce(vc.like_count, 0) as like_count,
  coalesce(vc.dislike_count, 0) as dislike_count
from public.submissions s
left join rating_counts rc on rc.submission_id = s.id
left join vote_counts vc on vc.submission_id = s.id;

create view public.submission_comments
as
select
  c.id,
  c.submission_id,
  c.parent_id,
  c.parent_id as parents_id,
  c.body,
  c.created_at,
  c.updated_at,
  p.display_name,
  p.avatar_url,
  parent_profile.display_name as parent_display_name,
  r.score as user_score
from public.comments c
join public.profiles p on p.id = c.user_id
left join public.comments parent_comment on parent_comment.id = c.parent_id
left join public.profiles parent_profile on parent_profile.id = parent_comment.user_id
left join public.ratings r
  on r.submission_id = c.submission_id
 and r.user_id = c.user_id;

create or replace function public.next_profile_user_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_number bigint;
  next_code text;
begin
  loop
    next_number := nextval('public.profile_user_code_seq');
    next_code := 'user' || lpad(next_number::text, 3, '0');

    exit when not exists (
      select 1
      from public.profiles
      where user_code = next_code
    );
  end loop;

  return next_code;
end;
$$;

create or replace function public.claim_invite(
  p_code text,
  p_user_id uuid,
  p_display_name text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_code text;
begin
  update public.invite_codes
  set used_by = p_user_id,
      used_at = now()
  where code = p_code
    and used_by is null
    and (expires_at is null or expires_at > now())
  returning code into claimed_code;

  if claimed_code is null then
    return false;
  end if;

  insert into public.profiles (id, user_code, display_name)
  values (p_user_id, public.next_profile_user_code(), p_display_name)
  on conflict (id) do update
    set
      display_name = excluded.display_name,
      user_code = coalesce(public.profiles.user_code, excluded.user_code);

  return true;
end;
$$;

drop function if exists public.admin_user_rows();
create or replace function public.admin_user_rows()
returns table (
  id uuid,
  user_code text,
  email text,
  display_name text,
  avatar_url text,
  is_admin boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  submission_count integer,
  rating_count integer,
  comment_count integer
)
language plpgsql
security definer
set search_path = public, auth
stable
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.user_code,
    u.email::text,
    p.display_name,
    p.avatar_url,
    p.is_admin,
    p.created_at,
    u.last_sign_in_at,
    count(distinct s.id)::int as submission_count,
    count(distinct r.id)::int as rating_count,
    count(distinct c.id)::int as comment_count
  from public.profiles p
  left join auth.users u on u.id = p.id
  left join public.submissions s on s.user_id = p.id
  left join public.ratings r on r.user_id = p.id
  left join public.comments c on c.user_id = p.id
  group by p.id, u.email, u.last_sign_in_at
  order by p.created_at desc;
end;
$$;

drop function if exists public.admin_submission_rows();
create or replace function public.admin_submission_rows()
returns table (
  id uuid,
  user_id uuid,
  user_code text,
  user_email text,
  display_name text,
  title text,
  description text,
  image_path text,
  image_url text,
  maidata_url text,
  track_url text,
  bg_url text,
  pv_url text,
  level text,
  created_at timestamptz,
  average_score numeric,
  rating_count integer
)
language plpgsql
security definer
set search_path = public, auth
stable
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  return query
  select
    s.id,
    s.user_id,
    p.user_code,
    u.email::text as user_email,
    p.display_name,
    s.title,
    s.description,
    s.image_path,
    s.image_url,
    s.maidata_url,
    s.track_url,
    s.bg_url,
    s.pv_url,
    s.level,
    s.created_at,
    coalesce(round(avg(r.score)::numeric, 1), 0) as average_score,
    count(r.id)::int as rating_count
  from public.submissions s
  join public.profiles p on p.id = s.user_id
  left join auth.users u on u.id = s.user_id
  left join public.ratings r on r.submission_id = s.id
  group by s.id, u.email, p.user_code, p.display_name
  order by s.created_at desc;
end;
$$;

drop function if exists public.admin_rating_rows();
create or replace function public.admin_rating_rows()
returns table (
  id uuid,
  submission_id uuid,
  submission_title text,
  user_id uuid,
  user_code text,
  user_email text,
  display_name text,
  score numeric,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
stable
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  return query
  select
    r.id,
    r.submission_id,
    s.title as submission_title,
    r.user_id,
    p.user_code,
    u.email::text as user_email,
    p.display_name,
    r.score,
    r.created_at,
    r.updated_at
  from public.ratings r
  join public.submissions s on s.id = r.submission_id
  join public.profiles p on p.id = r.user_id
  left join auth.users u on u.id = r.user_id
  order by r.updated_at desc;
end;
$$;

drop function if exists public.admin_comment_rows();
create or replace function public.admin_comment_rows()
returns table (
  id uuid,
  submission_id uuid,
  submission_title text,
  user_id uuid,
  user_code text,
  user_email text,
  display_name text,
  body text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
stable
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  return query
  select
    c.id,
    c.submission_id,
    s.title as submission_title,
    c.user_id,
    p.user_code,
    u.email::text as user_email,
    p.display_name,
    c.body,
    c.created_at,
    c.updated_at
  from public.comments c
  join public.submissions s on s.id = c.submission_id
  join public.profiles p on p.id = c.user_id
  left join auth.users u on u.id = c.user_id
  order by c.created_at desc;
end;
$$;

drop function if exists public.admin_invite_rows();
create or replace function public.admin_invite_rows()
returns table (
  code text,
  note text,
  used_by uuid,
  used_user_code text,
  used_display_name text,
  used_email text,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
stable
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  return query
  select
    i.code,
    i.note,
    i.used_by,
    p.user_code as used_user_code,
    p.display_name as used_display_name,
    u.email::text as used_email,
    i.used_at,
    i.expires_at,
    i.created_at
  from public.invite_codes i
  left join auth.users u on u.id = i.used_by
  left join public.profiles p on p.id = i.used_by
  order by i.created_at desc;
end;
$$;

create or replace function public.admin_create_invite(
  p_code text default null,
  p_note text default null,
  p_expires_at timestamptz default null
)
returns table (
  code text,
  note text,
  used_by uuid,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  return query
  insert into public.invite_codes as i (code, note, expires_at)
  values (
    coalesce(nullif(trim(p_code), ''), upper(replace(gen_random_uuid()::text, '-', ''))),
    nullif(trim(p_note), ''),
    p_expires_at
  )
  returning i.code, i.note, i.used_by, i.used_at, i.expires_at, i.created_at;
end;
$$;

create or replace function public.admin_delete_rating(p_rating_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  delete from public.ratings
  where id = p_rating_id;
end;
$$;

create or replace function public.admin_delete_submission(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  delete from public.submissions
  where id = p_submission_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.invite_codes enable row level security;
alter table public.submissions enable row level security;
alter table public.ratings enable row level security;
alter table public.comments enable row level security;
alter table public.submission_votes enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.invite_codes from anon, authenticated;
revoke all on public.submissions from anon, authenticated;
revoke all on public.ratings from anon, authenticated;
revoke all on public.comments from anon, authenticated;
revoke all on public.submission_votes from anon, authenticated;
revoke all on public.submission_scores from anon, authenticated;
revoke all on public.submission_comments from anon, authenticated;
revoke execute on function public.claim_invite(text, uuid, text) from public, anon, authenticated;
revoke execute on function public.current_user_is_admin() from public, anon, authenticated;
revoke execute on function public.next_profile_user_code() from public, anon, authenticated;
revoke execute on function public.enforce_one_regular_submission() from public, anon, authenticated;
revoke execute on function public.validate_comment_parent() from public, anon, authenticated;
revoke execute on function public.admin_user_rows() from public, anon, authenticated;
revoke execute on function public.admin_submission_rows() from public, anon, authenticated;
revoke execute on function public.admin_rating_rows() from public, anon, authenticated;
revoke execute on function public.admin_comment_rows() from public, anon, authenticated;
revoke execute on function public.admin_invite_rows() from public, anon, authenticated;
revoke execute on function public.admin_create_invite(text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.admin_delete_rating(uuid) from public, anon, authenticated;
revoke execute on function public.admin_delete_submission(uuid) from public, anon, authenticated;

grant select on public.submission_scores to anon, authenticated;
grant select on public.submission_comments to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
grant select, insert, update, delete on public.submissions to authenticated;
grant select, insert, update on public.ratings to authenticated;
grant insert, update, delete on public.comments to authenticated;
grant select, insert, update, delete on public.submission_votes to authenticated;
grant execute on function public.claim_invite(text, uuid, text) to service_role;
grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.admin_user_rows() to authenticated;
grant execute on function public.admin_submission_rows() to authenticated;
grant execute on function public.admin_rating_rows() to authenticated;
grant execute on function public.admin_comment_rows() to authenticated;
grant execute on function public.admin_invite_rows() to authenticated;
grant execute on function public.admin_create_invite(text, text, timestamptz) to authenticated;
grant execute on function public.admin_delete_rating(uuid) to authenticated;
grant execute on function public.admin_delete_submission(uuid) to authenticated;

drop policy if exists "profiles are readable by signed-in users" on public.profiles;
drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id or public.current_user_is_admin());

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "submissions are public" on public.submissions;

drop policy if exists "users read own submissions" on public.submissions;
create policy "users read own submissions"
on public.submissions for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users insert own submission" on public.submissions;
create policy "users insert own submission"
on public.submissions for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "users update own submission" on public.submissions;
create policy "users update own submission"
on public.submissions for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "admins manage submissions" on public.submissions;
create policy "admins manage submissions"
on public.submissions for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "ratings are public" on public.ratings;
drop policy if exists "users read own rating" on public.ratings;
create policy "users read own rating"
on public.ratings for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users rate as self" on public.ratings;
create policy "users rate as self"
on public.ratings for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "users update own rating" on public.ratings;
create policy "users update own rating"
on public.ratings for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "admins delete ratings" on public.ratings;
create policy "admins delete ratings"
on public.ratings for delete
to authenticated
using (public.current_user_is_admin());

drop policy if exists "users read own submission vote" on public.submission_votes;
create policy "users read own submission vote"
on public.submission_votes for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users vote as self" on public.submission_votes;
create policy "users vote as self"
on public.submission_votes for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "users update own submission vote" on public.submission_votes;
create policy "users update own submission vote"
on public.submission_votes for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "users delete own submission vote" on public.submission_votes;
create policy "users delete own submission vote"
on public.submission_votes for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users comment as self" on public.comments;
create policy "users comment as self"
on public.comments for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "users update own comment" on public.comments;
create policy "users update own comment"
on public.comments for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "users delete own comment" on public.comments;
create policy "users delete own comment"
on public.comments for delete
to authenticated
using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "submission images public read" on storage.objects;
create policy "submission images public read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'submissions');

drop policy if exists "users upload own submission images" on storage.objects;
create policy "users upload own submission images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'submissions'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (
      (storage.foldername(name))[1] = 'avatars'
      and (storage.foldername(name))[2] = (select auth.uid())::text
    )
  )
);

drop policy if exists "users update own submission images" on storage.objects;
create policy "users update own submission images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'submissions'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (
      (storage.foldername(name))[1] = 'avatars'
      and (storage.foldername(name))[2] = (select auth.uid())::text
    )
  )
);

drop policy if exists "admins manage submission files" on storage.objects;
create policy "admins manage submission files"
on storage.objects for all
to authenticated
using (bucket_id = 'submissions' and public.current_user_is_admin())
with check (bucket_id = 'submissions' and public.current_user_is_admin());

-- Example invite codes for testing. Remove or replace before production.
insert into public.invite_codes (code, note)
values ('MUFC-DEMO-001', 'local demo invite')
on conflict (code) do nothing;
