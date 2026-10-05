-- Les clés Web Push sont créées par la fonction Edge, puis conservées dans Vault.
-- Le verrou garantit une seule paire, même lors de démarrages simultanés.
create or replace function public.mesura_vapid(p_candidate jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare saved text;
begin
  perform pg_advisory_xact_lock(hashtextextended('mesura_vapid', 0));
  select decrypted_secret into saved from vault.decrypted_secrets where name = 'mesura_vapid';
  if saved is not null then return saved::jsonb; end if;
  if jsonb_typeof(p_candidate) <> 'object'
     or coalesce(p_candidate->>'publicKey', '') !~ '^[A-Za-z0-9_-]{87}$'
     or coalesce(p_candidate->>'privateKey', '') !~ '^[A-Za-z0-9_-]{43}$'
     or coalesce(p_candidate->>'subject', '') !~ '^https://[^[:space:]]+$'
     or length(p_candidate->>'subject') > 2008
  then raise exception 'Invalid VAPID configuration'; end if;
  perform vault.create_secret(p_candidate::text, 'mesura_vapid', 'Clés privées Web Push de Mesura');
  return p_candidate;
end $$;
revoke all on function public.mesura_vapid(jsonb) from public, anon, authenticated;
grant execute on function public.mesura_vapid(jsonb) to service_role;
