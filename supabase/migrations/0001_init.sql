-- ============================================================================
-- Budsin Chat — Esquema inicial (Supabase / Postgres)
-- Diseño inspirado en Discord / Stoat: servidores, canales, mensajes,
-- roles, conversaciones (DMs + grupales), reacciones, invitaciones,
-- presencia, typing, reportes y moderación.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Perfiles (se crean automáticamente al registrarse)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text not null unique,
  display_name  text not null default '',
  avatar_url    text,
  status        text not null default 'offline'
                check (status in ('online','away','dnd','invisible','offline')),
  bio           text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-crear perfil cuando nace un usuario de auth (OAuth/email/guest).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_name text;
begin
  base_name := coalesce(new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'display_name');
  if base_name is null or base_name = '' then
    base_name := 'user_' || substring(new.id from 1 for 8);
  else
    base_name := 'user_' || lower(base_name);
  end if;
  insert into public.profiles (id, username)
  values (new.id, base_name)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. Servidores (spaces) y canales
-- ---------------------------------------------------------------------------
create table if not exists public.servers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  icon_url     text,
  banner_color text,
  owner_id     uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now()
);

create table if not exists public.channels (
  id         uuid primary key default gen_random_uuid(),
  server_id  uuid not null references public.servers(id) on delete cascade,
  name       text not null,
  topic      text not null default '',
  kind       text not null default 'text' check (kind in ('text','voice')),
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  unique (server_id, name)
);
create index on public.channels (server_id, position);

-- Miembros de servidor + roles (member/moderator/admin/owner)
create table if not exists public.server_members (
  server_id  uuid not null references public.servers(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'member'
             check (role in ('member','moderator','admin','owner')),
  joined_at  timestamptz not null default now(),
  primary key (server_id, user_id)
);
create index on public.server_members (user_id);

-- Roles personalizables por servidor (nombre + posición + permisos JSON)
create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  server_id   uuid not null references public.servers(id) on delete cascade,
  name        text not null,
  position    integer not null default 0,
  color       text,
  permissions jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  unique (server_id, name)
);

create table if not exists public.role_assignments (
  server_id uuid not null,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role_id   uuid not null references public.roles(id) on delete cascade,
  primary key (server_id, user_id, role_id)
);

-- ---------------------------------------------------------------------------
-- 3. Mensajes de canal
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid not null references public.channels(id) on delete cascade,
  author_id   uuid not null references auth.users(id) on delete cascade,
  content     text not null,
  content_html text,           -- renderizado del markdown (sanitizado)
  attachments jsonb not null default '[]'::jsonb,  -- [{url,name,size,type}]
  reply_to    uuid references public.messages(id) on delete set null,
  edited_at   timestamptz,
  created_at  timestamptz not null default now()
);
create index on public.messages (channel_id, created_at desc);
create index on public.messages (author_id);

-- Reacciones (emoji)
create table if not exists public.reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

-- ---------------------------------------------------------------------------
-- 4. Conversaciones (DMs directos + grupales) — un modelo unificado
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null default 'direct' check (kind in ('direct','group')),
  name        text,            -- solo para groups
  owner_id    uuid references auth.users(id) on delete set null,
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null default 'member' check (role in ('member','admin')),
  joined_at       timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index on public.conversation_members (user_id);

