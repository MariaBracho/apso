import "server-only";

import { type CategoriaGasto } from "@/lib/gasto";
import {
  type MovimientoCaja,
  cambioDe,
  esPagoEnDivisa,
  saldosPorMetodo,
} from "@/lib/precio";
import { crearClienteServidor } from "@/lib/supabase/servidor";

/**
 * La caja: lo que entró por pagos y lo que salió por gastos y comisiones.
 *
 * Todo se guarda en dólares con la tasa del día al lado. Sumar bolívares de
 * distintas semanas sin eso da un número que no significa nada, y recalcular
 * con la tasa de hoy cambiaría el pasado.
 */

export type PagoDePedido = {
  id: string;
  monto_usd: number;
  metodo: string;
  tasa_cambio: number;
  referencia: string | null;
  estado: string;
  tipo: "cobro" | "reembolso";
  creado_en: string;
};

/**
 * Los pagos de un pedido, y cuánto falta.
 *
 * Solo cuentan los verificados: un pago en espera es plata que todavía no
 * está, y sumarlo daría un pedido cobrado que nadie cobró.
 */
export async function pagosDePedido(pedidoId: string): Promise<{
  pagos: PagoDePedido[];
  cobrado: number;
}> {
  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("pagos")
    .select(
      "id, monto_usd, metodo, tasa_cambio, referencia, estado, tipo, creado_en",
    )
    .eq("pedido_id", pedidoId)
    .order("creado_en");

  const pagos = (data ?? []).map((p) => ({
    ...p,
    monto_usd: Number(p.monto_usd),
    tasa_cambio: Number(p.tasa_cambio),
  }));

  return {
    pagos,
    // Lo devuelto se resta: un pedido cobrado y luego reembolsado no está
    // cobrado, y sumarlo dejaría el pedido como pagado con la plata devuelta.
    cobrado:
      Math.round(
        pagos
          .filter((p) => p.estado === "verificado")
          .reduce(
            (suma, p) => suma + (p.tipo === "reembolso" ? -p.monto_usd : p.monto_usd),
            0,
          ) * 100,
      ) / 100,
  };
}

export type Gasto = {
  id: string;
  fecha: string;
  categoria: CategoriaGasto;
  descripcion: string;
  monto_usd: number;
  tasa_cambio: number;
  metodo: string | null;
  pedido: { id: string; numero: string } | null;
};

export type Conversion = {
  id: string;
  fecha: string;
  metodo_origen: string;
  monto_origen_usd: number;
  tasa_origen: number;
  metodo_destino: string;
  monto_destino_usd: number;
  /** Lo que se quedó en el camino. */
  perdida: number;
  /** La tasa que de verdad se pagó, si el origen eran bolívares. */
  tasaReal: number | null;
};

export type ResumenCaja = {
  /** Saldo de cada método: el efectivo y el saldo de Zelle no son lo mismo. */
  porMetodo: Record<string, number>;
  sinMetodo: number;
  entro: number;
  salio: number;
  neto: number;
  /** Lo que salió por gastos, separado de lo que salió por comisiones. */
  gastado: number;
  comisionesPagadas: number;
  /** Lo que salió por comprar mercancía. No es gasto: es inventario. */
  comprado: number;
  /**
   * Lo que se quedó en el camino al cambiar bolívares a dólares.
   *
   * No es un gasto aparte: ya está descontado del neto por la diferencia entre
   * las dos puntas del cambio. Se nombra para poder mirarlo, porque si crece
   * es que el recargo del catálogo se quedó corto.
   */
  perdidoEnCambios: number;
  gastos: Gasto[];
  conversiones: Conversion[];
};

/**
 * El estado de la caja.
 *
 * Entra lo cobrado y verificado. Sale lo gastado y las comisiones ya
 * liquidadas — una comisión que se debe pero no se ha pagado no salió de la
 * caja todavía, y contarla haría que el saldo mostrara menos plata de la que
 * hay.
 */
