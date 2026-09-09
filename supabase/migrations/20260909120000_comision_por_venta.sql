-- ============================================================================
-- apso · Comisión por venta
--
-- Un porcentaje de lo que se gana con cada producto, que es lo que le toca a
-- quien vendió. Sobre el margen y no sobre el precio: pagar comisión sobre la
-- venta de algo que dejó poco margen sale de la ganancia de la tienda, y en un
-- producto vendido con pérdida se pagaría por perder.
--
-- Va en `ajustes` junto al recargo porque es la misma clase de dato: un número
-- que la tienda cambia cuando quiere y que mueve todas las cuentas de una vez.
-- Fijarlo en el código obligaría a un despliegue para cambiar un 10 por un 12.
-- ============================================================================

alter table public.ajustes
  add column comision_venta_pct numeric(5, 2) not null default 10;

alter table public.ajustes
  add constraint comision_razonable check (
    comision_venta_pct >= 0 and comision_venta_pct <= 100
  );

comment on column public.ajustes.comision_venta_pct is
  'Porcentaje del margen que se paga como comisión por vender. Sobre el margen, no sobre el precio. En 0 no se paga comisión.';
