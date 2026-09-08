-- ============================================================================
-- apso · Quién responde por la garantía
--
-- Hasta ahora la ficha decía siempre «del fabricante». No siempre es así: hay
-- equipos que respalda la propia tienda, y decir que responde el fabricante
-- cuando responde apso manda al cliente a tocar la puerta equivocada.
--
-- Va aparte de la duración porque son dos cosas independientes: se puede tener
-- una garantía de 12 meses del fabricante o de 12 meses de apso, y también una
-- de por vida de cualquiera de los dos.
-- ============================================================================

create type public.respaldo_garantia as enum ('fabricante', 'apso');

alter table public.productos
  add column garantia_respalda public.respaldo_garantia not null default 'fabricante';

comment on column public.productos.garantia_respalda is
  'Quién responde si el equipo falla. La duración va en garantia_meses o garantia_vitalicia; esto dice a quién se reclama.';

-- ---------------------------------------------------------------------------
-- La procedencia deja de estar clavada en EE. UU.
--
-- La columna ya existía con ese valor por defecto, pero el panel no la mostraba
-- y no había forma de cambiarla sin entrar a la base. Ahora se edita desde el
-- formulario, así que el valor por defecto pasa a ser solo el punto de partida
-- del producto nuevo y no una promesa de toda la tienda.
-- ---------------------------------------------------------------------------

comment on column public.productos.procedencia is
  'De dónde viene el equipo, tal como se muestra en la ficha: «EE. UU.», «Venezuela», lo que corresponda. Se edita desde el panel.';
