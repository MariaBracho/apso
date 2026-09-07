import type { Metadata } from "next";

import { ListaPedidos } from "@/components/admin/lista-pedidos";
import { listarPedidos } from "@/lib/admin";

export const metadata: Metadata = { title: "Pedidos" };

export default async function PaginaPedidos() {
  const { pedidos, total } = await listarPedidos();
  const porConfirmar = pedidos.filter((p) => p.estado === "por_confirmar");
  const fueraDelTope = total - pedidos.length;

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="mb-8">
        <h1 className="font-display text-texto tracking-titular text-2xl font-semibold">
          Pedidos
        </h1>
        {/* Los conteos son del total y no de lo encontrado: son la foto del
            día, y que cambiaran al teclear en el buscador haría perder de vista
            cuántos quedan de verdad por atender. */}
        <p className="text-texto-2 mt-1 text-sm">
          {porConfirmar.length} por confirmar · {total} en total
        </p>

        {/* Se dice qué queda fuera. Un listado recortado en silencio se lee
            como el listado completo, y el buscador parecería no encontrar algo
            que sí existe. */}
        {fueraDelTope > 0 && (
          <p className="text-texto-meta mt-1 text-xs">
            Están todos los que faltan por confirmar, más los atendidos más
            recientes. Los otros {fueraDelTope} siguen guardados; se llega a
            ellos por la dirección del pedido.
          </p>
        )}
      </header>

      {pedidos.length === 0 ? <Vacio /> : <ListaPedidos pedidos={pedidos} />}
    </div>
  );
}

function Vacio() {
  return (
    <div className="border-borde rounded-panel border border-dashed px-6 py-16 text-center">
      <h2 className="font-display text-texto text-lg font-semibold">
        Todavía no hay pedidos
      </h2>
      <p className="text-texto-2 mx-auto mt-2 max-w-sm text-sm">
        Cuando alguien envíe uno desde la tienda, aparece aquí y te llega el
        mensaje por WhatsApp.
      </p>
    </div>
  );
}
