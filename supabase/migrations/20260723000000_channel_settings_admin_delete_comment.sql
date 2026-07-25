begin;

alter table public.site_settings
  add column if not exists submission_channel_enabled boolean not null default true;

alter table public.site_settings
  add column if not exists rating_channel_enabled boolean not null default true;

create or replace function public.channel_settings()
returns table (
  submission_enabled boolean,
  rating_enabled boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    coalesce(s.submission_channel_enabled, true) as submission_enabled,
    coalesce(s.rating_channel_enabled, true) as rating_enabled
  from public.site_settings s
  where s.id = true;
$$;

create or replace function public.admin_channel_settings()
returns table (
  submission_enabled boolean,
  rating_enabled boolean,
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
    coalesce(s.submission_channel_enabled, true) as submission_enabled,
    coalesce(s.rating_channel_enabled, true) as rating_enabled,
    s.updated_at,
    s.updated_by
  from public.site_settings s
  where s.id = true;
end;
$$;

create or replace function public.admin_update_channel_settings(
  p_submission_enabled boolean,
  p_rating_enabled boolean
)
returns table (
  submission_enabled boolean,
  rating_enabled boolean,
  updated_at timestamptz,
  updated_by uuid
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
  insert into public.site_settings as s (
    id,
    submission_channel_enabled,
    rating_channel_enabled,
    updated_by,
    updated_at
  )
  values (
    true,
    coalesce(p_submission_enabled, true),
    coalesce(p_rating_enabled, true),
    auth.uid(),
    now()
  )
  on conflict (id) do update
    set submission_channel_enabled = excluded.submission_channel_enabled,
        rating_channel_enabled = excluded.rating_channel_enabled,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at
  returning
    s.submission_channel_enabled as submission_enabled,
    s.rating_channel_enabled as rating_enabled,
    s.updated_at,
    s.updated_by;
end;
$$;

create or replace function public.admin_delete_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  delete from public.comments
  where id = p_comment_id;
end;
$$;

revoke execute on function public.channel_settings() from public, anon, authenticated;
revoke execute on function public.admin_channel_settings() from public, anon, authenticated;
revoke execute on function public.admin_update_channel_settings(boolean, boolean) from public, anon, authenticated;
revoke execute on function public.admin_delete_comment(uuid) from public, anon, authenticated;

grant execute on function public.channel_settings() to authenticated;
grant execute on function public.admin_channel_settings() to authenticated;
grant execute on function public.admin_update_channel_settings(boolean, boolean) to authenticated;
grant execute on function public.admin_delete_comment(uuid) to authenticated;

drop policy if exists "users insert own submission" on public.submissions;
create policy "users insert own submission"
on public.submissions for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    public.current_user_is_admin()
    or coalesce((select submission_enabled from public.channel_settings()), true)
  )
);

drop policy if exists "users rate as self" on public.ratings;
create policy "users rate as self"
on public.ratings for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    public.current_user_is_admin()
    or coalesce((select rating_enabled from public.channel_settings()), true)
  )
);

commit;
