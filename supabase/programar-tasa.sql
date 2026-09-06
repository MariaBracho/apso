-- ============================================================================
-- apso · Programar la actualización de la tasa
--
-- Se ejecuta UNA VEZ en el SQL Editor del panel de Supabase, después de haber
-- desplegado la función:
--
--   supabase functions deploy actualizar-tasa
--
-- Requiere las extensiones pg_cron (programar) y pg_net (hacer la petición).
-- ============================================================================

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- Horario
--
-- pg_cron trabaja en UTC y Caracas está en UTC-4. El BCV publica en días
-- hábiles alrededor de las 4:30 pm de Caracas, con efecto al día siguiente.
--
--   21:00 UTC = 5:00 pm Caracas · justo después de que publican
--   11:00 UTC = 7:00 am Caracas · red de seguridad por si la tarde falló
--
-- Correr de más no cuesta nada: la función descarta la vigencia que ya tiene
-- guardada, así que los fines de semana simplemente no hace nada.
-- ---------------------------------------------------------------------------

select cron.schedule(
  'apso-tasa-bcv',
  '0 11,21 * * *',
  $$
  select net.http_post(
    url := 'https://yzyxytscmddorasrdhqj.supabase.co/functions/v1/actualizar-tasa',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_4Pk879ooMoiW2cVzowlh6Q_62FHP4iV',
      'Authorization', 'Bearer sb_publishable_4Pk879ooMoiW2cVzowlh6Q_62FHP4iV'
    ),
    body := jsonb_build_object('origen', 'cron'),
    timeout_milliseconds := 20000
  ) as request_id;
  $$
);

-- ---------------------------------------------------------------------------
-- Comprobaciones
-- ---------------------------------------------------------------------------

-- Ver que quedó programada:
--   select jobname, schedule, active from cron.job;

-- Ver las últimas corridas y si fallaron:
--   select jobid, status, return_message, start_time
--   from cron.job_run_details
--   order by start_time desc
--   limit 10;

-- Ver qué respondió el BCV en las últimas peticiones:
--   select status_code, content, created
--   from net._http_response
--   order by created desc
--   limit 5;

-- Ver el historial de tasas guardadas:
--   select valor, fuente, vigente_desde
--   from public.tasas_cambio
--   order by vigente_desde desc
--   limit 10;

-- Para apagarla:
--   select cron.unschedule('apso-tasa-bcv');
