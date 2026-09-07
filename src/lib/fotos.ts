/**
 * Constantes del almacén de fotos, compartidas entre navegador y servidor.
 *
 * Módulo aparte y no dentro del archivo de server actions: allí solo se pueden
 * exportar funciones async, y un `export const` rompe el build sin que `tsc` ni
 * el linter digan nada.
 *
 * Los mismos valores están en la migración del depósito, que es la que manda:
 * estos evitan el viaje de subida cuando ya se sabe que va a fallar.
 */

export const DEPOSITO = "productos";

export const TIPOS = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/** 5 MB, igual que `file_size_limit` del depósito. */
export const MAXIMO = 5 * 1024 * 1024;

/**
 * La tienda muestra las fotos en 4:3 y recorta lo que sobra.
 *
 * La más grande se ve a 520 px de ancho, así que 1200 × 900 la cubre con
 * margen en pantalla retina y es 4:3 exacto.
 */
export const ANCHO_SUGERIDO = 1200;
export const ALTO_SUGERIDO = 900;
export const PROPORCION = ANCHO_SUGERIDO / ALTO_SUGERIDO;

/** El texto que se muestra en el formulario, para no repetirlo. */
export const MEDIDA_SUGERIDA = `${ANCHO_SUGERIDO} × ${ALTO_SUGERIDO} px`;

/**
 * Avisa cuando la foto no es 4:3 y va a recortarse.
 *
 * Se avisa pero no se rechaza: puede que la foto valga la pena igual y el
 * recorte no estorbe. Lo que no sirve es enterarse al ver la ficha publicada,
 * que es lo que pasaba. El 4 % de tolerancia deja pasar medidas cercanas como
 * 1024 × 768 sin molestar.
 */
export function avisoDeRecorte(ancho: number, alto: number): string | null {
  if (!ancho || !alto) return null;

  const proporcion = ancho / alto;
  if (Math.abs(proporcion - PROPORCION) / PROPORCION <= 0.04) return null;

  const lado = proporcion > PROPORCION ? "los lados" : "arriba y abajo";
  return `Es ${ancho} × ${alto} y la tienda usa 4:3, así que se va a recortar por ${lado}. La medida ideal es ${MEDIDA_SUGERIDA}.`;
}

export function motivoRechazo(archivo: File): string | null {
  if (archivo.size === 0) return "El archivo está vacío.";
  if (!TIPOS.includes(archivo.type)) {
    return "Solo se aceptan imágenes JPG, PNG, WebP o AVIF.";
  }
  if (archivo.size > MAXIMO) {
    return `Pesa ${(archivo.size / 1048576).toFixed(1)} MB y el máximo son 5 MB.`;
  }
  return null;
}
