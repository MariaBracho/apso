import { describe, expect, it } from "vitest";

import {
  aDivisa,
  esPagoEnDivisa,
  margenDe,
  precioSegunPago,
  preciosDe,
} from "@/lib/precio";

describe("preciosDe", () => {
  it("deriva el precio en bolívares sumando el recargo al de divisas", () => {
    // El ejemplo con el que María describió el modelo.
    const precios = preciosDe(680, 19);

    expect(precios.divisa).toBe(680);
    expect(precios.bolivares).toBe(809.2);
    expect(precios.ahorro).toBe(129.2);
  });

  it("sin recargo los dos precios son el mismo y no hay ahorro que anunciar", () => {
    const precios = preciosDe(120, 0);

    expect(precios.bolivares).toBe(120);
    expect(precios.ahorro).toBe(0);
  });

  it("redondea a dos decimales, que es como se muestra el dinero", () => {
    // 62 × 1,19 = 73,78 exacto; sin redondear, casos así arrastran decimales
    // que hacen que el total del carrito no cuadre con la suma de las líneas.
    expect(preciosDe(62, 19).bolivares).toBe(73.78);
    expect(preciosDe(64, 19).bolivares).toBe(76.16);

    // Un caso con arrastre real en coma flotante.
    const precios = preciosDe(19.99, 19);
    expect(precios.bolivares).toBe(23.79);
    expect(Number.isInteger(precios.bolivares * 100)).toBe(true);
  });

  it("el ahorro es exactamente la diferencia entre los dos precios", () => {
    for (const base of [10, 62, 120, 690, 1999.99]) {
      const p = preciosDe(base, 19);
      expect(p.ahorro).toBeCloseTo(p.bolivares - p.divisa, 2);
    }
  });
});

describe("esPagoEnDivisa", () => {
  it("bolívares para pago móvil y transferencia", () => {
    expect(esPagoEnDivisa("pago_movil")).toBe(false);
    expect(esPagoEnDivisa("transferencia_bs")).toBe(false);
  });

  it("divisas para lo que se cobra en dólares", () => {
    expect(esPagoEnDivisa("zelle")).toBe(true);
    expect(esPagoEnDivisa("binance")).toBe(true);
    expect(esPagoEnDivisa("efectivo")).toBe(true);
    expect(esPagoEnDivisa("tarjeta_internacional")).toBe(true);
  });

  it("un método desconocido cobra el precio en bolívares, que es el más alto", () => {
    // Ante la duda se cobra de más y no de menos: cobrar de menos es una
    // pérdida silenciosa, cobrar de más lo reclama el cliente.
    expect(esPagoEnDivisa("")).toBe(false);
    expect(esPagoEnDivisa("cripto_inventada")).toBe(false);
  });
});

describe("precioSegunPago", () => {
  const precios = preciosDe(680, 19);

  it("cobra el de bolívares a quien paga en bolívares", () => {
    expect(precioSegunPago(precios, "pago_movil")).toBe(809.2);
  });

  it("cobra el de divisas a quien paga en dólares", () => {
    expect(precioSegunPago(precios, "zelle")).toBe(680);
  });
});

describe("aDivisa", () => {
  it("deshace el recargo: es la vuelta de preciosDe", () => {
    for (const base of [62, 120, 680, 1999.99]) {
      const { bolivares } = preciosDe(base, 19);
      expect(aDivisa(bolivares, 19)).toBeCloseTo(base, 2);
    }
  });

  it("sin recargo no cambia nada", () => {
    expect(aDivisa(150, 0)).toBe(150);
  });
});

describe("margenDe", () => {
  it("es la diferencia contra el costo, y el porcentaje va sobre la venta", () => {
    const margen = margenDe(120, 78);

    expect(margen?.monto).toBe(42);
    // 42 de 120, no 42 de 78: es como se lee un margen de tienda.
    expect(margen?.porcentaje).toBe(35);
    // Sin comisión pedida no se descuenta nada.
    expect(margen?.comision).toBe(0);
    expect(margen?.neto).toBe(42);
  });

  it("la comisión sale del margen, no del precio", () => {
    const margen = margenDe(120, 78, 10);

    // 10 % de 42, no de 120.
    expect(margen?.comision).toBe(4.2);
    expect(margen?.neto).toBe(37.8);
  });

  /**
   * Sin costo cargado no se inventa un margen. Con él se decide qué comprar y
   * a cuánto vender, así que uno inventado es peor que ninguno.
   */
  it("sin costo no hay margen que mostrar", () => {
    expect(margenDe(120, null)).toBeNull();
  });

  it("avisa cuando se está vendiendo por debajo del costo", () => {
    const margen = margenDe(100, 130);

    expect(margen?.monto).toBe(-30);
    expect(margen?.porcentaje).toBe(-30);
  });

  /** Nadie le cobra comisión a quien vendió algo con pérdida. */
  it("sin ganancia no hay comisión, ni siquiera negativa", () => {
    const margen = margenDe(100, 130, 10);

    expect(margen?.comision).toBe(0);
    expect(margen?.neto).toBe(-30);
  });

  it("con costo cero el margen es todo el precio, no un error", () => {
    expect(margenDe(50, 0)).toEqual({
      monto: 50,
      porcentaje: 100,
      comision: 0,
      neto: 50,
    });
  });

  it("redondea la comisión a dos decimales, que es como se paga", () => {
    // 10 % de 23,79 son 2,379: si no se redondea, la nómina no cuadra.
    expect(margenDe(100, 76.21, 10)?.comision).toBe(2.38);
  });

  it("un precio en cero no divide entre cero", () => {
    expect(margenDe(0, 10)).toBeNull();
  });
});
