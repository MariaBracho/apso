import { describe, expect, it } from "vitest";

import { aUsd, saldosPorMetodo } from "@/lib/precio";

describe("aUsd", () => {
  it("un pago en divisas se guarda tal cual", () => {
    expect(aUsd(120, "efectivo", 820)).toBe(120);
    expect(aUsd(58.5, "zelle", 820)).toBe(58.5);
  });

  /**
   * Lo que se escribe en un método en bolívares son bolívares. Guardarlos como
   * dólares sin dividir metería cien mil dólares en la caja.
   */
  it("un pago en bolívares se divide por la tasa", () => {
    expect(aUsd(100000, "pago_movil", 820)).toBe(121.95);
    expect(aUsd(82000, "transferencia_bs", 820)).toBe(100);
  });

  it("sin tasa no inventa una conversión", () => {
    expect(aUsd(100000, "pago_movil", 0)).toBe(0);
  });
});

describe("saldosPorMetodo", () => {
  it("separa la plata por donde está, no en un solo total", () => {
    const r = saldosPorMetodo([
      { metodo: "efectivo", montoUsd: 120, signo: 1 },
      { metodo: "zelle", montoUsd: 200, signo: 1 },
      { metodo: "efectivo", montoUsd: 30, signo: -1 },
    ]);

    // El efectivo del mostrador y el saldo de Zelle son plata distinta.
    expect(r.porMetodo).toEqual({ efectivo: 90, zelle: 200 });
    expect(r.entro).toBe(320);
    expect(r.salio).toBe(30);
    expect(r.neto).toBe(290);
  });

  /**
   * Un gasto sin método sigue saliendo de la caja. Descartarlo haría que la
   * suma de los saldos no cuadre con el neto, que es el error que nadie
   * encuentra.
   */
  it("lo que no tiene método se suma aparte y no se pierde", () => {
    const r = saldosPorMetodo([
      { metodo: "efectivo", montoUsd: 100, signo: 1 },
      { metodo: null, montoUsd: 40, signo: -1 },
    ]);

    expect(r.porMetodo).toEqual({ efectivo: 100 });
    expect(r.sinMetodo).toBe(-40);
    expect(r.neto).toBe(60);

    const suma = Object.values(r.porMetodo).reduce((a, b) => a + b, 0) + r.sinMetodo;
    expect(suma).toBeCloseTo(r.neto, 2);
  });

  it("un saldo puede quedar negativo, y se dice", () => {
    const r = saldosPorMetodo([
      { metodo: "binance", montoUsd: 50, signo: -1 },
    ]);

    expect(r.porMetodo.binance).toBe(-50);
    expect(r.neto).toBe(-50);
  });

  it("sin movimientos todo es cero", () => {
    expect(saldosPorMetodo([])).toEqual({
      porMetodo: {},
      sinMetodo: 0,
      entro: 0,
      salio: 0,
      neto: 0,
    });
  });
});

/**
 * La invariante de la caja: la suma de los saldos por método más lo que no
 * tiene método tiene que dar el neto. Si eso deja de cumplirse, hay plata que
 * se contó dos veces o que desapareció, y no hay forma de encontrarla mirando
 * la pantalla.
 */
describe("la caja siempre cuadra", () => {
  it("cobros, reembolsos, compras y gastos suman al neto", () => {
    const r = saldosPorMetodo([
      // Cobros.
      { metodo: "efectivo", montoUsd: 142.8, signo: 1 },
      { metodo: "pago_movil", montoUsd: 85.68, signo: 1 },
      // Un reembolso: entró y volvió a salir.
      { metodo: "efectivo", montoUsd: 71.4, signo: -1 },
      // Compra de mercancía.
      { metodo: "zelle", montoUsd: 152, signo: -1 },
      // Gasto.
      { metodo: "efectivo", montoUsd: 22, signo: -1 },
      // Comisión liquidada, sin método.
      { metodo: null, montoUsd: 8.4, signo: -1 },
    ]);

    expect(r.entro).toBe(228.48);
    expect(r.salio).toBe(253.8);
    expect(r.neto).toBe(-25.32);

    const suma =
      Object.values(r.porMetodo).reduce((a, b) => a + b, 0) + r.sinMetodo;
    expect(suma).toBeCloseTo(r.neto, 2);

    // Y cada método dice lo suyo, sin mezclarse.
    expect(r.porMetodo.efectivo).toBe(49.4);
    expect(r.porMetodo.pago_movil).toBe(85.68);
    expect(r.porMetodo.zelle).toBe(-152);
  });
});
