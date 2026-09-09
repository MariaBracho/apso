"use server";

import { revalidatePath } from "next/cache";

import {
  type EstadoPedido,
  NOMBRE_ESTADO,
  esCancelado,
  inventarioDeberiaEstarDescontado,
} from "@/lib/estados";
import { obtenerAjustes } from "@/lib/catalogo";
import { generarComision, quitarComision } from "@/lib/comisiones";
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

  // La comisión nace y muere con el mismo corte que el inventario: cuando la
  // venta se da por buena. Quien la gana es quien atiende el pedido, que es
  // esta misma sesión — por eso se toma de aquí y no de lo que hubiera antes.
  if (debeDescontar !== pedido.inventario_descontado) {
    if (debeDescontar) {
      const { comision } = await obtenerAjustes();
      await generarComision(pedidoId, sesion.id, comision);
    } else {
      await quitarComision(pedidoId);
    }
    revalidatePath("/admin/vendedores");
  }

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${pedidoId}`);
  revalidatePath("/mis-pedidos");
  return { ok: true };
}

/**
 * Suma o resta al inventario las unidades de un pedido.
 *
 * Devuelve un mensaje si algo falla, o null si salió bien. Que el stock quede
 * corto no es fallo: la función nunca baja de cero, porque el inventario real
 * lo cuenta una persona y el panel no puede negarse a registrar una venta que
 * ya ocurrió.
 *
 * Un error de la llamada sí corta. Antes se ignoraba, y cuando una migración
 * dejó dos versiones de `mover_inventario` cargadas a la vez, la llamada
 * empezó a fallar y el stock dejó de bajar sin que nada lo dijera: el pedido
 * quedaba marcado como descontado y el almacén no se había movido. Un error
 * que nadie mira es un descuadre esperando.
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
    const { error } = await supabase.rpc("mover_inventario", {
      p_producto: item.producto_id,
      p_cantidad: descontar ? -item.cantidad : item.cantidad,
      p_motivo: descontar ? "venta" : "devolucion",
      p_pedido: pedidoId,
    });

    if (error) {
      return `No se pudo mover el inventario: ${error.message}. El pedido no cambió de estado.`;
    }
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
 * Suma existencias que acaban de llegar, con lo que costaron.
 *
 * Es distinto de corregir el total: aquí se dice cuántas entraron, que es como
 * se piensa al recibir mercancía, y el historial queda diciendo «entraron 5»
 * en vez de «alguien cambió el número a 6».
 *
 * El costo se pide aquí y no en el producto porque cambia en cada viaje, y es
 * el único momento en que se sabe: seis meses después nadie recuerda a cuánto
 * salió el lote que ya se vendió. Sigue siendo opcional — es preferible una
 * entrada sin costo que una entrada que no se registra por no tener el dato a
 * mano.
 */
export async function agregarExistencias(
  productoId: string,
  cantidad: number,
  costoUsd?: number | null,
  nota?: string,
): Promise<EstadoAccion> {
  await exigirAdmin();

  if (!Number.isInteger(cantidad) || cantidad < 1) {
    return { error: "Escribe cuántas unidades entraron, mínimo una." };
  }

  if (costoUsd !== undefined && costoUsd !== null) {
    if (!Number.isFinite(costoUsd) || costoUsd < 0) {
      return { error: "El costo tiene que ser un número, cero o más." };
    }
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("mover_inventario", {
    p_producto: productoId,
    p_cantidad: cantidad,
    p_motivo: "entrada",
    p_nota: nota ?? null,
    p_costo: costoUsd ?? null,
  });

  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/admin/productos");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Cambia a quién se le atribuye el pedido.
 *
 * `atendido_por` se pone solo con quien mueve el estado, que casi siempre es
 * quien vendió — pero no siempre: alguien vende y otro despacha, o se registra
 * a mano una venta que hizo otra persona. Sin poder corregirlo, la comisión se
 * le paga al equivocado.
 *
 * La comisión se mueve con el pedido solo si no se ha pagado. Una ya liquidada
 * se queda con quien la cobró: ese dinero salió, y moverla de dueño haría que
 * la liquidación de ese mes dejara de cuadrar. Se avisa cuando pasa.
 */
export async function cambiarVendedor(
  pedidoId: string,
  perfilId: string,
): Promise<{ error: string } | { ok: true; comisionMovida: boolean }> {
  await exigirAdmin();

  const supabase = await crearClienteServidor();

  // Que tenga el rol se comprueba aquí y no solo en el selector: la acción se
  // puede llamar sin pasar por la pantalla.
  const { data: vendedor } = await supabase
    .from("perfiles")
    .select("id, nombre, roles")
    .eq("id", perfilId)
    .maybeSingle();

  if (!vendedor || !vendedor.roles.includes("vendedor")) {
    return { error: "Esa persona no tiene el rol de vendedor." };
  }

  const { error } = await supabase
    .from("pedidos")
    .update({ atendido_por: perfilId })
    .eq("id", pedidoId);

  if (error) return { error: `No se pudo guardar: ${error.message}` };

  const { data: movidas } = await supabase
    .from("comisiones")
    .update({ perfil_id: perfilId })
    .eq("pedido_id", pedidoId)
    .is("pagada_en", null)
    .select("id");

  const { data: pendiente } = await supabase
    .from("comisiones")
    .select("id")
    .eq("pedido_id", pedidoId)
    .maybeSingle();

  await supabase.from("pedido_eventos").insert({
    pedido_id: pedidoId,
    descripcion: `Pasa a atenderlo ${vendedor.nombre}`,
    autor_id: (await exigirAdmin()).id,
  });

  revalidatePath(`/admin/pedidos/${pedidoId}`);
  revalidatePath("/admin/vendedores");

  return {
    ok: true,
    // Falso cuando había comisión y no se movió: es que ya estaba pagada.
    comisionMovida: !pendiente || (movidas?.length ?? 0) > 0,
  };
}

/**
 * Pone costo a las existencias que ya estaban en el estante.
 *
 * El costo normal se carga al recibir mercancía, pero lo que ya había cuando
 * apareció el campo se quedaba sin él para siempre: no había forma de decir
 * «estas cinco que tengo me costaron 62» sin fingir que acababan de llegar y
 * duplicar el stock. Sin esto no hay margen ni comisión sobre nada de lo que
 * hay hoy.
 *
 * Declara, no mueve: registra las unidades y su costo y deja el stock donde
 * está. Una sola vez por producto — repetirla arrastraría el promedio hacia el
 * último número escrito.
 */
export async function declararCostoInicial(
  productoId: string,
  costoUsd: number,
): Promise<EstadoAccion> {
  await exigirAdmin();

  if (!Number.isFinite(costoUsd) || costoUsd < 0) {
    return { error: "El costo tiene que ser un número, cero o más." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("declarar_costo_inicial", {
    p_producto: productoId,
    p_costo: costoUsd,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/productos");
  return { ok: true };
}
