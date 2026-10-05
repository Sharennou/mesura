-- Installation additive : aucune table existante n’est effacée.
create table if not exists public.mesura_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (octet_length(data::text) < 10485760),
  revision integer not null default 0,
  last_active timestamptz not null default now()
);
create table if not exists public.mesura_tombstones (
  user_id uuid primary key,
  deleted_at timestamptz not null default now()
);
create table if not exists public.mesura_photo_gc (
  path text primary key,
  user_id uuid not null,
  not_before timestamptz not null default now()
);
create table if not exists public.mesura_deliveries (
  user_id uuid not null,
  occurrence text not null,
  revision text not null,
  device text not null,
  created_at timestamptz not null default now(),
  status text not null default 'claimed',
  primary key(user_id, occurrence, revision, device)
);
create table if not exists public.mesura_rate_limits (
  user_id uuid not null,
  scope text not null,
  window_started timestamptz not null,
  count integer not null,
  primary key(user_id, scope, window_started)
);
create table if not exists public.mesura_push_devices (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade
);
create table if not exists public.mesura_system (
  id text primary key,
  heartbeat timestamptz not null
);

alter table public.mesura_accounts enable row level security;
alter table public.mesura_tombstones enable row level security;
alter table public.mesura_photo_gc enable row level security;
alter table public.mesura_deliveries enable row level security;
alter table public.mesura_rate_limits enable row level security;
alter table public.mesura_push_devices enable row level security;
alter table public.mesura_system enable row level security;
revoke all on public.mesura_accounts, public.mesura_tombstones, public.mesura_photo_gc, public.mesura_deliveries, public.mesura_rate_limits from anon, authenticated;
grant select on public.mesura_accounts to authenticated;
grant all on public.mesura_accounts, public.mesura_tombstones, public.mesura_photo_gc, public.mesura_deliveries, public.mesura_rate_limits to service_role;
revoke all on public.mesura_push_devices, public.mesura_system from anon, authenticated;
grant all on public.mesura_push_devices, public.mesura_system to service_role;
drop policy if exists mesura_owner_read on public.mesura_accounts;
create policy mesura_owner_read on public.mesura_accounts for select to authenticated
  using (user_id = (select auth.uid()) and (auth.jwt()->>'email') is not null);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('mesura-photos', 'mesura-photos', false, 10485760, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
-- Aucune policy sur storage.objects : les clients ne peuvent ni lire ni écrire
-- ces photos directement. Seule la fonction authentifiée utilise service_role.
drop policy if exists mesura_private_photos on storage.objects;
create policy mesura_private_photos on storage.objects as restrictive for all
  using (bucket_id <> 'mesura-photos') with check (bucket_id <> 'mesura-photos');

create or replace function public.mesura_commit(p_user_id uuid, p_revision integer, p_data jsonb, p_active boolean default true)
returns boolean language plpgsql security definer set search_path = '' as $$
declare old_data jsonb;
begin
  if exists (select 1 from public.mesura_tombstones where user_id = p_user_id) then return false; end if;
  select data into old_data from public.mesura_accounts where user_id = p_user_id and revision = p_revision for update;
  if not found then return false; end if;
  update public.mesura_accounts set data = p_data, revision = revision + 1,
    last_active = case when p_active then now() else last_active end where user_id = p_user_id;
  delete from public.mesura_push_devices where user_id = p_user_id;
  insert into public.mesura_push_devices(endpoint, user_id)
    select s->>'endpoint', p_user_id from jsonb_array_elements(p_data->'subscriptions') s;
  insert into public.mesura_photo_gc(path, user_id)
    select p_user_id::text || '/' || (old_photo #>> '{}') || '.jpg', p_user_id
    from jsonb_path_query(old_data, '$.entries[*].photos[*].id') old_photo
    where not exists (select 1 from jsonb_path_query(p_data, '$.entries[*].photos[*].id') new_photo where new_photo = old_photo)
    on conflict(path) do update set not_before = now();
  return true;
end;
$$;

create or replace function public.mesura_mark_deleted(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.mesura_tombstones(user_id) values (p_user_id) on conflict do nothing;
  insert into public.mesura_photo_gc(path, user_id)
    select p_user_id::text || '/' || (p #>> '{}') || '.jpg', p_user_id
    from public.mesura_accounts a, lateral jsonb_path_query(a.data, '$.entries[*].photos[*].id') p
    where a.user_id = p_user_id on conflict(path) do update set not_before = now();
  delete from public.mesura_accounts where user_id = p_user_id;
  delete from public.mesura_deliveries where user_id = p_user_id;
  delete from public.mesura_rate_limits where user_id = p_user_id;
  delete from public.mesura_push_devices where user_id = p_user_id;
end;
$$;

create or replace function public.mesura_rate_limit(p_user_id uuid, p_scope text, p_max integer, p_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  insert into public.mesura_rate_limits(user_id, scope, window_started, count)
    values(p_user_id, p_scope, to_timestamp(floor(extract(epoch from now()) / p_seconds) * p_seconds), 1)
    on conflict(user_id, scope, window_started) do update set count = public.mesura_rate_limits.count + 1 returning count into n;
  return n <= p_max;
end;
$$;

create or replace function public.mesura_session_active(p_user_id uuid, p_session_id uuid)
returns boolean language sql security definer set search_path = '' as $$
  select exists(select 1 from auth.sessions s join auth.users u on u.id = s.user_id
    where s.id = p_session_id and s.user_id = p_user_id and u.email_confirmed_at is not null
    and (s.not_after is null or s.not_after > now())
    and coalesce((to_jsonb(s)->>'updated_at')::timestamptz, s.created_at) > now() - interval '7 days'
    and not exists(select 1 from public.mesura_tombstones t where t.user_id = u.id));
$$;

create or replace function public.mesura_sessions()
returns jsonb language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'createdAt', s.created_at, 'expiresAt', coalesce(s.not_after, s.updated_at + interval '7 days'))), '[]'::jsonb)
    from auth.sessions s where s.user_id = (select auth.uid()) and (s.not_after is null or s.not_after > now());
$$;

create or replace function public.mesura_claim_delivery(p_user_id uuid, p_occurrence text, p_revision text, p_device text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not exists(select 1 from public.mesura_accounts a where a.user_id = p_user_id
    and a.data->>'reminderRevision' = p_revision and a.data->'reminder'->>'nextAt' = p_occurrence
    and a.data->'reminder'->>'enabled' = 'true' and a.data->'consents'->>'body' = 'true'
    and a.data->'consents'->>(a.data->'reminder'->>'channel') = 'true') then return false; end if;
  insert into public.mesura_deliveries(user_id, occurrence, revision, device) values(p_user_id, p_occurrence, p_revision, p_device) on conflict do nothing;
  get diagnostics n = row_count;
  return n = 1;
end;
$$;

revoke all on function public.mesura_commit(uuid, integer, jsonb, boolean), public.mesura_mark_deleted(uuid), public.mesura_rate_limit(uuid, text, integer, integer), public.mesura_session_active(uuid, uuid), public.mesura_claim_delivery(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.mesura_commit(uuid, integer, jsonb, boolean), public.mesura_mark_deleted(uuid), public.mesura_rate_limit(uuid, text, integer, integer), public.mesura_session_active(uuid, uuid), public.mesura_claim_delivery(uuid, text, text, text) to service_role;
revoke all on function public.mesura_sessions() from public, anon;
grant execute on function public.mesura_sessions() to authenticated;

create or replace function public.mesura_can_read()
returns boolean language sql security definer set search_path = '' as $$
  select public.mesura_session_active(auth.uid(), (auth.jwt()->>'session_id')::uuid);
$$;
revoke all on function public.mesura_can_read() from public, anon;
grant execute on function public.mesura_can_read() to authenticated;
drop policy if exists mesura_owner_read on public.mesura_accounts;
create policy mesura_owner_read on public.mesura_accounts for select to authenticated
  using (user_id = (select auth.uid()) and (select public.mesura_can_read()));

create or replace function public.mesura_jobs_ready()
returns boolean language sql security definer set search_path = '' as $$
  select exists(select 1 from public.mesura_system where id = 'jobs' and heartbeat > now() - interval '3 minutes');
$$;
revoke all on function public.mesura_jobs_ready() from public, anon, authenticated;
grant execute on function public.mesura_jobs_ready() to service_role;
