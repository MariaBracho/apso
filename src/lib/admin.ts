import "server-only";

import {
  CAMPOS_PRODUCTO_EN_PEDIDO,
  type ProductoEnPedido,
} from "@/lib/producto";
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
  stock: number;
  dias_encargo: number | null;
  activo: boolean;
  destacado: boolean;
  categoria: { slug: string; nombre: string } | null;
  marca: { nombre: string } | null;
  /** Promedio ponderado de las entradas con costo. Nulo si no hay ninguna. */
  costo_promedio_usd: number | null;
};

export async function listarProductos(): Promise<ProductoAdmin[]> {
  const supabase = await crearClienteServidor();

  // El costo vive en una vista aparte y no en `productos`, así que se pide en
  // paralelo y se une aquí. Es una consulta más a cambio de no tener el costo
  // duplicado en la tabla, donde se iría quedando viejo.
  const [{ data, error }, { data: costos }] = await Promise.all([
    supabase
      .from("productos")
      .select(
        `id, slug, nombre, precio_usd, stock, dias_encargo,
         activo, destacado,
         categoria:categorias (slug, nombre),
         marca:marcas (nombre)`,
      )
      .order("nombre")
      .returns<Omit<ProductoAdmin, "costo_promedio_usd">[]>(),

    supabase.from("costos_producto").select("producto_id, costo_promedio_usd"),
  ]);

  if (error || !data) return [];

  const porProducto = new Map(
    (costos ?? []).map((c) => [c.producto_id, Number(c.costo_promedio_usd)]),
  );

  return data.map((producto) => ({
    ...producto,
    costo_promedio_usd: porProducto.get(producto.id) ?? null,
  }));
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
  origen: string;
  para_que_lo_usa: string | null;
  total_usd: number;
  creado_en: string;
  items: Array<{
    nombre_producto: string;
    cantidad: number;
    producto: ProductoEnPedido;
  }>;
  /** Milisegundos que lleva esperando. Se calcula aquí y no al renderizar:
   *  el reloj no es puro y no tiene por qué vivir dentro de un componente. */
  esperaMs: number;
};

/**
 * Cuántos pedidos ya atendidos se traen.
 *
 * El listado se carga entero para poder buscar en el navegador sin latencia.
 * Sin tope, el día que haya mil pedidos la pantalla se vuelve impracticable, y
 * sería un problema descubierto por la persona que menos tiempo tiene.
 */
const TOPE_HISTORIAL = 200;

const CAMPOS_PEDIDO_FILA = `
  id, numero, cliente_nombre, cliente_whatsapp, estado, origen, para_que_lo_usa,
  total_usd, creado_en,
  items:pedido_items (
    nombre_producto, cantidad,
    producto:productos (${CAMPOS_PRODUCTO_EN_PEDIDO})
  )
`;

export type ListadoPedidos = {
  pedidos: PedidoFila[];
  /** Cuántos hay en total, para poder decir si el tope dejó alguno fuera. */
  total: number;
};

/**
 * Los pedidos del panel.
 *
 * Lo que está por confirmar viene completo, sin tope: es el trabajo pendiente y
 * esconder uno por antigüedad sería justo el fallo que no se puede permitir. Lo
 * ya atendido se acota a los más recientes, que es lo que se consulta.
 */
export async function listarPedidos(): Promise<ListadoPedidos> {
  const supabase = await crearClienteServidor();

  const [pendientes, atendidos, conteo] = await Promise.all([
    supabase
      .from("pedidos")
      .select(CAMPOS_PEDIDO_FILA)
      .eq("estado", "por_confirmar")
      .order("creado_en", { ascending: true })
      .returns<Omit<PedidoFila, "esperaMs">[]>(),

    // Descendente para quedarse con los recientes, y se reordena abajo.
    supabase
      .from("pedidos")
      .select(CAMPOS_PEDIDO_FILA)
      .neq("estado", "por_confirmar")
      .order("creado_en", { ascending: false })
      .limit(TOPE_HISTORIAL)
      .returns<Omit<PedidoFila, "esperaMs">[]>(),

    supabase.from("pedidos").select("id", { count: "exact", head: true }),
  ]);

  // Se ordena por antigüedad ascendente: el pedido que lleva más tiempo
  // esperando va arriba, porque es el que urge responder.
  const filas = [...(pendientes.data ?? []), ...(atendidos.data ?? [])].sort(
    (a, b) => a.creado_en.localeCompare(b.creado_en),
  );

  const ahora = Date.now();
  const pedidos = filas.map((pedido) => ({
    ...pedido,
    esperaMs: ahora - new Date(pedido.creado_en).getTime(),
  }));

  return { pedidos, total: conteo.count ?? pedidos.length };
}

