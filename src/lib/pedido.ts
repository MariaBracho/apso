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
