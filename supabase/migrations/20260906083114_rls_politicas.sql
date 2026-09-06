-- ============================================================================
-- apso · Row Level Security
--
-- Criterio general:
--   · El catálogo es público. No hay muro de registro: se puede ver todo sin
--     cuenta, y la cuenta se pide recién al enviar un pedido.
--   · Cada cliente ve solo lo suyo. El admin ve todo.
--   · Los pedidos los crea y modifica el servidor (server actions con la
--     clave de servicio), nunca el navegador: así el precio, la tasa y el
--     total no dependen de lo que mande el cliente.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper de rol
--
-- SECURITY DEFINER para poder leer perfiles sin disparar las políticas de la
-- propia tabla perfiles (recursión infinita).
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
      and rol = 'admin'
  );
$$;

revoke execute on function public.es_admin() from public;
grant execute on function public.es_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Nadie se asciende a sí mismo
--
-- RLS filtra filas, no columnas: sin esto, un cliente podría actualizar su
-- propio perfil y ponerse rol = 'admin'.
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
  -- es que una persona con sesión se ascienda a sí misma.
  if new.rol is distinct from old.rol
     and (select auth.uid()) is not null
     and not public.es_admin()
  then
    raise exception 'El rol solo lo cambia un administrador';
  end if;
  return new;
end;
$$;

create trigger perfiles_proteger_rol
  before update on public.perfiles
  for each row execute function public.proteger_rol();

-- ---------------------------------------------------------------------------
-- Activar RLS en todo
-- ---------------------------------------------------------------------------

alter table public.perfiles enable row level security;
alter table public.categorias enable row level security;
alter table public.marcas enable row level security;
alter table public.productos enable row level security;
alter table public.producto_imagenes enable row level security;
alter table public.tasas_cambio enable row level security;
alter table public.carritos enable row level security;
alter table public.carrito_items enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_items enable row level security;
alter table public.seriales enable row level security;
alter table public.pagos enable row level security;
alter table public.pedido_eventos enable row level security;
alter table public.favoritos enable row level security;
alter table public.busquedas enable row level security;

-- ---------------------------------------------------------------------------
-- Catálogo: lectura pública, escritura solo admin
-- ---------------------------------------------------------------------------

create policy "Categorías activas visibles para todos"
  on public.categorias for select
  to anon, authenticated
  using (activa);

create policy "El admin gestiona las categorías"
  on public.categorias for all
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

create policy "Marcas activas visibles para todos"
  on public.marcas for select
  to anon, authenticated
  using (activa);

create policy "El admin gestiona las marcas"
  on public.marcas for all
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

create policy "Productos activos visibles para todos"
  on public.productos for select
  to anon, authenticated
  using (activo);

create policy "El admin gestiona los productos"
  on public.productos for all
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

create policy "Imágenes de productos activos visibles para todos"
  on public.producto_imagenes for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.productos p
      where p.id = producto_id and p.activo
    )
  );

create policy "El admin gestiona las imágenes"
  on public.producto_imagenes for all
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- La tasa del día se muestra en la barra superior de todas las pantallas:
-- es el dato que el cliente venezolano revisa antes que el precio.
create policy "La tasa es pública"
  on public.tasas_cambio for select
  to anon, authenticated
  using (true);

create policy "El admin fija la tasa"
  on public.tasas_cambio for all
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- ---------------------------------------------------------------------------
-- Perfiles
-- ---------------------------------------------------------------------------

create policy "Cada quien ve su perfil"
  on public.perfiles for select
  to authenticated
  using (id = (select auth.uid()) or (select public.es_admin()));

create policy "Cada quien edita su perfil"
  on public.perfiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "El admin edita cualquier perfil"
  on public.perfiles for update
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- ---------------------------------------------------------------------------
-- Carrito
--
-- Solo el carrito de una sesión con cuenta se toca desde el navegador. El de
-- invitado vive detrás de un token en cookie y lo maneja el servidor.
-- ---------------------------------------------------------------------------

create policy "Cada quien maneja su carrito"
  on public.carritos for all
  to authenticated
  using (perfil_id = (select auth.uid()))
  with check (perfil_id = (select auth.uid()));

create policy "Cada quien maneja los items de su carrito"
  on public.carrito_items for all
  to authenticated
  using (
    exists (
      select 1 from public.carritos c
      where c.id = carrito_id and c.perfil_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.carritos c
      where c.id = carrito_id and c.perfil_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Pedidos
--
-- El cliente lee los suyos y nada más. Crear y cambiar de estado pasa por el
-- servidor: los estados los mueve una persona desde el panel, y el total no
-- se recalcula con lo que mande el navegador.
-- ---------------------------------------------------------------------------

create policy "Cada quien ve sus pedidos"
  on public.pedidos for select
  to authenticated
  using (perfil_id = (select auth.uid()) or (select public.es_admin()));

create policy "El admin gestiona los pedidos"
  on public.pedidos for all
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

create policy "Cada quien ve los items de sus pedidos"
  on public.pedido_items for select
  to authenticated
  using (
    exists (
      select 1 from public.pedidos p
      where p.id = pedido_id
        and (p.perfil_id = (select auth.uid()) or (select public.es_admin()))
    )
  );

create policy "El admin gestiona los items"
  on public.pedido_items for all
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- El cliente ve sus seriales: son los que le sirven para reclamar garantía
-- años después sin buscar la factura.
create policy "Cada quien ve sus seriales"
  on public.seriales for select
  to authenticated
  using (
    exists (
      select 1
      from public.pedido_items i
      join public.pedidos p on p.id = i.pedido_id
      where i.id = pedido_item_id
        and (p.perfil_id = (select auth.uid()) or (select public.es_admin()))
    )
  );

create policy "El admin anota los seriales"
  on public.seriales for all
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

create policy "Cada quien ve sus pagos"
  on public.pagos for select
  to authenticated
  using (
    exists (
      select 1 from public.pedidos p
      where p.id = pedido_id
        and (p.perfil_id = (select auth.uid()) or (select public.es_admin()))
    )
  );

create policy "El admin registra los pagos"
  on public.pagos for all
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

create policy "Cada quien ve la historia de sus pedidos"
  on public.pedido_eventos for select
  to authenticated
  using (
    exists (
      select 1 from public.pedidos p
      where p.id = pedido_id
        and (p.perfil_id = (select auth.uid()) or (select public.es_admin()))
    )
  );

create policy "El admin escribe la historia del pedido"
  on public.pedido_eventos for all
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- ---------------------------------------------------------------------------
-- Favoritos
-- ---------------------------------------------------------------------------

create policy "Cada quien maneja sus favoritos"
  on public.favoritos for all
  to authenticated
  using (perfil_id = (select auth.uid()))
  with check (perfil_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Búsquedas
--
-- Cualquiera puede dejar registro de lo que buscó, con o sin cuenta. Leerlas
-- es privilegio del panel: son la lista de qué importar el mes que viene.
-- ---------------------------------------------------------------------------

create policy "Cualquiera registra lo que buscó"
  on public.busquedas for insert
  to anon, authenticated
  with check (
    perfil_id is null or perfil_id = (select auth.uid())
  );

create policy "Solo el admin lee las búsquedas"
  on public.busquedas for select
  to authenticated
  using ((select public.es_admin()));
