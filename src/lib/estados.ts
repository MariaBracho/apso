/**
 * Estados del pedido. Módulo puro: lo usan el panel y la vista del cliente.
 *
 * Los estados los mueve siempre una persona desde el panel, nunca el sistema.
 * Es una decisión del handoff, no una limitación: si el estado se adelanta
 * solo y miente, la app pierde la confianza que justifica que exista.
 */

export type EstadoPedido =
  | "por_confirmar"
  | "confirmado_y_pagado"
  | "comprado"
  | "en_transito"
  | "en_aduana"
  | "aqui"
  | "armando_probando"
  | "listo_entregar"
  | "entregado"
  | "sin_stock_pendiente"
  | "cancelado"
  | "cancelado_reembolsado";

/** Cómo se le dice al cliente. */
export const NOMBRE_ESTADO: Record<EstadoPedido, string> = {
  por_confirmar: "Recibido",
  confirmado_y_pagado: "Confirmado y pagado",
  comprado: "Comprado",
  en_transito: "En tránsito",
  en_aduana: "En aduana",
  aqui: "Ya está aquí",
  armando_probando: "Armando y probando",
  listo_entregar: "Listo para entregar",
  entregado: "Entregado",
  sin_stock_pendiente: "Sin stock, por resolver",
  cancelado: "Cancelado",
  cancelado_reembolsado: "Cancelado y reembolsado",
};

/** La línea que acompaña al aviso, para que el estado no sea solo una palabra. */
export const CONTEXTO_ESTADO: Record<EstadoPedido, string> = {
  por_confirmar: "Lo tenemos. Te confirmamos disponibilidad y forma de pago.",
  confirmado_y_pagado: "Pago verificado. Ya es tuyo.",
  comprado: "Lo compramos en Estados Unidos.",
  en_transito: "Viene en camino hacia Venezuela.",
  en_aduana: "Está en aduana. Es el paso menos predecible.",
  aqui: "Ya llegó al país y lo tenemos nosotros.",
  armando_probando: "Lo estamos armando y probando antes de entregártelo.",
  listo_entregar: "Listo. Coordinamos la entrega por WhatsApp.",
  entregado: "Entregado. Desde hoy corre la garantía.",
  sin_stock_pendiente: "Se agotó mientras comprabas. Te escribimos con opciones.",
  cancelado: "Cancelado.",
  cancelado_reembolsado: "Cancelado y con el dinero devuelto.",
};

const SECUENCIA_STOCK: EstadoPedido[] = [
  "por_confirmar",
  "confirmado_y_pagado",
  "armando_probando",
  "listo_entregar",
  "entregado",
];

/**
 * Los encargos añaden cuatro pasos entre el pago y el armado. Se muestran
 * porque un encargo tarda semanas y el cliente necesita saber en cuál de ellas
 * está, en vez de preguntar.
 */
const SECUENCIA_ENCARGO: EstadoPedido[] = [
  "por_confirmar",
  "confirmado_y_pagado",
  "comprado",
  "en_transito",
  "en_aduana",
  "aqui",
  "armando_probando",
  "listo_entregar",
  "entregado",
];

/** Estados fuera de la línea: no son un paso más, son una salida. */
export const ESTADOS_FUERA_DE_LINEA: EstadoPedido[] = [
  "sin_stock_pendiente",
  "cancelado",
  "cancelado_reembolsado",
];

export function secuenciaDe(esEncargo: boolean): EstadoPedido[] {
  return esEncargo ? SECUENCIA_ENCARGO : SECUENCIA_STOCK;
}

export function esCancelado(estado: EstadoPedido): boolean {
  return estado === "cancelado" || estado === "cancelado_reembolsado";
}

/**
 * Desde "confirmado y pagado" en adelante, el inventario ya salió del almacén.
 * Es el corte que decide si el stock se descuenta o se devuelve.
 */
export function inventarioDeberiaEstarDescontado(
  estado: EstadoPedido,
  esEncargo: boolean,
): boolean {
  if (esCancelado(estado) || estado === "sin_stock_pendiente") return false;

  const secuencia = secuenciaDe(esEncargo);
  const posicion = secuencia.indexOf(estado);
  const corte = secuencia.indexOf("confirmado_y_pagado");

  return posicion >= corte && posicion !== -1;
}

/** Cuántos pasos lleva recorridos, para pintar el stepper. */
export function progresoDe(
  estado: EstadoPedido,
  esEncargo: boolean,
): { indice: number; total: number } {
  const secuencia = secuenciaDe(esEncargo);
  return { indice: secuencia.indexOf(estado), total: secuencia.length };
}
