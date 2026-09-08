-- ============================================================================
-- apso · El destino del envío lleva estado y ciudad
--
-- Antes era una sola casilla de texto libre. «Maracaibo», «mcbo», «maracaibo
-- zulia» y «Maracaibo, Zulia» eran cuatro destinos distintos para la base, y
-- ninguno decía el estado, que es justo lo que pide una encomienda para
-- cotizar el flete.
--
-- Ahora los dos salen de una lista cerrada: estado y ciudad de esa lista. El
-- servidor comprueba que la ciudad sea de ese estado antes de guardar.
-- ============================================================================

alter table public.pedidos add column estado_destino text;

comment on column public.pedidos.estado_destino is
  'Estado de destino de un envío nacional, de la lista de src/lib/venezuela.ts. Nulo cuando la entrega es en Punto Fijo.';

comment on column public.pedidos.ciudad_destino is
  'Ciudad de destino, de la lista del estado. Nulo cuando la entrega es en Punto Fijo.';

-- ---------------------------------------------------------------------------
-- Un envío nacional necesita los dos
--
-- La restricción vieja solo exigía la ciudad. Se reemplaza en vez de agregar
-- otra al lado: dos reglas que hablan de lo mismo se contradicen en cuanto
-- alguien toca una.
--
-- Los pedidos que ya existen tienen ciudad pero no estado, así que la regla
-- mira solo los nuevos: `not valid` la deja pasar sobre lo viejo y la aplica
-- de aquí en adelante.
-- ---------------------------------------------------------------------------

alter table public.pedidos drop constraint if exists envio_lleva_ciudad;

alter table public.pedidos
  add constraint envio_con_destino check (
    entrega <> 'envio_nacional'
    or (ciudad_destino is not null and estado_destino is not null)
  )
  not valid;
