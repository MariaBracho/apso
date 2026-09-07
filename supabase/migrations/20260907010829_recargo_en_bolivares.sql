-- ============================================================================
-- apso · Recargo por pagar en bolívares
--
-- La tienda tiene dos precios para el mismo producto:
--
--   · El de divisas es el que se carga en el panel. Es lo que cuesta pagando
--     en dólares — efectivo, Zelle, Binance o tarjeta.
--   · El de bolívares es ese más un recargo, y es el que se convierte a
--     bolívares multiplicándolo por la tasa del BCV.
--
-- El recargo existe porque la tienda cobra en bolívares pero repone inventario
-- comprando dólares: a tasa BCV pelada pierde la diferencia en cada venta.
--
-- Va en el precio y NO en la tasa. La tasa del BCV es un dato oficial que el
-- cliente contrasta por su cuenta, y con un recargo encima la comprobación más
-- obvia de esta tienda —multiplicar el precio en dólares por la tasa y ver si
-- da los bolívares de pantalla— dejaba de dar. Puesto en el precio, sí da.
-- ============================================================================

create table public.ajustes (
  -- Fila única: la restricción de abajo impide que exista una segunda.
  id boolean primary key default true,

  recargo_bs_pct numeric(5, 2) not null default 0,

  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references public.perfiles (id) on delete set null,

  constraint ajustes_fila_unica check (id),
  constraint recargo_razonable check (
    recargo_bs_pct >= 0 and recargo_bs_pct <= 100
  )
);

comment on column public.ajustes.recargo_bs_pct is
  'Porcentaje que se suma al precio en divisas para obtener el precio pagando en bolívares. El precio en bolívares que ve el cliente es ese resultado por la tasa del BCV, sin recargo sobre la tasa.';

insert into public.ajustes (id, recargo_bs_pct) values (true, 19)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Quién puede hacer qué
--
-- Lectura pública: sin el recargo no se puede calcular el precio que se
-- muestra en el catálogo, y el catálogo se ve sin sesión.
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
