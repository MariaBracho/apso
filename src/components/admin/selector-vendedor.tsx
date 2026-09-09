"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { cambiarVendedor } from "@/app/admin/(panel)/pedidos/acciones";
import type { Vendedor } from "@/lib/admin";

/**
 * A quién se le atribuye el pedido, y con él la comisión.
 *
 * `atendido_por` se pone solo con quien mueve el estado, y casi siempre acierta
 * — pero alguien puede vender y otro despachar, o registrarse a mano una venta
 * que hizo otra persona. Sin poder corregirlo, la comisión se le paga al
 * equivocado y no hay forma de arreglarlo desde el panel.
 */
export function SelectorVendedor({
  pedidoId,
  actual,
  vendedores,
}: {
  pedidoId: string;
  actual: string | null;
  vendedores: Vendedor[];
}) {
  const [pendiente, iniciar] = useTransition();

  const cambiar = (perfilId: string) => {
    if (!perfilId || perfilId === actual) return;

    iniciar(async () => {
      const resultado = await cambiarVendedor(pedidoId, perfilId);

      if ("error" in resultado) {
        toast.error(resultado.error);
        return;
      }

      const nombre = vendedores.find((v) => v.id === perfilId)?.nombre ?? "";

      toast.success(`Pasa a atenderlo ${nombre}`, {
        description: resultado.comisionMovida
          ? "La comisión de este pedido va con él."
          : "La comisión ya estaba pagada, así que se queda con quien la cobró.",
      });
    });
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <dt className="text-texto-meta">Atendido por</dt>
        <dd>
          {/* Se dibuja aunque hoy haya una sola persona. Esconderlo hasta que
              exista la segunda deja la función invisible justo cuando hace
              falta descubrirla. */}
          <select
            value={actual ?? ""}
            disabled={pendiente}
            onChange={(e) => cambiar(e.target.value)}
            aria-label="Quién atiende este pedido"
            className="bg-superficie-2 border-borde text-texto-2 focus:border-cian rounded border px-2 py-1 text-sm outline-none disabled:opacity-50"
          >
            {actual === null && <option value="">Sin asignar</option>}
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre}
              </option>
            ))}
          </select>
        </dd>
      </div>

      {/* Con una sola opción el desplegable no explica por qué: se dice dónde
          salen los demás nombres. */}
      {vendedores.length < 2 && (
        <p className="text-texto-meta text-right text-xs">
          Para que aparezca otra persona, dale el rol de vendedor.
        </p>
      )}
    </div>
  );
}
