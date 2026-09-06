import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { salirDeLaCuenta } from "@/app/(tienda)/entrar/acciones";
import { LineaDeTiempo } from "@/components/tienda/linea-de-tiempo";
import { enlaceWhatsapp } from "@/lib/contacto";
import {
  type EstadoPedido,
  NOMBRE_ESTADO,
  esCancelado,
} from "@/lib/estados";
import { formatearBs, formatearUsd } from "@/lib/formato";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Mis pedidos" };

type PedidoCliente = {
  id: string;
  numero: string;
  estado: string;
  es_encargo: boolean;
  motivo_cancelacion: string | null;
  tasa_cambio: number;
  total_usd: number;
  creado_en: string;
  entregado_en: string | null;
  items: Array<{
    id: string;
    nombre_producto: string;
    cantidad: number;
    garantia_meses: number | null;
    garantia_vitalicia: boolean;
    seriales: Array<{ serial: string }>;
  }>;
  eventos: Array<{ id: string; descripcion: string; creado_en: string }>;
};

export default async function PaginaMisPedidos() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/entrar?destino=%2Fmis-pedidos");

  const supabase = await crearClienteServidor();

  // El filtro por perfil_id va explícito y no se delega a RLS: la política de
  // pedidos deja ver todo a quien tiene rol admin, así que sin esto un admin
  // vería aquí los pedidos de todos los clientes en vez de los suyos.
  const { data } = await supabase
    .from("pedidos")
    .select(
      `id, numero, estado, es_encargo, motivo_cancelacion, tasa_cambio,
       total_usd, creado_en, entregado_en,
       items:pedido_items (
         id, nombre_producto, cantidad, garantia_meses, garantia_vitalicia,
         seriales (serial)
       ),
       eventos:pedido_eventos (id, descripcion, creado_en)`,
    )
    .eq("perfil_id", sesion.id)
    .order("creado_en", { ascending: false })
    .returns<PedidoCliente[]>();

  const pedidos = data ?? [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-texto tracking-titular text-2xl font-semibold">
            Mis pedidos
          </h1>
          <p className="text-texto-2 mt-1 text-sm">
            Hola, {sesion.nombre.split(" ")[0]}.
          </p>
        </div>

        <form action={salirDeLaCuenta}>
          <button
            type="submit"
            className="text-texto-meta hover:text-texto-2 text-xs transition-colors"
          >
            Salir
          </button>
        </form>
      </header>

      {pedidos.length === 0 ? (
        <Vacio />
      ) : (
        <ul className="space-y-5">
          {pedidos.map((pedido) => (
            <Tarjeta key={pedido.id} pedido={pedido} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Tarjeta({ pedido }: { pedido: PedidoCliente }) {
  const estado = pedido.estado as EstadoPedido;
  const tasa = Number(pedido.tasa_cambio);
  const total = Number(pedido.total_usd);
  const cancelado = esCancelado(estado);

  return (
    <li className="bg-superficie border-borde-sutil rounded-panel border p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="font-display text-texto text-sm font-semibold">
            {pedido.numero}
          </p>
          <p className="text-texto-meta text-xs">
            {formatearFecha(pedido.creado_en)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-ambar text-lg font-semibold">
            {formatearUsd(total)}
          </p>
          <p className="text-texto-meta text-xs">{formatearBs(total, tasa)}</p>
        </div>
      </div>

      <ul className="text-texto-2 mt-4 space-y-1 text-sm">
        {pedido.items.map((item) => (
          <li key={item.id}>
            <span className="text-texto-meta">{item.cantidad} ×</span>{" "}
            {item.nombre_producto}
            {item.seriales.length > 0 && (
              // El serial se le muestra al cliente porque es suyo: es lo que
              // le evita buscar la factura cuando reclame garantía.
              <span className="text-texto-meta block text-xs">
                Serial: {item.seriales.map((s) => s.serial).join(" · ")}
                {textoGarantia(item) && ` · ${textoGarantia(item)}`}
              </span>
            )}
          </li>
        ))}
      </ul>

      {cancelado ? (
        <p className="border-borde text-texto-2 mt-4 border-t pt-4 text-sm">
          <strong className="text-error font-medium">
            {NOMBRE_ESTADO[estado]}
          </strong>
          {pedido.motivo_cancelacion && `: ${pedido.motivo_cancelacion}`}
        </p>
      ) : (
        <div className="border-borde mt-4 border-t pt-4">
          <LineaDeTiempo estado={estado} esEncargo={pedido.es_encargo} />
        </div>
      )}

      <div className="mt-4">
        <a
          href={enlaceWhatsapp(
            `Hola, te escribo por mi pedido ${pedido.numero} (${NOMBRE_ESTADO[estado]}).`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cian hover:text-cian/80 text-xs transition-colors"
        >
          Preguntar por este pedido →
        </a>
      </div>
    </li>
  );
}

function textoGarantia(item: {
  garantia_meses: number | null;
  garantia_vitalicia: boolean;
}): string | null {
  if (item.garantia_vitalicia) return "garantía de por vida";
  if (item.garantia_meses === null) return null;

  const años = item.garantia_meses / 12;
  return Number.isInteger(años) && años >= 1
    ? `garantía de ${años} ${años === 1 ? "año" : "años"}`
    : `garantía de ${item.garantia_meses} meses`;
}

function Vacio() {
  return (
    <div className="border-borde rounded-panel border border-dashed px-6 py-16 text-center">
      <h2 className="font-display text-texto text-lg font-semibold">
        Todavía no has pedido nada
      </h2>
      <p className="text-texto-2 mx-auto mt-2 max-w-sm text-sm leading-relaxed">
        Si compraste antes de tener cuenta, tus pedidos aparecen aquí en cuanto
        confirmes el mismo WhatsApp que usaste.
      </p>
      <Link
        href="/componentes"
        className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 mt-8 inline-block px-6 py-3 text-sm font-semibold transition-colors"
      >
        Ver la tienda
      </Link>
    </div>
  );
}

function formatearFecha(iso: string): string {
  return new Intl.DateTimeFormat("es-VE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}
