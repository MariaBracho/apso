import type { Metadata } from "next";
import Link from "next/link";

import { type PedidoFila, listarPedidos } from "@/lib/admin";
import { NOMBRE_ESTADO, type EstadoPedido } from "@/lib/estados";
import { formatearUsd } from "@/lib/formato";

export const metadata: Metadata = { title: "Pedidos" };

/** Pasadas dos horas sin responder, la espera se marca en rojo. */
const MS_PARA_ALARMA = 2 * 60 * 60 * 1000;

export default async function PaginaPedidos() {
  const pedidos = await listarPedidos();

  const porConfirmar = pedidos.filter((p) => p.estado === "por_confirmar");
  const resto = pedidos.filter((p) => p.estado !== "por_confirmar");

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="mb-8">
        <h1 className="font-display text-texto tracking-titular text-2xl font-semibold">
          Pedidos
        </h1>
        <p className="text-texto-2 mt-1 text-sm">
          {porConfirmar.length} por confirmar · {pedidos.length} en total
        </p>
      </header>

      {pedidos.length === 0 ? (
        <Vacio />
      ) : (
        <div className="space-y-8">
          {porConfirmar.length > 0 && (
            <Grupo titulo="Por confirmar" pedidos={porConfirmar} />
          )}
          {resto.length > 0 && <Grupo titulo="El resto" pedidos={resto} />}
        </div>
      )}
    </div>
  );
}

function Grupo({ titulo, pedidos }: { titulo: string; pedidos: PedidoFila[] }) {
  return (
    <section>
      <h2 className="etiqueta text-texto-3 mb-3 text-[10px]">{titulo}</h2>
      <ul className="space-y-2">
        {pedidos.map((pedido) => (
          <Fila key={pedido.id} pedido={pedido} />
        ))}
      </ul>
    </section>
  );
}

function Fila({ pedido }: { pedido: PedidoFila }) {
  const urgente =
    pedido.estado === "por_confirmar" && pedido.esperaMs >= MS_PARA_ALARMA;

  return (
    <li>
      <Link
        href={`/admin/pedidos/${pedido.id}`}
        className="bg-superficie border-borde-sutil hover:border-cian/40 rounded-tarjeta block border p-4 transition-colors"
      >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="text-texto text-sm font-medium">
            <span className="font-display">{pedido.numero}</span> ·{" "}
            {pedido.cliente_nombre}
          </p>
          <p className="text-texto-meta text-xs">
            {pedido.cliente_whatsapp} ·{" "}
            {NOMBRE_ESTADO[pedido.estado as EstadoPedido] ?? pedido.estado}
          </p>
        </div>

        <div className="flex items-baseline gap-4">
          <span
            className={urgente ? "text-error text-xs" : "text-texto-meta text-xs"}
          >
            {formatearEspera(pedido.esperaMs)}
          </span>
          <span className="font-display text-ambar text-lg font-semibold">
            {formatearUsd(Number(pedido.total_usd))}
          </span>
        </div>
      </div>

      <ul className="text-texto-2 mt-3 space-y-0.5 text-xs">
        {pedido.items.map((item, i) => (
          <li key={i}>
            {item.cantidad} × {item.nombre_producto}
          </li>
        ))}
      </ul>

      {/* El uso que indicó el cliente va citado, no resumido: es el dato con
          el que se responde bien. */}
      {pedido.para_que_lo_usa ? (
        <p className="border-cian/40 text-texto-2 mt-3 border-l-2 pl-3 text-xs leading-relaxed italic">
          «{pedido.para_que_lo_usa}»
        </p>
      ) : (
        <p className="text-texto-meta mt-3 text-xs">Sin uso indicado</p>
      )}
      </Link>
    </li>
  );
}

function formatearEspera(ms: number): string {
  const minutos = Math.floor(ms / 60000);
  if (minutos < 60) return `hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h ${minutos % 60} min`;

  const dias = Math.floor(horas / 24);
  return `hace ${dias} ${dias === 1 ? "día" : "días"}`;
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
