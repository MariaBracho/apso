-- ============================================================================
-- apso · El WhatsApp del pedido deja de ser obligatorio
--
-- Era `not null` porque ningún pedido de la web puede llegar sin una forma de
-- responderle. Eso sigue siendo cierto para la web y ahí se sigue exigiendo.
--
-- Pero en el mostrador hay ventas donde no lo hay: alguien compra un cable en
-- efectivo y se va. Con la columna obligatoria, esa venta o no se registraba
-- —y el inventario se iba separando del real, que es lo que este panel vino a
-- arreglar— o se anotaba con un número inventado, que es peor: un número falso
-- en la base se ve igual que uno verdadero.
--
-- La restricción de formato se mantiene para lo que sí venga.
-- ============================================================================

alter table public.pedidos alter column cliente_whatsapp drop not null;

comment on column public.pedidos.cliente_whatsapp is
  'Por donde se atiende el pedido. Obligatorio en la web; en una venta de mostrador puede faltar, y entonces la garantía depende de que el cliente vuelva con su comprobante.';
