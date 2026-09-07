import { describe, expect, it } from "vitest";

import { calcularAhorro, formatearBs, formatearTasa, formatearUsd } from "@/lib/formato";

describe("formatearUsd", () => {
  it("sin céntimos cuando el monto es redondo", () => {
    expect(formatearUsd(120)).toBe("$120");
  });

  it("con céntimos cuando los hay, y con coma decimal", () => {
    expect(formatearUsd(142.8)).toBe("$142,80");
    expect(formatearUsd(96.5)).toBe("$96,50");
  });
});

describe("formatearBs", () => {
  it("multiplica por la tasa y redondea al bolívar", () => {
    // Los céntimos de bolívar no significan nada aquí.
    expect(formatearBs(142.8, 790)).toBe("Bs 112.812");
  });

  it("usa el punto como separador de miles, como se lee en Venezuela", () => {
    expect(formatearBs(1000, 790)).toBe("Bs 790.000");
  });
});

describe("formatearTasa", () => {
  it("nombra la unidad para que se entienda qué es", () => {
    expect(formatearTasa(807.39)).toBe("Bs 807,39 / $");
  });
});

describe("calcularAhorro", () => {
  it("calcula el monto y el porcentaje contra el precio de referencia", () => {
    const ahorro = calcularAhorro(120, 138);
    expect(ahorro?.monto).toBe(18);
    expect(ahorro?.porcentaje).toBe(13);
  });

  it("devuelve null cuando no hay comparación honesta que hacer", () => {
    // Sin referencia no se inventa un ahorro.
    expect(calcularAhorro(120, null)).toBeNull();
    // Y si la referencia no es mayor, tampoco: sería un descuento falso.
    expect(calcularAhorro(120, 120)).toBeNull();
    expect(calcularAhorro(142.8, 138)).toBeNull();
  });
});
