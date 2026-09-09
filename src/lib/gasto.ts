/**
 * Categorías de gasto. Módulo puro: lo usan el formulario y el servidor.
 *
 * Vive aparte de `caja.ts` porque ese es server-only —tiene las consultas— y
 * el formulario de gastos corre en el navegador. Importarlo desde ahí
 * arrastraría el cliente de Supabase al bundle.
 */

export const CATEGORIAS_GASTO = [
  // Los de traer la mercancía. Van primero porque son los que más pesan y los
  // que se pueden colgar de un pedido concreto.
  "flete_internacional",
  "aduana",
  "transporte_local",
  // Los de cobrar y entregar.
  "comision_pago",
  "empaque",
  // Los de tener la tienda abierta.
  "publicidad",
  "sueldos",
  "alquiler",
  "servicios",
  "otro",
] as const;

export type CategoriaGasto = (typeof CATEGORIAS_GASTO)[number];

export const NOMBRE_GASTO: Record<CategoriaGasto, string> = {
  flete_internacional: "Flete internacional",
  aduana: "Aduana",
  transporte_local: "Transporte local",
  comision_pago: "Comisión de plataforma de pago",
  empaque: "Empaque",
  publicidad: "Publicidad",
  sueldos: "Sueldos",
  alquiler: "Alquiler",
  servicios: "Servicios",
  otro: "Otro",
};
