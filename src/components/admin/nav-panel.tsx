"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ENLACES = [
  { href: "/admin/pedidos", etiqueta: "Pedidos" },
  { href: "/admin/productos", etiqueta: "Inventario" },
  { href: "/admin/tasa", etiqueta: "Tasa" },
];

export function NavPanel() {
  const ruta = usePathname();

  return (
    <nav className="space-y-1">
      {ENLACES.map((enlace) => {
        const activo = ruta.startsWith(enlace.href);
        return (
          <Link
            key={enlace.href}
            href={enlace.href}
            aria-current={activo ? "page" : undefined}
            className={`rounded-pildora block px-3.5 py-2 text-sm transition-colors ${
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
