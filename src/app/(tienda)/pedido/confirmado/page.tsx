import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { BotonWhatsapp } from "@/components/tienda/boton-whatsapp";
import { COOKIE_PEDIDO, NOMBRE_PAGO } from "@/lib/pedido";
import { crearClienteServicio } from "@/lib/supabase/servicio";
import { formatearBs, formatearUsd } from "@/lib/formato";

export const metadata: Metadata = { title: "Pedido registrado" };


export default async function PaginaConfirmado() {
  // El pedido se busca por la cookie que dejó el envío, no por un número en la
  // dirección: así nadie ve el pedido de otro probando números correlativos.
  const almacen = await cookies();
  const pedidoId = almacen.get(COOKIE_PEDIDO)?.value;
  if (!pedidoId) redirect("/componentes");

  const supabase = crearClienteServicio();

  const { data: pedido } = await supabase
    .from("pedidos")
    .select(
      `numero, cliente_nombre, entrega, ciudad_destino, metodo_pago,
       para_que_lo_usa, tasa_cambio, total_usd, es_encargo, plazo_encargo_dias,
       items:pedido_items (nombre_producto, cantidad, precio_usd_unitario)`,
    )
    .eq("id", pedidoId)
    .maybeSingle();

  if (!pedido) redirect("/componentes");

  const items = (pedido.items ?? []) as Array<{
    nombre_producto: string;
    cantidad: number;
    precio_usd_unitario: number;
  }>;

  const totalUsd = Number(pedido.total_usd);
  const tasa = Number(pedido.tasa_cambio);
  const mensaje = armarMensaje({ pedido, items, totalUsd, tasa });

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="text-center">
        <MarcaDeVerificacion />
        <h1 className="font-display text-texto tracking-titular mt-4 text-2xl font-semibold">
          Pedido {pedido.numero} registrado
        </h1>
        <p className="text-texto-2 mt-2 text-sm leading-relaxed">
          Ya lo tenemos. Envía el mensaje y te confirmamos disponibilidad y
          forma de pago. Si no lo envías, igual te escribimos nosotros.
        </p>
      </div>

      <div className="bg-superficie rounded-panel mt-8 p-5">
        <h2 className="etiqueta text-texto-3 mb-3 text-[10px]">
          El mensaje que se envía
        </h2>
        <pre className="text-texto-2 font-sans text-sm leading-relaxed whitespace-pre-wrap">
          {mensaje}
        </pre>
      </div>

      <div className="mt-6">
        <BotonWhatsapp mensaje={mensaje} />
      </div>

      {pedido.es_encargo && pedido.plazo_encargo_dias && (
        <p className="border-ambar/40 bg-ambar/10 rounded-tarjeta text-texto-2 mt-6 border p-4 text-sm leading-relaxed">
          Algo de este pedido se trae por encargo: el plazo estimado es de{" "}
          <strong className="text-ambar font-medium">
            {pedido.plazo_encargo_dias} días
          </strong>
          . El precio en dólares queda fijo desde que lo confirmas.
        </p>
      )}

      <div className="mt-10 text-center">
        <Link
          href="/componentes"
          className="text-texto-2 hover:text-texto text-sm transition-colors"
        >
          Seguir viendo la tienda
        </Link>
      </div>
    </div>
  );
}

/**
 * El mensaje va escrito de antemano y completo: productos, total en las dos
 * monedas, tasa usada, entrega, forma de pago y para qué lo va a usar. Cerrar
 * con todo en un solo mensaje es la conversación tipo del manual de marca.
 */
function armarMensaje({
  pedido,
  items,
  totalUsd,
  tasa,
}: {
  pedido: {
    numero: string;
    cliente_nombre: string;
    entrega: string;
    ciudad_destino: string | null;
    metodo_pago: string | null;
    para_que_lo_usa: string | null;
  };
  items: Array<{
    nombre_producto: string;
    cantidad: number;
    precio_usd_unitario: number;
  }>;
  totalUsd: number;
  tasa: number;
}): string {
  const lineas: string[] = [
    `Hola, soy ${pedido.cliente_nombre}. Este es mi pedido ${pedido.numero}:`,
    "",
  ];

  for (const item of items) {
    const subtotal = Number(item.precio_usd_unitario) * item.cantidad;
    lineas.push(
      `· ${item.cantidad} × ${item.nombre_producto} — ${formatearUsd(subtotal)}`,
    );
  }

  lineas.push(
    "",
    `Total: ${formatearUsd(totalUsd)} · ${formatearBs(totalUsd, tasa)}`,
    `Tasa usada: Bs ${tasa.toLocaleString("es-VE", { minimumFractionDigits: 2 })} / $`,
    pedido.entrega === "punto_fijo"
      ? "Entrega: en Punto Fijo"
      : `Envío: a ${pedido.ciudad_destino}`,
    `Pago: ${NOMBRE_PAGO[pedido.metodo_pago ?? ""] ?? "por acordar"}`,
  );

  if (pedido.para_que_lo_usa) {
    lineas.push("", `Lo voy a usar para: ${pedido.para_que_lo_usa}`);
  }

  return lineas.join("\n");
}

function MarcaDeVerificacion() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      className="text-exito mx-auto"
      aria-hidden="true"
    >
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}