create table if not exists public.conversation_messages (
  id             uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  author_id      uuid not null references auth.users(id) on delete cascade,
  content        text not null,
  content_html   text,
  attachments    jsonb not null default '[]'::jsonb,
  reply_to       uuid,
  edited_at      timestamptz,
  created_at     timestamptz not null default now()
);
create index on public.conversation_messages (conversation_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 5. Invitaciones personalizables
-- ---------------------------------------------------------------------------
create table if not exists public.invites (
  id         uuid primary key default gen_random_uuid(),
  server_id  uuid references public.servers(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  code       text not null unique,
  label      text not null default '',
  created_by uuid not null references auth.users(id) on delete cascade,
  max_uses   integer,            -- null = sin límite
  uses       integer not null default 0,
  expires_at timestamptz,        -- null = sin expiración
  created_at timestamptz not null default now()
);
create index on public.invites (server_id);

-- ---------------------------------------------------------------------------
-- 6. Presencia y typing (ephemeral)
-- ---------------------------------------------------------------------------
create table if not exists public.presence (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  status     text not null default 'offline',
  last_seen  timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.typing (
  channel_id    uuid not null references public.channels(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  last_active   timestamptz not null default now(),
  primary key (channel_id, user_id),
  unique (conversation_id, user_id)
);

-- Limpiar typing old (> 15s) en background
create or replace function public.cleanup_typing()
returns trigger language plpgsql as $$
begin
  delete from public.typing where last_active < now() - interval '15 seconds';
  return null;
end; $$;

-- ---------------------------------------------------------------------------
-- 7. Reportes y moderación
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  target_user  uuid not null references auth.users(id) on delete cascade,
  reporter_id  uuid not null references auth.users(id) on delete cascade,
  reason       text not null,
  detail       text not null default '',
  status       text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at   timestamptz not null default now()
);

create table if not exists public.moderation_actions (
  id            uuid primary key default gen_random_uuid(),
  target_user   uuid not null references auth.users(id) on delete cascade,
  action        text not null check (action in ('mute','ban','role_remove','warn')),
  reason        text not null default '',
  moderator_id  uuid references auth.users(id) on delete set null,
  expires_at    timestamptz,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 8. Triggers: updated_at + presencia cleanup
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_presence_cleanup on public.typing;
create trigger trg_presence_cleanup after insert on public.typing
  for each row execute function public.cleanup_typing();

-- ---------------------------------------------------------------------------
-- 9. Políticas RLS (todo por permiso de membresía)
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.servers   enable row level security;
alter table public.channels  enable row level security;
alter table public.server_members enable row level security;
alter table public.roles     enable row level security;
alter table public.role_assignments enable row level security;
alter table public.messages  enable row level security;
alter table public.reactions enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.invites   enable row level security;
alter table public.presence  enable row level security;
alter table public.typing    enable row level security;
alter table public.reports   enable row level security;
alter table public.moderation_actions enable row level security;

-- --- Helpers de membresía ---
create or replace function public.is_server_member(srv uuid, uid uuid)
returns boolean language sql stable as $$
  select exists (select 1 from public.server_members where server_id = srv and user_id = uid);
$$;

create or replace function public.is_conversation_member(conv uuid, uid uuid)
returns boolean language sql stable as $$
  select exists (select 1 from public.conversation_members where conversation_id = conv and user_id = uid);
$$;

-- --- Profiles: cada uno ve/actualiza solo el suyo ---
create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- --- Servers: miembros pueden leer; crear libremente; update owner/admin ---
create policy "server read members" on public.servers
  for select using (public.is_server_member(id, auth.uid()));
create policy "server create" on public.servers
  for insert with check (true);
create policy "server update admin" on public.servers
  for update using (owner_id = auth.uid() or public.is_server_member(id, auth.uid()) and
                    (select role from public.server_members where server_id = servers.id and user_id = auth.uid()) in ('owner','admin'));

-- --- Channels: miembros del servidor ---
create policy "channels read members" on public.channels
  for select using (public.is_server_member(server_id, auth.uid()));
create policy "channels create admin" on public.channels
  for insert with check (public.is_server_member(server_id, auth.uid()));
create policy "channels update admin" on public.channels
  for update using (public.is_server_member(server_id, auth.uid()));

-- --- server_members ---
create policy "members read self" on public.server_members
  for select using (user_id = auth.uid() or public.is_server_member(server_id, auth.uid()));
create policy "members join via invite" on public.server_members
  for insert with check (public.is_server_member(server_id, auth.uid()) or true);
create policy "members manage admin" on public.server_members
  for all using (public.is_server_member(server_id, auth.uid())) with check (public.is_server_member(server_id, auth.uid()));

-- --- roles / role_assignments ---
create policy "roles read members" on public.roles
  for select using (public.is_server_member(server_id, auth.uid()));
create policy "roles manage admin" on public.roles
  for all using (public.is_server_member(server_id, auth.uid())) with check (public.is_server_member(server_id, auth.uid()));
create policy "role_assignments read" on public.role_assignments
  for select using (public.is_server_member(server_id, auth.uid()));
create policy "role_assignments manage" on public.role_assignments
  for all using (public.is_server_member(server_id, auth.uid())) with check (public.is_server_member(server_id, auth.uid()));

-- --- messages: miembros del canal ---
create policy "messages read members" on public.messages
  for select using (public.is_server_member(
    (select server_id from public.channels where id = messages.channel_id), auth.uid()));
create policy "messages write members" on public.messages
  for insert with check (public.is_server_member(
    (select server_id from public.channels where id = messages.channel_id), auth.uid()));
create policy "messages update own" on public.messages
  for update using (author_id = auth.uid() and edited_at is null) with check (author_id = auth.uid());

-- --- reactions ---
create policy "reactions read members" on public.reactions
  for select using (public.is_server_member(
    (select server_id from public.channels c join public.messages m on m.channel_id = c.id
      where m.id = reactions.message_id), auth.uid()));
create policy "reactions write members" on public.reactions
  for insert with check (auth.uid() is not null);
create policy "reactions delete own" on public.reactions
  for delete using (user_id = auth.uid());

-- --- conversations / members / messages ---
create policy "conversations read members" on public.conversations
  for select using (public.is_conversation_member(id, auth.uid()));
create policy "conversations create" on public.conversations
  for insert with check (true);
create policy "conversations update owner" on public.conversations
  for update using (owner_id = auth.uid() or public.is_conversation_member(id, auth.uid()));

create policy "conv members read self" on public.conversation_members
  for select using (user_id = auth.uid() or public.is_conversation_member(conversation_id, auth.uid()));
create policy "conv members add" on public.conversation_members
  for insert with check (public.is_conversation_member(conversation_id, auth.uid()) or true);
create policy "conv members manage" on public.conversation_members
  for all using (public.is_conversation_member(conversation_id, auth.uid())) with check (public.is_conversation_member(conversation_id, auth.uid()));

create policy "conv messages read members" on public.conversation_messages
  for select using (public.is_conversation_member(conversation_id, auth.uid()));
create policy "conv messages write members" on public.conversation_messages
  for insert with check (public.is_conversation_member(conversation_id, auth.uid()));
create policy "conv messages update own" on public.conversation_messages
  for update using (author_id = auth.uid() and edited_at is null) with check (author_id = auth.uid());

-- --- invites ---
create policy "invites read public" on public.invites
  for select using (true);
create policy "invites create" on public.invites
  for insert with check (auth.uid() is not null);

-- --- presence: cada uno su fila ---
create policy "presence own" on public.presence
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --- typing: miembros (solo se lee typing de canales/conversaciones del usuario) ---
create policy "typing read members" on public.typing
  for select using (user_id = auth.uid() or
                   (channel_id is not null and public.is_server_member(
                      (select server_id from public.channels where id = typing.channel_id), auth.uid())) or
                   (conversation_id is not null and public.is_conversation_member(typing.conversation_id, auth.uid())));
create policy "typing write members" on public.typing
  for insert with check (auth.uid() is not null);
create policy "typing delete own" on public.typing
  for delete using (user_id = auth.uid());

-- --- reports / moderation ---
create policy "reports create" on public.reports
  for insert with check (auth.uid() is not null and target_user <> auth.uid());
create policy "reports read reporter" on public.reports
  for select using (reporter_id = auth.uid());
create policy "moderation admin" on public.moderation_actions
  for select using (moderator_id = auth.uid() or true);
create policy "moderation create" on public.moderation_actions
  for insert with check (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- 10. Realtime: publicar tablas relevantes
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.reactions;
alter publication supabase_realtime add table public.conversation_messages;
alter publication supabase_realtime add table public.presence;
alter publication supabase_realtime add table public.typing;
alter publication supabase_realtime add table public.server_members;
alter publication supabase_realtime add table public.conversation_members;

-- Nota: en Supabase, RLS filtra las suscripcións realtime. Las políticas de
-- 'select' son las que deciden qué filas llegan al cliente en tiempo real.

-- ---------------------------------------------------------------------------
-- 11. Almacenamiento (Supabase Storage) — buckets + RLS
-- ---------------------------------------------------------------------------
-- Los buckets se crean por la API/UI de Storage, pero las políticas RLS
-- (que determinan quién puede ver/subir) se definen aquí sobre storage.objects.

-- Bucket 'uploads': adjuntos de mensajes (lectura pública,
-- subida restringida a usuarios autenticados).
create policy "uploads public read" on storage.objects
  for select using (bucket_id = 'uploads');

create policy "uploads user insert" on storage.objects
  for insert with check (
    bucket_id = 'uploads' and auth.uid() is not null
  );

-- Bucket 'avatars': avatares de perfil (lectura pública, subida del propio usuario).
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars user insert own" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars user update own" on storage.objects
  for update using (
    bucket_id = 'avatars' and
    (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'avatars' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars user delete own" on storage.objects
  for delete using (
    bucket_id = 'avatars' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 12. Utilidades: generación de códigos de invitación
-- ---------------------------------------------------------------------------
create or replace function public.gen_invite_code()
returns text language plpgsql as $$
begin
  return encode(gen_random_bytes(6), 'hex');
end; $$;

-- ---------------------------------------------------------------------------
-- 13. Ayudante: rol de un usuario en un servidor
-- ---------------------------------------------------------------------------
create or replace function public.server_role(srv uuid, uid uuid)
returns text language sql stable as $$
  select coalesce((select role from public.server_members where server_id = srv and user_id = uid), 'none');
$$;

-- ---------------------------------------------------------------------------
-- 14. Notificaciones
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  ref uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "notifications own" on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
alter publication supabase_realtime add table public.notifications;

-- ---------------------------------------------------------------------------
-- 15. Actividad
-- ---------------------------------------------------------------------------
create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  content text not null,
  server_id uuid references public.servers(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.activity enable row level security;
create policy "activity read members" on public.activity
  for select using (
    server_id is null or
    public.is_server_member(server_id, auth.uid())
  );
create policy "activity write own" on public.activity
  for insert with check (auth.uid() is not null);
alter publication supabase_realtime add table public.activity;
