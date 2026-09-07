-- ============================================================================
-- apso · Margen de venta sobre la tasa
--
-- La tienda cobra en bolívares pero repone inventario comprando dólares. Si
-- vende exactamente a la tasa del BCV, pierde la diferencia en cada venta.
-- El margen es ese colchón.
--
-- Va aparte de `tasas_cambio` a propósito: esa tabla es el registro de lo que
-- publicó el BCV, y la Edge Function le agrega una fila cada día. Meter aquí
-- una política de precios ensuciaría ese historial y obligaría a arrastrar el
-- margen fila por fila. El margen es uno solo y vive en un sitio.
-- ============================================================================

create table public.ajustes (
  -- Fila única: la restricción de abajo impide que exista una segunda.
  id boolean primary key default true,

  -- Porcentaje sobre la tasa del BCV. En 0 la tienda vende a tasa BCV pelada.
  margen_tasa_pct numeric(5, 2) not null default 0,

  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references public.perfiles (id) on delete set null,

  constraint ajustes_fila_unica check (id),
  constraint margen_razonable check (
    margen_tasa_pct >= 0 and margen_tasa_pct <= 100
  )
);

comment on column public.ajustes.margen_tasa_pct is
  'Porcentaje que se suma a la tasa del BCV para calcular la tasa de venta. Lo que el cliente ve en bolívares sale de esta tasa, y cada pedido guarda la suya congelada.';

-- El 19 % que pidió la tienda al arrancar. Se cambia desde el panel.
insert into public.ajustes (id, margen_tasa_pct) values (true, 19)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Quién puede hacer qué
--
-- Lectura pública: sin el margen no se puede calcular el precio en bolívares
-- del catálogo, y el catálogo se ve sin sesión.
-- ---------------------------------------------------------------------------

alter table public.ajustes enable row level security;

create policy "Los ajustes son públicos"
  on public.ajustes for select
  to anon, authenticated
  using (true);

create policy "El admin cambia los ajustes"
  on public.ajustes for all
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- ---------------------------------------------------------------------------
-- La tasa de venta
--
-- Se expone como función para que exista una sola definición del cálculo.
-- `tasa_vigente()` sigue devolviendo la del BCV, que es lo que el panel muestra
-- como referencia.
-- ---------------------------------------------------------------------------

create or replace function public.tasa_de_venta()
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select round(
    public.tasa_vigente() * (1 + (select margen_tasa_pct from public.ajustes) / 100),
    4
  );
$$;
