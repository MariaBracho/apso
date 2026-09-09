/**
 * Constantes de pedido, fuera del archivo de server actions.
 *
 * Un archivo con "use server" solo puede exportar funciones async, así que las
 * constantes compartidas viven aquí.
 */

/**
 * Guarda el pedido recién enviado para poder mostrar la confirmación sin
 * exponer el número en una dirección que se pueda adivinar probando
 * correlativos.
 */
export const COOKIE_PEDIDO = "apso_ultimo_pedido";

export const NOMBRE_PAGO: Record<string, string> = {
  pago_movil: "Pago Móvil",
  transferencia_bs: "Transferencia en bolívares",
  zelle: "Zelle",
  binance: "Binance",
  efectivo: "Efectivo",
  tarjeta_internacional: "Tarjeta internacional",
};

/**
 * A dónde va el pedido, en una línea.
 *
 * Se dice ciudad y estado, no solo la ciudad: hay Santa Ana en cuatro estados
 * distintos, y quien despacha la encomienda necesita los dos. Vive aquí porque
 * lo leen el panel, la confirmación y el correo, y tenían que decir lo mismo.
 */
export function destinoDe(pedido: {
  entrega: string;
  ciudad_destino: string | null;
  estado_destino: string | null;
}): string {
  if (pedido.entrega === "punto_fijo") return "en Punto Fijo";
  if (!pedido.ciudad_destino) return "envío nacional";

  return pedido.estado_destino
    ? `envío a ${pedido.ciudad_destino}, ${pedido.estado_destino}`
    : `envío a ${pedido.ciudad_destino}`;
}

/**
 * De dónde entró el pedido.
 *
 * «web» no se muestra: es el caso normal y anotarlo en cada fila solo haría
 * ruido. Lo que interesa ver de un vistazo es lo que se cargó a mano.
 */
export const NOMBRE_ORIGEN: Record<string, string> = {
  mostrador: "Mostrador",
  whatsapp: "WhatsApp",
};
