-- ============================================================================
-- apso · Cuánto costó lo que se vende
--
-- Hasta ahora la base sabía a cuánto se vende y no a cuánto se compró, así que
-- no había forma de responder la pregunta más básica del negocio: cuánto se
-- ganó con esa laptop. Y eso no se puede reconstruir después — lo que se pagó
-- por lo que ya se vendió no se recuerda seis meses más tarde.
--
-- El costo va en el movimiento de entrada y no en el producto. La misma RAM
-- llega a 52 $ en un viaje y a 58 $ en el siguiente; guardarlo en el producto
-- pisaría el anterior y borraría justo la historia que hace falta para saber
-- cuánto costó de verdad lo que hay en el estante.
-- ============================================================================

alter table public.movimientos_inventario
  add column costo_unitario_usd numeric(10, 2);

comment on column public.movimientos_inventario.costo_unitario_usd is
  'Lo que costó cada unidad de esta entrada, sin flete ni aduana. Nulo en el resto de movimientos y en las entradas cargadas antes de que existiera el campo.';

alter table public.movimientos_inventario
  add constraint costo_solo_en_entradas check (
    costo_unitario_usd is null
    or (motivo = 'entrada' and cantidad > 0 and costo_unitario_usd >= 0)
  );

-- ---------------------------------------------------------------------------
-- El costo promedio de cada producto
--
-- Ponderado por unidades: veinte a 52 $ y dos a 58 $ no es 55 $, es 52,55 $.
--
-- Promedia todas las entradas con costo, no solo las que siguen en el estante.
-- Es el «costo promedio ponderado» de toda la vida, y para una tienda de este
-- tamaño es más honesto que fingir que se sabe de qué lote salió cada unidad
-- vendida — eso exigiría rastrear cada salida contra su entrada, y nadie va a
-- llevar esa cuenta en el mostrador.
--
-- `unidades_con_costo` acompaña al promedio a propósito: si de veinte unidades
-- compradas solo dos tienen costo cargado, el promedio existe pero no
-- representa nada, y quien lo lea tiene que poder darse cuenta.
-- ---------------------------------------------------------------------------

create view public.costos_producto
with (security_invoker = true)
as
select
  producto_id,
  round(
    sum(cantidad * costo_unitario_usd) / nullif(sum(cantidad), 0),
    2
  ) as costo_promedio_usd,
  sum(cantidad)::integer as unidades_con_costo
from public.movimientos_inventario
where motivo = 'entrada' and costo_unitario_usd is not null
group by producto_id;

comment on view public.costos_producto is
  'Costo promedio ponderado por producto, sobre las entradas que tienen costo cargado. Hereda las políticas de movimientos_inventario: solo el admin lo ve.';

-- ---------------------------------------------------------------------------
-- `mover_inventario` acepta el costo
--
-- Se borra la versión de cinco parámetros ANTES de crear la de seis. En
-- Postgres una firma distinta no reemplaza: convive. Con las dos cargadas,
-- PostgREST no puede decidir cuál llamar y la llamada falla — y como quien
-- descuenta el inventario de una venta no miraba ese error, el stock
-- simplemente dejaba de bajar sin que nada lo dijera.
-- ---------------------------------------------------------------------------

drop function if exists public.mover_inventario(
  uuid, integer, public.motivo_movimiento, text, uuid
);

create or replace function public.mover_inventario(
  p_producto uuid,
  p_cantidad integer,
  p_motivo public.motivo_movimiento,
  p_nota text default null,
  p_pedido uuid default null,
  p_costo numeric default null
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
    producto_id, cantidad, stock_resultante, motivo, nota, pedido_id, perfil_id,
    costo_unitario_usd
  )
  values (
    p_producto, p_cantidad, v_stock, p_motivo, p_nota, p_pedido,
    (select auth.uid()),
    -- El costo solo tiene sentido en una entrada; en el resto se descarta en
    -- vez de dejar que la restricción reviente una venta.
    case when p_motivo = 'entrada' and p_cantidad > 0 then p_costo end
  );

  return v_stock;
end;
$$;
