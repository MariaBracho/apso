"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { liquidarComisiones } from "@/app/admin/(panel)/comisiones/acciones";
import { formatearUsd } from "@/lib/formato";

/**
 * Liquidar lo que se le debe a alguien.
 *
 * Pregunta antes. Marcar comisiones como pagadas no se deshace desde el panel
 * —una vez pagadas dejan de borrarse solas cuando un pedido se cancela— y el
 * botón está justo al lado de un número grande, que es donde se pulsa por
 * error.
 */
export function BotonLiquidar({
  perfilId,
  nombre,
  total,
}: {
  perfilId: string;
  nombre: string;
  total: number;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [pendiente, iniciar] = useTransition();

  const liquidar = () => {
    setConfirmando(false);

    iniciar(async () => {
      const resultado = await liquidarComisiones(perfilId);

      if ("error" in resultado) {
        toast.error(resultado.error);
        return;
      }

      toast.success(`${nombre}: ${formatearUsd(total)} liquidados`, {
        description: `${resultado.pagadas} ${
          resultado.pagadas === 1 ? "comisión pasa" : "comisiones pasan"
        } a pagadas.`,
      });
    });
  };

  if (confirmando) {
    return (
      <span className="inline-flex items-center gap-2 text-xs">
        <span className="text-texto-2">
          ¿Le pagaste {formatearUsd(total)} a {nombre}?
        </span>
        <button
          type="button"
          onClick={liquidar}
          disabled={pendiente}
          className="bg-exito text-superficie rounded-pildora px-3 py-1.5 font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Sí, liquidar
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className="text-texto-meta hover:text-texto transition-colors"
        >
          Cancelar
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirmando(true)}
      disabled={pendiente || total === 0}
      className="border-exito text-exito hover:bg-exito hover:text-superficie rounded-pildora border px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-40"
    >
      {pendiente ? "Guardando…" : "Marcar como pagadas"}
    </button>
  );
}
