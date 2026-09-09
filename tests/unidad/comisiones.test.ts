import { describe, expect, it } from "vitest";

import { calcularComision } from "@/lib/precio";

describe("calcularComision", () => {
  it("suma el margen de todas las líneas y saca el porcentaje", () => {
    const r = calcularComision(
      [
        { cantidad: 2, precio_usd_unitario: 120, costo: 78 },
        { cantidad: 1, precio_usd_unitario: 64, costo: 40 },
      ],
      10,
    );

    // (120 − 78) × 2 = 84, más (64 − 40) = 24.
    expect(r.margen).toBe(108);
    expect(r.monto).toBe(10.8);
    expect(r.itemsSinCosto).toBe(0);
  });

  /**
   * Sin costo la línea no entra al margen y se cuenta aparte. Meterla como
   * margen cero dejaría la comisión corta sin decir por qué, y quien la cobra
   * pensaría que le pagaron de menos.
   */
  it("aparta las líneas sin costo en vez de contarlas como cero", () => {
    const r = calcularComision(
      [
        { cantidad: 1, precio_usd_unitario: 120, costo: 78 },
        { cantidad: 1, precio_usd_unitario: 300, costo: null },
      ],
      10,
    );

    expect(r.margen).toBe(42);
    expect(r.monto).toBe(4.2);
    expect(r.itemsSinCosto).toBe(1);
  });

  it("un pedido entero sin costos no genera comisión, y lo dice", () => {
    const r = calcularComision(
      [{ cantidad: 3, precio_usd_unitario: 200, costo: null }],
      10,
    );

    expect(r.margen).toBe(0);
    expect(r.monto).toBe(0);
    expect(r.itemsSinCosto).toBe(1);
  });

  /** Nadie le cobra comisión a quien vendió con pérdida. */
  it("un pedido vendido por debajo del costo no paga comisión", () => {
    const r = calcularComision(
      [{ cantidad: 1, precio_usd_unitario: 100, costo: 130 }],
      10,
    );

    expect(r.margen).toBe(-30);
    expect(r.monto).toBe(0);
  });

  it("una línea con pérdida se compensa con las demás, no se ignora", () => {
    const r = calcularComision(
      [
        { cantidad: 1, precio_usd_unitario: 100, costo: 130 },
        { cantidad: 1, precio_usd_unitario: 200, costo: 100 },
      ],
      10,
    );

    // El pedido entero dejó 70, no 100: la pérdida de una línea es real.
    expect(r.margen).toBe(70);
    expect(r.monto).toBe(7);
  });

  it("redondea a dos decimales, que es como se paga", () => {
    const r = calcularComision(
      [{ cantidad: 3, precio_usd_unitario: 33.33, costo: 25.55 }],
      10,
    );

    expect(r.margen).toBe(23.34);
    expect(r.monto).toBe(2.33);
  });

  it("en cero por ciento no se paga nada", () => {
    const r = calcularComision(
      [{ cantidad: 1, precio_usd_unitario: 120, costo: 78 }],
      0,
    );

    expect(r.margen).toBe(42);
    expect(r.monto).toBe(0);
  });
});
