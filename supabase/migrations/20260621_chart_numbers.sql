begin;

drop view if exists public.submission_scores;

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

grant select on public.submission_scores to anon, authenticated;

notify pgrst, 'reload schema';

commit;
