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
