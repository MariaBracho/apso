/**
 * Marco de foto de producto.
 *
 * Todavía no hay fotografía real: el handoff de diseño usa un recuadro hueso
 * con la palabra "FOTO" como marcador. Se mantiene igual a propósito, para
 * que se vea qué falta en vez de rellenar con una imagen de archivo.
 */
export function FotoProducto({
  alto = "aspect-[4/3]",
  etiqueta = "FOTO",
}: {
  alto?: string;
  etiqueta?: string;
}) {
  return (
    <div
      className={`bg-hueso ${alto} flex w-full items-center justify-center overflow-hidden rounded-[10px]`}
    >
      <span className="etiqueta text-violeta/35 text-xs">{etiqueta}</span>
    </div>
  );
}
