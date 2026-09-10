-- ============================================================================
-- apso · El costo declarado se puede corregir
--
-- `declarar_costo_inicial` se negaba a correr dos veces, para que las mismas
-- unidades no entraran otra vez al promedio y lo arrastraran hacia el último
-- número escrito. La intención era buena y el efecto malo: un costo mal
-- tecleado quedaba grabado para siempre y no había forma de arreglarlo.
--
-- Reemplaza en vez de negarse. La declaración es una sola fila por producto
-- —lo que había en el estante y lo que costó—, así que corregirla es
-- sustituirla, no sumar otra. El promedio no se arrastra porque nunca hay dos.
--
-- Las entradas de mercancía siguen siendo inmutables: esas son compras que
-- ocurrieron, con plata que salió de la caja, y reescribirlas descuadraría el
-- saldo.
-- ============================================================================

create or replace function public.declarar_costo_inicial(
  p_producto uuid,
  p_costo numeric
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_stock integer;
begin
  if p_costo is null or p_costo < 0 then
    raise exception 'El costo tiene que ser cero o más';
  end if;

  select stock into v_stock from public.productos where id = p_producto;

  if v_stock is null then
    raise exception 'Ese producto no existe';
  end if;

  if v_stock = 0 then
    raise exception 'No hay existencias a las que ponerles costo. Cárgalo al recibir la mercancía.';
  end if;

  -- Fuera la anterior: es una corrección, no un lote nuevo.
  delete from public.movimientos_inventario
  where producto_id = p_producto and motivo = 'inventario_inicial';

  insert into public.movimientos_inventario (
    producto_id, cantidad, stock_resultante, motivo, costo_unitario_usd,
    nota, perfil_id
  )
  values (
    p_producto, v_stock, v_stock, 'inventario_inicial', p_costo,
    'Costo declarado sobre las existencias que ya había', (select auth.uid())
  );
end;
$$;
