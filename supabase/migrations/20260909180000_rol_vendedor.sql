-- ============================================================================
-- apso · Existe el rol de vendedor
--
-- Va en su propia migración porque Postgres no deja usar un valor de enum en
-- la misma transacción en que se agrega. La columna de roles y el reparto van
-- en la siguiente.
-- ============================================================================

alter type public.rol_usuario add value if not exists 'vendedor' after 'admin';
