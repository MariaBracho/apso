-- ============================================================================
-- apso · Quitar el margen de la tasa
--
-- La migración anterior le sumaba un recargo a la tasa del BCV. Estaba mal
-- pensado: la tasa del BCV es un dato oficial que el cliente contrasta por su
-- cuenta, y publicar otro número bajo ese nombre lo vuelve incomprobable —
-- multiplicar el precio en dólares por la tasa no daba los bolívares que la
-- tienda mostraba.
--
-- El margen de la tienda va en el precio, que sí es suyo. Dónde exactamente
-- está por definir, así que aquí solo se deshace: se prefiere no dejar una
-- tabla a medio significado esperando a que alguien adivine para qué era.
--
-- Se deshace hacia adelante en vez de reescribir la migración anterior: puede
-- haberse aplicado ya en la nube, y una migración aplicada no se toca.
-- ============================================================================

drop function if exists public.tasa_de_venta();

drop table if exists public.ajustes;
