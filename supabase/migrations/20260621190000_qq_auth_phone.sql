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

drop function if exists public.admin_message_rows();
create or replace function public.admin_message_rows()
returns table (
  id uuid,
  target_scope text,
  target_user_id uuid,
  user_code text,
  user_email text,
  display_name text,
  title text,
  body text,
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
    m.id,
    m.target_scope,
    m.target_user_id,
    p.user_code,
    u.email::text as user_email,
    p.display_name,
    m.title,
    m.body,
    m.created_at
  from public.inbox_messages m
  left join public.profiles p on p.id = m.target_user_id
  left join auth.users u on u.id = m.target_user_id
  where m.kind in ('admin_broadcast', 'admin_direct')
  order by m.created_at desc;
end;
$$;
