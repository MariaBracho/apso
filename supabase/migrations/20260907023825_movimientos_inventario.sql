-- ============================================================================
-- apso · Movimientos de inventario
--
-- Hasta ahora el stock era un número que se pisaba y ya: si mañana aparecen
-- dos laptops de menos, no hay forma de saber si se vendieron, si llegaron mal
-- contadas o si alguien se equivocó tecleando.
--
-- Cada cambio deja una fila. El stock del producto sigue siendo el número que
-- manda para vender —leerlo no debe costar una suma sobre todo el historial—
-- pero ya no cambia sin dejar rastro.
-- ============================================================================

create type public.motivo_movimiento as enum (
  'entrada',    -- llegó mercancía
  'venta',      -- se confirmó el pago de un pedido
  'devolucion', -- se retrocedió un pedido ya descontado
  'ajuste'      -- conteo físico o corrección a mano
);

create table public.movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos (id) on delete cascade,

  -- El delta, no el total: positivo suma, negativo resta. Guardar la diferencia
  -- y no el absoluto es lo que permite leer «entraron 5» en vez de «quedó en 6»,
  -- que sin el anterior no dice nada.
  cantidad integer not null,

  -- El stock que quedó después. Es redundante a propósito: deja leer el
  -- historial de cualquier fila sin recalcular desde el principio, y delata
  -- si alguna vez alguien tocó el stock por fuera.
  stock_resultante integer not null,

  motivo public.motivo_movimiento not null,
  nota text,

  -- De qué pedido salió, cuando aplica. `on delete set null` porque el
  -- movimiento ocurrió aunque el pedido después se borre.
  pedido_id uuid references public.pedidos (id) on delete set null,
  perfil_id uuid references public.perfiles (id) on delete set null,

  creado_en timestamptz not null default now(),

  constraint movimiento_no_vacio check (cantidad <> 0),
  constraint stock_resultante_no_negativo check (stock_resultante >= 0)
);

create index movimientos_producto_idx
  on public.movimientos_inventario (producto_id, creado_en desc);

-- ---------------------------------------------------------------------------
-- Quién puede hacer qué
--
-- El inventario es cosa de la tienda: no se expone a los clientes. Cuánto hay
-- se sabe por `productos.stock`, que sí es público.
-- ---------------------------------------------------------------------------

alter table public.movimientos_inventario enable row level security;

create policy "El admin ve y registra movimientos"
  on public.movimientos_inventario for all
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- ---------------------------------------------------------------------------
-- El único camino para cambiar el stock
--
-- Actualiza y registra en la misma transacción. Hacerlo en dos viajes desde la
-- aplicación deja la puerta abierta a que el stock cambie y el historial no,
-- que es justo el caso en que el historial haría falta.
-- ---------------------------------------------------------------------------

create or replace function public.mover_inventario(
  p_producto uuid,
  p_cantidad integer,
  p_motivo public.motivo_movimiento,
  p_nota text default null,
  p_pedido uuid default null
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_stock integer;
begin
  if p_cantidad = 0 then
    raise exception 'Un movimiento de cero unidades no registra nada';
  end if;

  -- Nunca baja de cero. El inventario real lo cuenta una persona, y un stock
  -- negativo sería un dato inventado que después hay que explicar.
  update public.productos
  set stock = greatest(0, stock + p_cantidad)
  where id = p_producto
  returning stock into v_stock;

  if v_stock is null then
    raise exception 'Ese producto no existe';
  end if;

  insert into public.movimientos_inventario (
    producto_id, cantidad, stock_resultante, motivo, nota, pedido_id, perfil_id
  )
  values (
    p_producto, p_cantidad, v_stock, p_motivo, p_nota, p_pedido,
    (select auth.uid())
  );

  return v_stock;
end;
$$;

comment on function public.mover_inventario is
  'Cambia el stock de un producto y deja el movimiento registrado, en una sola transacción. Es el único camino que debe usarse para tocar productos.stock.';
