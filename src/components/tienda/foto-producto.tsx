import Image from "next/image";

/**
 * Foto de producto, con respaldo.
 *
 * Cuando todavía no hay fotografía, se dibuja el recuadro hueso con la palabra
 * «FOTO» del handoff de diseño. Es deliberado: deja ver qué falta en vez de
 * rellenar con una imagen de archivo que no es el producto.
 */
export function FotoProducto({
  url,
  alt,
  alto = "aspect-[4/3]",
  etiqueta = "FOTO",
  prioridad = false,
  tamanos = "(min-width: 1280px) 320px, (min-width: 768px) 33vw, 50vw",
}: {
  url?: string | null;
  alt?: string;
  alto?: string;
  etiqueta?: string;
  prioridad?: boolean;
  tamanos?: string;
}) {
  if (url) {
    return (
      <div
        className={`bg-hueso ${alto} relative w-full overflow-hidden rounded-[10px]`}
      >
        {/* `cover` llena el marco y recorta lo que sobra, para que la rejilla
            del catálogo quede pareja. El precio es que una foto que no sea 4:3
            pierde los bordes, así que el formulario de subida avisa de la
            medida y comprueba la proporción antes de subir. */}
        <Image
          src={url}
          alt={alt ?? ""}
          fill
          sizes={tamanos}
          priority={prioridad}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`bg-hueso ${alto} flex w-full items-center justify-center overflow-hidden rounded-[10px]`}
    >
      <span className="etiqueta text-violeta/35 text-xs">{etiqueta}</span>
    </div>
  );
}
