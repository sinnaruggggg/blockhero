create table if not exists public.lobby_chat_messages (
  id text primary key,
  channel_key text not null,
  mode text not null check (mode in ('battle', 'raid')),
  channel_id integer not null check (channel_id > 0),
  user_id text not null,
  nickname text not null,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_lobby_chat_messages_channel_created
on public.lobby_chat_messages(channel_key, created_at desc);

alter table public.lobby_chat_messages replica identity full;
alter table public.lobby_chat_messages enable row level security;

drop policy if exists lobby_chat_messages_read_all on public.lobby_chat_messages;
create policy lobby_chat_messages_read_all
on public.lobby_chat_messages
for select
using (true);

drop policy if exists lobby_chat_messages_insert_all on public.lobby_chat_messages;
create policy lobby_chat_messages_insert_all
on public.lobby_chat_messages
for insert
with check (true);

create or replace function public.trim_lobby_chat_messages()
returns trigger
language plpgsql
as $$
begin
  delete from public.lobby_chat_messages
  where channel_key = new.channel_key
    and id in (
      select id
      from public.lobby_chat_messages
      where channel_key = new.channel_key
      order by created_at desc, id desc
      offset 100
    );

  return new;
end;
$$;

drop trigger if exists lobby_chat_messages_trim on public.lobby_chat_messages;
create trigger lobby_chat_messages_trim
after insert on public.lobby_chat_messages
for each row execute function public.trim_lobby_chat_messages();

alter publication supabase_realtime add table public.lobby_chat_messages;
