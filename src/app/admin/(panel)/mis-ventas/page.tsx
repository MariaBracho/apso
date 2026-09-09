import type { Metadata } from "next";
import Link from "next/link";

import { resumenDeVendedor } from "@/lib/comisiones";
import { formatearUsd } from "@/lib/formato";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Mis ventas y comisiones" };

/**
 * Lo que vendió quien está mirando, y lo que eso le dejó.
 *
 * A diferencia de «Comisiones», que es la vista de quien paga y las agrupa por
 * persona, esta es la de quien cobra: solo lo suyo. Sin ese corte, ver lo que
 * gana otro es cuestión de mirar la pantalla de al lado.
 *
 * Los montos salen de la tabla y no se recalculan: se congelaron al venderse,
 * y aquí tiene que aparecer el mismo número que en la liquidación.
 */
export default async function PaginaMisVentas() {
  const sesion = await exigirAdmin();
  const { ventas, totalVendido, porCobrar, cobrado } = await resumenDeVendedor(
    sesion.id,
  );

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <header className="mb-8">
        <h1 className="font-display text-texto tracking-titular text-2xl font-semibold">
          Mis ventas y comisiones
        </h1>
        <p className="text-texto-2 mt-1 text-sm">{sesion.nombre}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Tarjeta
          etiqueta="Por cobrar"
          valor={porCobrar}
          nota="De ventas ya pagadas por el cliente"
          destacada
        />
        <Tarjeta
          etiqueta="Ya cobrado"
          valor={cobrado}
          nota="Liquidado hasta hoy"
        />
        <Tarjeta
          etiqueta="Vendido"
          valor={totalVendido}
          nota={`${ventas.length} ${ventas.length === 1 ? "pedido" : "pedidos"}`}
        />
      </div>

      <section className="mt-10">
        <h2 className="etiqueta text-texto-3 mb-3 text-[10px]">Mis ventas</h2>

        {ventas.length === 0 ? (
          <div className="border-borde rounded-panel border border-dashed px-6 py-16 text-center">
            <h3 className="font-display text-texto text-lg font-semibold">
              Todavía no tienes ventas
            </h3>
            <p className="text-texto-2 mx-auto mt-2 max-w-sm text-sm">
              Aparecen aquí los pedidos que atiendes, y la comisión de cada uno
              cuando el cliente paga.
            </p>
          </div>
        ) : (
          <ul className="border-borde-sutil divide-y border-t">
            {ventas.map((venta) => (
              <li
                key={venta.pedidoId}
                className="flex flex-wrap items-baseline justify-between gap-3 py-3 text-sm"
              >
                <Link
                  href={`/admin/pedidos/${venta.pedidoId}`}
                  className="text-texto-2 hover:text-cian min-w-0 transition-colors"
                >
                  <span className="font-display">{venta.numero}</span> ·{" "}
                  {venta.cliente}
                  <span className="text-texto-meta block text-xs">
                    {formatearFecha(venta.creadoEn)}
                  </span>
                </Link>

                <span className="flex shrink-0 items-baseline gap-4">
                  <span className="text-texto-meta text-xs">
                    {formatearUsd(venta.totalUsd)}
                  </span>
                  <Comision comision={venta.comision} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/**
 * La comisión de una venta.
 *
 * Sin comisión no se pinta un cero: el pedido está esperando que el cliente
 * pague, y un cero se leería como «esta venta no dejó nada».
 */
function Comision({
  comision,
}: {
  comision: { monto: number; pagada: boolean } | null;
}) {
  if (!comision) {
    return (
      <span className="text-texto-meta w-24 text-right text-xs">
        Sin pagar aún
      </span>
    );
  }

  return (
    <span className="w-24 text-right">
      <span className="font-display text-texto font-semibold">
        {formatearUsd(comision.monto)}
      </span>
      <span
        className={`block text-[11px] ${
          comision.pagada ? "text-texto-meta" : "text-exito"
        }`}
      >
        {comision.pagada ? "cobrada" : "por cobrar"}
      </span>
    </span>
  );
}

function Tarjeta({
  etiqueta,
  valor,
  nota,
  destacada = false,
}: {
  etiqueta: string;
  valor: number;
  nota: string;
  destacada?: boolean;
}) {
  return (
    <div
      className={`rounded-panel p-5 ${
        destacada ? "bg-superficie-alta" : "bg-superficie"
      }`}
    >
      <p className="etiqueta text-texto-3 text-[10px]">{etiqueta}</p>
      <p
        className={`font-display tracking-display mt-2 text-2xl font-semibold ${
          destacada ? "text-ambar" : "text-texto"
        }`}
      >
        {formatearUsd(valor)}
      </p>
      <p className="text-texto-meta mt-1 text-xs">{nota}</p>
    </div>
  );
}

function formatearFecha(iso: string): string {
  return new Intl.DateTimeFormat("es-VE", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
