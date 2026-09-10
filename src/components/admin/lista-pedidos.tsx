"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { FotoProducto } from "@/components/tienda/foto-producto";
import type { PedidoFila } from "@/lib/admin";
import { NOMBRE_ESTADO, type EstadoPedido } from "@/lib/estados";
import { formatearUsd } from "@/lib/formato";
import { NOMBRE_ORIGEN } from "@/lib/pedido";
import { fotoPrincipal } from "@/lib/producto";

/** Pasadas dos horas sin responder, la espera se marca en rojo. */
const MS_PARA_ALARMA = 2 * 60 * 60 * 1000;

/**
 * Listado de pedidos con buscador.
 *
 * Filtra en el navegador y no contra el servidor: al buscar un pedido se teclea
 * de corrido, y un viaje por pulsación se sentiría como el catálogo antes de
 * arreglarlo. Los pedidos ya vienen todos cargados, así que filtrarlos aquí no
 * cuesta nada.
 *
 * Cuando el listado crezca a cientos, lo que habrá que paginar es la consulta,
 * y entonces el buscador tendrá que ir al servidor con él.
 */
export function ListaPedidos({ pedidos }: { pedidos: PedidoFila[] }) {
  const [consulta, setConsulta] = useState("");

  const encontrados = useMemo(() => {
    const q = consulta.trim().toLowerCase();
    if (!q) return pedidos;

    return pedidos.filter((p) => coincide(p, q));
  }, [pedidos, consulta]);

  const porConfirmar = encontrados.filter((p) => p.estado === "por_confirmar");
  const resto = encontrados.filter((p) => p.estado !== "por_confirmar");

  return (
    <div>
      <div className="mb-6">
        <input
          type="search"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Número, cliente, teléfono o producto…"
          aria-label="Buscar pedidos"
          className="bg-superficie-2 border-borde text-texto placeholder:text-texto-meta focus:border-cian rounded-pildora w-full max-w-md border px-4 py-2.5 text-sm outline-none"
        />
      </div>

      {encontrados.length === 0 ? (
        <p className="text-texto-meta text-sm">
          Ningún pedido coincide con «{consulta}».
        </p>
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

/**
 * Se busca por todo lo que uno recuerda de un pedido.
 *
 * El número y el nombre son lo obvio, pero al teléfono se llega desde WhatsApp
 * y al producto desde «el que compró la Dell», que es como se pregunta de
 * verdad. Del teléfono se quitan los símbolos: nadie escribe el «+58».
 */
function coincide(pedido: PedidoFila, q: string): boolean {
  const telefono = (pedido.cliente_whatsapp ?? "").replace(/\D/g, "");
  const qDigitos = q.replace(/\D/g, "");

  const campos = [
    pedido.numero,
    NOMBRE_ORIGEN[pedido.origen] ?? "",
    pedido.cliente_nombre,
    NOMBRE_ESTADO[pedido.estado as EstadoPedido] ?? pedido.estado,
    ...pedido.items.map((i) => i.nombre_producto),
  ];

  if (campos.some((c) => c.toLowerCase().includes(q))) return true;
  return qDigitos.length > 0 && telefono.includes(qDigitos);
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
              {pedido.cliente_whatsapp ?? "Sin número"} ·{" "}
              {NOMBRE_ESTADO[pedido.estado as EstadoPedido] ?? pedido.estado}
              {/* Solo si no vino de la web: lo normal no necesita etiqueta. */}
              {NOMBRE_ORIGEN[pedido.origen] && (
                <>
                  {" · "}
                  <span className="text-violeta">
                    {NOMBRE_ORIGEN[pedido.origen]}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-baseline gap-4">
            <span
              className={
                urgente ? "text-error text-xs" : "text-texto-meta text-xs"
              }
            >
              {formatearEspera(pedido.esperaMs)}
            </span>
            <span className="font-display text-ambar text-lg font-semibold">
              {formatearUsd(Number(pedido.total_usd))}
            </span>
          </div>
        </div>

        {/* Solo la foto, sin enlace al producto: la tarjeta entera ya lleva al
            pedido y un enlace dentro de otro no es HTML válido. El enlace a la
            ficha está en el detalle, que es adonde lleva este clic. */}
        <ul className="text-texto-2 mt-3 space-y-2 text-xs">
          {pedido.items.map((item, i) => {
            const foto = fotoPrincipal(item.producto);
            return (
              <li key={i} className="flex items-center gap-2.5">
                <span className="w-9 shrink-0">
                  <FotoProducto
                    url={foto?.url}
                    alt=""
                    alto="aspect-square"
                    etiqueta=""
                    tamanos="36px"
                  />
                </span>
                <span>
                  {item.cantidad} × {item.nombre_producto}
                </span>
              </li>
            );
          })}
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
