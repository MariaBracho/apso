-- ============================================================================
-- apso · `mover_inventario` guarda de dónde salió la plata de una compra
--
-- Se borra la firma anterior ANTES de crear la nueva. En Postgres una firma
-- distinta no reemplaza: convive. Con dos versiones cargadas PostgREST no
-- puede decidir cuál llamar, la llamada falla, y la última vez eso dejó el
-- inventario sin descontarse en silencio.
-- ============================================================================

drop function if exists public.mover_inventario(
  uuid, integer, public.motivo_movimiento, text, uuid, numeric
);

create or replace function public.mover_inventario(
  p_producto uuid,
  p_cantidad integer,
  p_motivo public.motivo_movimiento,
  p_nota text default null,
  p_pedido uuid default null,
  p_costo numeric default null,
  p_metodo public.metodo_pago default null
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_stock integer;
  v_costo numeric;
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

  -- El costo solo tiene sentido en una entrada; en el resto se descarta en vez
  -- de dejar que la restricción reviente una venta.
  v_costo := case when p_motivo = 'entrada' and p_cantidad > 0 then p_costo end;

  insert into public.movimientos_inventario (
    producto_id, cantidad, stock_resultante, motivo, nota, pedido_id, perfil_id,
    costo_unitario_usd, metodo
  )
  values (
    p_producto, p_cantidad, v_stock, p_motivo, p_nota, p_pedido,
    (select auth.uid()),
    v_costo,
    -- Sin costo no hay compra que atribuir: el método iría suelto y la
    -- restricción de la tabla lo rechazaría.
    case when v_costo is not null then p_metodo end
  );

  return v_stock;
end;
$$;
