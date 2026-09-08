import { describe, expect, it } from "vitest";

import { formatearBs, formatearTasa, formatearUsd } from "@/lib/formato";

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
