import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { type Busqueda, Catalogo } from "@/components/tienda/catalogo";
import { obtenerCategoriaPorSlug } from "@/lib/catalogo";

type Params = { categoria: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { categoria: slug } = await params;
  const categoria = await obtenerCategoriaPorSlug(slug);

  if (!categoria) return { title: "Categoría no encontrada" };
  return { title: categoria.nombre };
}

export default async function PaginaCategoria({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Busqueda>;
}) {
  const { categoria: slug } = await params;
  const [categoria, filtrosCrudos] = await Promise.all([
    obtenerCategoriaPorSlug(slug),
    searchParams,
  ]);
  if (!categoria) notFound();

  return (
    <Catalogo
      categoria={categoria}
      titulo={categoria.nombre}
      descripcion="De cada uno decimos en qué estado está, de dónde viene y quién responde por la garantía."
      filtrosCrudos={filtrosCrudos}
    />
  );
}
