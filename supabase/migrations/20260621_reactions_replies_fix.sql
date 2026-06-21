begin;

drop view if exists public.submission_comments;
drop view if exists public.submission_scores;

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

drop trigger if exists comments_validate_parent on public.comments;
create trigger comments_validate_parent
before insert or update of parent_id, submission_id on public.comments
for each row execute function public.validate_comment_parent();

drop trigger if exists submission_votes_touch_updated_at on public.submission_votes;
create trigger submission_votes_touch_updated_at
before update on public.submission_votes
for each row execute function public.touch_updated_at();

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
  s.title,
  s.description,
  s.image_url,
  s.maidata_url,
  s.track_url,
  s.bg_url,
  s.pv_url,
  s.level,
  s.created_at,
  p.user_code,
  p.display_name,
  coalesce(rc.rating_count, 0) as rating_count,
  coalesce(vc.like_count, 0) as like_count,
  coalesce(vc.dislike_count, 0) as dislike_count
from public.submissions s
left join public.profiles p on p.id = s.user_id
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
  parent_profile.display_name as parent_display_name,
  r.score as user_score
from public.comments c
join public.profiles p on p.id = c.user_id
left join public.comments parent_comment on parent_comment.id = c.parent_id
left join public.profiles parent_profile on parent_profile.id = parent_comment.user_id
left join public.ratings r
  on r.submission_id = c.submission_id
 and r.user_id = c.user_id;

alter table public.submission_votes enable row level security;

revoke all on public.submission_votes from anon, authenticated;
revoke all on public.submission_scores from anon, authenticated;
revoke all on public.submission_comments from anon, authenticated;
revoke execute on function public.validate_comment_parent() from public, anon, authenticated;

grant select on public.submission_scores to anon, authenticated;
grant select on public.submission_comments to anon, authenticated;
grant select, insert, update, delete on public.submission_votes to authenticated;

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

notify pgrst, 'reload schema';

commit;
