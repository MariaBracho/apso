"use server";

import { revalidatePath } from "next/cache";

import {
  type EstadoPedido,
  NOMBRE_ESTADO,
  esCancelado,
  inventarioDeberiaEstarDescontado,
} from "@/lib/estados";
import { esquemaSerial, validar } from "@/lib/esquemas";
import { exigirAdmin } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type EstadoAccion = { error: string } | { ok: true } | undefined;

const ESTADOS = [
  "por_confirmar",
  "confirmado_y_pagado",
  "comprado",
  "en_transito",
  "en_aduana",
  "aqui",
  "armando_probando",
  "listo_entregar",
  "entregado",
  "sin_stock_pendiente",
  "cancelado",
  "cancelado_reembolsado",
] as const;

/**
 * Mueve el pedido de estado.
 *
 * Tres cosas pasan juntas y ninguna puede quedarse sin la otra: se guarda el
 * estado, se deja constancia en el historial con hora y autor, y se ajusta el
 * inventario si hace falta. El historial no es decoración — es lo que permite
 * responderle al cliente qué pasó y cuándo sin depender de la memoria.
 */
export async function cambiarEstado(
  pedidoId: string,
  nuevoEstado: EstadoPedido,
  motivo?: string,
): Promise<EstadoAccion> {
  const sesion = await exigirAdmin();

  if (!ESTADOS.includes(nuevoEstado)) {
    return { error: "Ese estado no existe." };
  }

  if (esCancelado(nuevoEstado) && !motivo?.trim()) {
    // Cancelar en silencio es exactamente lo que el flujo 14 prohíbe: el
    // cliente tiene derecho a saber por qué.
    return { error: "Para cancelar hace falta decir el motivo." };
  }

  const supabase = await crearClienteServidor();

  const { data: pedido } = await supabase
    .from("pedidos")
    .select("id, estado, es_encargo, inventario_descontado, confirmado_en")
    .eq("id", pedidoId)
    .maybeSingle();

  if (!pedido) return { error: "No encontramos ese pedido." };
  if (pedido.estado === nuevoEstado) return { ok: true };

  const debeDescontar = inventarioDeberiaEstarDescontado(
    nuevoEstado,
    pedido.es_encargo,
  );

  // El inventario solo se mueve cuando cambia de verdad de lado. Sin esta
  // comparación, ir y volver entre estados descontaría dos veces.
  if (debeDescontar !== pedido.inventario_descontado) {
    const ajuste = await ajustarInventario(pedidoId, debeDescontar);
    if (ajuste) return { error: ajuste };
  }

  const ahora = new Date().toISOString();
  const cambios: Record<string, unknown> = {
    estado: nuevoEstado,
    inventario_descontado: debeDescontar,
    atendido_por: sesion.id,
  };

  // Se marca al pasar el corte del pago, no solo en ese estado exacto: una
  // venta de mostrador entra directo en «entregado» y se quedaba sin fecha de
  // confirmación, que es de donde salen los tiempos de atención.
  if (
    pedido.confirmado_en === null &&
    inventarioDeberiaEstarDescontado(nuevoEstado, pedido.es_encargo)
  ) {
    cambios.confirmado_en = ahora;
  }
  // La garantía arranca al entregar, no al despachar (flujo 15, paso 4).
  if (nuevoEstado === "entregado") cambios.entregado_en = ahora;
  if (esCancelado(nuevoEstado)) cambios.motivo_cancelacion = motivo!.trim();

  const { error } = await supabase
    .from("pedidos")
    .update(cambios)
    .eq("id", pedidoId);

  if (error) return { error: `No se pudo guardar: ${error.message}` };

  await supabase.from("pedido_eventos").insert({
    pedido_id: pedidoId,
    descripcion: esCancelado(nuevoEstado)
      ? `${NOMBRE_ESTADO[nuevoEstado]}: ${motivo!.trim()}`
      : NOMBRE_ESTADO[nuevoEstado],
    estado_nuevo: nuevoEstado,
    autor_id: sesion.id,
  });

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${pedidoId}`);
  revalidatePath("/mis-pedidos");
  return { ok: true };
}

/**
 * Suma o resta al inventario las unidades de un pedido.
 *
 * Devuelve un mensaje si algo falla, o null si salió bien. No bloquea cuando
 * el stock queda corto: el inventario real lo cuenta una persona, y el panel
 * no puede negarse a registrar una venta que ya ocurrió.
 */
async function ajustarInventario(
  pedidoId: string,
  descontar: boolean,
): Promise<string | null> {
  const supabase = await crearClienteServidor();

  const { data: items } = await supabase
    .from("pedido_items")
    .select("producto_id, cantidad")
    .eq("pedido_id", pedidoId);

  if (!items) return "No pudimos leer las líneas del pedido.";

  for (const item of items) {
    if (!item.producto_id) continue;

    // Por `mover_inventario` y no actualizando el stock a mano: así el cambio
    // y su registro ocurren en la misma transacción, y el historial del
    // producto explica de qué pedido salió cada unidad.
    await supabase.rpc("mover_inventario", {
      p_producto: item.producto_id,
      p_cantidad: descontar ? -item.cantidad : item.cantidad,
      p_motivo: descontar ? "venta" : "devolucion",
      p_pedido: pedidoId,
    });
  }

  revalidatePath("/admin/productos");
  return null;
}

/**
 * Anota el serial de una unidad.
 *
 * Es el paso que no se puede saltar: sin serial, dos años después la garantía
 * del cliente vuelve a depender de que encuentre su factura.
 */
export async function anotarSerial(
  pedidoItemId: string,
  serial: string,
): Promise<EstadoAccion> {
  const sesion = await exigirAdmin();

  const validado = await validar(esquemaSerial, { serial });
  if (!validado.ok) return { error: validado.error };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("seriales").insert({
    pedido_item_id: pedidoItemId,
    serial: validado.valores.serial,
    anotado_por: sesion.id,
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ese serial ya está anotado en esta línea."
          : `No se pudo guardar: ${error.message}`,
    };
  }

  revalidatePath("/admin/pedidos");
  return { ok: true };
}

export async function borrarSerial(serialId: string) {
  await exigirAdmin();

  const supabase = await crearClienteServidor();
  await supabase.from("seriales").delete().eq("id", serialId);

  revalidatePath("/admin/pedidos");
}

/**
 * Corrige el stock a un número concreto, para cuadrar con el conteo físico.
 *
 * Se guarda como movimiento igual que todo lo demás: la diferencia contra lo
 * que había es lo que queda registrado, porque «quedó en 6» sin saber de cuánto
 * venía no explica nada.
 */
export async function ajustarStock(
  productoId: string,
  stock: number,
  nota?: string,
): Promise<EstadoAccion> {
  await exigirAdmin();

  if (!Number.isInteger(stock) || stock < 0) {
    return { error: "El stock tiene que ser un número entero, cero o más." };
  }

  const supabase = await crearClienteServidor();

  const { data: producto } = await supabase
    .from("productos")
    .select("stock")
    .eq("id", productoId)
    .maybeSingle();

  if (!producto) return { error: "Ese producto ya no está." };

  const diferencia = stock - producto.stock;
  if (diferencia === 0) return { ok: true };

  const { error } = await supabase.rpc("mover_inventario", {
    p_producto: productoId,
    p_cantidad: diferencia,
    p_motivo: "ajuste",
    p_nota: nota ?? null,
  });

  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/admin/productos");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Suma existencias que acaban de llegar.
 *
 * Es distinto de corregir el total: aquí se dice cuántas entraron, que es como
 * se piensa al recibir mercancía, y el historial queda diciendo «entraron 5»
 * en vez de «alguien cambió el número a 6».
 */
export async function agregarExistencias(
  productoId: string,
  cantidad: number,
  nota?: string,
): Promise<EstadoAccion> {
  await exigirAdmin();

  if (!Number.isInteger(cantidad) || cantidad < 1) {
    return { error: "Escribe cuántas unidades entraron, mínimo una." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("mover_inventario", {
    p_producto: productoId,
    p_cantidad: cantidad,
    p_motivo: "entrada",
    p_nota: nota ?? null,
  });

  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/admin/productos");
  revalidatePath("/", "layout");
  return { ok: true };
}
