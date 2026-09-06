-- ============================================================================
-- apso · Carrito, pedidos y cuentas (fase 1)
--
-- Referencias: flujos 02, 03, 06, 07, 09, 10, 11, 13 del handoff.
--
-- Reglas que dan forma a este esquema:
--   · Ninguna venta se cobra dentro de la app. El pedido es el documento
--     central; el cobro se acuerda por WhatsApp y se registra aquí a mano.
--   · El pedido congela precios y tasa al enviarse. Nada se recalcula después.
--   · Los estados los cambia siempre una persona desde el panel, nunca el
--     sistema solo: si el estado miente, la app pierde la confianza.
--   · El serial es el único dato irrecuperable. Se guarda por unidad y es lo
--     que convierte la garantía en derecho en vez de favor.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

-- Los cuatro estados de tránsito (comprado → aqui) solo aplican a los pedidos
-- por encargo; los de stock saltan de confirmado a armando.
create type public.estado_pedido as enum (
  'por_confirmar',
  'confirmado_y_pagado',
  'comprado',
  'en_transito',
  'en_aduana',
  'aqui',
  'armando_probando',
  'listo_entregar',
  'entregado',
  'sin_stock_pendiente',
  'cancelado',
  'cancelado_reembolsado'
);

create type public.tipo_entrega as enum ('punto_fijo', 'envio_nacional');

create type public.metodo_pago as enum (
  'pago_movil',
  'transferencia_bs',
  'zelle',
  'binance',
  'efectivo',
  'tarjeta_internacional'
);

create type public.estado_pago as enum ('en_espera', 'verificado', 'rechazado');

-- ---------------------------------------------------------------------------
-- Carrito
--
-- Se puede armar un carrito sin cuenta: la cuenta se pide recién al enviar el
-- pedido. El carrito de invitado se identifica por un token en cookie y se
-- reclama para el perfil cuando la persona entra con Google.
-- ---------------------------------------------------------------------------

create table public.carritos (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid references public.perfiles (id) on delete cascade,
  token uuid not null default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create unique index carritos_token_unico on public.carritos (token);

-- Un solo carrito abierto por persona registrada.
create unique index carritos_perfil_unico
  on public.carritos (perfil_id)
  where perfil_id is not null;

create table public.carrito_items (
  id uuid primary key default gen_random_uuid(),
  carrito_id uuid not null references public.carritos (id) on delete cascade,
  producto_id uuid not null references public.productos (id) on delete cascade,
  cantidad integer not null default 1,
  -- Precio en el momento de agregar. Si cambió al continuar, se avisa antes
  -- de seguir (flujo 02, paso 4) en vez de cambiarlo en silencio.
  precio_usd_agregado numeric(10, 2) not null,
  creado_en timestamptz not null default now(),

  constraint cantidad_positiva check (cantidad > 0),
  unique (carrito_id, producto_id)
);

create index carrito_items_carrito_idx on public.carrito_items (carrito_id);

create trigger carritos_actualizado
  before update on public.carritos
  for each row execute function public.marcar_actualizado();

-- ---------------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------------

-- Numeración visible al cliente: A-0148. Arranca en 100 para no estrenar la
-- tienda con el pedido número 1.
create sequence public.pedidos_numero_seq start with 100;

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique
    default 'A-' || lpad(nextval('public.pedidos_numero_seq')::text, 4, '0'),

  -- Opcional: se puede comprar sin cuenta. Cuando la haya (entrar con Google),
  -- el pedido se asocia y habilita el historial y "volver a pedir".
  perfil_id uuid references public.perfiles (id) on delete set null,

  -- La identidad viaja en el pedido, no solo en la cuenta. Ningún pedido llega
  -- anónimo: el WhatsApp es obligatorio porque es por donde se atiende. Y como
  -- el pedido es un documento, guarda a quién contactar tal como estaba ese
  -- día, aunque la persona cambie de número después.
  cliente_nombre text not null,
  cliente_whatsapp text not null,
  cliente_correo text,

  estado public.estado_pedido not null default 'por_confirmar',
  es_encargo boolean not null default false,
  -- Plazo prometido en días para los encargos. Nunca una fecha cerrada.
  plazo_encargo_dias integer,

  entrega public.tipo_entrega not null,
  ciudad_destino text,
  -- El flete no se calcula solo: se cotiza por WhatsApp y se suma después
  -- (flujo 15, paso 2).
  flete_usd numeric(10, 2) not null default 0,
  empresa_encomienda text,
  numero_guia text,

  metodo_pago public.metodo_pago,
  -- "Para qué lo va a usar". Opcional, pero se pide siempre: es el dato con
  -- el que se responde bien, y encabeza la fila en el panel.
  para_que_lo_usa text,

  -- Congelados al enviar el pedido. No se recalculan nunca.
  tasa_cambio numeric(12, 4) not null,
  subtotal_usd numeric(10, 2) not null,
  total_usd numeric(10, 2) not null,

  -- Campo previsto: hoy atiende una sola persona, pero el handoff avisa que
  -- agregar esto después obliga a migrar y preverlo es gratis.
  atendido_por uuid references public.perfiles (id) on delete set null,

  motivo_cancelacion text,

  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  confirmado_en timestamptz,
  -- Arranca el reloj de la garantía. No al despachar: al confirmar que llegó.
  entregado_en timestamptz,

  constraint totales_no_negativos check (
    subtotal_usd >= 0 and total_usd >= 0 and flete_usd >= 0
  ),
  constraint tasa_pedido_positiva check (tasa_cambio > 0),
  constraint cliente_whatsapp_e164
    check (cliente_whatsapp ~ '^\+58[0-9]{10}$'),
  constraint envio_lleva_ciudad check (
    entrega <> 'envio_nacional' or ciudad_destino is not null
  ),
  constraint cancelado_lleva_motivo check (
    estado not in ('cancelado', 'cancelado_reembolsado')
    or motivo_cancelacion is not null
  )
);

