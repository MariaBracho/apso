-- ============================================================================
-- apso · Gastos
--
-- Sin esto el margen no es ganancia. Una laptop que se compra en 600 y se
-- vende en 690 deja 90 de margen, pero si el flete y la aduana costaron 70, lo
-- que quedó fueron 20. El panel mostraba los 90 y llamaba a eso ganancia.
--
-- Cada gasto guarda su tasa, igual que los pedidos y los pagos: lo que se
-- gastó en bolívares un martes no se recalcula con la tasa de hoy.
-- ============================================================================

create type public.categoria_gasto as enum (
  -- Los de traer la mercancía. Se pueden colgar de un pedido concreto cuando
  -- se sabe de cuál fueron, y así el margen de esa venta se puede leer neto.
  'flete_internacional',
  'aduana',
  'transporte_local',
  -- Los de cobrar y entregar.
  'comision_pago',
  'empaque',
  -- Los de tener la tienda abierta.
  'publicidad',
  'sueldos',
  'alquiler',
  'servicios',
  'otro'
);

create table public.gastos (
  id uuid primary key default gen_random_uuid(),

  -- La fecha del gasto, no la de cuando se anotó: se cargan en lote al final
  -- de la semana y con `now()` todos caerían el mismo día.
  fecha date not null default current_date,
  categoria public.categoria_gasto not null,
  descripcion text not null,

  monto_usd numeric(10, 2) not null,
  -- La del día del gasto. Un gasto en bolívares se guarda por su equivalente
  -- en dólares a esa tasa, que es la única forma de sumarlo con el resto.
  tasa_cambio numeric(12, 4) not null,
  -- De dónde salió la plata. Nulo cuando no se sabe o no aplica.
  metodo public.metodo_pago,

  -- Cuando el gasto es de un pedido concreto: flete, aduana, la encomienda.
  pedido_id uuid references public.pedidos (id) on delete set null,

  registrado_por uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),

  constraint monto_gasto_positivo check (monto_usd > 0),
  constraint tasa_gasto_positiva check (tasa_cambio > 0),
  constraint descripcion_no_vacia check (length(trim(descripcion)) > 0)
);

create index gastos_fecha_idx on public.gastos (fecha desc);
create index gastos_pedido_idx on public.gastos (pedido_id) where pedido_id is not null;

comment on table public.gastos is
  'Lo que sale de la caja y no es una comisión. Con esto el margen de una venta se vuelve ganancia; sin esto, el margen se lee como si fuera lo que quedó.';

alter table public.gastos enable row level security;

create policy "El admin lleva los gastos"
  on public.gastos for all
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));
