"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  anotarSerial,
  borrarSerial,
} from "@/app/admin/(panel)/pedidos/acciones";

type Item = {
  id: string;
  nombre_producto: string;
  cantidad: number;
  seriales: Array<{ id: string; serial: string }>;
};

/**
 * Seriales del pedido.
 *
 * Lleva borde ámbar porque es el único dato que no se recupera después: si no
 * se anota al empacar, dos años más tarde la garantía del cliente vuelve a
 * depender de que encuentre su factura. Un serial por unidad.
 */
export function BloqueSeriales({ items }: { items: Item[] }) {
  const faltan = items.reduce(
    (total, item) => total + Math.max(0, item.cantidad - item.seriales.length),
    0,
  );

  return (
    <section className="border-ambar/50 rounded-panel border p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="etiqueta text-ambar text-[10px]">
          Seriales · no se puede después
        </h2>
        <span className="text-texto-meta text-xs">
          {faltan === 0
            ? "Completos"
            : `Faltan ${faltan} de ${items.reduce((t, i) => t + i.cantidad, 0)}`}
        </span>
      </div>

      <div className="space-y-5">
        {items.map((item) => (
          <LineaSeriales key={item.id} item={item} />
        ))}
      </div>

      <p className="text-texto-meta mt-5 text-xs leading-relaxed">
        Sin esto, la garantía del cliente vuelve a depender de que encuentre su
        factura.
      </p>
    </section>
  );
}

function LineaSeriales({ item }: { item: Item }) {
  const [valor, setValor] = useState("");
  const [pendiente, iniciar] = useTransition();

  const completo = item.seriales.length >= item.cantidad;

  const guardar = () =>
    iniciar(async () => {
      const resultado = await anotarSerial(item.id, valor);
      if (resultado && "error" in resultado) {
        toast.error(resultado.error);
        return;
      }
      const guardado = valor;
      setValor("");
      toast.success(`Serial ${guardado} anotado`, {
        description: "Es lo que le sostiene la garantía al cliente.",
      });
    });

  return (
    <div>
      <p className="text-texto-2 mb-2 text-sm">
        {item.nombre_producto}{" "}
        <span className="text-texto-meta text-xs">
          ({item.seriales.length}/{item.cantidad})
        </span>
      </p>

      {item.seriales.length > 0 && (
        <ul className="mb-2 space-y-1">
          {item.seriales.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-sm">
              <code className="text-texto bg-superficie-2 rounded px-2 py-0.5 text-xs">
                {s.serial}
              </code>
              <button
                type="button"
                disabled={pendiente}
                onClick={() =>
                  iniciar(async () => {
                    await borrarSerial(s.id);
                    toast(`Serial ${s.serial} quitado`);
                  })
                }
                aria-label={`Quitar el serial ${s.serial}`}
                className="text-texto-meta hover:text-error text-xs transition-colors"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {!completo && (
        <div className="flex gap-2">
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={(e) => {
              // Las pistolas de código de barras terminan con Enter.
              if (e.key === "Enter" && valor.trim()) {
                e.preventDefault();
                guardar();
              }
            }}
            placeholder="Escanea o escribe el serial"
            className="bg-superficie-2 border-borde text-texto placeholder:text-texto-meta focus:border-ambar rounded-tarjeta flex-1 border px-3.5 py-2 text-sm outline-none"
          />
          <button
            type="button"
            disabled={pendiente || valor.trim().length === 0}
            onClick={guardar}
            className="border-ambar text-ambar hover:bg-ambar hover:text-superficie rounded-pildora border px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-40"
          >
            Anotar
          </button>
        </div>
      )}

    </div>
  );
}
