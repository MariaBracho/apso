import type { Metadata } from "next";
import Link from "next/link";

import { BandaAsesoria } from "@/components/tienda/banda-asesoria";
import { TarjetaProducto } from "@/components/tienda/tarjeta-producto";
import {
  obtenerAjustes,
  obtenerProductos,
  obtenerTasaVigente,
} from "@/lib/catalogo";

export const metadata: Metadata = { title: "Buscar" };

/**
 * Resultados de la barra de búsqueda, en toda la tienda.
 *
 * Existe porque las dos barras apuntaban a `/componentes` fijo: buscar
 * «lenovo» devolvía nada aunque hubiera tres Lenovo en el catálogo, porque
 * ninguna es un componente. Quien escribe en esa barra quiere el producto, no
 * el producto que además esté en la sección donde se quedó parado.
 *
 * Sin filtros ni orden a propósito. Esto responde una pregunta concreta —
 * «¿tienen esto?»— y una barra lateral de facetas encima de cuatro resultados
 * estorba más de lo que ayuda. Para explorar están las categorías.
 */
export default async function PaginaBuscar({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const termino = q?.trim() ?? "";

  const [productos, tasa, { recargo, mostrarDivisa }] = await Promise.all([
    termino ? obtenerProductos(null, { busqueda: termino }) : [],
    obtenerTasaVigente(),
    obtenerAjustes(),
  ]);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8">
      <header className="mb-8">
        <h1 className="font-display text-texto tracking-display text-3xl font-semibold">
          {termino ? `«${termino}»` : "Buscar"}
        </h1>
        <p className="text-texto-2 mt-2 text-sm">
          {!termino
            ? "Escribe en la barra de arriba lo que estás buscando."
            : `${productos.length} ${
                productos.length === 1 ? "resultado" : "resultados"
              } en toda la tienda.`}
        </p>
      </header>

      {termino && productos.length === 0 ? (
        <SinResultados termino={termino} />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {productos.map((producto) => (
            <TarjetaProducto
              key={producto.id}
              producto={producto}
              tasa={tasa}
              recargo={recargo}
              mostrarDivisa={mostrarDivisa}
            />
          ))}
        </div>
      )}

      <BandaAsesoria />
    </div>
  );
}

/**
 * Vacío con salida, igual que en el catálogo: no se deja a nadie en una
 * pantalla en blanco. Aquí además se ofrecen las dos secciones, porque quien
 * no encontró lo que buscaba muchas veces no sabía cómo se llama.
 */
function SinResultados({ termino }: { termino: string }) {
  return (
    <div className="border-borde rounded-panel border border-dashed px-6 py-16 text-center">
      <h2 className="font-display text-texto text-lg font-semibold">
        No encontramos «{termino}»
      </h2>
      <p className="text-texto-2 mx-auto mt-2 max-w-sm text-sm">
        Puede que lo tengamos con otro nombre. Míralo en{" "}
        <Link href="/componentes" className="text-cian hover:underline">
          Componentes
        </Link>{" "}
        o{" "}
        <Link href="/laptops" className="text-cian hover:underline">
          Laptops
        </Link>
        , o pídelo por encargo y te decimos en cuántos días llega.
      </p>
    </div>
  );
}
