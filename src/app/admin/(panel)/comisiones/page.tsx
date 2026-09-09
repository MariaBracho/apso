import type { Metadata } from "next";
import Link from "next/link";

import { BotonLiquidar } from "@/components/admin/boton-liquidar";
import { type ComisionDeVendedor, listarComisiones } from "@/lib/comisiones";
import { formatearUsd } from "@/lib/formato";

export const metadata: Metadata = { title: "Comisiones" };

/**
 * Lo que se le debe a cada quien, y lo que ya se le pagó.
 *
 * Los montos salen congelados de cuando se cerró cada venta, no del costo de
 * hoy. Es la diferencia con el número del inventario, que es una estimación y
 * se mueve cada vez que entra mercancía a otro precio.
 */
export default async function PaginaComisiones() {
  const vendedores = await listarComisiones();

  const totalPorPagar = vendedores.reduce((s, v) => s + v.totalPorPagar, 0);

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <header className="mb-8">
        <h1 className="font-display text-texto tracking-titular text-2xl font-semibold">
          Comisiones
        </h1>
        <p className="text-texto-2 mt-1 text-sm">
          {totalPorPagar > 0
            ? `${formatearUsd(totalPorPagar)} por pagar en total.`
            : "No hay nada pendiente de pagar."}
        </p>
        <p className="text-texto-meta mt-2 max-w-lg text-xs leading-relaxed">
          Cada comisión se calcula cuando la venta se da por pagada y desde ahí
          no cambia, aunque después el producto se compre más caro. Por eso
          puede no coincidir con lo que estima el inventario.
        </p>
      </header>

      {vendedores.length === 0 ? <Vacio /> : null}

      <div className="space-y-10">
        {vendedores.map((vendedor) => (
          <section key={vendedor.perfilId}>
            <div className="border-borde-sutil flex flex-wrap items-center justify-between gap-3 border-b pb-3">
              <div>
                <h2 className="font-display text-texto text-lg font-semibold">
                  {vendedor.nombre}
                </h2>
                <p className="text-texto-meta text-xs">
                  {formatearUsd(vendedor.totalPagado)} pagados hasta hoy
                </p>
              </div>

              <div className="flex items-center gap-4">
                <p className="text-right">
                  <span className="etiqueta text-texto-3 block text-[10px]">
                    Por pagar
                  </span>
                  <span className="font-display text-ambar text-xl font-semibold">
                    {formatearUsd(vendedor.totalPorPagar)}
                  </span>
                </p>
                <BotonLiquidar
                  perfilId={vendedor.perfilId}
                  nombre={vendedor.nombre}
                  total={vendedor.totalPorPagar}
                />
              </div>
            </div>

            {vendedor.porPagar.length > 0 && (
              <Lista titulo="Por pagar" comisiones={vendedor.porPagar} />
            )}

            {/* Las pagadas se acotan a las últimas: la pregunta de esta
                pantalla es cuánto se debe, no el historial completo. */}
            {vendedor.pagadas.length > 0 && (
              <Lista
                titulo={`Pagadas · ${vendedor.pagadas.length}`}
                comisiones={vendedor.pagadas.slice(0, 10)}
                apagadas
              />
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function Lista({
  titulo,
  comisiones,
  apagadas = false,
}: {
  titulo: string;
  comisiones: ComisionDeVendedor[];
  apagadas?: boolean;
}) {
  return (
    <div className="mt-5">
      <h3 className="etiqueta text-texto-3 mb-2 text-[10px]">{titulo}</h3>
      <ul className="border-borde-sutil divide-y border-t">
        {comisiones.map((c) => (
          <li
            key={c.id}
            className={`flex flex-wrap items-baseline justify-between gap-3 py-2.5 text-sm ${
              apagadas ? "opacity-60" : ""
            }`}
          >
            <span className="min-w-0">
              {c.pedido ? (
                <Link
                  href={`/admin/pedidos/${c.pedido.id}`}
                  className="text-texto-2 hover:text-cian transition-colors"
                >
                  <span className="font-display">{c.pedido.numero}</span> ·{" "}
                  {c.pedido.cliente_nombre}
                </Link>
              ) : (
                <span className="text-texto-meta">Pedido borrado</span>
              )}

              {/* Se dice cuando el margen quedó corto por falta de costo: sin
                  esto, quien cobra ve un monto bajo y no sabe por qué. */}
              {c.items_sin_costo > 0 && (
                <span className="text-ambar block text-xs">
                  {c.items_sin_costo}{" "}
                  {c.items_sin_costo === 1 ? "producto" : "productos"} sin costo
                  cargado: el margen quedó corto
                </span>
              )}
            </span>

            <span className="flex shrink-0 items-baseline gap-3">
              <span className="text-texto-meta text-xs">
                margen {formatearUsd(c.margen_usd)} · {c.porcentaje} %
              </span>
              <span className="font-display text-texto font-semibold">
                {formatearUsd(c.monto_usd)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Vacio() {
  return (
    <div className="border-borde rounded-panel border border-dashed px-6 py-16 text-center">
      <h2 className="font-display text-texto text-lg font-semibold">
        Todavía no hay comisiones
      </h2>
      <p className="text-texto-2 mx-auto mt-2 max-w-sm text-sm">
        Se generan solas cuando un pedido pasa a pagado. Para que salga el monto
        completo, carga el costo de la mercancía al recibirla.
      </p>
    </div>
  );
}
