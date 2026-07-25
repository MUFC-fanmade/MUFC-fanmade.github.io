begin;

drop view if exists public.submission_comments;
drop view if exists public.submission_scores;

alter table public.submissions
add column if not exists song_title text,
add column if not exists song_artist text,
add column if not exists charter_name text,
add column if not exists level_value text;

update public.submissions
set
  song_title = coalesce(song_title, title),
  charter_name = coalesce(charter_name, nullif(title, ''))
where song_title is null
   or charter_name is null;

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
  row_number() over (order by s.created_at, s.id)::int as chart_number,
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

grant select on public.submission_scores to anon, authenticated;
grant select on public.submission_comments to anon, authenticated;

notify pgrst, 'reload schema';

commit;
