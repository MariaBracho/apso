import { Suspense } from "react";

import { BandaAsesoria } from "@/components/tienda/banda-asesoria";
import {
  FiltrosSidebar,
  type OpcionFiltro,
} from "@/components/tienda/filtros-sidebar";
import { SelectorOrden } from "@/components/tienda/selector-orden";
import { TarjetaProducto } from "@/components/tienda/tarjeta-producto";
import {
  type Categoria,
  type Disponibilidad,
  type FiltrosCatalogo,
  disponibilidadDe,
  obtenerAjustes,
  obtenerCategoriasHoja,
  obtenerProductos,
  obtenerSubcategorias,
  obtenerTasaVigente,
} from "@/lib/catalogo";
import { aDivisa, preciosDe } from "@/lib/precio";
import {
  CONDICIONES,
  type Condicion,
  NOMBRE_CONDICION,
} from "@/lib/producto";

export type Busqueda = Record<string, string | string[] | undefined>;

/**
 * El catálogo con sus filtros, de una categoría o de toda la tienda.
 *
 * Lo usan dos rutas: `/[categoria]` y `/todo`. Con `categoria` en nulo no se
 * restringe por sección y el filtro de tipo pasa a listar todas las secciones
 * en vez de las subcategorías de una.
 */
export async function Catalogo({
  categoria,
  titulo,
  descripcion,
  filtrosCrudos,
}: {
  categoria: Categoria | null;
  titulo: string;
  descripcion: string;
  filtrosCrudos: Busqueda;
}) {
  // Los ajustes y la tasa no dependen de la categoría, así que se piden a la
  // vez: eran dos viajes a la base esperando por nada, y se notaban al cambiar
  // de categoría.
  const [{ recargo, mostrarDivisa }, tasa] = await Promise.all([
    obtenerAjustes(),
    obtenerTasaVigente(),
  ]);

  const filtros = interpretarFiltros(filtrosCrudos);

  // El slider habla en los precios que se ven en las tarjetas —los de pagar en
  // bolívares— pero la base guarda los de divisas, así que lo que elige el
  // cliente se traduce antes de consultar. Si no, el filtro de «hasta $100»
  // dejaría fuera productos que la tarjeta muestra en $95.
  const filtrosBase = {
    ...filtros,
    precioMin:
      filtros.precioMin === undefined
        ? undefined
        : aDivisa(filtros.precioMin, recargo),
    precioMax:
      filtros.precioMax === undefined
        ? undefined
        : aDivisa(filtros.precioMax, recargo),
  };

  // El listado sin filtrar sirve para dos cosas: los conteos del sidebar y los
  // topes del slider. Los conteos muestran lo que hay en la categoría, no lo
  // que queda después de filtrar — si no, marcar un filtro vaciaría el resto.
  const [todos, productos, secciones] = await Promise.all([
    obtenerProductos(categoria),
    obtenerProductos(categoria, filtrosBase),
    // En «Todo» las secciones son todas; dentro de una, sus subcategorías.
    categoria ? obtenerSubcategorias(categoria.id) : obtenerCategoriasHoja(),
  ]);

  const precios = todos.map((p) => preciosDe(p.precio_usd, recargo).bolivares);
  const precioMinimo = precios.length ? Math.floor(Math.min(...precios)) : 0;
  const precioMaximo = precios.length ? Math.ceil(Math.max(...precios)) : 0;

  const opcionesDisponibilidad = contarDisponibilidad(todos);
  const opcionesTipo: OpcionFiltro[] = secciones
    .map((sub) => ({
      valor: sub.slug,
      etiqueta: sub.nombre,
      total: todos.filter((p) => p.categoria.slug === sub.slug).length,
    }))
    .filter((opcion) => opcion.total > 0);
  const opcionesMarca = contarMarcas(todos);
  const opcionesCondicion: OpcionFiltro[] = CONDICIONES.map((c) => ({
    valor: c,
    etiqueta: NOMBRE_CONDICION[c],
    total: todos.filter((p) => p.condicion === c).length,
  })).filter((opcion) => opcion.total > 0);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8">
      <header className="mb-8">
        <h1 className="font-display text-texto tracking-display text-3xl font-semibold">
          {titulo}
        </h1>
        <p className="text-texto-2 mt-2 text-sm">
          {todos.length} {todos.length === 1 ? "producto" : "productos"}.{" "}
          {descripcion}
        </p>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
        <Suspense fallback={<div className="w-full lg:w-60" />}>
          <FiltrosSidebar
            disponibilidad={opcionesDisponibilidad}
            tipos={opcionesTipo}
            marcas={opcionesMarca}
            condiciones={opcionesCondicion}
            precioMinimo={precioMinimo}
            precioMaximo={precioMaximo}
          />
        </Suspense>

        <div className="min-w-0 flex-1">
          <div className="mb-5 flex items-center justify-between">
            <p className="text-texto-meta text-xs">
              {productos.length} de {todos.length}
            </p>
            <Suspense fallback={null}>
              <SelectorOrden />
            </Suspense>
          </div>

          {productos.length === 0 ? (
            <SinResultados />
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {productos.map((producto) => (
                <TarjetaProducto
                  key={producto.id}
                  producto={producto}
                  tasa={tasa}
                  recargo={recargo}
                  mostrarDivisa={mostrarDivisa}
                />
              ))}
            </div>
          )}

          <BandaAsesoria />
        </div>
      </div>
    </div>
  );
}

