-- ============================================================================
-- apso · El precio en divisas se anuncia cuando la tienda quiera
--
-- Hasta ahora la ficha y las tarjetas mostraban siempre el precio pagando en
-- dólares como promoción. No siempre conviene: hay temporadas en que la tienda
-- prefiere anunciar un solo precio y dejar la diferencia para el momento de
-- pagar.
--
-- El interruptor es solo de presentación. Lo que se cobra no cambia: quien
-- paga en efectivo, Zelle, Binance o tarjeta sigue pagando el precio en
-- divisas, y el carrito y el pedido lo siguen mostrando porque ahí es donde se
-- elige el método y el número tiene que ser el que se va a cobrar.
-- ============================================================================

alter table public.ajustes
  add column mostrar_precio_divisa boolean not null default false;

comment on column public.ajustes.mostrar_precio_divisa is
  'Si el catálogo y la ficha anuncian el precio pagando en dólares. No afecta lo que se cobra: el carrito y el pedido lo muestran siempre, porque ahí se elige el método de pago.';

-- ---------------------------------------------------------------------------
-- El precio de referencia deja de mostrarse
--
-- Era el precio del mismo producto en un marketplace con comisión, y con él se
-- armaba un bloque de «aquí ahorras». Se cae porque es un número que la tienda
-- no puede sostener: nadie lo comprueba y nada obliga a mantenerlo al día.
--
-- La columna se queda con lo que ya tiene cargado. Borrarla tiraría los datos
-- de forma irreversible por un cambio que es de pantalla.
-- ---------------------------------------------------------------------------

comment on column public.productos.precio_referencia_usd is
  'Sin uso desde 2026-09-07: la tienda ya no muestra el bloque de comparación. Se conserva lo cargado, pero no se lee ni se escribe desde el panel.';
