import type { Metadata } from "next";

import { type Busqueda, Catalogo } from "@/components/tienda/catalogo";

export const metadata: Metadata = { title: "Todo el catálogo" };

/**
 * Todo lo que vende la tienda, sin separar por sección.
 *
 * Es a donde llevan el logo y «Ver catálogo»: quien entra por primera vez no
 * sabe todavía si lo que busca es un componente o una laptop, y obligarlo a
 * elegir una sección antes de ver nada es pedirle que adivine la organización
 * de la tienda.
 */
export default async function PaginaTodo({
  searchParams,
}: {
  searchParams: Promise<Busqueda>;
}) {
  return (
    <Catalogo
      categoria={null}
      titulo="Todo el catálogo"
      descripcion="De cada uno decimos en qué estado está, de dónde viene y quién responde por la garantía."
      filtrosCrudos={await searchParams}
    />
  );
}
