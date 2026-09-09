-- ============================================================================
-- apso · Comisiones ganadas y pagadas
--
-- Una fila por pedido, con el monto CONGELADO en el momento en que la venta se
-- dio por buena. El número del inventario es una estimación —sale del costo
-- promedio de hoy— y se mueve cada vez que entra mercancía a otro precio. Lo
-- que ya se le prometió a alguien no puede moverse: si el promedio sube, la
-- comisión de una venta de la semana pasada cambiaría sola y nadie podría
-- cuadrar una liquidación.
--
-- Por eso se guardan los tres números y no solo el resultado: el margen que
-- sirvió de base, el porcentaje que regía ese día y el monto. Con eso una
-- comisión se puede explicar dos meses después sin depender de nada actual.
-- ============================================================================

create table public.comisiones (
  id uuid primary key default gen_random_uuid(),

  -- Una por pedido: la restricción es lo que impide generarla dos veces si el
  -- pedido va y vuelve entre estados.
  pedido_id uuid not null unique references public.pedidos (id) on delete cascade,
  -- Quien atendió el pedido. `restrict` a propósito: un perfil con comisiones
  -- no se borra sin resolverlas antes.
  perfil_id uuid not null references public.perfiles (id) on delete restrict,

  margen_usd numeric(10, 2) not null,
  porcentaje numeric(5, 2) not null,
  monto_usd numeric(10, 2) not null,

  -- Cuántas líneas del pedido no tenían costo cargado. El margen se calculó
  -- sin ellas, así que la comisión queda corta y hay que poder verlo en vez de
  -- descubrirlo cuadrando.
  items_sin_costo integer not null default 0,

  creado_en timestamptz not null default now(),
  pagada_en timestamptz,
  pagada_por uuid references public.perfiles (id) on delete set null,
  nota text,

  constraint monto_no_negativo check (monto_usd >= 0),
  constraint items_sin_costo_no_negativo check (items_sin_costo >= 0),
  constraint pagada_con_fecha check (
    (pagada_en is null) = (pagada_por is null)
  )
);

create index comisiones_perfil_idx
  on public.comisiones (perfil_id, pagada_en, creado_en desc);

comment on table public.comisiones is
  'Lo que gana quien atiende cada pedido. Los montos se congelan al generarse y no se recalculan nunca: el costo promedio de un producto cambia con cada compra, y con él cambiaría una comisión ya prometida.';

-- ---------------------------------------------------------------------------
-- Solo el admin, y una vez pagada no se toca
-- ---------------------------------------------------------------------------

alter table public.comisiones enable row level security;

create policy "El admin ve y registra comisiones"
  on public.comisiones for all
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));
