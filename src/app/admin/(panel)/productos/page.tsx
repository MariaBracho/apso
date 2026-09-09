import type { Metadata } from "next";
import Link from "next/link";

import { EditorCosto } from "@/components/admin/editor-costo";
import { EditorStock } from "@/components/admin/editor-stock";
import { InterruptorPublicado } from "@/components/admin/interruptor-publicado";
import { listarProductos } from "@/lib/admin";
import { obtenerAjustes, obtenerTasaVigente } from "@/lib/catalogo";
import { disponibilidadDe } from "@/lib/producto";
import { formatearBs, formatearUsd } from "@/lib/formato";
import { preciosDe } from "@/lib/precio";

export const metadata: Metadata = { title: "Inventario" };

export default async function PaginaInventario() {
  const [productos, { recargo, comision }, tasa] = await Promise.all([
    listarProductos(),
    obtenerAjustes(),
    obtenerTasaVigente(),
  ]);

  const sinStock = productos.filter(
    (p) => p.activo && disponibilidadDe(p) === "sin_stock",
  ).length;

  // Sin costo no hay margen, y sin margen no hay comisión que mostrar. La fila
  // dice «Sin costo» pero no dice qué hacer con eso, y en una tabla donde
  // todas lo dicen se lee como que la función no existe.
  const sinCosto = productos.filter(
    (p) => p.costo_promedio_usd === null,
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

          {sinCosto > 0 && (
            <p className="text-texto-meta mt-1.5 max-w-lg text-xs leading-relaxed">
              {sinCosto === productos.length
                ? "Ninguno tiene el costo de compra cargado"
                : `${sinCosto} sin costo de compra`}
              , así que no se puede calcular margen ni comisión. Lo que ya
              tienes en el estante se declara con «Poner costo»; lo que llegue
              después, con el <span className="text-texto-2">+</span> de la
              columna Stock.
            </p>
          )}
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
        <div className="border-borde-sutil overflow-x-auto rounded-panel border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-borde-sutil bg-superficie border-b">
                <Th>Producto</Th>
                {/* Los dos precios, en el orden en que se piensan: el de
                    divisas es el que se carga, y el de al lado es el que ve
                    quien entra a la tienda. «Precio» a secas no diría cuál. */}
                <Th alineado="derecha">En divisas</Th>
                <Th alineado="derecha">A tasa BCV</Th>
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

                  {/* En verde y en ámbar como en la tienda, para que el color
                      signifique lo mismo en los dos lados. */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <p className="text-exito font-display">
                      {formatearUsd(producto.precio_usd)}
                    </p>
                    <EditorCosto
                      productoId={producto.id}
                      nombre={producto.nombre}
                      precioDivisa={producto.precio_usd}
                      costo={producto.costo_promedio_usd}
                      comision={comision}
                      stock={producto.stock}
                    />
                  </td>

                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <PrecioBcv
                      precioDivisa={producto.precio_usd}
                      recargo={recargo}
                      tasa={tasa}
                    />
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

/**
 * El precio que ve quien entra a la tienda.
 *
 * Es el de divisas más el recargo, y debajo esos mismos dólares por la tasa del
 * BCV. Van juntos porque es la cuenta que el cliente puede rehacer a mano: si
 * el de arriba por la tasa no da el de abajo, algo está mal.
 */
function PrecioBcv({
  precioDivisa,
  recargo,
  tasa,
}: {
  precioDivisa: number;
  recargo: number;
  tasa: number | null;
}) {
  const { bolivares } = preciosDe(precioDivisa, recargo);

  return (
    <>
      <p className="text-ambar font-display font-semibold">
        {formatearUsd(bolivares)}
      </p>
      <p className="text-texto-meta text-xs">
        {tasa === null ? "Sin tasa cargada" : formatearBs(bolivares, tasa)}
      </p>
    </>
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
