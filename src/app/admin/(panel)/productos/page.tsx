import type { Metadata } from "next";
import Link from "next/link";

import { EditorStock } from "@/components/admin/editor-stock";
import { InterruptorPublicado } from "@/components/admin/interruptor-publicado";
import { listarProductos } from "@/lib/admin";
import { disponibilidadDe } from "@/lib/producto";
import { formatearUsd } from "@/lib/formato";

export const metadata: Metadata = { title: "Inventario" };

export default async function PaginaInventario() {
  const productos = await listarProductos();

  const sinStock = productos.filter(
    (p) => p.activo && disponibilidadDe(p) === "sin_stock",
  ).length;

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-texto tracking-titular text-2xl font-semibold">
            Inventario
          </h1>
          <p className="text-texto-2 mt-1 text-sm">
            {productos.length} productos
            {sinStock > 0 && ` · ${sinStock} sin stock y sin plazo`}
          </p>
        </div>

        <Link
          href="/admin/productos/nuevo"
          className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 shrink-0 px-5 py-2.5 text-sm font-semibold transition-colors"
        >
          Agregar producto
        </Link>
      </header>

      {productos.length === 0 ? (
        <Vacio />
      ) : (
        <div className="border-borde-sutil overflow-hidden rounded-panel border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-borde-sutil bg-superficie border-b">
                <Th>Producto</Th>
                <Th alineado="derecha">Precio</Th>
                <Th alineado="derecha">Estado</Th>
                <Th alineado="derecha">Stock</Th>
                <Th alineado="centro">Visible</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {productos.map((producto) => (
                <tr
                  key={producto.id}
                  className="border-borde-sutil hover:bg-superficie/50 border-b last:border-0 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className={producto.activo ? "text-texto" : "text-texto-meta"}>
                      {producto.nombre}
                    </p>
                    <p className="text-texto-meta text-xs">
                      {producto.marca?.nombre ?? "Sin marca"} ·{" "}
                      {producto.categoria?.nombre ?? "Sin categoría"}
                    </p>
                  </td>

                  <td className="text-ambar font-display px-4 py-3 text-right font-semibold">
                    {formatearUsd(producto.precio_usd)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <Existencias producto={producto} />
                  </td>

                  <td className="px-4 py-3 text-right">
                    <EditorStock
                      id={producto.id}
                      stock={producto.stock}
                      nombre={producto.nombre}
                    />
                  </td>

                  <td className="px-4 py-3 text-center">
                    <InterruptorPublicado
                      id={producto.id}
                      activo={producto.activo}
                      nombre={producto.nombre}
                    />
                  </td>

                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/productos/${producto.id}`}
                      className="text-cian hover:text-cian/80 transition-colors"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Existencias({
  producto,
}: {
  producto: { stock: number; dias_encargo: number | null };
}) {
  const estado = disponibilidadDe(producto);

  if (estado === "en_stock") {
    return <span className="text-texto-2">{producto.stock}</span>;
  }
  if (estado === "por_pedido") {
    return (
      <span className="text-ambar text-xs">
        Encargo · {producto.dias_encargo} d
      </span>
    );
  }
  return <span className="text-texto-meta text-xs">Sin stock</span>;
}

function Th({
  children,
  alineado = "izquierda",
}: {
  children?: React.ReactNode;
  alineado?: "izquierda" | "derecha" | "centro";
}) {
  const alineacion = {
    izquierda: "text-left",
    derecha: "text-right",
    centro: "text-center",
  }[alineado];

  return (
    <th
      scope="col"
      className={`etiqueta text-texto-3 px-4 py-3 text-[10px] ${alineacion}`}
    >
      {children}
    </th>
  );
}

function Vacio() {
  return (
    <div className="border-borde rounded-panel border border-dashed px-6 py-16 text-center">
      <h2 className="font-display text-texto text-lg font-semibold">
        Todavía no hay productos
      </h2>
      <p className="text-texto-2 mx-auto mt-2 max-w-sm text-sm">
        Agrega el primero y aparece en la tienda al instante.
      </p>
    </div>
  );
}
