import { crearClienteServidor } from "@/lib/supabase/servidor";
import { disponibilidadDe } from "@/lib/producto";
import type {
  Categoria,
  Disponibilidad,
  ProductoFicha,
  ProductoListado,
} from "@/lib/producto";

// Los tipos y las reglas puras viven en producto.ts, que no toca el
// servidor; se reexportan para que quien consulte tenga todo a mano.
export * from "@/lib/producto";

/**
 * Consultas del catálogo.
 *
 * El catálogo es público: nada de esto exige sesión. La regla del handoff es
 * explícita — no hay muro de registro, la cuenta se pide recién al enviar un
 * pedido.
 */

const CAMPOS_LISTADO = `
  id, slug, nombre, resumen, precio_usd, precio_referencia_usd,
  stock, dias_encargo,
  categoria:categorias!inner (slug, nombre),
  marca:marcas (slug, nombre),
  imagenes:producto_imagenes (url, alt)
`;

const CAMPOS_FICHA = `
  id, slug, nombre, resumen, descripcion, especificaciones,
  precio_usd, precio_referencia_usd, stock, dias_encargo,
  condicion, procedencia, garantia_meses, garantia_vitalicia,
  categoria:categorias!inner (slug, nombre),
  marca:marcas (slug, nombre),
  imagenes:producto_imagenes (url, alt)
`;


/**
 * Deja constancia de un fallo de consulta antes de devolver el vacío.
 *
 * Sin esto, un error de conexión se ve igual que "no hay datos": la tienda
 * aparece vacía y nada explica por qué. En producción esto sale en los logs
 * del servidor, que es donde se busca cuando algo no cuadra.
 */
function avisarFallo(donde: string, error: { message: string } | null) {
  if (error) console.error(`[catalogo] ${donde}: ${error.message}`);
}

/** La tasa vigente. Se muestra en la barra superior de todas las pantallas. */
export async function obtenerTasaVigente(): Promise<number | null> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase
    .from("tasas_cambio")
    .select("valor")
    .lte("vigente_desde", new Date().toISOString())
    .order("vigente_desde", { ascending: false })
    .limit(1)
    .maybeSingle();

  avisarFallo("tasa vigente", error);
  if (error || !data) return null;
  return Number(data.valor);
}

/**
 * Categorías raíz, para el nav de la barra superior.
 *
 * `activa` se respeta en todas las consultas de este archivo: apagar una
 * categoría tiene que sacarla del menú y dejar su dirección sin página. Si solo
 * saliera del menú, la sección seguiría en pie para quien tenga el enlace.
 */
export async function obtenerCategoriasRaiz(): Promise<Categoria[]> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase
    .from("categorias")
    .select("id, slug, nombre, padre_id")
    .is("padre_id", null)
    .eq("activa", true)
    .order("orden");

  avisarFallo("categorías raíz", error);
  if (error || !data) return [];
  return data as Categoria[];
}

export async function obtenerCategoriaPorSlug(
  slug: string,
): Promise<Categoria | null> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase
    .from("categorias")
    .select("id, slug, nombre, padre_id")
    .eq("slug", slug)
    .eq("activa", true)
    .maybeSingle();

  avisarFallo(`categoría ${slug}`, error);
  if (error || !data) return null;
  return data as Categoria;
}

export async function obtenerCategoriaPorId(
  id: string,
): Promise<Categoria | null> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase
    .from("categorias")
    .select("id, slug, nombre, padre_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as Categoria;
}

/** Subcategorías de una categoría, para el filtro "Tipo" del sidebar. */
export async function obtenerSubcategorias(
  padreId: string,
): Promise<Categoria[]> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase
    .from("categorias")
    .select("id, slug, nombre, padre_id")
    .eq("padre_id", padreId)
    .eq("activa", true)
    .order("orden");

  if (error || !data) return [];
  return data as Categoria[];
}

export type FiltrosCatalogo = {
  busqueda?: string;
  disponibilidad?: Disponibilidad[];
  marcas?: string[];
  tipos?: string[];
  precioMin?: number;
  precioMax?: number;
  orden?: "precio-asc" | "precio-desc" | "nuevos";
};

/**
 * Productos de una categoría y sus descendientes. Pedir "componentes" trae
 * también RAM, gráficas y almacenamiento.
 */
export async function obtenerProductos(
  categoria: Categoria,
  filtros: FiltrosCatalogo = {},
): Promise<ProductoListado[]> {
  const supabase = await crearClienteServidor();

  const subcategorias = await obtenerSubcategorias(categoria.id);
  const idsDisponibles = [categoria.id, ...subcategorias.map((c) => c.id)];

  // El filtro "Tipo" del sidebar restringe a subcategorías concretas.
  const idsFiltrados =
    filtros.tipos && filtros.tipos.length > 0
      ? subcategorias
          .filter((c) => filtros.tipos!.includes(c.slug))
          .map((c) => c.id)
      : idsDisponibles;

  if (idsFiltrados.length === 0) return [];

  let consulta = supabase
    .from("productos")
    .select(CAMPOS_LISTADO)
    .eq("activo", true)
    .in("categoria_id", idsFiltrados);

  if (filtros.busqueda) {
    // Coincidencia por nombre o resumen. El índice de texto completo en
    // español queda para cuando el catálogo justifique el salto.
    const termino = `%${filtros.busqueda}%`;
    consulta = consulta.or(`nombre.ilike.${termino},resumen.ilike.${termino}`);
  }
  if (filtros.precioMin !== undefined) {
    consulta = consulta.gte("precio_usd", filtros.precioMin);
  }
  if (filtros.precioMax !== undefined) {
    consulta = consulta.lte("precio_usd", filtros.precioMax);
  }
  if (filtros.marcas && filtros.marcas.length > 0) {
    // El filtro va sobre el slug de la marca, que es lo que viaja en la URL.
    const { data: marcas } = await supabase
      .from("marcas")
      .select("id")
      .in("slug", filtros.marcas);

    const idsMarcas = (marcas ?? []).map((m) => m.id);
    if (idsMarcas.length === 0) return [];
    consulta = consulta.in("marca_id", idsMarcas);
  }

  switch (filtros.orden) {
    case "precio-desc":
      consulta = consulta.order("precio_usd", { ascending: false });
      break;
    case "nuevos":
      consulta = consulta.order("creado_en", { ascending: false });
      break;
    default:
      consulta = consulta.order("precio_usd", { ascending: true });
  }

  const { data, error } = await consulta.returns<ProductoListado[]>();
  avisarFallo("productos", error);
  if (error || !data) return [];

  // La disponibilidad es derivada (stock + plazo de encargo), así que no se
  // puede filtrar en SQL sin duplicar la regla. Se aplica aquí, sobre un
  // catálogo que en esta fase cabe de sobra en memoria.
  if (!filtros.disponibilidad || filtros.disponibilidad.length === 0) {
    return data;
  }

  return data.filter((p) =>
    filtros.disponibilidad!.includes(disponibilidadDe(p)),
  );
}

export async function obtenerProductoPorSlug(
  slug: string,
): Promise<ProductoFicha | null> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase
    .from("productos")
    .select(CAMPOS_FICHA)
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle<ProductoFicha>();

  if (error || !data) return null;
  return data;
}
