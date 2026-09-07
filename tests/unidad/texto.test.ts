import { describe, expect, it } from "vitest";

import { generarSlug } from "@/lib/texto";

describe("generarSlug", () => {
  it("pasa a minúsculas y une con guiones", () => {
    expect(generarSlug("Corsair Vengeance 32 GB")).toBe("corsair-vengeance-32-gb");
  });

  it("quita los acentos, que no valen en una dirección", () => {
    expect(generarSlug("Tarjetas Gráficas")).toBe("tarjetas-graficas");
    expect(generarSlug("Almacenamiento SSD Ñu")).toBe("almacenamiento-ssd-nu");
  });

  it("no deja guiones sueltos en los bordes ni repetidos", () => {
    expect(generarSlug("  Dell Latitude 7430 14\" Touch  ")).toBe("dell-latitude-7430-14-touch");
    expect(generarSlug("RAM // DDR5")).toBe("ram-ddr5");
  });

  it("con solo símbolos devuelve vacío, para que el llamador decida", () => {
    expect(generarSlug("¡!¿?")).toBe("");
  });
});
