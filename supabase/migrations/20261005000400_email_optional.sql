-- La session authentifiée suffit ; la confirmation email n’est plus requise.
create or replace function public.mesura_session_active(p_user_id uuid, p_session_id uuid)
returns boolean language sql security definer set search_path = '' as $$
  select exists(select 1 from auth.sessions s join auth.users u on u.id = s.user_id
    where s.id = p_session_id and s.user_id = p_user_id
    and (s.not_after is null or s.not_after > now())
    and coalesce((to_jsonb(s)->>'updated_at')::timestamptz, s.created_at) > now() - interval '7 days'
    and not exists(select 1 from public.mesura_tombstones t where t.user_id = u.id));
$$;

