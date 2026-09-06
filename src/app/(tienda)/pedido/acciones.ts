"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_CARRITO,
  leerCarrito,
  obtenerCarritoActual,
} from "@/lib/carrito";
import { type DatosPedido, esquemaPedido, validar } from "@/lib/esquemas";
import { COOKIE_PEDIDO } from "@/lib/pedido";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServicio } from "@/lib/supabase/servicio";

export type EstadoPedido = { error: string } | undefined;

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
  datos: DatosPedido,
): Promise<EstadoPedido> {
  const resultado = await validar(esquemaPedido, datos);
  if (!resultado.ok) return { error: resultado.error };

  const pedido = resultado.valores;

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
