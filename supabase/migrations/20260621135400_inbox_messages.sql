begin;

create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('admin_broadcast', 'admin_direct', 'comment_reply', 'chart_comment')),
  target_scope text not null check (target_scope in ('all', 'user')),
  target_user_id uuid references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 2000),
  related_submission_id uuid references public.submissions(id) on delete set null,
  related_comment_id uuid references public.comments(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint inbox_messages_target_check check (
    (target_scope = 'all' and target_user_id is null)
    or (target_scope = 'user' and target_user_id is not null)
  )
);

create table if not exists public.inbox_message_reads (
  message_id uuid not null references public.inbox_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists inbox_messages_target_user_idx
on public.inbox_messages (target_user_id, created_at desc);

create index if not exists inbox_messages_target_scope_idx
on public.inbox_messages (target_scope, created_at desc);

create index if not exists inbox_message_reads_user_idx
on public.inbox_message_reads (user_id, read_at desc);

create or replace function public.create_comment_inbox_messages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  submission_owner uuid;
  submission_title text;
  commenter_name text;
  parent_owner uuid;
begin
  select s.user_id, coalesce(nullif(s.song_title, ''), s.title)
  into submission_owner, submission_title
  from public.submissions s
  where s.id = new.submission_id;

  select coalesce(nullif(p.display_name, ''), p.user_code, '某位用户')
  into commenter_name
  from public.profiles p
  where p.id = new.user_id;

  if new.parent_id is not null then
    select c.user_id
    into parent_owner
    from public.comments c
    where c.id = new.parent_id;

    if parent_owner is not null and parent_owner <> new.user_id then
      insert into public.inbox_messages (
        kind,
        target_scope,
        target_user_id,
        actor_user_id,
        title,
        body,
        related_submission_id,
        related_comment_id
      )
      values (
        'comment_reply',
        'user',
        parent_owner,
        new.user_id,
        '有人回复了你的评论',
        commenter_name || ' 回复了你在「' || coalesce(submission_title, '未命名谱面') || '」下的评论：' || E'\n\n' || new.body,
        new.submission_id,
        new.id
      );
    end if;
  end if;

  if submission_owner is not null
     and submission_owner <> new.user_id
     and (parent_owner is null or submission_owner <> parent_owner) then
    insert into public.inbox_messages (
      kind,
      target_scope,
      target_user_id,
      actor_user_id,
      title,
      body,
      related_submission_id,
      related_comment_id
    )
    values (
      'chart_comment',
      'user',
      submission_owner,
      new.user_id,
      '你的谱面收到了新评论',
      commenter_name || ' 评论了你的谱面「' || coalesce(submission_title, '未命名谱面') || '」：' || E'\n\n' || new.body,
      new.submission_id,
      new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists comments_create_inbox_messages on public.comments;
create trigger comments_create_inbox_messages
after insert on public.comments
for each row execute function public.create_comment_inbox_messages();

drop function if exists public.inbox_rows();
create or replace function public.inbox_rows()
returns table (
  id uuid,
  kind text,
  target_scope text,
  target_user_id uuid,
  title text,
  body text,
  related_submission_id uuid,
  related_comment_id uuid,
  created_at timestamptz,
  read_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if auth.uid() is null then
    raise exception 'login required' using errcode = '42501';
  end if;

  return query
  select
    m.id,
    m.kind,
    m.target_scope,
    m.target_user_id,
    m.title,
    m.body,
    m.related_submission_id,
    m.related_comment_id,
    m.created_at,
    r.read_at
  from public.inbox_messages m
  left join public.inbox_message_reads r
    on r.message_id = m.id
   and r.user_id = auth.uid()
  where m.target_scope = 'all'
     or m.target_user_id = auth.uid()
  order by m.created_at desc;
end;
$$;

create or replace function public.mark_inbox_message_read(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'login required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.inbox_messages m
    where m.id = p_message_id
      and (m.target_scope = 'all' or m.target_user_id = auth.uid())
  ) then
    raise exception 'message not found' using errcode = '42501';
  end if;

  insert into public.inbox_message_reads (message_id, user_id)
  values (p_message_id, auth.uid())
  on conflict (message_id, user_id) do update
    set read_at = now();
end;
$$;

create or replace function public.mark_all_inbox_messages_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'login required' using errcode = '42501';
  end if;

  insert into public.inbox_message_reads (message_id, user_id)
  select m.id, auth.uid()
  from public.inbox_messages m
  where m.target_scope = 'all'
     or m.target_user_id = auth.uid()
  on conflict (message_id, user_id) do update
    set read_at = now();
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

create or replace function public.admin_send_message(
  p_target_scope text,
  p_target_user_id uuid,
  p_title text,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_message_id uuid;
  clean_target_scope text := coalesce(nullif(trim(p_target_scope), ''), 'all');
  clean_title text := nullif(trim(p_title), '');
  clean_body text := nullif(trim(p_body), '');
begin
  if not public.current_user_is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  if clean_target_scope not in ('all', 'user') then
    raise exception 'invalid message target' using errcode = '22023';
  end if;

  if clean_target_scope = 'user' and p_target_user_id is null then
    raise exception 'target user required' using errcode = '22023';
  end if;

  if clean_target_scope = 'user' and not exists (select 1 from public.profiles where id = p_target_user_id) then
    raise exception 'target user not found' using errcode = '23503';
  end if;

  if clean_title is null or clean_body is null then
    raise exception 'title and body are required' using errcode = '23502';
  end if;

  insert into public.inbox_messages (
    kind,
    target_scope,
    target_user_id,
    actor_user_id,
    title,
    body
  )
  values (
    case when clean_target_scope = 'all' then 'admin_broadcast' else 'admin_direct' end,
    clean_target_scope,
    case when clean_target_scope = 'all' then null else p_target_user_id end,
    auth.uid(),
    clean_title,
    clean_body
  )
  returning id into new_message_id;

  return new_message_id;
end;
$$;

alter table public.inbox_messages enable row level security;
alter table public.inbox_message_reads enable row level security;

revoke all on public.inbox_messages from anon, authenticated;
revoke all on public.inbox_message_reads from anon, authenticated;
revoke execute on function public.create_comment_inbox_messages() from public, anon, authenticated;
revoke execute on function public.inbox_rows() from public, anon, authenticated;
revoke execute on function public.mark_inbox_message_read(uuid) from public, anon, authenticated;
revoke execute on function public.mark_all_inbox_messages_read() from public, anon, authenticated;
revoke execute on function public.admin_message_rows() from public, anon, authenticated;
revoke execute on function public.admin_send_message(text, uuid, text, text) from public, anon, authenticated;

grant execute on function public.inbox_rows() to authenticated;
grant execute on function public.mark_inbox_message_read(uuid) to authenticated;
grant execute on function public.mark_all_inbox_messages_read() to authenticated;
grant execute on function public.admin_message_rows() to authenticated;
grant execute on function public.admin_send_message(text, uuid, text, text) to authenticated;

notify pgrst, 'reload schema';

commit;
