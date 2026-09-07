import { describe, expect, it } from "vitest";

import {
  esCancelado,
  inventarioDeberiaEstarDescontado,
  progresoDe,
  secuenciaDe,
} from "@/lib/estados";

describe("inventarioDeberiaEstarDescontado", () => {
  it("no se descuenta mientras el pago no esté confirmado", () => {
    expect(inventarioDeberiaEstarDescontado("por_confirmar", false)).toBe(false);
  });

  it("se descuenta desde que se confirma el pago y en todo lo que sigue", () => {
    for (const estado of ["confirmado_y_pagado", "listo_entregar", "entregado"] as const) {
      expect(inventarioDeberiaEstarDescontado(estado, false), estado).toBe(true);
    }
  });

  it("se devuelve al inventario si el pedido se cancela", () => {
    // Cancelar tiene que dejar el stock como estaba, o el inventario miente.
    expect(inventarioDeberiaEstarDescontado("cancelado", false)).toBe(false);
    expect(inventarioDeberiaEstarDescontado("cancelado_reembolsado", false)).toBe(false);
    expect(inventarioDeberiaEstarDescontado("sin_stock_pendiente", false)).toBe(false);
  });

  it("un encargo tiene más pasos pero el mismo corte", () => {
    expect(inventarioDeberiaEstarDescontado("por_confirmar", true)).toBe(false);
    expect(inventarioDeberiaEstarDescontado("confirmado_y_pagado", true)).toBe(true);
    expect(inventarioDeberiaEstarDescontado("en_transito", true)).toBe(true);
  });
});

describe("secuenciaDe", () => {
  it("el encargo pasa por aduana y el de stock no", () => {
    expect(secuenciaDe(true)).toContain("en_aduana");
    expect(secuenciaDe(false)).not.toContain("en_aduana");
  });

  it("las dos empiezan igual y terminan entregando", () => {
    for (const esEncargo of [true, false]) {
      const s = secuenciaDe(esEncargo);
      expect(s[0]).toBe("por_confirmar");
      expect(s.at(-1)).toBe("entregado");
    }
  });
});

describe("esCancelado", () => {
  it("distingue las dos salidas de la cancelación", () => {
    expect(esCancelado("cancelado")).toBe(true);
    expect(esCancelado("cancelado_reembolsado")).toBe(true);
    expect(esCancelado("entregado")).toBe(false);
  });
});

describe("progresoDe", () => {
  it("un estado fuera de la línea no tiene posición en ella", () => {
    // -1 es lo que el stepper usa para no pintar ningún paso como alcanzado.
    expect(progresoDe("cancelado", false).indice).toBe(-1);
  });

  it("el primer estado está al principio y el último al final", () => {
    const { indice, total } = progresoDe("entregado", false);
    expect(indice).toBe(total - 1);
    expect(progresoDe("por_confirmar", false).indice).toBe(0);
  });
});
