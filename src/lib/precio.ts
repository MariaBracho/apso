/**
 * Los dos precios de un producto.
 *
 * Módulo puro: lo usan el servidor y el navegador, así que no toca la base ni
 * `next/headers`.
 *
 * El que se carga en el panel es el de divisas. El de bolívares se deriva
 * sumándole el recargo, y es el que se multiplica por la tasa del BCV para
 * llegar a los bolívares que ve el cliente. Así la cuenta queda a la vista:
 * precio mostrado × tasa oficial = lo que paga. Con el recargo puesto sobre la
 * tasa, esa multiplicación no daba y el número era incomprobable.
 */

export type MetodoPago =
  | "pago_movil"
  | "transferencia_bs"
  | "zelle"
  | "binance"
  | "efectivo"
  | "tarjeta_internacional";

/** Los que se cobran en dólares. El resto se paga en bolívares. */
const EN_DIVISA: MetodoPago[] = [
  "zelle",
  "binance",
  "efectivo",
  "tarjeta_internacional",
];

export function esPagoEnDivisa(metodo: string): boolean {
  return EN_DIVISA.includes(metodo as MetodoPago);
}

export type Precios = {
  /** Pagando en dólares. Es el que se carga en el panel. */
  divisa: number;
  /** Pagando en bolívares: el de divisas más el recargo. */
  bolivares: number;
  /** Lo que se ahorra pagando en dólares. Cero si no hay recargo. */
  ahorro: number;
};

/**
 * Se redondea a dos decimales porque es dinero y se muestra tal cual. Sin
 * redondear, 62 × 1,19 arrastra decimales que no significan nada y hacen que
 * el total del carrito no cuadre con la suma de las líneas.
 */
export function preciosDe(precioDivisa: number, recargoPct: number): Precios {
  const bolivares = Math.round(precioDivisa * (1 + recargoPct / 100) * 100) / 100;

  return {
    divisa: precioDivisa,
    bolivares,
    ahorro: Math.round((bolivares - precioDivisa) * 100) / 100,
  };
}

/** El precio que aplica según cómo vaya a pagar. */
export function precioSegunPago(precios: Precios, metodo: string): number {
  return esPagoEnDivisa(metodo) ? precios.divisa : precios.bolivares;
}

/**
 * De precio en bolívares a precio en divisas.
 *
 * Hace falta para el filtro de precio del catálogo: el slider se muestra en los
 * precios que el cliente ve (los de bolívares) pero la base guarda los de
 * divisas, así que lo que elige hay que traducirlo antes de consultar.
 */
export function aDivisa(precioBolivares: number, recargoPct: number): number {
  return precioBolivares / (1 + recargoPct / 100);
}

export type Margen = {
  /** Lo que queda por unidad, en dólares, antes de la comisión. */
  monto: number;
  /** Sobre el precio de venta, que es como se lee un margen de tienda. */
  porcentaje: number;
  /** Lo que se lleva quien vendió. Cero si no hay ganancia que repartir. */
  comision: number;
  /** Lo que queda para la tienda una vez pagada la comisión. */
  neto: number;
};

/**
 * Cuánto se gana con una unidad.
 *
 * Contra el precio en divisas, que es el más bajo de los dos: si el margen da
 * bien ahí, da bien cobrando en bolívares. Al revés se vería un margen que
 * desaparece en cuanto alguien paga en efectivo.
 *
 * La comisión se calcula sobre lo que se gana y no sobre lo que se cobra:
 * pagarla sobre la venta de algo que dejó poco margen saldría de la ganancia
 * de la tienda.
 *
 * Devuelve null sin costo cargado. Un margen inventado es peor que ninguno:
 * con él se decide qué comprar y a cuánto vender.
 */
export function margenDe(
  precioDivisa: number,
  costoUsd: number | null,
  comisionPct = 0,
): Margen | null {
  if (costoUsd === null || precioDivisa <= 0) return null;

  const monto = Math.round((precioDivisa - costoUsd) * 100) / 100;

  // Sin ganancia no hay comisión. Calcularla sobre un margen negativo la
  // volvería negativa, y nadie le cobra a quien vende algo con pérdida.
  const comision =
    monto > 0 ? Math.round(monto * (comisionPct / 100) * 100) / 100 : 0;

  return {
    monto,
    porcentaje: Math.round((monto / precioDivisa) * 100),
    comision,
    neto: Math.round((monto - comision) * 100) / 100,
  };
}

export type LineaVendida = {
  cantidad: number;
  precio_usd_unitario: number;
  /** Costo promedio del producto ese día. Nulo si nunca se cargó. */
  costo: number | null;
};

export type ComisionCalculada = {
  margen: number;
  monto: number;
  /** Líneas que no entraron al margen por no tener costo cargado. */
  itemsSinCosto: number;
};

/**
 * El margen del pedido y la comisión que sale de él.
 *
 * Las líneas sin costo se cuentan aparte en vez de entrar como margen cero:
 * eso último dejaría la comisión corta sin decir por qué, y quien la cobra
 * pensaría que le pagaron de menos. Contarlas permite avisarlo.
 */
export function calcularComision(
  lineas: LineaVendida[],
  porcentaje: number,
): ComisionCalculada {
  let margen = 0;
  let itemsSinCosto = 0;

  for (const linea of lineas) {
    if (linea.costo === null) {
      itemsSinCosto++;
      continue;
    }
    margen += (linea.precio_usd_unitario - linea.costo) * linea.cantidad;
  }

  margen = Math.round(margen * 100) / 100;

  return {
    margen,
    // Un pedido vendido con pérdida no paga comisión, igual que en el
    // inventario: nadie le cobra a quien vendió por debajo del costo.
    monto: margen > 0 ? Math.round(margen * (porcentaje / 100) * 100) / 100 : 0,
    itemsSinCosto,
  };
}
