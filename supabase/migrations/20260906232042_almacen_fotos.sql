-- ============================================================================
-- apso · Almacén de fotos de producto
--
-- El catálogo es público, así que las fotos también: cualquiera puede verlas
-- sin sesión. Escribir, en cambio, es solo del admin.
--
-- Los límites de tamaño y tipo se ponen en el depósito y no solo en el
-- formulario: la validación del navegador es comodidad, esta es la que manda.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'productos',
  'productos',
  true,
  -- 5 MB por foto. De sobra para una imagen de producto bien comprimida, y
  -- suficientemente bajo para que una foto de teléfono sin optimizar no se
  -- cuele y haga lenta la tienda.
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Quién puede hacer qué
-- ---------------------------------------------------------------------------

drop policy if exists "Las fotos de producto son públicas" on storage.objects;
create policy "Las fotos de producto son públicas"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'productos');

drop policy if exists "El admin sube fotos" on storage.objects;
create policy "El admin sube fotos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'productos' and (select public.es_admin()));

drop policy if exists "El admin reemplaza fotos" on storage.objects;
create policy "El admin reemplaza fotos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'productos' and (select public.es_admin()));

drop policy if exists "El admin borra fotos" on storage.objects;
create policy "El admin borra fotos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'productos' and (select public.es_admin()));

-- ---------------------------------------------------------------------------
-- Orden de las fotos
--
-- La primera es la que sale en la tarjeta del catálogo, así que el orden no es
-- cosmético: decide con qué imagen se vende el producto.
-- ---------------------------------------------------------------------------

create unique index if not exists producto_imagenes_orden_unico
  on public.producto_imagenes (producto_id, orden);
