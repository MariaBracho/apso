import "server-only";

import { calcularComision } from "@/lib/precio";
import { crearClienteServidor } from "@/lib/supabase/servidor";

/**
 * Comisiones: lo que gana quien atiende cada pedido.
 *
 * Se generan al darse la venta por buena —el mismo corte que descuenta el
 * inventario— y con el monto congelado. El número que muestra el inventario es
 * una estimación que se mueve con cada compra de mercancía; el de aquí no se
 * recalcula nunca, porque una comisión ya prometida no puede cambiar sola.
 */

/**
 * Deja registrada la comisión de un pedido.
 *
 * Se llama al cruzar el corte del pago. La restricción de un pedido por fila
 * es lo que impide duplicarla si el pedido va y vuelve entre estados, así que
 * un choque ahí no es un error: es que ya estaba.
 */
export async function generarComision(
  pedidoId: string,
  perfilId: string,
  porcentaje: number,
): Promise<void> {
  const supabase = await crearClienteServidor();

  const { data: items } = await supabase
    .from("pedido_items")
    .select("producto_id, cantidad, precio_usd_unitario")
    .eq("pedido_id", pedidoId);

  if (!items || items.length === 0) return;

  const ids = items.map((i) => i.producto_id).filter((id): id is string => !!id);
  const { data: costos } = await supabase
    .from("costos_producto")
    .select("producto_id, costo_promedio_usd")
    .in("producto_id", ids);

  const porProducto = new Map(
    (costos ?? []).map((c) => [c.producto_id, Number(c.costo_promedio_usd)]),
  );

  const calculada = calcularComision(
    items.map((item) => ({
      cantidad: item.cantidad,
      precio_usd_unitario: Number(item.precio_usd_unitario),
      costo: item.producto_id
        ? (porProducto.get(item.producto_id) ?? null)
        : null,
    })),
    porcentaje,
  );

  await supabase.from("comisiones").insert({
    pedido_id: pedidoId,
    perfil_id: perfilId,
    margen_usd: calculada.margen,
    porcentaje,
    monto_usd: calculada.monto,
    items_sin_costo: calculada.itemsSinCosto,
  });
}

/**
 * Quita la comisión de un pedido que dejó de estar vendido.
 *
 * Solo si no se pagó. Una que ya se liquidó se queda: ese dinero salió, y
 * borrar la fila haría que la liquidación de ese mes dejara de cuadrar. La
 * devolución se resuelve con el vendedor, no borrando el registro.
 */
export async function quitarComision(pedidoId: string): Promise<void> {
  const supabase = await crearClienteServidor();

  await supabase
    .from("comisiones")
    .delete()
    .eq("pedido_id", pedidoId)
    .is("pagada_en", null);
}

const dosDecimales = (n: number) => Math.round(n * 100) / 100;

export type ComisionDeVendedor = {
  id: string;
  monto_usd: number;
  margen_usd: number;
  porcentaje: number;
  items_sin_costo: number;
  creado_en: string;
  pagada_en: string | null;
  pedido: { id: string; numero: string; cliente_nombre: string } | null;
};

export type Vendedor = {
  perfilId: string;
  nombre: string;
  porPagar: ComisionDeVendedor[];
  pagadas: ComisionDeVendedor[];
  totalPorPagar: number;
  totalPagado: number;
};

/**
 * Las comisiones agrupadas por quien las ganó.
 *
 * Se agrupa aquí y no en la consulta porque la pregunta que se hace en esta
 * pantalla es «¿cuánto le debo a cada quien?», y esa respuesta es por persona.
 */
export async function listarComisiones(): Promise<Vendedor[]> {
  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("comisiones")
    .select(
      `id, monto_usd, margen_usd, porcentaje, items_sin_costo, creado_en,
       pagada_en, perfil_id,
       perfil:perfiles!comisiones_perfil_id_fkey (nombre),
       pedido:pedidos (id, numero, cliente_nombre)`,
    )
    .order("creado_en", { ascending: false });

  if (!data) return [];

  const porVendedor = new Map<string, Vendedor>();

  for (const fila of data) {
    const perfil = fila.perfil as unknown as { nombre: string } | null;

    const vendedor: Vendedor = porVendedor.get(fila.perfil_id) ?? {
      perfilId: fila.perfil_id,
      nombre: perfil?.nombre ?? "Sin nombre",
      porPagar: [],
      pagadas: [],
      totalPorPagar: 0,
      totalPagado: 0,
    };

    const comision: ComisionDeVendedor = {
      id: fila.id,
      monto_usd: Number(fila.monto_usd),
      margen_usd: Number(fila.margen_usd),
      porcentaje: Number(fila.porcentaje),
      items_sin_costo: fila.items_sin_costo,
      creado_en: fila.creado_en,
      pagada_en: fila.pagada_en,
      pedido: fila.pedido as unknown as ComisionDeVendedor["pedido"],
    };

    if (comision.pagada_en === null) {
      vendedor.porPagar.push(comision);
      vendedor.totalPorPagar += comision.monto_usd;
    } else {
      vendedor.pagadas.push(comision);
      vendedor.totalPagado += comision.monto_usd;
    }

    porVendedor.set(fila.perfil_id, vendedor);
  }

  return [...porVendedor.values()]
    .map((v) => ({
      ...v,
      totalPorPagar: dosDecimales(v.totalPorPagar),
      totalPagado: dosDecimales(v.totalPagado),
    }))
    // Primero a quien más se le debe: es a quien hay que pagarle.
    .sort((a, b) => b.totalPorPagar - a.totalPorPagar);
}