export async function resumenDeCaja(): Promise<ResumenCaja> {
  const supabase = await crearClienteServidor();

  const [
    { data: pagos },
    { data: gastos },
    { data: comisiones },
    { data: compras },
    { data: cambios },
  ] = await Promise.all([
      supabase
        .from("pagos")
        .select("monto_usd, metodo, tipo")
        .eq("estado", "verificado"),

      supabase
        .from("gastos")
        .select(
          `id, fecha, categoria, descripcion, monto_usd, tasa_cambio, metodo,
           pedido:pedidos (id, numero)`,
        )
        .order("fecha", { ascending: false })
        .limit(100),

      supabase
        .from("comisiones")
        .select("monto_usd")
        .not("pagada_en", "is", null),

      // Comprar mercancía no es un gasto —es cambiar efectivo por inventario—
      // pero la plata sale igual. Se resta de la caja sin tocar el margen, que
      // ya descuenta ese mismo costo al vender.
      supabase
        .from("movimientos_inventario")
        .select("cantidad, costo_unitario_usd, metodo")
        .eq("motivo", "entrada")
        .not("metodo", "is", null)
        .not("costo_unitario_usd", "is", null),

      supabase
        .from("conversiones")
        .select(
          `id, fecha, metodo_origen, monto_origen_usd, tasa_origen,
           metodo_destino, monto_destino_usd`,
        )
        .order("fecha", { ascending: false })
        .limit(50),
    ]);

  const compradoPorMetodo = (compras ?? []).map((c) => ({
    metodo: c.metodo,
    montoUsd:
      Math.round(c.cantidad * Number(c.costo_unitario_usd) * 100) / 100,
    signo: -1 as const,
  }));

  const movimientos: MovimientoCaja[] = [
    // Un reembolso guarda su monto en positivo: el signo lo pone quien suma.
    ...(pagos ?? []).map((p) => ({
      metodo: p.metodo as string,
      montoUsd: Number(p.monto_usd),
      signo: (p.tipo === "reembolso" ? -1 : 1) as 1 | -1,
    })),
    ...compradoPorMetodo,
    // Un cambio mueve plata de un método a otro y algo se queda en el camino.
    // La diferencia entre las dos puntas es la pérdida, y no hace falta
    // registrarla aparte: el neto ya la refleja.
    ...(cambios ?? []).flatMap((c) => [
      {
        metodo: c.metodo_origen,
        montoUsd: Number(c.monto_origen_usd),
        signo: -1 as const,
      },
      {
        metodo: c.metodo_destino,
        montoUsd: Number(c.monto_destino_usd),
        signo: 1 as const,
      },
    ]),
    ...(gastos ?? []).map((g) => ({
      metodo: g.metodo,
      montoUsd: Number(g.monto_usd),
      signo: -1 as const,
    })),
    // Las comisiones liquidadas no guardan de qué método salieron: se pagan en
    // mano o por transferencia sin registrarlo. Restan del neto sin atribuirse.
    ...(comisiones ?? []).map((c) => ({
      metodo: null,
      montoUsd: Number(c.monto_usd),
      signo: -1 as const,
    })),
  ];

  const saldos = saldosPorMetodo(movimientos);
  const dosDecimales = (n: number) => Math.round(n * 100) / 100;

  return {
    ...saldos,
    gastado: dosDecimales(
      (gastos ?? []).reduce((suma, g) => suma + Number(g.monto_usd), 0),
    ),
    comisionesPagadas: dosDecimales(
      (comisiones ?? []).reduce((suma, c) => suma + Number(c.monto_usd), 0),
    ),
    comprado: dosDecimales(
      compradoPorMetodo.reduce((suma, c) => suma + c.montoUsd, 0),
    ),
    perdidoEnCambios: dosDecimales(
      (cambios ?? []).reduce(
        (suma, c) => suma + Number(c.monto_origen_usd) - Number(c.monto_destino_usd),
        0,
      ),
    ),
    conversiones: (cambios ?? []).map((c) => {
      const { perdida, tasaReal } = cambioDe(
        Number(c.monto_origen_usd),
        Number(c.tasa_origen),
        Number(c.monto_destino_usd),
        !esPagoEnDivisa(c.metodo_origen),
      );

      return {
        id: c.id,
        fecha: c.fecha,
        metodo_origen: c.metodo_origen,
        monto_origen_usd: Number(c.monto_origen_usd),
        tasa_origen: Number(c.tasa_origen),
        metodo_destino: c.metodo_destino,
        monto_destino_usd: Number(c.monto_destino_usd),
        perdida,
        tasaReal,
      };
    }),
    gastos: (gastos ?? []).map((g) => ({
      id: g.id,
      fecha: g.fecha,
      categoria: g.categoria as CategoriaGasto,
      descripcion: g.descripcion,
      monto_usd: Number(g.monto_usd),
      tasa_cambio: Number(g.tasa_cambio),
      metodo: g.metodo,
      pedido: g.pedido as unknown as Gasto["pedido"],
    })),
  };
}

/**
 * El costo promedio de un producto, o null si no tiene ninguno cargado.
 *
 * Lo lee la ficha del producto para mostrar el mismo número que el inventario:
 * dos pantallas diciendo costos distintos del mismo producto es la clase de
 * desacuerdo que hace desconfiar de todos los demás números.
 */
export async function costoDe(productoId: string): Promise<number | null> {
  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("costos_producto")
    .select("costo_promedio_usd")
    .eq("producto_id", productoId)
    .maybeSingle();

  return data ? Number(data.costo_promedio_usd) : null;
}
