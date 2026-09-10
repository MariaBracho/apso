"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { cambiarEstado } from "@/app/admin/(panel)/pedidos/acciones";
import { obtenerTasaVigente } from "@/lib/catalogo";
import { type DatosPedidoManual, esquemaPedidoManual, validar } from "@/lib/esquemas";
import { exigirAdmin } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type EstadoPedidoManual = { error: string } | undefined;

/**
 * Registra una venta que ocurrió fuera de la web.
 *
 * Es el pedido que nadie hizo desde la tienda: el que se cerró en el mostrador
 * o por chat. Se guarda igual que cualquier otro —mismo número, mismo
 * historial, mismos seriales— y con el origen anotado, para que las ventas de
 * la web sigan pudiéndose leer aparte.
 *
 * Los precios los pone quien vende y no se recalculan aquí: en el mostrador se
 * negocia, y sobreescribir con el de catálogo convertiría un descuento
 * acordado en un descuadre. Los nombres de producto sí se leen de la base, que
 * es lo que hace que el pedido sea un documento y no una copia del formulario.
 */
export async function registrarPedidoManual(
  datos: DatosPedidoManual,
): Promise<EstadoPedidoManual> {
  const sesion = await exigirAdmin();

  const resultado = await validar(esquemaPedidoManual, datos);
  if (!resultado.ok) return { error: resultado.error };

  const pedido = resultado.valores;
  const supabase = await crearClienteServidor();

  // La tasa se congela igual que en la web: el pedido tiene que poder explicar
  // con cuál se calculó, aunque se haya cobrado en efectivo.
  const tasa = await obtenerTasaVigente();
  if (tasa === null) {
    return { error: "Carga la tasa del día antes de registrar la venta." };
  }

  const { data: productos } = await supabase
    .from("productos")
    .select("id, nombre, stock, dias_encargo")
    .in(
      "id",
      pedido.items.map((i) => i.producto_id),
    );

  if (!productos || productos.length !== pedido.items.length) {
    return { error: "Alguno de los productos ya no está. Vuelve a elegirlo." };
  }

  const porId = new Map(productos.map((p) => [p.id, p]));

  // Encargo si algo no está en existencia, igual que en la web: es lo que
  // decide qué pasos ve el cliente en su seguimiento.
  const esEncargo = pedido.items.some(
    (item) => (porId.get(item.producto_id)?.stock ?? 0) < item.cantidad,
  );
  const plazos = pedido.items
    .filter((item) => (porId.get(item.producto_id)?.stock ?? 0) < item.cantidad)
    .map((item) => porId.get(item.producto_id)?.dias_encargo ?? 0);
  const plazoEncargo = plazos.length > 0 ? Math.max(...plazos) : 0;

  const subtotalUsd = pedido.items.reduce(
    (total, item) => total + item.precio_usd * item.cantidad,
    0,
  );

  const { data: creado, error: errorPedido } = await supabase
    .from("pedidos")
    .insert({
      origen: pedido.origen,
      cliente_nombre: pedido.cliente_nombre,
      cliente_whatsapp: pedido.whatsapp ? `+58${pedido.whatsapp}` : null,
      cliente_correo: pedido.cliente_correo,
      entrega: pedido.entrega,
      estado_destino: pedido.estado_destino,
      ciudad_destino: pedido.ciudad_destino,
      metodo_pago: pedido.metodo_pago,
      para_que_lo_usa: pedido.para_que_lo_usa,
      es_encargo: esEncargo,
      plazo_encargo_dias: plazoEncargo > 0 ? plazoEncargo : null,
      tasa_cambio: tasa,
      subtotal_usd: subtotalUsd,
      total_usd: subtotalUsd,
      atendido_por: sesion.id,
    })
    .select("id, numero")
    .single();

  if (errorPedido || !creado) {
    return { error: `No se pudo registrar: ${errorPedido?.message ?? ""}` };
  }

  const { error: errorItems } = await supabase.from("pedido_items").insert(
    pedido.items.map((item) => ({
      pedido_id: creado.id,
      producto_id: item.producto_id,
      nombre_producto: porId.get(item.producto_id)!.nombre,
      cantidad: item.cantidad,
      precio_usd_unitario: item.precio_usd,
    })),
  );

  if (errorItems) {
    // Un pedido sin líneas no le sirve a nadie: se deshace para no dejar un
    // registro que el panel no puede atender.
    await supabase.from("pedidos").delete().eq("id", creado.id);
    return { error: "No se pudieron guardar las líneas. Intenta de nuevo." };
  }

  await supabase.from("pedido_eventos").insert({
    pedido_id: creado.id,
    descripcion:
      pedido.origen === "mostrador"
        ? "Venta de mostrador, cargada desde el panel"
        : "Pedido por WhatsApp, cargado desde el panel",
    estado_nuevo: "por_confirmar",
    autor_id: sesion.id,
  });

  // Por `cambiarEstado` y no escribiendo el estado a mano: es lo que descuenta
  // el inventario por `mover_inventario` y deja el movimiento colgado de este
  // pedido. Duplicar esa lógica aquí es cómo se descuadran los almacenes.
  if (pedido.ya_entregado) {
    const movido = await cambiarEstado(creado.id, "entregado");
    if (movido && "error" in movido) return { error: movido.error };
  }

  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/productos");
  redirect(`/admin/pedidos/${creado.id}`);
}
