create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

do $$ begin
  if not exists(select 1 from vault.secrets where name = 'mesura_jobs_secret') then
    perform vault.create_secret(gen_random_uuid()::text || gen_random_uuid()::text, 'mesura_jobs_secret', 'Accès privé du planificateur Mesura');
  end if;
end $$;

create or replace function public.mesura_check_job_secret(p_secret text)
returns boolean language sql security definer set search_path = '' as $$
  select length(p_secret) >= 64 and exists(select 1 from vault.decrypted_secrets where name = 'mesura_jobs_secret' and decrypted_secret = p_secret);
$$;
revoke all on function public.mesura_check_job_secret(text) from public, anon, authenticated;
grant execute on function public.mesura_check_job_secret(text) to service_role;

do $$ begin
  if not exists(select 1 from cron.job where jobname = 'mesura-minute') then
    perform cron.schedule('mesura-minute', '* * * * *', $cron$
      select net.http_post(
        url := 'https://duselqsuvkwbwkhmljkh.supabase.co/functions/v1/mesura-api/jobs',
        headers := jsonb_build_object('Content-Type', 'application/json', 'X-Mesura-Jobs-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'mesura_jobs_secret')),
        body := '{}'::jsonb,
        timeout_milliseconds := 50000
      );
    $cron$);
  end if;
end $$;
