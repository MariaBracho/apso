"use server";

import { revalidatePath } from "next/cache";

import { obtenerCarritoActual, obtenerOCrearCarrito } from "@/lib/carrito";
import { crearClienteServicio } from "@/lib/supabase/servicio";

export type EstadoCarrito = { error: string } | { ok: true } | undefined;

/**
 * Agrega al carrito.
 *
 * El precio se lee de la base, nunca de lo que mande el navegador, y se guarda
 * el del momento: si cambia antes de enviar el pedido, el carrito lo avisa en
 * vez de cobrar otra cosa en silencio.
 *
 * La reserva es blanda: se descuenta de lo que se muestra pero no bloquea el
 * inventario. Que dos personas lleguen a la última unidad es un caso previsto
 * (flujo 12), no algo que se evite haciendo esperar a nadie.
 */
export async function agregarAlCarrito(
  productoId: string,
  cantidad: number,
): Promise<EstadoCarrito> {
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    return { error: "Cantidad inválida." };
  }

  const supabase = crearClienteServicio();

  const { data: producto, error: fallo } = await supabase
    .from("productos")
    .select("id, precio_usd, stock, activo")
    .eq("id", productoId)
    .maybeSingle();

  // Que la consulta falle no es lo mismo que el producto no exista, y decirle
  // «ya no está disponible» a quien mira el producto en pantalla es mentira:
  // manda a buscar el fallo en el inventario cuando está en la conexión o en
  // las credenciales del servidor.
  if (fallo) {
    console.error(`[carrito] no se pudo leer el producto: ${fallo.message}`);
    return { error: "No se pudo agregar al carrito. Intenta de nuevo." };
  }

  if (!producto || !producto.activo) {
    return { error: "Ese producto ya no está disponible." };
  }

  const carritoId = await obtenerOCrearCarrito();

  const { data: existente } = await supabase
    .from("carrito_items")
    .select("id, cantidad")
    .eq("carrito_id", carritoId)
    .eq("producto_id", productoId)
    .maybeSingle();

  if (existente) {
    const { error } = await supabase
      .from("carrito_items")
      .update({ cantidad: existente.cantidad + cantidad })
      .eq("id", existente.id);

    if (error) return { error: "No se pudo agregar al carrito." };
  } else {
    const { error } = await supabase.from("carrito_items").insert({
      carrito_id: carritoId,
      producto_id: productoId,
      cantidad,
      precio_usd_agregado: producto.precio_usd,
    });

    if (error) return { error: "No se pudo agregar al carrito." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function cambiarCantidad(itemId: string, cantidad: number) {
  // Se acota siempre al carrito de quien llama: la clave de servicio salta
  // RLS, así que el filtro por carrito_id es lo único que impide tocar el
  // carrito de otra persona conociendo el id de la fila.
  const carritoId = await obtenerCarritoActual();
  if (!carritoId) return;

  const supabase = crearClienteServicio();

  if (cantidad < 1) {
    await supabase
      .from("carrito_items")
      .delete()
      .eq("id", itemId)
      .eq("carrito_id", carritoId);
  } else {
    await supabase
      .from("carrito_items")
      .update({ cantidad })
      .eq("id", itemId)
      .eq("carrito_id", carritoId);
  }

  revalidatePath("/", "layout");
}

export async function quitarDelCarrito(itemId: string) {
  const carritoId = await obtenerCarritoActual();
  if (!carritoId) return;

  const supabase = crearClienteServicio();
  await supabase
    .from("carrito_items")
    .delete()
    .eq("id", itemId)
    .eq("carrito_id", carritoId);

  revalidatePath("/", "layout");
}

/**
 * Vacía el carrito de quien llama.
 *
 * Se borran las líneas y no el carrito: la fila de `carritos` es a lo que
 * apunta la cookie, y borrarla dejaría al navegador con una cookie apuntando a
 * nada. Vacío y reutilizable es lo que se quiere.
 */
export async function vaciarCarrito() {
  const carritoId = await obtenerCarritoActual();
  if (!carritoId) return;

  const supabase = crearClienteServicio();
  await supabase.from("carrito_items").delete().eq("carrito_id", carritoId);

  revalidatePath("/", "layout");
}
