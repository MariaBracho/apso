-- ============================================================================
-- apso · Arranque del proyecto en la nube
--
-- `supabase db push` sube el esquema pero NO los datos: `seed.sql` solo corre
-- en local con `db reset`. Sin esto, el proyecto en la nube queda con las
-- tablas vacías y la tienda no funciona — el checkout falla porque no hay tasa
-- y el panel no deja crear productos porque no hay categorías.
--
-- Se ejecuta UNA VEZ, pegándolo en el SQL Editor del panel de Supabase.
-- No incluye productos: esos se cargan desde /admin/productos con los reales.
--
-- Es idempotente: se puede volver a ejecutar sin duplicar nada.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tasa del día
--
-- Pon aquí la tasa real de hoy. Después se cambia desde /admin/tasa, que no
-- pisa esta fila sino que agrega una vigencia nueva.
--
-- El valor de abajo es solo un punto de partida con el orden de magnitud
-- correcto: consúltalo en bcv.org.ve o deja que lo corrija la función
-- `actualizar-tasa` en su primera corrida.
-- ---------------------------------------------------------------------------

insert into public.tasas_cambio (valor, fuente)
select 807.3862, 'bcv'
where not exists (select 1 from public.tasas_cambio);

-- ---------------------------------------------------------------------------
-- Categorías
-- ---------------------------------------------------------------------------

insert into public.categorias (slug, nombre, padre_id, orden)
values
  ('componentes', 'Componentes', null, 1),
  ('laptops', 'Laptops', null, 2),
  ('pc-a-medida', 'PC a medida', null, 3)
on conflict (slug) do nothing;

insert into public.categorias (slug, nombre, padre_id, orden)
select v.slug, v.nombre, c.id, v.orden
from (values
  ('ram', 'Memoria RAM', 1),
  ('graficas', 'Tarjetas gráficas', 2),
  ('almacenamiento', 'Almacenamiento', 3)
) as v (slug, nombre, orden)
cross join (select id from public.categorias where slug = 'componentes') as c
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Marcas
--
-- Estas son las del catálogo de ejemplo. Agrega o quita según lo que traigas
-- de verdad; se pueden gestionar después por SQL desde el panel de Supabase.
-- ---------------------------------------------------------------------------

insert into public.marcas (slug, nombre)
values
  ('corsair', 'Corsair'),
  ('kingston', 'Kingston'),
  ('samsung', 'Samsung'),
  ('crucial', 'Crucial'),
  ('asus', 'ASUS'),
  ('msi', 'MSI'),
  ('lenovo', 'Lenovo'),
  ('hp', 'HP')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Administrador
--
-- El usuario NO se crea aquí: se crea desde el panel de Supabase, en
-- Authentication → Users → Add user, con "Auto Confirm User" activado.
-- Al crearlo, un trigger le arma el perfil solo.
--
-- Después se le da el rol ejecutando esto con el correo que usaste:
--
--   update public.perfiles
--   set rol = 'admin', whatsapp = '+584246056110', whatsapp_verificado = true
--   where correo = 'TU-CORREO-AQUI';
--
-- Sin este paso el panel no deja entrar: las políticas de RLS solo abren la
-- gestión a quien tiene rol 'admin'.
-- ---------------------------------------------------------------------------
