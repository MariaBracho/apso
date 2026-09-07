import "server-only";

import { CORREO_PEDIDOS, SITIO } from "@/lib/contacto";
import { formatearBs, formatearUsd } from "@/lib/formato";

/**
 * Aviso por correo de cada pedido nuevo.
 *
 * El pedido ya abre WhatsApp con todo escrito, pero eso depende de que el
 * cliente le dé a enviar. Si se arrepiente o se le cierra el navegador, el
 * pedido queda en el panel y nadie se entera. Este correo es el que no depende
 * de nadie.
 *
 * Sin `RESEND_API_KEY` no hace nada y lo dice en el log. Es a propósito: la
 * tienda tiene que funcionar igual antes de que el correo esté configurado, y
 * un pedido no se puede perder porque falte una credencial.
 */

export type ResumenPedido = {
  numero: string;
  clienteNombre: string;
  clienteWhatsapp: string;
  clienteCorreo: string | null;
  entrega: string;
  ciudadDestino: string | null;
  metodoPago: string;
  paraQueLoUsa: string | null;
  totalUsd: number;
  tasa: number;
  items: Array<{ nombre: string; cantidad: number; precioUsd: number }>;
};

export async function avisarPedidoNuevo(pedido: ResumenPedido): Promise<void> {
  const clave = process.env.RESEND_API_KEY;

  if (!clave) {
    console.warn(
      `[correo] ${pedido.numero} sin avisar: falta RESEND_API_KEY. El pedido sí quedó registrado.`,
    );
    return;
  }

  // Mientras el dominio no esté verificado en Resend, su remitente de pruebas
  // funciona pero solo entrega a la cuenta dueña de la clave.
  const remitente = process.env.CORREO_REMITENTE ?? "apso <onboarding@resend.dev>";

  try {
    const respuesta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: remitente,
        to: [CORREO_PEDIDOS],
        // El asunto lleva lo que se necesita para decidir si abrirlo ya o
        // después: quién y cuánto.
        subject: `Pedido ${pedido.numero} · ${pedido.clienteNombre} · ${formatearUsd(pedido.totalUsd)}`,
        // Se responde al cliente, no a la tienda.
        reply_to: pedido.clienteCorreo ?? undefined,
        text: enTextoPlano(pedido),
        html: enHtml(pedido),
      }),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      console.error(
        `[correo] ${pedido.numero} rechazado por Resend (${respuesta.status}): ${detalle}`,
      );
    }
  } catch (error) {
    // Se traga el fallo a propósito: esto corre después de responderle al
    // cliente, y un correo caído no puede convertirse en un pedido perdido.
    console.error(`[correo] ${pedido.numero} no se pudo enviar:`, error);
  }
}

function lineas(pedido: ResumenPedido): string[] {
  return pedido.items.map(
    (i) =>
      `${i.cantidad} × ${i.nombre} — ${formatearUsd(i.precioUsd * i.cantidad)}`,
  );
}

function enTextoPlano(p: ResumenPedido): string {
  return [
    `Pedido ${p.numero}`,
    "",
    `Cliente: ${p.clienteNombre}`,
    `WhatsApp: ${p.clienteWhatsapp}`,
    p.clienteCorreo ? `Correo: ${p.clienteCorreo}` : null,
    "",
    ...lineas(p),
    "",
    `Total: ${formatearUsd(p.totalUsd)} · ${formatearBs(p.totalUsd, p.tasa)}`,
    `Pago: ${p.metodoPago}`,
    `Entrega: ${p.entrega}${p.ciudadDestino ? ` — ${p.ciudadDestino}` : ""}`,
    p.paraQueLoUsa ? `\nLo quiere para: «${p.paraQueLoUsa}»` : null,
    "",
    `Atenderlo: ${SITIO}/admin/pedidos`,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

/**
 * HTML deliberadamente pobre: tablas y estilos en línea.
 *
 * Los clientes de correo ignoran hojas de estilo y la mitad de CSS moderno,
 * así que aquí no aplica nada del diseño de la tienda.
 */
function enHtml(p: ResumenPedido): string {
  const filas = p.items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 0;color:#241735;">${escapar(String(i.cantidad))} × ${escapar(i.nombre)}</td>
        <td style="padding:8px 0;text-align:right;color:#241735;white-space:nowrap;">
          ${escapar(formatearUsd(i.precioUsd * i.cantidad))}
        </td>
      </tr>`,
    )
    .join("");

  return `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;color:#241735;">
  <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b6478;margin:0 0 4px;">
    Pedido nuevo
  </p>
  <h1 style="font-size:24px;margin:0 0 16px;">${escapar(p.numero)}</h1>

  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr><td style="color:#6b6478;padding:2px 0;">Cliente</td><td style="text-align:right;">${escapar(p.clienteNombre)}</td></tr>
    <tr><td style="color:#6b6478;padding:2px 0;">WhatsApp</td><td style="text-align:right;">${escapar(p.clienteWhatsapp)}</td></tr>
    ${p.clienteCorreo ? `<tr><td style="color:#6b6478;padding:2px 0;">Correo</td><td style="text-align:right;">${escapar(p.clienteCorreo)}</td></tr>` : ""}
    <tr><td style="color:#6b6478;padding:2px 0;">Pago</td><td style="text-align:right;">${escapar(p.metodoPago)}</td></tr>
    <tr><td style="color:#6b6478;padding:2px 0;">Entrega</td><td style="text-align:right;">${escapar(p.entrega)}${p.ciudadDestino ? ` — ${escapar(p.ciudadDestino)}` : ""}</td></tr>
  </table>

  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:20px;border-top:1px solid #ddd;">
    ${filas}
    <tr>
      <td style="padding:12px 0 0;border-top:1px solid #ddd;font-weight:600;">Total</td>
      <td style="padding:12px 0 0;border-top:1px solid #ddd;text-align:right;font-weight:600;">
        ${escapar(formatearUsd(p.totalUsd))}<br>
        <span style="font-weight:400;color:#6b6478;font-size:12px;">${escapar(formatearBs(p.totalUsd, p.tasa))}</span>
      </td>
    </tr>
  </table>

  ${
    p.paraQueLoUsa
      ? `<p style="margin-top:20px;padding-left:12px;border-left:3px solid #5CD7E8;color:#4a4458;font-style:italic;font-size:14px;">«${escapar(p.paraQueLoUsa)}»</p>`
      : ""
  }

  <p style="margin-top:24px;">
    <a href="${SITIO}/admin/pedidos" style="background:#5CD7E8;color:#1a1524;padding:10px 20px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:600;">
      Atender el pedido
    </a>
  </p>
</div>`;
}

/** El nombre y el uso los escribe el cliente: no pueden entrar crudos al HTML. */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
