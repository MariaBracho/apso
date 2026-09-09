import type { MovimientoInventario } from "@/lib/admin";
import { formatearUsd } from "@/lib/formato";

/**
 * Historial de inventario de un producto.
 *
 * Responde la pregunta que un número solo no puede: si hoy hay 6 y ayer había
 * 1, de dónde salieron las otras 5. Cada fila dice cuántas se movieron, por
 * qué, con qué quedó, y de qué pedido salió cuando fue una venta.
 */

const ETIQUETA: Record<MovimientoInventario["motivo"], string> = {
  entrada: "Entró mercancía",
  venta: "Vendido",
  devolucion: "Devuelto al inventario",
  ajuste: "Corrección de conteo",
};

export function HistorialInventario({
  movimientos,
}: {
  movimientos: MovimientoInventario[];
}) {
  if (movimientos.length === 0) {
    return (
      <p className="text-texto-meta text-sm">
        Todavía no hay movimientos. Aparecen aquí cuando entre mercancía, se
        confirme una venta o se corrija el conteo.
      </p>
    );
  }

  return (
    <ul className="border-borde-sutil divide-y border-t border-b">
      {movimientos.map((m) => (
        <li key={m.id} className="flex items-baseline gap-4 py-2.5 text-sm">
          {/* El signo va delante y con color: leyendo la columna en diagonal
              se ve qué entró y qué salió sin leer el motivo. */}
          <span
            className={`font-display w-12 shrink-0 text-right font-semibold ${
              m.cantidad > 0 ? "text-exito" : "text-ambar"
            }`}
          >
            {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
          </span>

          <span className="min-w-0 flex-1">
            <span className="text-texto-2">{ETIQUETA[m.motivo]}</span>
            {m.pedido && (
              <span className="text-texto-meta"> · {m.pedido.numero}</span>
            )}
            {/* El costo del lote, junto a la entrada que lo trajo. Es lo que
                deja ver que el promedio subió porque un viaje salió más caro,
                y no porque alguien se equivocó al cargarlo. */}
            {m.costo_unitario_usd !== null && (
              <span className="text-texto-meta">
                {" "}
                · a {formatearUsd(Number(m.costo_unitario_usd))} c/u
              </span>
            )}
            {m.nota && (
              <span className="text-texto-meta block text-xs">{m.nota}</span>
            )}
          </span>

          <span className="text-texto-meta shrink-0 text-xs">
            quedan {m.stock_resultante}
          </span>

          <span className="text-texto-meta w-28 shrink-0 text-right text-xs">
            {formatearFecha(m.creado_en)}
          </span>
        </li>
      ))}
    </ul>
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
