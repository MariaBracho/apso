"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { cambiarEstado } from "@/app/admin/(panel)/pedidos/acciones";
import {
  type EstadoPedido,
  NOMBRE_ESTADO,
  esCancelado,
  secuenciaDe,
} from "@/lib/estados";

/**
 * Stepper de estado y cambio manual.
 *
 * Se puede saltar a cualquier paso, no solo al siguiente: aquí atiende una
 * sola persona con el teléfono en la otra mano, y obligarla a pasar por cada
 * estado para corregir un clic sería peor que dejarla elegir.
 */
export function ControlEstado({
  pedidoId,
  estado,
  esEncargo,
  inventarioDescontado,
}: {
  pedidoId: string;
  estado: EstadoPedido;
  esEncargo: boolean;
  inventarioDescontado: boolean;
}) {
  const [pendiente, iniciar] = useTransition();
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");

  const secuencia = secuenciaDe(esEncargo);
  const actual = secuencia.indexOf(estado);
  const cancelado = esCancelado(estado);

  const mover = (siguiente: EstadoPedido, razon?: string) =>
    iniciar(async () => {
      const resultado = await cambiarEstado(pedidoId, siguiente, razon);
      if (resultado && "error" in resultado) {
        toast.error(resultado.error);
        return;
      }
      setCancelando(false);
      setMotivo("");
      // El cliente ve este mismo estado en su historial, así que el aviso
      // confirma qué se le acaba de comunicar.
      toast.success(`Pedido en «${NOMBRE_ESTADO[siguiente]}»`, {
        description: "El cliente lo ve así en su seguimiento.",
      });
    });

  return (
    <div className={pendiente ? "opacity-60" : ""}>
      <ol className="flex flex-wrap gap-2">
        {secuencia.map((paso, i) => {
          const alcanzado = !cancelado && actual >= i;
          const esActual = estado === paso;

          return (
            <li key={paso}>
              <button
                type="button"
                disabled={pendiente || esActual}
                onClick={() => mover(paso)}
                aria-current={esActual ? "step" : undefined}
                className={`rounded-pildora border px-3.5 py-2 text-xs transition-colors disabled:cursor-default ${
                  esActual
                    ? "border-cian bg-cian text-superficie font-semibold"
                    : alcanzado
                      ? "border-cian/40 text-cian"
                      : "border-borde text-texto-meta hover:border-texto-meta hover:text-texto-2"
                }`}
              >
                {NOMBRE_ESTADO[paso]}
              </button>
            </li>
          );
        })}
      </ol>

      <p className="text-texto-meta mt-3 text-xs">
        {inventarioDescontado
          ? "El inventario de este pedido ya está descontado."
          : "El inventario se descuenta al confirmar el pago, no antes."}
      </p>

      <div className="mt-4">
        {cancelado ? (
          <button
            type="button"
            disabled={pendiente}
            onClick={() => mover("por_confirmar")}
            className="text-texto-meta hover:text-texto-2 text-xs transition-colors"
          >
            Reabrir el pedido
          </button>
        ) : cancelando ? (
          <div className="border-borde rounded-tarjeta max-w-md border p-4">
            <label className="block">
              <span className="text-texto-2 mb-1.5 block text-sm">
                ¿Por qué se cancela?
              </span>
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="El cliente no completó el pago en 5 días."
                className="bg-superficie-2 border-borde text-texto placeholder:text-texto-meta focus:border-cian rounded-tarjeta w-full border px-3.5 py-2.5 text-sm outline-none"
              />
            </label>
            <p className="text-texto-meta mt-2 text-xs">
              El motivo se le muestra al cliente. Un pedido cancelado no
              desaparece de su historial.
            </p>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={pendiente || motivo.trim().length === 0}
                onClick={() => mover("cancelado", motivo)}
                className="bg-error text-hueso rounded-pildora px-4 py-2 text-xs font-semibold transition-opacity disabled:opacity-40"
              >
                Cancelar el pedido
              </button>
              <button
                type="button"
                onClick={() => setCancelando(false)}
                className="text-texto-2 hover:text-texto px-3 text-xs transition-colors"
              >
                Volver
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCancelando(true)}
            className="text-texto-meta hover:text-error text-xs transition-colors"
          >
            Cancelar este pedido
          </button>
        )}
      </div>
    </div>
  );
}
