import { describe, expect, it } from "vitest";

import { WHATSAPP_ASESOR, enlaceWhatsapp } from "@/lib/contacto";

describe("enlaceWhatsapp", () => {
  it("sin destino escribe a la tienda, que es lo que hace el cliente", () => {
    const url = new URL(enlaceWhatsapp("Hola"));
    expect(url.pathname).toBe(`/${WHATSAPP_ASESOR}`);
  });

  it("con destino escribe a ese número", () => {
    // Este es el fallo que tuvo el panel: «Escribir al cliente» abría una
    // conversación de apso consigo misma porque el destino se ignoraba.
    const url = new URL(enlaceWhatsapp("Hola", "+584141234567"));
    expect(url.pathname).toBe("/584141234567");
    expect(url.pathname).not.toBe(`/${WHATSAPP_ASESOR}`);
  });

  it("limpia el + y los símbolos, que wa.me no acepta", () => {
    for (const numero of ["+58 414 123 4567", "(0414) 123-4567", "+584141234567"]) {
      const url = new URL(enlaceWhatsapp("Hola", numero));
      expect(/^\/\d+$/.test(url.pathname), `${numero} debería quedar en dígitos`).toBe(true);
    }
  });

  it("escapa el mensaje para que no rompa la dirección", () => {
    const url = new URL(enlaceWhatsapp("Pedido A-1: 2 × RAM & SSD ¿queda?"));
    expect(url.searchParams.get("text")).toBe("Pedido A-1: 2 × RAM & SSD ¿queda?");
  });
});
