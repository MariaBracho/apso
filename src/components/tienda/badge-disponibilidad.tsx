import { type Disponibilidad, disponibilidadDe } from "@/lib/producto";

/**
 * Etiqueta de estado del producto. Un solo estado por producto.
 *
 * "Por pedido" siempre lleva el plazo al lado: el manual de marca prohíbe
 * prometer lo que no se controla, así que se dice el plazo del proveedor y no
 * una fecha cerrada.
 */
export function BadgeDisponibilidad({
  producto,
  detallado = false,
  sobreFoto = false,
}: {
  producto: { stock: number; dias_encargo: number | null };
  detallado?: boolean;
  /**
   * Encima de una foto el tinte translúcido desaparece: contra una imagen clara
   * el verde sobre verde al 15 % no se lee. Se cambia por un fondo opaco con el
   * color de estado en el texto y el borde, que aguanta cualquier fotografía.
   */
  sobreFoto?: boolean;
}) {
  const estado: Disponibilidad = disponibilidadDe(producto);

  const tintado: Record<Disponibilidad, string> = {
    en_stock: "bg-exito/15 text-exito",
    por_pedido: "bg-ambar/15 text-ambar",
    sin_stock: "bg-superficie-3 text-texto-meta",
  };

  const opaco: Record<Disponibilidad, string> = {
    en_stock: "bg-fondo text-exito border border-exito/40",
    por_pedido: "bg-fondo text-ambar border border-ambar/40",
    sin_stock: "bg-fondo text-texto-meta border border-borde",
  };

  const estilos = sobreFoto ? opaco : tintado;

  return (
    <span
      className={`etiqueta inline-flex items-center rounded-pildora px-2.5 py-1 text-[10px] ${estilos[estado]}`}
    >
      {texto(producto, estado, detallado)}
    </span>
  );
}

function texto(
  producto: { stock: number; dias_encargo: number | null },
  estado: Disponibilidad,
  detallado: boolean,
): string {
  switch (estado) {
    case "en_stock":
      if (producto.stock === 1) return "Último";
      return detallado ? `${producto.stock} en stock` : "En stock";
    case "por_pedido":
      return `Por pedido · ${producto.dias_encargo} días`;
    case "sin_stock":
      return "Sin stock";
  }
}
