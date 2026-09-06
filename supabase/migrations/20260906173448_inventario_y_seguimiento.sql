-- ============================================================================
-- apso · Control de inventario y seguimiento del cliente
--
-- Referencias: flujos 06 (seguir un pedido) y 10 (atender un pedido).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Descuento de inventario
--
-- El stock real baja cuando se confirma el pago, no cuando llega el pedido
-- (flujo 10, paso 4). Como el admin puede mover el estado adelante y atrás
-- desde el panel, hace falta recordar si ya se descontó: sin esta marca, dos
-- clics dejarían el inventario en cero por partida doble.
-- ---------------------------------------------------------------------------

alter table public.pedidos
  add column inventario_descontado boolean not null default false;

comment on column public.pedidos.inventario_descontado is
  'Si el stock de este pedido ya se restó del inventario. Hace idempotente el cambio de estado.';

-- ---------------------------------------------------------------------------
-- Reclamar pedidos hechos sin cuenta
--
-- Se puede comprar sin cuenta, y la persona puede registrarse después. Cuando
-- confirma su WhatsApp, los pedidos que hizo con ese mismo número pasan a ser
-- suyos y aparecen en su historial. El WhatsApp es el canal único de contacto,
-- así que es la llave natural.
--
-- SECURITY DEFINER porque las políticas de pedidos solo dejan ver los que ya
-- tienen perfil_id, y aquí justamente hay que tocar los que no lo tienen.
-- ---------------------------------------------------------------------------

create or replace function public.reclamar_pedidos_por_whatsapp()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  quien uuid := (select auth.uid());
  numero_whatsapp text;
  reclamados integer;
begin
  if quien is null then
    return 0;
  end if;

  select whatsapp into numero_whatsapp
  from public.perfiles
  where id = quien;

  if numero_whatsapp is null then
    return 0;
  end if;

  update public.pedidos
  set perfil_id = quien
  where perfil_id is null
    and cliente_whatsapp = numero_whatsapp;

  get diagnostics reclamados = row_count;
  return reclamados;
end;
$$;

revoke execute on function public.reclamar_pedidos_por_whatsapp() from public;
grant execute on function public.reclamar_pedidos_por_whatsapp() to authenticated;
