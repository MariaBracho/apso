"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import {
  COOKIE_CARRITO,
  leerCarrito,
  obtenerCarritoActual,
} from "@/lib/carrito";
import { obtenerAjustes, obtenerTasaVigente } from "@/lib/catalogo";
import { preciosDe, precioSegunPago } from "@/lib/precio";
import {
  type DatosPedido,
  type DatosPedidoConCuenta,
  esquemaPedido,
  esquemaPedidoConCuenta,
  validar,
} from "@/lib/esquemas";
import { avisarPedidoNuevo } from "@/lib/correo";
import { COOKIE_PEDIDO, NOMBRE_PAGO, destinoDe } from "@/lib/pedido";
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
  datos: DatosPedido | DatosPedidoConCuenta,
): Promise<EstadoPedido> {
  // Con cuenta el contacto sale del perfil y el formulario ni lo pide; sin
  // cuenta llega en el formulario, porque no hay de dónde más sacarlo. Se
  // decide con la sesión de verdad y no con lo que diga el navegador: un
  // server action se puede llamar sin pasar por el formulario.
  const sesion = await obtenerSesion();

  let pedido: DatosPedidoConCuenta;
  let contacto: { nombre: string; whatsapp: string; correo: string | null };

  if (sesion) {
    const resultado = await validar(esquemaPedidoConCuenta, datos);
    if (!resultado.ok) return { error: resultado.error };

    // Sin número no hay por dónde atender el pedido. Se manda a completarlo en
    // vez de registrar algo que nadie va a poder responder.
    if (!sesion.whatsapp) {
      redirect(`/perfil/completar?destino=${encodeURIComponent("/pedido")}`);
    }

    pedido = resultado.valores;
    contacto = {
      nombre: sesion.nombre,
      whatsapp: sesion.whatsapp,
      correo: sesion.correo,
    };
  } else {
    const resultado = await validar(esquemaPedido, datos);
    if (!resultado.ok) return { error: resultado.error };

    pedido = resultado.valores;
    contacto = {
      nombre: resultado.valores.cliente_nombre,
      whatsapp: `+58${resultado.valores.whatsapp}`,
      correo: resultado.valores.cliente_correo,
    };
  }

  const items = await leerCarrito();
  if (items.length === 0) {
    return { error: "Tu carrito está vacío." };
  }

  const supabase = crearClienteServicio();

  // La misma función que usa toda la tienda, margen incluido. Antes esto
  // consultaba `tasas_cambio` por su cuenta: al aparecer el margen, el cliente
  // habría visto un monto en el checkout y otro en su confirmación.
  const tasa = await obtenerTasaVigente();

  if (tasa === null) {
    return {
      error: "No hay tasa del día cargada. Escríbenos por WhatsApp y lo cerramos por ahí.",
    };
  }

  // El precio depende de cómo vaya a pagar: en divisas rige el que se carga en
  // el panel, y en bolívares ese mismo más el recargo. Se decide aquí y no en
  // el navegador porque es lo que se le va a cobrar.
  const { recargo } = await obtenerAjustes();

  // Se lee del producto, no del carrito: el carrito guarda el precio de cuando
  // se agregó y el que vale es el de ahora, que es el que se le mostró.
  const precioDe = (precioDivisa: number) =>
    precioSegunPago(preciosDe(precioDivisa, recargo), pedido.metodo_pago);

  const subtotalUsd = items.reduce(
    (total, item) => total + precioDe(item.producto.precio_usd) * item.cantidad,
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

  // Con sesión el pedido queda colgado de la cuenta y aparece en «Mis
  // pedidos». Sin ella se registra igual: no hay muro de registro, y la cuenta
  // puede llegar después y reclamarlo por el WhatsApp.
  const { data: creado, error: errorPedido } = await supabase
    .from("pedidos")
    .insert({
      perfil_id: sesion?.id ?? null,
      // El pedido guarda a quién contactar tal como estaba ese día, aunque la
      // persona cambie de número después.
      cliente_nombre: contacto.nombre,
      cliente_whatsapp: contacto.whatsapp,
      cliente_correo: contacto.correo,
      entrega: pedido.entrega,
      estado_destino: pedido.estado_destino,
      ciudad_destino: pedido.ciudad_destino,
      metodo_pago: pedido.metodo_pago,
      para_que_lo_usa: pedido.para_que_lo_usa,
      es_encargo: esEncargo,
      plazo_encargo_dias: plazoEncargo && plazoEncargo > 0 ? plazoEncargo : null,
      tasa_cambio: tasa,
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
      // El mismo precio que se sumó al subtotal, o las líneas no cuadrarían
      // con el total del pedido.
      precio_usd_unitario: precioDe(item.producto.precio_usd),
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

  // Va en `after` para que corra una vez respondido: el cliente no tiene por
  // qué esperar a que un proveedor de correo conteste, y si ese proveedor está
  // caído el pedido ya está guardado igual.
  after(async () => {
    await avisarPedidoNuevo({
      numero: creado.numero,
      clienteNombre: contacto.nombre,
      clienteWhatsapp: contacto.whatsapp,
      clienteCorreo: contacto.correo,
      destino: destinoDe({ ...pedido, entrega: pedido.entrega }),
      metodoPago: NOMBRE_PAGO[pedido.metodo_pago] ?? pedido.metodo_pago,
      paraQueLoUsa: pedido.para_que_lo_usa,
      totalUsd: subtotalUsd,
      tasa,
      items: items.map((item) => ({
        nombre: item.producto.nombre,
        cantidad: item.cantidad,
        precioUsd: precioDe(item.producto.precio_usd),
      })),
    });
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