export type PedidoDetalle = {
  id: string;
  numero: string;
  cliente_nombre: string;
  cliente_whatsapp: string;
  cliente_correo: string | null;
  estado: string;
  origen: string;
  es_encargo: boolean;
  plazo_encargo_dias: number | null;
  entrega: string;
  ciudad_destino: string | null;
  estado_destino: string | null;
  metodo_pago: string | null;
  para_que_lo_usa: string | null;
  motivo_cancelacion: string | null;
  tasa_cambio: number;
  subtotal_usd: number;
  total_usd: number;
  inventario_descontado: boolean;
  atendido_por: string | null;
  creado_en: string;
  confirmado_en: string | null;
  entregado_en: string | null;
  items: Array<{
    id: string;
    nombre_producto: string;
    cantidad: number;
    precio_usd_unitario: number;
    producto: (ProductoEnPedido & { stock: number }) | null;
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
      `id, numero, cliente_nombre, cliente_whatsapp, cliente_correo, estado, origen,
       es_encargo, plazo_encargo_dias, entrega, ciudad_destino, estado_destino, metodo_pago,
       para_que_lo_usa, motivo_cancelacion, tasa_cambio, subtotal_usd,
       total_usd, inventario_descontado, atendido_por, creado_en, confirmado_en,
       entregado_en,
       items:pedido_items (
         id, nombre_producto, cantidad, precio_usd_unitario,
         producto:productos (stock, ${CAMPOS_PRODUCTO_EN_PEDIDO}),
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

export type MovimientoInventario = {
  id: string;
  cantidad: number;
  stock_resultante: number;
  motivo: "entrada" | "venta" | "devolucion" | "ajuste";
  costo_unitario_usd: number | null;
  nota: string | null;
  creado_en: string;
  pedido: { numero: string } | null;
  perfil: { nombre: string } | null;
};

/**
 * El historial de inventario de un producto, del más reciente al más viejo.
 *
 * Se acota a los últimos 50: el historial existe para responder «¿qué pasó con
 * estas unidades?», y esa pregunta casi siempre mira los últimos días.
 */
export async function listarMovimientos(
  productoId: string,
): Promise<MovimientoInventario[]> {
  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("movimientos_inventario")
    .select(
      `id, cantidad, stock_resultante, motivo, costo_unitario_usd, nota, creado_en,
       pedido:pedidos (numero),
       perfil:perfiles (nombre)`,
    )
    .eq("producto_id", productoId)
    .order("creado_en", { ascending: false })
    .limit(50)
    .returns<MovimientoInventario[]>();

  return data ?? [];
}

export type MarcaAdmin = {
  id: string;
  nombre: string;
  slug: string;
  productos: number;
};

/**
 * Marcas con cuántos productos cuelgan de cada una.
 *
 * El conteo no es adorno: la llave foránea es `on delete restrict`, así que es
 * lo que dice de antemano cuáles se pueden borrar y cuáles no.
 */
export async function listarMarcasAdmin(): Promise<MarcaAdmin[]> {
  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("marcas")
    .select("id, nombre, slug, productos:productos(count)")
    .order("nombre");

  if (!data) return [];

  return data.map((marca) => ({
    id: marca.id,
    nombre: marca.nombre,
    slug: marca.slug,
    // PostgREST devuelve el agregado como [{ count: n }], y como arreglo vacío
    // cuando no hay ninguno.
    productos:
      (marca.productos as unknown as { count: number }[] | null)?.[0]?.count ??
      0,
  }));
}

export type Vendedor = { id: string; nombre: string };

/**
 * Quiénes pueden quedar como vendedor de un pedido.
 *
 * Los que tienen el rol, que no es lo mismo que administrar: hoy la misma
 * persona hace las dos cosas, pero el día que entre alguien que solo venda
 * aparece aquí sin darle el panel entero.
 */
export async function listarVendedores(): Promise<Vendedor[]> {
  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("perfiles")
    .select("id, nombre")
    .contains("roles", ["vendedor"])
    .order("nombre");

  return data ?? [];
}
