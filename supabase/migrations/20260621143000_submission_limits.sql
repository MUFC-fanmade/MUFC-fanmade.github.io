begin;

create table if not exists public.site_settings (
  id boolean primary key default true check (id),
  submission_limit_enabled boolean not null default true,
  regular_submission_limit integer not null default 1 check (regular_submission_limit between 1 and 100),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id, submission_limit_enabled, regular_submission_limit)
values (true, true, 1)
on conflict (id) do nothing;

create or replace function public.enforce_one_regular_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  limit_enabled boolean := true;
  max_submissions integer := 1;
  current_count integer := 0;
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

  select
    coalesce(s.submission_limit_enabled, true),
    coalesce(s.regular_submission_limit, 1)
  into limit_enabled, max_submissions
  from public.site_settings s
  where s.id = true;

  if not coalesce(limit_enabled, true) then
    return new;
  end if;

  select count(*)::int
  into current_count
  from public.submissions
  where user_id = new.user_id
    and id <> new.id;

  if current_count >= greatest(coalesce(max_submissions, 1), 1) then
    raise exception '普通用户最多只能提交 % 张谱面。', max_submissions using errcode = '23505';
  end if;

  return new;
end;
$$;

create or replace function public.submission_limit_settings()
returns table (
  limit_enabled boolean,
  max_submissions integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    coalesce(s.submission_limit_enabled, true) as limit_enabled,
    coalesce(s.regular_submission_limit, 1) as max_submissions
  from public.site_settings s
  where s.id = true;
$$;

create or replace function public.admin_submission_limit_settings()
returns table (
  limit_enabled boolean,
  max_submissions integer,
  updated_at timestamptz,
  updated_by uuid
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  return query
  select
    coalesce(s.submission_limit_enabled, true) as limit_enabled,
    coalesce(s.regular_submission_limit, 1) as max_submissions,
    s.updated_at,
    s.updated_by
  from public.site_settings s
  where s.id = true;
end;
$$;

create or replace function public.admin_update_submission_limit(
  p_limit_enabled boolean,
  p_max_submissions integer
)
returns table (
  limit_enabled boolean,
  max_submissions integer,
  updated_at timestamptz,
  updated_by uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_max integer := coalesce(p_max_submissions, 1);
begin
  if not public.current_user_is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  if clean_max < 1 or clean_max > 100 then
    raise exception 'regular submission limit must be between 1 and 100' using errcode = '22023';
  end if;

  return query
  insert into public.site_settings as s (
    id,
    submission_limit_enabled,
    regular_submission_limit,
    updated_by,
    updated_at
  )
  values (
    true,
    coalesce(p_limit_enabled, true),
    clean_max,
    auth.uid(),
    now()
  )
  on conflict (id) do update
    set submission_limit_enabled = excluded.submission_limit_enabled,
        regular_submission_limit = excluded.regular_submission_limit,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at
  returning
    s.submission_limit_enabled as limit_enabled,
    s.regular_submission_limit as max_submissions,
    s.updated_at,
    s.updated_by;
end;
$$;

alter table public.site_settings enable row level security;

revoke all on public.site_settings from anon, authenticated;
revoke execute on function public.submission_limit_settings() from public, anon, authenticated;
revoke execute on function public.admin_submission_limit_settings() from public, anon, authenticated;
revoke execute on function public.admin_update_submission_limit(boolean, integer) from public, anon, authenticated;

grant execute on function public.submission_limit_settings() to authenticated;
grant execute on function public.admin_submission_limit_settings() to authenticated;
grant execute on function public.admin_update_submission_limit(boolean, integer) to authenticated;

notify pgrst, 'reload schema';

commit;
