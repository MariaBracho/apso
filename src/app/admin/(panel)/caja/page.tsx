import type { Metadata } from "next";
import Link from "next/link";

import { BorrarGasto } from "@/components/admin/borrar-gasto";
import { FormularioGasto } from "@/components/admin/formulario-gasto";
import { type Gasto, resumenDeCaja } from "@/lib/caja";
import { obtenerTasaVigente } from "@/lib/catalogo";
import { formatearBs, formatearUsd } from "@/lib/formato";
import { NOMBRE_GASTO } from "@/lib/gasto";
import { NOMBRE_PAGO } from "@/lib/pedido";

export const metadata: Metadata = { title: "Caja" };

/**
 * Cuánta plata hay, de dónde entró y en qué se fue.
 *
 * El saldo va por método y no como un total único: el efectivo del mostrador,
 * el saldo de Zelle y los bolívares del banco son plata distinta, y un solo
 * número no sirve para decidir con qué se paga algo.
 *
 * Solo cuenta lo verificado: un pago en espera es plata que todavía no está.
 */
export default async function PaginaCaja() {
  const [caja, tasa] = await Promise.all([
    resumenDeCaja(),
    obtenerTasaVigente(),
  ]);

  const metodos = Object.entries(caja.porMetodo).sort((a, b) => b[1] - a[1]);

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <header className="mb-8">
        <h1 className="font-display text-texto tracking-titular text-2xl font-semibold">
          Caja
        </h1>
        <p className="text-texto-2 mt-1 text-sm">
          Entró {formatearUsd(caja.entro)} · salió {formatearUsd(caja.salio)}
        </p>
        <p className="text-texto-meta mt-2 max-w-lg text-xs leading-relaxed">
          Entra lo cobrado y verificado de cada pedido. Sale lo que anotes aquí
          y las comisiones ya liquidadas — una comisión que se debe todavía no
          salió de la caja.
        </p>
      </header>

      <div className="bg-superficie-alta rounded-panel p-6">
        <p className="etiqueta text-texto-3 text-[10px]">Neto</p>
        <p
          className={`font-display tracking-display mt-2 text-3xl font-semibold ${
            caja.neto < 0 ? "text-error" : "text-ambar"
          }`}
        >
          {formatearUsd(caja.neto)}
        </p>
        {tasa !== null && (
          <p className="text-texto-2 mt-0.5 text-sm">
            {formatearBs(caja.neto, tasa)}
          </p>
        )}
        <p className="text-texto-meta mt-2 text-xs">
          {formatearUsd(caja.gastado)} en gastos ·{" "}
          {formatearUsd(caja.comisionesPagadas)} en comisiones pagadas
        </p>
      </div>

      <section className="mt-10">
        <h2 className="etiqueta text-texto-3 mb-3 text-[10px]">
          Dónde está la plata
        </h2>

        {metodos.length === 0 && caja.sinMetodo === 0 ? (
          <p className="text-texto-meta text-sm">
            Todavía no hay movimientos. Los pagos se registran en cada pedido.
          </p>
        ) : (
          <ul className="border-borde-sutil divide-y border-t">
            {metodos.map(([metodo, saldo]) => (
              <li
                key={metodo}
                className="flex items-baseline justify-between gap-3 py-2.5 text-sm"
              >
                <span className="text-texto-2">
                  {NOMBRE_PAGO[metodo] ?? metodo}
                </span>
                <span
                  className={`font-display font-semibold ${
                    saldo < 0 ? "text-error" : "text-texto"
                  }`}
                >
                  {formatearUsd(saldo)}
                </span>
              </li>
            ))}

            {/* Las comisiones liquidadas no dicen de qué método salieron. Se
                muestran aparte en vez de repartirlas a ojo, o la suma de los
                saldos dejaría de cuadrar con el neto. */}
            {caja.sinMetodo !== 0 && (
              <li className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                <span className="text-texto-meta">
                  Sin método (comisiones pagadas)
                </span>
                <span className="font-display text-texto-meta font-semibold">
                  {formatearUsd(caja.sinMetodo)}
                </span>
              </li>
            )}
          </ul>
        )}
      </section>

      <section className="border-borde-sutil mt-10 border-t pt-8">
        <h2 className="etiqueta text-texto-3 mb-4 text-[10px]">
          Anotar un gasto
        </h2>
        <FormularioGasto tasa={tasa} />
      </section>

      {caja.gastos.length > 0 && (
        <section className="mt-10">
          <h2 className="etiqueta text-texto-3 mb-3 text-[10px]">Gastos</h2>
          <ul className="border-borde-sutil divide-y border-t">
            {caja.gastos.map((gasto) => (
              <Fila key={gasto.id} gasto={gasto} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Fila({ gasto }: { gasto: Gasto }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-3 py-2.5 text-sm">
      <span className="min-w-0">
        <span className="text-texto-2">{gasto.descripcion}</span>
        <span className="text-texto-meta block text-xs">
          {formatearFecha(gasto.fecha)} · {NOMBRE_GASTO[gasto.categoria]}
          {gasto.metodo && ` · ${NOMBRE_PAGO[gasto.metodo] ?? gasto.metodo}`}
          {gasto.pedido && (
            <>
              {" · "}
              <Link
                href={`/admin/pedidos/${gasto.pedido.id}`}
                className="text-cian hover:underline"
              >
                {gasto.pedido.numero}
              </Link>
            </>
          )}
        </span>
      </span>

      <span className="flex shrink-0 items-baseline gap-3">
        <span className="text-texto-meta text-xs">
          {formatearBs(gasto.monto_usd, gasto.tasa_cambio)}
        </span>
        <span className="font-display text-texto font-semibold">
          {formatearUsd(gasto.monto_usd)}
        </span>
        <BorrarGasto gastoId={gasto.id} descripcion={gasto.descripcion} />
      </span>
    </li>
  );
}

/** La fecha va sin hora: un gasto es de un día, no de un momento. */
function formatearFecha(fecha: string): string {
  const [año, mes, dia] = fecha.split("-").map(Number);
  return new Intl.DateTimeFormat("es-VE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(año, mes - 1, dia));
}
