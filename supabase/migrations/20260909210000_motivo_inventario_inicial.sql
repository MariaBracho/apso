-- ============================================================================
-- apso · Existe el motivo «inventario inicial»
--
-- En su propia migración porque Postgres no deja usar un valor de enum en la
-- misma transacción en que se agrega.
-- ============================================================================

alter type public.motivo_movimiento
  add value if not exists 'inventario_inicial' after 'entrada';
