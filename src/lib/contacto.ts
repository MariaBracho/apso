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

/**
 * Quién atiende. Sale en la banda de asesoría del listado y en la tarjeta de
 * la ficha de producto.
 *
 * Va con nombre y cara porque la asesoría uno a uno es lo que separa a apso
 * del resto: el manual pide hablar como un vecino que sabe del tema, y un
 * formulario de contacto anónimo no dice eso.
 */
export const ASESOR = {
  nombre: "Joseph",
  nombreCompleto: "Joseph Bracho",
  iniciales: "JB",
};

/**
 * Arma el enlace de WhatsApp con el mensaje ya redactado.
 *
 * Por omisión escribe a la tienda, que es lo que hace el cliente. Cuando
 * escribe la tienda hay que pasarle el número de destino: sin eso, «Escribir al
 * cliente» abría una conversación de apso consigo misma.
 *
 * wa.me quiere solo dígitos, y los números se guardan como `+58…`, así que se
 * limpia aquí y no en cada llamada.
 */
export function enlaceWhatsapp(mensaje: string, numero?: string): string {
  const destino = (numero ?? WHATSAPP_ASESOR).replace(/\D/g, "");
  return `https://wa.me/${destino}?text=${encodeURIComponent(mensaje)}`;
}
