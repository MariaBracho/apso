-- ============================================================================
-- apso · Cambio de divisas, y lo que se pierde en el camino
--
-- La tienda cobra en bolívares a la tasa del BCV y después los cambia a
-- dólares para reponer inventario. Ese cambio no ocurre a la tasa del BCV: un
-- cobro de Bs 7.807 —$9,52 a tasa oficial— se convirtió en $7,56 reales. Los
-- $1,96 de diferencia no aparecían en ningún lado: la caja seguía diciendo que
-- había 9,52.
--
-- Cada cambio guarda las dos puntas. La diferencia entre ellas es la pérdida,
-- y acumulada es el número que dice si el recargo del catálogo alcanza: si esa
-- pérdida crece, el recargo se quedó corto.
-- ============================================================================

create table public.conversiones (
  id uuid primary key default gen_random_uuid(),

  -- La del cambio, no la de cuando se anotó.
  fecha date not null default current_date,

  -- De dónde salió y cuánto, valorado en dólares a la tasa de esa punta. Para
  -- bolívares esa tasa es la del BCV, que es a la que se cobraron.
  metodo_origen public.metodo_pago not null,
  monto_origen_usd numeric(10, 2) not null,
  tasa_origen numeric(12, 4) not null,

  -- A dónde entró y cuánto llegó de verdad.
  metodo_destino public.metodo_pago not null,
  monto_destino_usd numeric(10, 2) not null,

  nota text,
  registrado_por uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),

  constraint montos_conversion_positivos check (
    monto_origen_usd > 0 and monto_destino_usd > 0
  ),
  constraint tasa_conversion_positiva check (tasa_origen > 0),
  -- Cambiar plata de un método al mismo método no es un cambio.
  constraint metodos_distintos check (metodo_origen <> metodo_destino)
);

create index conversiones_fecha_idx on public.conversiones (fecha desc);

comment on table public.conversiones is
  'Cambios de una moneda a otra. La diferencia entre las dos puntas es la pérdida por cambio, que no es un gasto aparte: ya está descontada del neto por la propia diferencia.';

alter table public.conversiones enable row level security;

create policy "El admin lleva los cambios"
  on public.conversiones for all
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));
