"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Categoria } from "@/lib/producto";

/**
 * Categorías de la barra superior, marcando en cuál se está.
 *
 * Es cliente solo por `usePathname`: la barra la arma el servidor y no sabe
 * qué ruta se está viendo. Sin esto, entrar a Laptops no cambiaba nada en el
 * menú y no había forma de saber dónde estabas parado.
 *
 * En columna arriba y en fila abajo en teléfono, misma lógica de marcado.
 */
export function NavCategorias({
  categorias,
  variante,
}: {
  categorias: Categoria[];
  variante: "barra" | "pildoras";
}) {
  const ruta = usePathname();

  // «Todo» va primero y no sale de la base: no es una categoría —ningún
  // producto cuelga de ella— sino la forma de ver el catálogo sin separar. Es
  // también a donde llevan el logo y los botones de «ver la tienda».
  const secciones = [{ id: "todo", slug: "todo", nombre: "Todo" }, ...categorias];

  return (
    <nav
      className={
        variante === "barra"
          ? "hidden items-center gap-1 lg:flex"
          : "flex flex-1 gap-2 overflow-x-auto"
      }
    >
      {secciones.map((categoria) => {
        // Coincidencia por segmento y no `startsWith` a secas: `/laptops` no
        // debe marcarse por estar en `/laptops-gamer`, que sería otra
        // categoría.
        const destino = `/${categoria.slug}`;
        const activa = ruta === destino || ruta.startsWith(`${destino}/`);

        const base =
          variante === "barra"
            ? "rounded-pildora px-3 py-1.5 text-sm transition-colors"
            : "rounded-pildora shrink-0 px-3 py-1.5 text-xs transition-colors";

        return (
          <Link
            key={categoria.id}
            href={destino}
            aria-current={activa ? "page" : undefined}
            className={`${base} ${
              activa
                ? "bg-superficie-alta text-texto font-medium"
                : variante === "barra"
                  ? "text-texto-2 hover:text-texto hover:bg-superficie"
                  : "bg-superficie-2 text-texto-2 hover:text-texto"
            }`}
          >
            {categoria.nombre}
          </Link>
        );
      })}
    </nav>
  );
}
