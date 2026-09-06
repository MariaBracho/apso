import "server-only";

import { crearClienteServidor } from "@/lib/supabase/servidor";

/**
 * Consultas del panel. A diferencia del catálogo, aquí se ven también los
 * productos despublicados: el panel es donde se arreglan.
 */

export type ProductoAdmin = {
  id: string;
  slug: string;
  nombre: string;
  precio_usd: number;
  precio_referencia_usd: number | null;
  stock: number;
  dias_encargo: number | null;
  activo: boolean;
  destacado: boolean;
  categoria: { slug: string; nombre: string } | null;
  marca: { nombre: string } | null;
};

export async function listarProductos(): Promise<ProductoAdmin[]> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase
    .from("productos")
    .select(
      `id, slug, nombre, precio_usd, precio_referencia_usd, stock, dias_encargo,
       activo, destacado,
       categoria:categorias (slug, nombre),
       marca:marcas (nombre)`,
    )
    .order("nombre")
    .returns<ProductoAdmin[]>();

  if (error || !data) return [];
  return data;
}

export async function obtenerProductoAdmin(id: string) {
  const supabase = await crearClienteServidor();

  // La categoría se trae para poder armar el enlace a la ficha pública, que
  // vive en /categoria/producto.
  const { data } = await supabase
    .from("productos")
    .select("*, categoria:categorias (slug)")
    .eq("id", id)
    .maybeSingle();

  return data;
}

export type PedidoFila = {
  id: string;
  numero: string;
  cliente_nombre: string;
  cliente_whatsapp: string;
  estado: string;
  para_que_lo_usa: string | null;
  total_usd: number;
  creado_en: string;
  items: Array<{ nombre_producto: string; cantidad: number }>;
  /** Milisegundos que lleva esperando. Se calcula aquí y no al renderizar:
   *  el reloj no es puro y no tiene por qué vivir dentro de un componente. */
  esperaMs: number;
};

export async function listarPedidos(): Promise<PedidoFila[]> {
  const supabase = await crearClienteServidor();

  // Se ordena por antigüedad ascendente: el pedido que lleva más tiempo
  // esperando va arriba, porque es el que urge responder.
  const { data } = await supabase
    .from("pedidos")
    .select(
      `id, numero, cliente_nombre, cliente_whatsapp, estado, para_que_lo_usa,
       total_usd, creado_en,
       items:pedido_items (nombre_producto, cantidad)`,
    )
    .order("creado_en", { ascending: true })
    .returns<Omit<PedidoFila, "esperaMs">[]>();

  const ahora = Date.now();
  return (data ?? []).map((pedido) => ({
    ...pedido,
    esperaMs: ahora - new Date(pedido.creado_en).getTime(),
  }));
}

export type PedidoDetalle = {
  id: string;
  numero: string;
  cliente_nombre: string;
  cliente_whatsapp: string;
  cliente_correo: string | null;
  estado: string;
  es_encargo: boolean;
  plazo_encargo_dias: number | null;
  entrega: string;
  ciudad_destino: string | null;
  metodo_pago: string | null;
  para_que_lo_usa: string | null;
  motivo_cancelacion: string | null;
  tasa_cambio: number;
  subtotal_usd: number;
  total_usd: number;
  inventario_descontado: boolean;
  creado_en: string;
  confirmado_en: string | null;
  entregado_en: string | null;
  items: Array<{
    id: string;
    nombre_producto: string;
    cantidad: number;
    precio_usd_unitario: number;
    producto: { stock: number } | null;
    seriales: Array<{ id: string; serial: string }>;
  }>;
  eventos: Array<{
    id: string;
    descripcion: string;
    creado_en: string;
  }>;
};

export async function obtenerPedido(id: string): Promise<PedidoDetalle | null> {
  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("pedidos")
    .select(
      `id, numero, cliente_nombre, cliente_whatsapp, cliente_correo, estado,
       es_encargo, plazo_encargo_dias, entrega, ciudad_destino, metodo_pago,
       para_que_lo_usa, motivo_cancelacion, tasa_cambio, subtotal_usd,
       total_usd, inventario_descontado, creado_en, confirmado_en, entregado_en,
       items:pedido_items (
         id, nombre_producto, cantidad, precio_usd_unitario,
         producto:productos (stock),
         seriales (id, serial)
       ),
       eventos:pedido_eventos (id, descripcion, creado_en)`,
    )
    .eq("id", id)
    .maybeSingle<PedidoDetalle>();

  if (!data) return null;

  // El historial se lee de arriba abajo, del más viejo al más nuevo.
  data.eventos.sort(
    (a, b) => new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime(),
  );

  return data;
}

/** Fotos de un producto, en el orden en que se muestran. */
export async function listarFotos(productoId: string) {
  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("producto_imagenes")
    .select("id, url, orden")
    .eq("producto_id", productoId)
    .order("orden");

  return data ?? [];
}

export async function listarCategorias() {
  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("categorias")
    .select("id, nombre, padre_id, orden")
    .order("orden");

  if (!data) return [];

  // Se muestran con el padre delante ("Componentes › Memoria RAM") para que al
  // elegir se vea dónde va a quedar colgado el producto.
  const porId = new Map(data.map((c) => [c.id, c]));
  return data.map((c) => ({
    id: c.id,
    nombre: c.padre_id
      ? `${porId.get(c.padre_id)?.nombre ?? "?"} › ${c.nombre}`
      : c.nombre,
  }));
}

export async function listarMarcas() {
  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("marcas")
    .select("id, nombre")
    .order("nombre");

  return data ?? [];
}
