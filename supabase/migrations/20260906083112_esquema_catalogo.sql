-- ============================================================================
-- apso · Esquema de catálogo (fase 1)
--
-- Cubre: perfiles, categorías, marcas, productos, imágenes y tasa de cambio.
-- Referencias: flujos 01, 02, 03, 05, 09 del handoff de diseño.
--
-- Regla transversal del negocio: los precios se fijan en USD. Los bolívares
-- son siempre un cálculo derivado de una tasa con fecha. Por eso la tasa vive
-- en una tabla con historial, no en una columna suelta: cada pedido y cada
-- abono guardan la tasa de su momento y no se recalculan nunca.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type public.rol_usuario as enum ('cliente', 'admin');

create type public.condicion_producto as enum ('nuevo', 'reacondicionado');

create type public.fuente_tasa as enum ('bcv', 'manual', 'promedio');

-- ---------------------------------------------------------------------------
-- Perfiles
--
-- Extiende auth.users. Nombre, correo y foto llegan de Google y no se vuelven
-- a pedir (flujo 01, paso 3). El WhatsApp es el único dato que el usuario
-- escribe a mano y es el canal único de contacto para todo.
-- ---------------------------------------------------------------------------

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  correo text not null,
  foto_url text,
  -- Se guarda en formato E.164 (+58XXXXXXXXXX). Nulo hasta que completa el
  -- perfil: se puede navegar el catálogo entero sin cuenta.
  whatsapp text,
  whatsapp_verificado boolean not null default false,
  rol public.rol_usuario not null default 'cliente',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  constraint whatsapp_formato_e164 check (whatsapp is null or whatsapp ~ '^\+58[0-9]{10}$')
);

comment on column public.perfiles.whatsapp is
  'Canal único de contacto. Se pide al enviar el primer pedido, no al abrir la app.';

-- Un número de WhatsApp no puede estar en dos cuentas: el flujo 01 pide avisar
-- y ofrecer continuar con la cuenta existente en vez de duplicar.
create unique index perfiles_whatsapp_unico
  on public.perfiles (whatsapp)
  where whatsapp is not null;

-- ---------------------------------------------------------------------------
-- Categorías
--
-- Jerarquía de un nivel para el breadcrumb "Componentes › Memoria RAM".
-- ---------------------------------------------------------------------------

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nombre text not null,
  padre_id uuid references public.categorias (id) on delete restrict,
  orden integer not null default 0,
  activa boolean not null default true,
  creado_en timestamptz not null default now(),

  constraint categoria_no_es_su_propio_padre check (id <> padre_id)
);

create index categorias_padre_idx on public.categorias (padre_id);

-- ---------------------------------------------------------------------------
-- Marcas
-- ---------------------------------------------------------------------------

create table public.marcas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nombre text not null,
  activa boolean not null default true,
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Productos
-- ---------------------------------------------------------------------------

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nombre text not null,
  categoria_id uuid not null references public.categorias (id) on delete restrict,
  marca_id uuid references public.marcas (id) on delete restrict,

  resumen text,
  descripcion text,
  -- Especificaciones de la ficha, como lista ordenada.
  -- Ej: [{"clave": "Capacidad", "valor": "2 × 16 GB"}, …]
  --
  -- Va como arreglo y no como objeto a propósito: jsonb no conserva el orden
  -- de las claves (las reordena por longitud y alfabéticamente), y aquí el
  -- orden es información — se lee primero la capacidad y después el perfil.
  especificaciones jsonb not null default '[]'::jsonb,

  precio_usd numeric(10, 2) not null,
  -- Precio del mismo producto en un marketplace con comisión. Alimenta el
  -- bloque de ahorro ("Con comisión: $138 · Comprando aquí: $120"). Nulo = no
  -- se muestra la comparación, en vez de inventar un ahorro.
  precio_referencia_usd numeric(10, 2),

  stock integer not null default 0,
  -- Plazo del proveedor en días cuando el producto se trae por encargo.
  -- Nunca se promete una fecha cerrada, solo un plazo (flujo 03, paso 1).
  dias_encargo integer,

  condicion public.condicion_producto not null default 'nuevo',
  procedencia text not null default 'EE. UU.',
  garantia_meses integer,
  garantia_vitalicia boolean not null default false,

  destacado boolean not null default false,
  activo boolean not null default true,

  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  constraint precio_usd_positivo check (precio_usd > 0),
  constraint precio_referencia_positivo
    check (precio_referencia_usd is null or precio_referencia_usd > 0),
  constraint stock_no_negativo check (stock >= 0),
  constraint dias_encargo_positivo check (dias_encargo is null or dias_encargo > 0),
  constraint garantia_meses_positiva check (garantia_meses is null or garantia_meses > 0),
  -- Un producto tiene garantía vitalicia o un plazo en meses, no ambos.
  constraint garantia_coherente
    check (not (garantia_vitalicia and garantia_meses is not null)),
  constraint especificaciones_es_lista
    check (jsonb_typeof(especificaciones) = 'array')
);

comment on column public.productos.precio_referencia_usd is
  'Precio con comisión de plataforma, para el bloque de ahorro. Nulo si no hay comparación honesta que hacer.';

create index productos_categoria_idx on public.productos (categoria_id) where activo;
create index productos_marca_idx on public.productos (marca_id) where activo;
create index productos_precio_idx on public.productos (precio_usd) where activo;

-- Búsqueda por nombre y resumen en español.
create index productos_busqueda_idx on public.productos
  using gin (to_tsvector('spanish', nombre || ' ' || coalesce(resumen, '')));

-- ---------------------------------------------------------------------------
-- Imágenes de producto
-- ---------------------------------------------------------------------------

create table public.producto_imagenes (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos (id) on delete cascade,
  url text not null,
  alt text,
  orden integer not null default 0,
  creado_en timestamptz not null default now()
);

create index producto_imagenes_producto_idx
  on public.producto_imagenes (producto_id, orden);

-- ---------------------------------------------------------------------------
-- Tasa de cambio
--
-- Historial, no valor único. La fila vigente es la de vigente_desde más
-- reciente. Se conserva el historial porque los pedidos viejos deben poder
-- explicar con qué tasa se calcularon.
-- ---------------------------------------------------------------------------

create table public.tasas_cambio (
  id uuid primary key default gen_random_uuid(),
  -- Bolívares por dólar.
  valor numeric(12, 4) not null,
  fuente public.fuente_tasa not null default 'bcv',
  vigente_desde timestamptz not null default now(),
  registrada_por uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),

  constraint tasa_positiva check (valor > 0)
);

create index tasas_cambio_vigencia_idx on public.tasas_cambio (vigente_desde desc);

-- Devuelve la tasa vigente. Usada por el catálogo, la ficha y el carrito.
create or replace function public.tasa_vigente()
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select valor
  from public.tasas_cambio
  where vigente_desde <= now()
  order by vigente_desde desc
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Mantenimiento de actualizado_en
-- ---------------------------------------------------------------------------

create or replace function public.marcar_actualizado()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create trigger perfiles_actualizado
  before update on public.perfiles
  for each row execute function public.marcar_actualizado();

create trigger productos_actualizado
  before update on public.productos
  for each row execute function public.marcar_actualizado();

-- ---------------------------------------------------------------------------
-- Alta automática de perfil al registrarse con Google
--
-- Google entrega nombre, correo y foto. El WhatsApp queda nulo y se pide en
-- el paso 2 del registro.
-- ---------------------------------------------------------------------------

create or replace function public.crear_perfil_para_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre, correo, foto_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_para_usuario();
