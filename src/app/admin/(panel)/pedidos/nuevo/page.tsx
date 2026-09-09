import type { Metadata } from "next";
import Link from "next/link";

import { FormularioVenta } from "@/components/admin/formulario-venta";
import { listarProductos } from "@/lib/admin";
import { obtenerAjustes } from "@/lib/catalogo";

export const metadata: Metadata = { title: "Registrar venta" };

/**
 * Cargar una venta que ocurrió fuera de la web.
 *
 * Sin esto, lo que se vende en el mostrador o por chat no existía para el
 * panel: el inventario se iba separando del real y no había garantía con
 * serial para quien compró de esa forma.
 */
export default async function PaginaVentaNueva() {
  const [productos, { recargo }] = await Promise.all([
    listarProductos(),
    obtenerAjustes(),
  ]);

  // Se ofrecen también los despublicados: una venta de mostrador puede ser de
  // algo que se sacó del catálogo pero sigue en la vitrina.
  const vendibles = productos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    precio_usd: Number(p.precio_usd),
    stock: p.stock,
  }));

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <header className="mb-8">
        <h1 className="font-display text-texto tracking-titular text-2xl font-semibold">
          Registrar venta
        </h1>
        <p className="text-texto-2 mt-1 text-sm">
          Para lo que se vendió en el mostrador o se cerró por WhatsApp. Queda
          como cualquier otro pedido: con su número, su historial y su serial.
        </p>
        <Link
          href="/admin/pedidos"
          className="text-cian hover:text-cian/80 mt-3 inline-block text-sm transition-colors"
        >
          ← Volver a pedidos
        </Link>
      </header>

      {vendibles.length === 0 ? (
        <div className="border-borde rounded-panel border border-dashed px-6 py-16 text-center">
          <h2 className="font-display text-texto text-lg font-semibold">
            Todavía no hay productos
          </h2>
          <p className="text-texto-2 mx-auto mt-2 max-w-sm text-sm">
            Carga el primero en Inventario y desde aquí podrás venderlo.
          </p>
        </div>
      ) : (
        <FormularioVenta productos={vendibles} recargo={recargo} />
      )}
    </div>
  );
}
