"use server";

import { revalidatePath } from "next/cache";

import { obtenerTasaVigente } from "@/lib/catalogo";
import {
  type DatosGasto,
  type DatosPago,
  esquemaGasto,
  esquemaPago,
  validar,
} from "@/lib/esquemas";
import { aUsd } from "@/lib/precio";
import { exigirAdmin } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type EstadoCaja = { error: string } | { ok: true } | undefined;

/**
 * Registra un pago de un pedido.
 *
 * El monto llega en la moneda del método —bolívares para Pago Móvil y
 * transferencia, dólares para el resto— y se guarda en dólares con la tasa del
 * día al lado. Sin eso, sumar cobros de semanas distintas da un número que no
 * significa nada, y recalcular con la tasa de hoy cambiaría el pasado.
 *
 * Se guarda como verificado: lo registra quien vio la plata. El estado en
 * espera queda para cuando sea el cliente quien suba el comprobante.
 *
 * Sirve igual para devolver: un reembolso es la misma fila con otro tipo, y es
 * lo que permite que un pedido cancelado después de cobrado deje de contarse
 * como ingreso.
 */
export async function registrarPago(
  pedidoId: string,
  datos: DatosPago,
): Promise<EstadoCaja> {
  const sesion = await exigirAdmin();

  const resultado = await validar(esquemaPago, datos);
  if (!resultado.ok) return { error: resultado.error };

  const { tipo, monto, metodo, referencia } = resultado.valores;

  const tasa = await obtenerTasaVigente();
  if (tasa === null) {
    return { error: "Carga la tasa del día antes de registrar el pago." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("pagos").insert({
    pedido_id: pedidoId,
    tipo,
    // En positivo también cuando es un reembolso: la fila dice qué es y el
    // signo lo pone quien suma. Un «−120» en una lista de cobros se lee mal.
    monto_usd: aUsd(monto, metodo, tasa),
    metodo,
    tasa_cambio: tasa,
    referencia,
    estado: "verificado",
    registrado_por: sesion.id,
  });

  if (error) {
    // El índice único de la referencia es lo que detecta un comprobante
    // reutilizado — el mismo número pegado en dos pedidos distintos.
    return {
      error:
        error.code === "23505"
          ? "Esa referencia ya está registrada en otro pago. Revísala."
          : `No se pudo guardar: ${error.message}`,
    };
  }

  revalidatePath(`/admin/pedidos/${pedidoId}`);
  revalidatePath("/admin/caja");
  return { ok: true };
}

/** Borra un pago mal registrado. La caja tiene que poder corregirse. */
export async function borrarPago(pagoId: string, pedidoId: string) {
  await exigirAdmin();

  const supabase = await crearClienteServidor();
  await supabase.from("pagos").delete().eq("id", pagoId);

  revalidatePath(`/admin/pedidos/${pedidoId}`);
  revalidatePath("/admin/caja");
}

/**
 * Registra un gasto.
 *
 * La fecha la pone quien lo carga y no `now()`: los gastos se anotan en lote y
 * con la fecha de hoy todos caerían el mismo día, que es justo lo que impide
 * después leer un mes.
 */
export async function registrarGasto(
  datos: DatosGasto,
): Promise<EstadoCaja> {
  const sesion = await exigirAdmin();

  const resultado = await validar(esquemaGasto, datos);
  if (!resultado.ok) return { error: resultado.error };

  const { fecha, categoria, descripcion, monto, metodo } = resultado.valores;

  const tasa = await obtenerTasaVigente();
  if (tasa === null) {
    return { error: "Carga la tasa del día antes de registrar el gasto." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("gastos").insert({
    fecha,
    categoria,
    descripcion,
    monto_usd: aUsd(monto, metodo, tasa),
    tasa_cambio: tasa,
    metodo,
    registrado_por: sesion.id,
  });

  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/admin/caja");
  return { ok: true };
}

export async function borrarGasto(gastoId: string) {
  await exigirAdmin();

  const supabase = await crearClienteServidor();
  await supabase.from("gastos").delete().eq("id", gastoId);

  revalidatePath("/admin/caja");
}
