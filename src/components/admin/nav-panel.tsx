"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ENLACES = [
  { href: "/admin/pedidos", etiqueta: "Pedidos" },
  { href: "/admin/productos", etiqueta: "Inventario" },
  { href: "/admin/mis-ventas", etiqueta: "Mis ventas" },
  { href: "/admin/comisiones", etiqueta: "Comisiones" },
  { href: "/admin/marcas", etiqueta: "Marcas" },
  { href: "/admin/tasa", etiqueta: "Tasa" },
];

/**
 * Navegación del panel.
 *
 * En columna dentro de la barra lateral del escritorio, y en fila en la barra
 * de arriba del teléfono, donde la fila se desliza. Sin botón que haya que
 * descubrir: son pocos y verlos todos es parte de saber qué hace el panel.
 */
export function NavPanel({
  orientacion = "vertical",
}: {
  orientacion?: "vertical" | "horizontal";
}) {
  const ruta = usePathname();

  const disposicion =
    orientacion === "horizontal"
      ? "flex gap-1.5 overflow-x-auto"
      : "space-y-1";

  return (
    <nav className={disposicion}>
      {ENLACES.map((enlace) => {
        const activo = ruta.startsWith(enlace.href);
        return (
          <Link
            key={enlace.href}
            href={enlace.href}
            aria-current={activo ? "page" : undefined}
            className={`rounded-pildora px-3.5 py-2 text-sm transition-colors ${
              orientacion === "horizontal" ? "shrink-0" : "block"
            } ${
              activo
                ? "bg-superficie-alta text-texto font-medium"
                : "text-texto-2 hover:text-texto hover:bg-superficie-2"
            }`}
          >
            {enlace.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
