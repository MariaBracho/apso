-- ============================================================================
-- apso · De dónde salió el pedido
--
-- No todo lo que vende la tienda pasa por la web: hay ventas de mostrador y
-- pedidos que se cierran directo por WhatsApp. Hasta ahora esos no se
-- registraban en ningún lado, así que el inventario del panel se iba separando
-- del real y las ventas de la web parecían ser todas las ventas.
--
-- El origen se guarda para poder distinguirlas después. Sin él, registrar las
-- de fuera arreglaría el inventario pero rompería la única lectura que hoy es
-- verdad: cuánto está produciendo el sitio.
-- ============================================================================

create type public.origen_pedido as enum ('web', 'mostrador', 'whatsapp');

alter table public.pedidos
  add column origen public.origen_pedido not null default 'web';

comment on column public.pedidos.origen is
  'Por dónde entró el pedido. «web» es el que hizo el cliente por su cuenta; los otros dos los registra el panel a mano por una venta que ya ocurrió.';

-- Los que ya existen entraron todos por la web, que era la única puerta.
comment on column public.pedidos.atendido_por is
  'Quién lo atiende desde el panel. En un pedido registrado a mano es también quien lo cargó.';
