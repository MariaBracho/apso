-- ============================================================================
-- apso · Una persona puede tener varios roles
--
-- `rol` era una sola columna, así que quien administraba no podía además
-- figurar como vendedor: eran valores excluyentes de un mismo campo. En la
-- práctica la misma persona hace las dos cosas, y el día que entre alguien que
-- solo venda tampoco habría dónde ponerlo.
--
-- Pasa a ser un conjunto. `cliente` lo tiene todo el mundo —cualquiera puede
-- comprar— y encima se suman los que dan permisos.
-- ============================================================================

alter table public.perfiles
  add column roles public.rol_usuario[] not null default '{cliente}';

-- Quien era admin hasta ahora también vendía, porque no había nadie más.
update public.perfiles
set roles = case
  when rol = 'admin' then array['cliente', 'admin', 'vendedor']::public.rol_usuario[]
  else array['cliente']::public.rol_usuario[]
end;

alter table public.perfiles
  add constraint roles_no_vacio check (array_length(roles, 1) >= 1);

comment on column public.perfiles.roles is
  'Lo que puede hacer la persona. «cliente» lo tienen todos; «admin» abre el panel y «vendedor» permite que se le atribuyan pedidos y comisiones.';

create index perfiles_roles_idx on public.perfiles using gin (roles);

-- ---------------------------------------------------------------------------
-- Las políticas siguen preguntando lo mismo
--
-- Las 44 políticas de la base pasan por `es_admin()`, así que cambiar dónde se
-- guarda el rol se resuelve aquí dentro y no hay que tocarlas una por una. Ese
-- fue el motivo de que existiera la función desde el principio.
-- ---------------------------------------------------------------------------

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfiles
    where id = (select auth.uid())
      and 'admin' = any (roles)
  );
$$;

create or replace function public.es_vendedor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfiles
    where id = (select auth.uid())
      and 'vendedor' = any (roles)
  );
$$;

revoke execute on function public.es_vendedor() from public;
grant execute on function public.es_vendedor() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- El guardia contra el autoascenso mira el conjunto
--
-- `proteger_rol` impide que alguien con sesión se dé permisos a sí mismo. Lee
-- la columna, así que hay que moverlo con ella: dejarlo mirando `rol` lo
-- rompía —el trigger revienta con «record new has no field rol» en cualquier
-- edición de perfil— y arreglarlo a medias sería peor, porque un guardia que
-- no dispara no se nota hasta que alguien se hace admin.
-- ---------------------------------------------------------------------------

create or replace function public.proteger_rol()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Sin sesión no hay a quién restringir: es el servidor actuando (seed,
  -- migraciones, clave de servicio), que ya es de confianza. Lo que se impide
  -- es que una persona con sesión se dé permisos a sí misma.
  if new.roles is distinct from old.roles
     and (select auth.uid()) is not null
     and not public.es_admin()
  then
    raise exception 'Los roles solo los cambia un administrador';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fuera la columna vieja
--
-- Dejarla al lado sería tener dos versiones de la verdad: alguien actualizaría
-- una y no la otra, y el desacuerdo aparecería como un permiso que va y viene.
-- ---------------------------------------------------------------------------

alter table public.perfiles drop column rol;
