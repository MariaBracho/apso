/**
 * Formato de precios.
 *
 * Los precios se fijan en dólares; los bolívares son siempre un cálculo a
 * partir de una tasa con fecha. La regla de marca dice que todo precio se
 * publica completo, sin "desde".
 */

const FORMATO_USD = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const FORMATO_USD_ENTERO = new Intl.NumberFormat("es-VE", {
  maximumFractionDigits: 0,
});

const FORMATO_BS = new Intl.NumberFormat("es-VE", {
  maximumFractionDigits: 0,
});

/** `$120` para montos redondos, `$96,50` cuando hay céntimos. */
export function formatearUsd(monto: number): string {
  const esRedondo = Number.isInteger(monto);
  return `$${esRedondo ? FORMATO_USD_ENTERO.format(monto) : FORMATO_USD.format(monto)}`;
}

/** `Bs 4.380`. Se redondea al bolívar: los céntimos no significan nada aquí. */
export function formatearBs(montoUsd: number, tasa: number): string {
  return `Bs ${FORMATO_BS.format(Math.round(montoUsd * tasa))}`;
}

/** `Bs 36,50 / $` — el rótulo de la tasa en la barra superior. */
export function formatearTasa(tasa: number): string {
  return `Bs ${FORMATO_USD.format(tasa)} / $`;
}

/**
 * Cuánto se ahorra contra el precio del mismo producto en un marketplace con
 * comisión. Devuelve null cuando no hay comparación que hacer, para no
 * inventar un ahorro que no existe.
 */
export function calcularAhorro(
  precioUsd: number,
  precioReferenciaUsd: number | null,
): { monto: number; porcentaje: number } | null {
  if (precioReferenciaUsd === null || precioReferenciaUsd <= precioUsd) {
    return null;
  }

  const monto = precioReferenciaUsd - precioUsd;
  return {
    monto,
    porcentaje: Math.round((monto / precioReferenciaUsd) * 100),
  };
}
