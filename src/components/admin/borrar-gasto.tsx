"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { borrarGasto } from "@/app/admin/(panel)/caja/acciones";

/** Un gasto mal anotado descuadra la caja, así que se puede quitar. */
export function BorrarGasto({
  gastoId,
  descripcion,
}: {
  gastoId: string;
  descripcion: string;
}) {
  const [pendiente, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={() =>
        iniciar(async () => {
          await borrarGasto(gastoId);
          toast(`«${descripcion}» fuera de la caja`);
        })
      }
      aria-label={`Borrar el gasto «${descripcion}»`}
      className="text-texto-meta hover:text-error text-xs transition-colors disabled:opacity-30"
    >
      Borrar
    </button>
  );
}
