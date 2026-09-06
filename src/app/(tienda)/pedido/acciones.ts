"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  COOKIE_CARRITO,
  leerCarrito,
  obtenerCarritoActual,
} from "@/lib/carrito";
import { COOKIE_PEDIDO } from "@/lib/pedido";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServicio } from "@/lib/supabase/servicio";

export type EstadoPedido = { error: string } | undefined;

const esquemaPedido = z.object({
  cliente_nombre: z.string().trim().min(2, "Escribe tu nombre."),
  // El +58 es fijo en la interfaz; aquí llegan los 10 dígitos.
  whatsapp: z
    .string()
    .regex(/^[0-9]{10}$/, "El WhatsApp son 10 dígitos, sin el 0 ni el +58."),
  cliente_correo: z.email("Ese correo no parece válido.").nullable(),
  entrega: z.enum(["punto_fijo", "envio_nacional"]),
  ciudad_destino: z.string().trim().nullable(),
  metodo_pago: z.enum([
    "pago_movil",
    "transferencia_bs",
    "zelle",
    "binance",
    "efectivo",
    "tarjeta_internacional",
  ]),
  para_que_lo_usa: z.string().trim().nullable(),
});

/**
 * Crea el pedido.
 *
 * Todo lo que cuesta dinero se lee de la base en este momento — precio por
 * unidad, tasa vigente, garantía — y se congela en el pedido. Del formulario
 * solo se toman los datos de contacto y las preferencias; un total que venga
 * del navegador no se usa nunca.
 *
 * No se cobra nada: el pedido queda registrado y la conversación sigue por
 * WhatsApp, que es donde este negocio cierra.
 */
export async function enviarPedido(
  _previo: EstadoPedido,
  datos: FormData,
): Promise<EstadoPedido> {
  const crudo = {
    cliente_nombre: String(datos.get("cliente_nombre") ?? "").trim(),
    whatsapp: String(datos.get("whatsapp") ?? "").replace(/[^0-9]/g, ""),
    cliente_correo: vacioANulo(datos.get("cliente_correo")),
    entrega: String(datos.get("entrega") ?? "punto_fijo"),
    ciudad_destino: vacioANulo(datos.get("ciudad_destino")),
    metodo_pago: String(datos.get("metodo_pago") ?? "pago_movil"),
    para_que_lo_usa: vacioANulo(datos.get("para_que_lo_usa")),
  };

  const validado = esquemaPedido.safeParse(crudo);
  if (!validado.success) {
    return { error: validado.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const pedido = validado.data;

  if (pedido.entrega === "envio_nacional" && !pedido.ciudad_destino) {
    return { error: "Dinos a qué ciudad enviamos." };
  }

  const items = await leerCarrito();
  if (items.length === 0) {
    return { error: "Tu carrito está vacío." };
  }

  const supabase = crearClienteServicio();

  const { data: tasaFila } = await supabase
    .from("tasas_cambio")
    .select("valor")
    .lte("vigente_desde", new Date().toISOString())
    .order("vigente_desde", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!tasaFila) {
    return {
      error: "No hay tasa del día cargada. Escríbenos por WhatsApp y lo cerramos por ahí.",
    };
  }

  // Se lee del producto, no del carrito: el carrito guarda el precio de cuando
  // se agregó y el que vale es el de ahora, que es el que se le mostró.
  const subtotalUsd = items.reduce(
    (total, item) => total + item.producto.precio_usd * item.cantidad,
    0,
  );

  // Un pedido es encargo si algo dentro no está en existencia.
  const esEncargo = items.some((item) => item.producto.stock < item.cantidad);
  const plazoEncargo = esEncargo
    ? Math.max(
        ...items
          .filter((item) => item.producto.stock < item.cantidad)
          .map((item) => item.producto.dias_encargo ?? 0),
      )
    : null;

  // Si hay sesión, el pedido queda colgado de la cuenta y aparece en «Mis
  // pedidos». Si no, el pedido igual se registra con los datos de contacto: no
  // hay muro de registro, y la cuenta puede llegar después.
  const sesion = await obtenerSesion();

  const { data: creado, error: errorPedido } = await supabase
    .from("pedidos")
    .insert({
      perfil_id: sesion?.id ?? null,
      cliente_nombre: pedido.cliente_nombre,
      cliente_whatsapp: `+58${pedido.whatsapp}`,
      cliente_correo: pedido.cliente_correo,
      entrega: pedido.entrega,
      ciudad_destino: pedido.ciudad_destino,
      metodo_pago: pedido.metodo_pago,
      para_que_lo_usa: pedido.para_que_lo_usa,
      es_encargo: esEncargo,
      plazo_encargo_dias: plazoEncargo && plazoEncargo > 0 ? plazoEncargo : null,
      tasa_cambio: tasaFila.valor,
      subtotal_usd: subtotalUsd,
      // El flete se cotiza por WhatsApp y se suma después, así que el total
      // arranca igual al subtotal.
      total_usd: subtotalUsd,
    })
    .select("id, numero")
    .single();

  if (errorPedido || !creado) {
    return { error: "No se pudo registrar el pedido. Intenta de nuevo." };
  }

  const { error: errorItems } = await supabase.from("pedido_items").insert(
    items.map((item) => ({
      pedido_id: creado.id,
      producto_id: item.producto.id,
      nombre_producto: item.producto.nombre,
      cantidad: item.cantidad,
      precio_usd_unitario: item.producto.precio_usd,
    })),
  );

  if (errorItems) {
    // Un pedido sin líneas no le sirve a nadie: se deshace para no dejar un
    // registro que el panel no puede atender.
    await supabase.from("pedidos").delete().eq("id", creado.id);
    return { error: "No se pudo registrar el pedido. Intenta de nuevo." };
  }

  await supabase.from("pedido_eventos").insert({
    pedido_id: creado.id,
    descripcion: "Pedido recibido desde la app",
    estado_nuevo: "por_confirmar",
  });

  // El carrito se vacía y se recuerda el pedido para poder mostrar la
  // confirmación sin exponer el número en una dirección adivinable.
  const carritoId = await obtenerCarritoActual();
  if (carritoId) {
    await supabase.from("carrito_items").delete().eq("carrito_id", carritoId);
  }

  const almacen = await cookies();
  almacen.set(COOKIE_PEDIDO, creado.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  almacen.delete(COOKIE_CARRITO);

  redirect("/pedido/confirmado");
}

function vacioANulo(valor: FormDataEntryValue | null): string | null {
  const texto = String(valor ?? "").trim();
  return texto === "" ? null : texto;
}
