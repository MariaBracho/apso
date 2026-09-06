import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BloqueSeriales } from "@/components/admin/bloque-seriales";
import { ControlEstado } from "@/components/admin/control-estado";
import { obtenerPedido } from "@/lib/admin";
import { type EstadoPedido, NOMBRE_ESTADO, esCancelado } from "@/lib/estados";
import { enlaceWhatsapp } from "@/lib/contacto";
import { formatearBs, formatearUsd } from "@/lib/formato";
import { NOMBRE_PAGO } from "@/lib/pedido";

export const metadata: Metadata = { title: "Detalle del pedido" };

export default async function PaginaPedido({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pedido = await obtenerPedido(id);
  if (!pedido) notFound();

  const estado = pedido.estado as EstadoPedido;
  const tasa = Number(pedido.tasa_cambio);
  const total = Number(pedido.total_usd);

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/admin/pedidos"
        className="text-texto-meta hover:text-texto-2 text-xs transition-colors"
      >
        ← Pedidos
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-texto tracking-titular text-2xl font-semibold">
            {pedido.numero}
          </h1>
          <p className="text-texto-2 mt-1 text-sm">
            {pedido.cliente_nombre} · recibido {formatearFecha(pedido.creado_en)}{" "}
            · tasa Bs {tasa.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <a
          href={enlaceWhatsapp(
            `Hola ${pedido.cliente_nombre}, te escribo por tu pedido ${pedido.numero}.`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="border-cian text-cian hover:bg-cian hover:text-superficie rounded-pildora shrink-0 border px-4 py-2 text-sm font-semibold transition-colors"
        >
          Escribir al cliente
        </a>
      </header>

      {esCancelado(estado) && pedido.motivo_cancelacion && (
        <p className="border-error/40 bg-error/10 rounded-tarjeta text-texto-2 mt-6 border p-4 text-sm">
          <strong className="text-error font-medium">
            {NOMBRE_ESTADO[estado]}:
          </strong>{" "}
          {pedido.motivo_cancelacion}
        </p>
      )}

      <div className="mt-8">
        <ControlEstado
          pedidoId={pedido.id}
          estado={estado}
          esEncargo={pedido.es_encargo}
          inventarioDescontado={pedido.inventario_descontado}
        />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <Productos pedido={pedido} tasa={tasa} total={total} />

          {pedido.para_que_lo_usa ? (
            <section>
              <h2 className="etiqueta text-texto-3 mb-3 text-[10px]">
                Lo que dijo el cliente
              </h2>
              {/* Va citado, no resumido: es con lo que se responde bien. */}
              <p className="border-cian/40 text-texto-2 border-l-2 pl-4 text-sm leading-relaxed italic">
                «{pedido.para_que_lo_usa}»
              </p>
            </section>
          ) : (
            <p className="text-texto-meta text-sm">
              No indicó para qué lo va a usar.
            </p>
          )}

          <BloqueSeriales items={pedido.items} />
        </div>

        <aside className="space-y-8">
          <Cliente pedido={pedido} />
          <Historial eventos={pedido.eventos} />
        </aside>
      </div>
    </div>
  );
}

function Productos({
  pedido,
  tasa,
  total,
}: {
  pedido: Awaited<ReturnType<typeof obtenerPedido>> & object;
  tasa: number;
  total: number;
}) {
  return (
    <section>
      <h2 className="etiqueta text-texto-3 mb-3 text-[10px]">Productos</h2>

      <ul className="border-borde-sutil divide-y border-t border-b">
        {pedido.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="text-texto text-sm">
                <span className="text-texto-meta">{item.cantidad} ×</span>{" "}
                {item.nombre_producto}
              </p>
              <p className="text-texto-meta text-xs">
                {item.producto
                  ? `Quedan ${item.producto.stock} en inventario`
                  : "El producto ya no está en el catálogo"}
              </p>
            </div>
            <p className="font-display text-texto shrink-0 text-sm font-semibold">
              {formatearUsd(Number(item.precio_usd_unitario) * item.cantidad)}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-texto text-sm font-medium">Total</span>
        <div className="text-right">
          <p className="font-display text-ambar text-xl font-semibold">
            {formatearUsd(total)}
          </p>
          <p className="text-texto-meta text-xs">{formatearBs(total, tasa)}</p>
        </div>
      </div>
    </section>
  );
}

function Cliente({
  pedido,
}: {
  pedido: Awaited<ReturnType<typeof obtenerPedido>> & object;
}) {
  return (
    <section>
      <h2 className="etiqueta text-texto-3 mb-3 text-[10px]">Cliente</h2>
      <dl className="space-y-2 text-sm">
        <Dato termino="Nombre" valor={pedido.cliente_nombre} />
        <Dato termino="WhatsApp" valor={pedido.cliente_whatsapp} />
        {pedido.cliente_correo && (
          <Dato termino="Correo" valor={pedido.cliente_correo} />
        )}
        <Dato
          termino="Entrega"
          valor={
            pedido.entrega === "punto_fijo"
              ? "En Punto Fijo"
              : `Envío a ${pedido.ciudad_destino}`
          }
        />
        <Dato
          termino="Pago"
          valor={NOMBRE_PAGO[pedido.metodo_pago ?? ""] ?? "Por acordar"}
        />
        {pedido.es_encargo && pedido.plazo_encargo_dias && (
          <Dato termino="Plazo" valor={`${pedido.plazo_encargo_dias} días`} />
        )}
      </dl>
    </section>
  );
}

function Dato({ termino, valor }: { termino: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-texto-meta">{termino}</dt>
      <dd className="text-texto-2 text-right">{valor}</dd>
    </div>
  );
}

function Historial({
  eventos,
}: {
  eventos: Array<{ id: string; descripcion: string; creado_en: string }>;
}) {
  return (
    <section>
      <h2 className="etiqueta text-texto-3 mb-3 text-[10px]">Historial</h2>
      <ol className="space-y-2.5">
        {eventos.map((evento) => (
          <li key={evento.id} className="text-sm">
            <span className="text-texto-meta text-xs">
              {formatearHora(evento.creado_en)}
            </span>
            <p className="text-texto-2 leading-snug">{evento.descripcion}</p>
          </li>
        ))}
      </ol>
    </section>
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

function formatearHora(iso: string): string {
  return new Intl.DateTimeFormat("es-VE", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
