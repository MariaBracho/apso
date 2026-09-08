import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormularioPedido } from "@/app/(tienda)/pedido/formulario";
import { obtenerAjustes, obtenerTasaVigente } from "@/lib/catalogo";
import { leerCarrito, resumir } from "@/lib/carrito";
import { obtenerSesion } from "@/lib/sesion";
import { formatearBs, formatearUsd } from "@/lib/formato";
import { preciosDe } from "@/lib/precio";

export const metadata: Metadata = { title: "Tu pedido" };

export default async function PaginaPedido() {
  const [items, tasa, sesion, { recargo }] = await Promise.all([
    leerCarrito(),
    obtenerTasaVigente(),
    obtenerSesion(),
    obtenerAjustes(),
  ]);

  if (items.length === 0) redirect("/carrito");

  const resumen = resumir(items);
  const total = preciosDe(resumen.subtotalUsd, recargo);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="font-display text-texto tracking-titular text-2xl font-semibold">
        Tu pedido
      </h1>
      <p className="text-texto-2 mt-1 text-sm">
        Nada se cobra aquí. Al enviarlo se abre WhatsApp con todo escrito.
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
        <FormularioPedido
          nombre={sesion?.nombre}
          correo={sesion?.correo}
        />

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="bg-superficie rounded-panel p-5">
            <h2 className="etiqueta text-texto-3 mb-4 text-[10px]">
              Lo que llevas
            </h2>

            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 text-sm">
                  <span className="text-texto-2 min-w-0">
                    <span className="text-texto-meta">{item.cantidad} ×</span>{" "}
                    {item.producto.nombre}
                  </span>
                  <span className="text-texto shrink-0">
                    {formatearUsd(
                      preciosDe(item.producto.precio_usd, recargo).bolivares *
                        item.cantidad,
                    )}
                  </span>
                </li>
              ))}
            </ul>

            {/* Se muestran los dos totales en vez de uno que cambie al elegir
                método: cuál se cobra depende de cómo pague, y verlo antes de
                decidir es justo el momento en que sirve saberlo. */}
            <div className="border-borde mt-4 flex items-baseline justify-between border-t pt-4">
              <span className="text-texto text-sm font-medium">
                Pagando en bolívares
              </span>
              <div className="text-right">
                <p className="font-display text-ambar text-xl font-semibold">
                  {formatearUsd(total.bolivares)}
                </p>
                {tasa !== null && (
                  <p className="text-texto-meta text-xs">
                    {formatearBs(total.bolivares, tasa)}
                  </p>
                )}
              </div>
            </div>

            {total.ahorro > 0 && (
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-texto-2 text-sm">Pagando en dólares</span>
                <p className="font-display text-exito text-lg font-semibold">
                  {formatearUsd(total.divisa)}
                </p>
              </div>
            )}

            <p className="text-texto-meta mt-3 text-xs leading-relaxed">
              El precio queda fijo en dólares desde que confirmas. Si eliges
              envío, el flete se cotiza por chat y se suma después.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