/**
 * Vacío con salida: nunca se deja al cliente en una pantalla en blanco. Si no
 * hay nada que mostrar, se ofrece traerlo por encargo — es de donde sale la
 * lista de qué importar el mes que viene.
 */
function SinResultados() {
  return (
    <div className="border-borde rounded-panel border border-dashed px-6 py-16 text-center">
      <h2 className="font-display text-texto text-lg font-semibold">
        No tenemos eso todavía
      </h2>
      <p className="text-texto-2 mx-auto mt-2 max-w-sm text-sm">
        Quita algún filtro para ver más opciones, o pídelo por encargo y te
        decimos en cuántos días llega y cuánto cuesta.
      </p>
    </div>
  );
}

function interpretarFiltros(crudos: Busqueda): FiltrosCatalogo {
  const lista = (clave: string): string[] => {
    const valor = crudos[clave];
    if (typeof valor !== "string" || valor === "") return [];
    return valor.split(",").filter(Boolean);
  };

  const numero = (clave: string): number | undefined => {
    const valor = crudos[clave];
    if (typeof valor !== "string") return undefined;
    const convertido = Number(valor);
    return Number.isFinite(convertido) ? convertido : undefined;
  };

  const orden = crudos.orden;
  const busqueda = crudos.q;

  return {
    busqueda: typeof busqueda === "string" && busqueda ? busqueda : undefined,
    disponibilidad: lista("disponibilidad") as Disponibilidad[],
    marcas: lista("marca"),
    tipos: lista("tipo"),
    // Se filtra contra los valores conocidos: la URL la escribe cualquiera, y
    // un valor inventado haría fallar la consulta contra el enum de la base.
    condiciones: lista("condicion").filter((c): c is Condicion =>
      (CONDICIONES as string[]).includes(c),
    ),
    precioMin: numero("min"),
    precioMax: numero("max"),
    orden:
      orden === "precio-desc" || orden === "nuevos" || orden === "precio-asc"
        ? orden
        : undefined,
  };
}

function contarDisponibilidad(
  productos: Array<{ stock: number; dias_encargo: number | null }>,
): OpcionFiltro[] {
  const etiquetas: Record<Disponibilidad, string> = {
    en_stock: "En stock",
    por_pedido: "Por pedido",
    sin_stock: "Sin stock",
  };

  return (Object.keys(etiquetas) as Disponibilidad[])
    .map((estado) => ({
      valor: estado,
      etiqueta: etiquetas[estado],
      total: productos.filter((p) => disponibilidadDe(p) === estado).length,
    }))
    .filter((opcion) => opcion.total > 0);
}

function contarMarcas(
  productos: Array<{ marca: { slug: string; nombre: string } | null }>,
): OpcionFiltro[] {
  const conteo = new Map<string, OpcionFiltro>();

  for (const producto of productos) {
    if (!producto.marca) continue;
    const existente = conteo.get(producto.marca.slug);
    if (existente) {
      existente.total += 1;
    } else {
      conteo.set(producto.marca.slug, {
        valor: producto.marca.slug,
        etiqueta: producto.marca.nombre,
        total: 1,
      });
    }
  }

  return [...conteo.values()].sort((a, b) =>
    a.etiqueta.localeCompare(b.etiqueta),
  );
}
