import type { Metadata } from "next";

import { FormularioTasa } from "@/app/admin/(panel)/tasa/formulario";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { formatearTasa } from "@/lib/formato";

export const metadata: Metadata = { title: "Tasa de cambio" };

const NOMBRE_FUENTE: Record<string, string> = {
  bcv: "BCV",
  manual: "A mano",
  promedio: "Promedio",
};

export default async function PaginaTasa() {
  const supabase = await crearClienteServidor();

  const { data: historial } = await supabase
    .from("tasas_cambio")
    .select("id, valor, fuente, vigente_desde")
    .order("vigente_desde", { ascending: false })
    .limit(15);

  const tasas = historial ?? [];
  const vigente = tasas[0];

  return (
    <div className="mx-auto max-w-2xl px-8 py-10">
      <header className="mb-8">
        <h1 className="font-display text-texto tracking-titular text-2xl font-semibold">
          Tasa de cambio
        </h1>
        <p className="text-texto-2 mt-1 text-sm">
          Con esta tasa se calculan todos los precios en bolívares de la tienda.
        </p>
      </header>

      <div className="bg-superficie-alta rounded-panel mb-8 p-6">
        <p className="etiqueta text-texto-3 text-[10px]">Vigente ahora</p>
        <p className="font-display text-texto tracking-display mt-2 text-3xl font-semibold">
          {vigente ? formatearTasa(Number(vigente.valor)) : "Sin tasa cargada"}
        </p>
        {vigente && (
          <p className="text-texto-meta mt-1 text-xs">
            {NOMBRE_FUENTE[vigente.fuente] ?? vigente.fuente} ·{" "}
            {formatearFecha(vigente.vigente_desde)}
          </p>
        )}
      </div>

      <FormularioTasa />

      {tasas.length > 1 && (
        <section className="mt-10">
          <h2 className="etiqueta text-texto-3 mb-4 text-[10px]">Historial</h2>
          <ul className="border-borde-sutil divide-y border-t border-b">
            {tasas.slice(1).map((tasa) => (
              <li
                key={tasa.id}
                className="flex items-baseline justify-between py-2.5 text-sm"
              >
                <span className="text-texto-2">
                  {formatearTasa(Number(tasa.valor))}
                </span>
                <span className="text-texto-meta text-xs">
                  {NOMBRE_FUENTE[tasa.fuente] ?? tasa.fuente} ·{" "}
                  {formatearFecha(tasa.vigente_desde)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-texto-meta mt-3 text-xs leading-relaxed">
            Las tasas viejas no se borran: cada pedido guarda la suya y tiene que
            poder explicar con cuál se calculó.
          </p>
        </section>
      )}
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
