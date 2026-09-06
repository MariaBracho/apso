/**
 * WhatsApp es literalmente el local: no hay tienda física y ahí se gana o se
 * pierde la confianza. Todo camino de compra termina en un mensaje ya escrito
 * hacia este número.
 *
 * Formato E.164 sin el "+", que es lo que espera wa.me. Corresponde a
 * +58 424 605 6110.
 */
export const WHATSAPP_ASESOR = "584246056110";

/** El mismo número, como se lee en pantalla. */
export const WHATSAPP_VISIBLE = "+58 424 605 6110";

/** Arma el enlace de WhatsApp con el mensaje ya redactado. */
export function enlaceWhatsapp(mensaje: string): string {
  return `https://wa.me/${WHATSAPP_ASESOR}?text=${encodeURIComponent(mensaje)}`;
}
