"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { borrarConversion } from "@/app/admin/(panel)/caja/acciones";

/** Un cambio mal anotado deja saldos falsos en dos métodos a la vez. */
export function BorrarConversion({ conversionId }: { conversionId: string }) {
  const [pendiente, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={() =>
        iniciar(async () => {
          await borrarConversion(conversionId);
          toast("Cambio borrado");
        })
      }
      aria-label="Borrar este cambio"
      className="text-texto-meta hover:text-error text-xs transition-colors disabled:opacity-30"
    >
      Borrar
    </button>
  );
}
