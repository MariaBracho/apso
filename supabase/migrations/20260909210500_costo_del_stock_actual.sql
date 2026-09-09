-- ============================================================================
-- apso · Poner costo a lo que ya está en el estante
--
-- El costo se carga al recibir mercancía, con el «+» del inventario. Pero el
-- stock que ya existía cuando apareció el campo se quedó sin costo para
-- siempre: no hay forma de decir «estas cinco que tengo me costaron 62 cada
-- una» sin fingir que acaban de llegar y duplicar las existencias.
--
-- Sin eso no hay margen ni comisión sobre nada de lo que hay hoy, que es todo
-- el catálogo.
--
-- Es un movimiento que declara, no que mueve: registra las unidades y su costo
-- pero deja el stock donde está. Va con su propio motivo para que el historial
-- no lo confunda con una entrada de mercancía — no llegó nada ese día.
-- ============================================================================

alter table public.movimientos_inventario
  drop constraint costo_solo_en_entradas;

alter table public.movimientos_inventario
  add constraint costo_solo_en_entradas check (
    costo_unitario_usd is null
    or (
      motivo in ('entrada', 'inventario_inicial')
      and cantidad > 0
      and costo_unitario_usd >= 0
    )
  );

-- La declaración pesa lo mismo que una compra en el promedio: son unidades
-- reales con un costo real, solo que ya estaban ahí.
create or replace view public.costos_producto
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
where motivo in ('entrada', 'inventario_inicial')
  and costo_unitario_usd is not null
group by producto_id;

/**
 * Declara lo que costó el stock que ya está en el estante.
 */
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

  -- Una sola vez por producto. Repetirla sumaría las mismas unidades otra vez
  -- al promedio y lo arrastraría hacia el último valor escrito.
  if exists (
    select 1 from public.movimientos_inventario
    where producto_id = p_producto and motivo = 'inventario_inicial'
  ) then
    raise exception 'Este producto ya tiene declarado el costo de su inventario inicial';
  end if;

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
