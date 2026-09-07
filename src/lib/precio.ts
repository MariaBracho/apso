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
