create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score numeric(3, 1) not null check (score >= 1 and score <= 10),
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

drop trigger if exists ratings_touch_updated_at on public.ratings;
create trigger ratings_touch_updated_at
before update on public.ratings
for each row execute function public.touch_updated_at();

create or replace view public.submission_scores
with (security_invoker = true)
as
select
  s.id,
  s.user_id,
  s.title,
  s.description,
  s.image_path,
  s.image_url,
  s.created_at,
  coalesce(round(avg(r.score)::numeric, 1), 0) as average_score,
  count(r.id)::int as rating_count
from public.submissions s
left join public.ratings r on r.submission_id = s.id
group by s.id;

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

  insert into public.profiles (id, display_name)
  values (p_user_id, p_display_name)
  on conflict (id) do update
    set display_name = excluded.display_name;

  return true;
end;
$$;

alter table public.profiles enable row level security;
alter table public.invite_codes enable row level security;
alter table public.submissions enable row level security;
alter table public.ratings enable row level security;

drop policy if exists "profiles are readable by signed-in users" on public.profiles;
create policy "profiles are readable by signed-in users"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "submissions are public" on public.submissions;
create policy "submissions are public"
on public.submissions for select
to anon, authenticated
using (true);

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

drop policy if exists "ratings are public" on public.ratings;
create policy "ratings are public"
on public.ratings for select
to anon, authenticated
using (true);

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
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "users update own submission images" on storage.objects;
create policy "users update own submission images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'submissions'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Example invite codes for testing. Remove or replace before production.
insert into public.invite_codes (code, note)
values ('MUFC-DEMO-001', 'local demo invite')
on conflict (code) do nothing;
