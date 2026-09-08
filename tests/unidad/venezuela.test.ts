import { describe, expect, it } from "vitest";

import { ESTADOS, ciudadesDe, esDestinoValido } from "@/lib/venezuela";

/**
 * El dataset vino de fuera y se corrigió a mano, así que estas pruebas son la
 * red que avisa si alguna de esas correcciones se pierde al reemplazarlo.
 */
describe("ESTADOS", () => {
  it("están los 24 y ninguno se queda sin ciudades", () => {
    expect(ESTADOS).toHaveLength(24);

    for (const estado of ESTADOS) {
      expect(estado.ciudades.length, `${estado.nombre} sin ciudades`).toBeGreaterThan(0);
    }
  });

  it("Vargas se llama La Guaira desde 2019", () => {
    const nombres = ESTADOS.map((e) => e.nombre);
    expect(nombres).toContain("La Guaira");
    expect(nombres).not.toContain("Vargas");
  });

  it("Distrito Capital tiene Caracas, que el dataset dejaba vacío", () => {
    expect(ciudadesDe("Distrito Capital")).toContain("Caracas");
  });

  it("no hay ciudades repetidas dentro de un estado", () => {
    for (const estado of ESTADOS) {
      const unicas = new Set(estado.ciudades);
      expect(unicas.size, `${estado.nombre} repite ciudades`).toBe(
        estado.ciudades.length,
      );
    }
  });

  it("las ciudades vienen ordenadas, que es como se busca en una lista larga", () => {
    for (const estado of ESTADOS) {
      const ordenadas = [...estado.ciudades].sort((a, b) =>
        a.localeCompare(b, "es"),
      );
      expect(estado.ciudades, `${estado.nombre} desordenado`).toEqual(ordenadas);
    }
  });
});

describe("ciudadesDe", () => {
  it("devuelve las del estado que se pide", () => {
    expect(ciudadesDe("Falcón")).toContain("Punto Fijo");
    expect(ciudadesDe("Zulia")).toContain("Maracaibo");
  });

  it("un estado que no existe devuelve vacío y no revienta", () => {
    expect(ciudadesDe("Cundinamarca")).toEqual([]);
    expect(ciudadesDe("")).toEqual([]);
  });
});

describe("esDestinoValido", () => {
  it("acepta el par correcto", () => {
    expect(esDestinoValido("Falcón", "Punto Fijo")).toBe(true);
  });

  /**
   * Lo que de verdad protege: las dos existen por separado, pero juntas son un
   * destino al que no llega ninguna encomienda.
   */
  it("rechaza una ciudad que es de otro estado", () => {
    expect(esDestinoValido("Zulia", "Punto Fijo")).toBe(false);
    expect(esDestinoValido("Falcón", "Maracaibo")).toBe(false);
  });

  it("rechaza lo inventado", () => {
    expect(esDestinoValido("Falcón", "Springfield")).toBe(false);
    expect(esDestinoValido("", "")).toBe(false);
  });
});
