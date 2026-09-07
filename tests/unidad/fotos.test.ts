import { describe, expect, it } from "vitest";

import { MAXIMO, avisoDeRecorte, motivoRechazo } from "@/lib/fotos";

/** Un File de mentira: solo hacen falta tipo y tamaño. */
function archivo(tipo: string, bytes: number): File {
  return { type: tipo, size: bytes, name: "foto" } as File;
}

describe("motivoRechazo", () => {
  it("acepta los formatos que aguanta el depósito", () => {
    for (const tipo of ["image/jpeg", "image/png", "image/webp", "image/avif"]) {
      expect(motivoRechazo(archivo(tipo, 500_000)), tipo).toBeNull();
    }
  });

  it("rechaza lo que no es una imagen soportada", () => {
    expect(motivoRechazo(archivo("application/pdf", 500_000))).toMatch(/JPG|PNG/i);
    expect(motivoRechazo(archivo("image/gif", 500_000))).toMatch(/JPG|PNG/i);
  });

  it("rechaza el archivo vacío y el que pasa del límite", () => {
    expect(motivoRechazo(archivo("image/png", 0))).toMatch(/vacío/i);
    expect(motivoRechazo(archivo("image/png", MAXIMO + 1))).toMatch(/5 MB/);
  });

  it("acepta justo en el límite", () => {
    expect(motivoRechazo(archivo("image/png", MAXIMO))).toBeNull();
  });
});

describe("avisoDeRecorte", () => {
  it("calla cuando la foto ya es 4:3", () => {
    expect(avisoDeRecorte(1200, 900)).toBeNull();
    expect(avisoDeRecorte(800, 600)).toBeNull();
    // 1024 × 768 es 4:3 exacto y muy común.
    expect(avisoDeRecorte(1024, 768)).toBeNull();
  });

  it("avisa de qué lado se pierde", () => {
    // Un banner panorámico pierde los lados, que es donde los proveedores
    // ponen el modelo y las especificaciones.
    expect(avisoDeRecorte(1920, 1080)).toMatch(/los lados/);
    // Una foto vertical pierde arriba y abajo.
    expect(avisoDeRecorte(900, 1600)).toMatch(/arriba y abajo/);
  });

  it("dice la medida ideal para no dejar adivinando", () => {
    expect(avisoDeRecorte(1920, 1080)).toMatch(/1200 × 900/);
  });

  it("tolera desviaciones mínimas en vez de molestar por un píxel", () => {
    expect(avisoDeRecorte(1201, 900)).toBeNull();
  });

  it("no avisa de una imagen sin medidas", () => {
    expect(avisoDeRecorte(0, 0)).toBeNull();
  });
});