create index pedidos_perfil_idx on public.pedidos (perfil_id, creado_en desc);
-- El panel ordena por antigüedad de los sin confirmar, no por fecha de alta:
-- el más viejo va arriba y se marca en rojo pasadas las 2 horas.
create index pedidos_por_confirmar_idx
  on public.pedidos (creado_en)
  where estado = 'por_confirmar';

create trigger pedidos_actualizado
  before update on public.pedidos
  for each row execute function public.marcar_actualizado();

-- ---------------------------------------------------------------------------
-- Items del pedido
--
-- Guardan copia del nombre y del precio: los productos cambian, el pedido es
-- un documento y debe seguir diciendo lo que decía el día que se hizo.
-- ---------------------------------------------------------------------------

create table public.pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  producto_id uuid references public.productos (id) on delete set null,

  nombre_producto text not null,
  cantidad integer not null,
  precio_usd_unitario numeric(10, 2) not null,

  -- Garantía copiada del producto al momento de la compra, para poder
  -- calcular vigencia años después aunque el producto ya no exista.
  garantia_meses integer,
  garantia_vitalicia boolean not null default false,

  creado_en timestamptz not null default now(),

  constraint cantidad_item_positiva check (cantidad > 0),
  constraint precio_item_no_negativo check (precio_usd_unitario >= 0)
);

create index pedido_items_pedido_idx on public.pedido_items (pedido_id);

-- ---------------------------------------------------------------------------
-- Seriales
--
-- Una fila por unidad física entregada. Es el paso que no se puede saltar:
-- sin serial, la garantía del cliente vuelve a depender de que encuentre su
-- factura (flujo 10, paso 5).
-- ---------------------------------------------------------------------------

create table public.seriales (
  id uuid primary key default gen_random_uuid(),
  pedido_item_id uuid not null references public.pedido_items (id) on delete cascade,
  serial text not null,
  anotado_por uuid references public.perfiles (id) on delete set null,
  anotado_en timestamptz not null default now(),

  unique (pedido_item_id, serial)
);

create index seriales_item_idx on public.seriales (pedido_item_id);

-- ---------------------------------------------------------------------------
-- Pagos
--
-- Sirve tanto para el pago completo como para los abonos parciales: cada uno
-- guarda su propia tasa y no se recalcula si la tasa cambia después. El pedido
-- pasa a "confirmado y pagado" solo cuando la suma verificada llega al total.
-- ---------------------------------------------------------------------------

create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,

  monto_usd numeric(10, 2) not null,
  metodo public.metodo_pago not null,
  -- Tasa del día de este abono. Los pagos en bolívares se convierten con
  -- esta, nunca con la tasa actual.
  tasa_cambio numeric(12, 4) not null,
  referencia text,
  comprobante_url text,

  estado public.estado_pago not null default 'en_espera',
  registrado_por uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),

  constraint monto_positivo check (monto_usd > 0),
  constraint tasa_pago_positiva check (tasa_cambio > 0)
);

create index pagos_pedido_idx on public.pagos (pedido_id);

-- Una referencia de pago no se puede repetir entre pedidos: es lo que detecta
-- el comprobante reutilizado (flujo 11, caso borde).
create unique index pagos_referencia_unica
  on public.pagos (referencia)
  where referencia is not null;

-- ---------------------------------------------------------------------------
-- Eventos del pedido
--
-- El historial con hora que se ve en el detalle del panel y alimenta la línea
-- de tiempo del cliente.
-- ---------------------------------------------------------------------------

create table public.pedido_eventos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  descripcion text not null,
  estado_nuevo public.estado_pedido,
  autor_id uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now()
);

create index pedido_eventos_pedido_idx
  on public.pedido_eventos (pedido_id, creado_en);

-- ---------------------------------------------------------------------------
-- Favoritos
--
-- Guarda el precio del día en que se marcó: es la referencia contra la que se
-- compara para avisar. Solo se avisa si baja más de 3% en USD — una subida de
-- la tasa mueve el precio en bolívares pero no es un cambio de precio, y si se
-- avisara por eso la app avisaría todos los días (flujo 09).
-- ---------------------------------------------------------------------------

create table public.favoritos (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  producto_id uuid not null references public.productos (id) on delete cascade,
  precio_usd_guardado numeric(10, 2) not null,
  creado_en timestamptz not null default now(),

  unique (perfil_id, producto_id)
);

create index favoritos_perfil_idx on public.favoritos (perfil_id, creado_en desc);

-- ---------------------------------------------------------------------------
-- Búsquedas
--
-- Se guardan con o sin resultados. Las que no encuentran nada, agrupadas por
-- frecuencia, son la lista de qué importar el mes que viene (flujo 05).
-- ---------------------------------------------------------------------------

create table public.busquedas (
  id uuid primary key default gen_random_uuid(),
  termino text not null,
  perfil_id uuid references public.perfiles (id) on delete set null,
  resultados integer not null default 0,
  creado_en timestamptz not null default now(),

  constraint resultados_no_negativos check (resultados >= 0)
);

create index busquedas_sin_resultado_idx
  on public.busquedas (lower(termino))
  where resultados = 0;
