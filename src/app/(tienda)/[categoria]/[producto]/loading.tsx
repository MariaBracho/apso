import { Esqueleto, Hueso } from "@/components/tienda/esqueleto";

/**
 * Lo que se ve mientras carga la ficha de un producto.
 *
 * Hace falta aparte del esqueleto de la categoría: el `loading.tsx` de arriba
 * cubre también lo que cuelga de él, así que sin este archivo abrir un producto
 * pintaría una rejilla de tarjetas que no va a llegar nunca.
 */
export default function CargandoProducto() {
  return (
    <Esqueleto aviso="Cargando el producto…">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <Hueso className="h-3 w-64" />

        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_400px]">
          <div className="flex max-w-[620px] gap-4">
            <div className="hidden w-20 shrink-0 flex-col gap-3 sm:flex">
              {[0, 1, 2].map((i) => (
                <Hueso key={i} className="aspect-square w-full rounded-[10px]" />
              ))}
            </div>
            <Hueso className="aspect-[4/3] min-w-0 flex-1 rounded-[10px]" />
          </div>

          <div className="space-y-6">
            <div>
              <Hueso className="h-2.5 w-16" />
              <Hueso className="mt-2 h-7 w-full" />
              <Hueso className="mt-2 h-7 w-3/5" />
              <Hueso className="mt-4 h-4 w-full" />
              <Hueso className="mt-2 h-4 w-4/5" />
            </div>

            <div>
              <Hueso className="h-10 w-40" />
              <Hueso className="mt-2 h-4 w-48" />
            </div>

            <Hueso className="h-11 w-36 rounded-pildora" />
            <Hueso className="h-12 w-full rounded-pildora" />
            <Hueso className="h-20 w-full rounded-tarjeta" />
          </div>
        </div>
      </div>
    </Esqueleto>
  );
}
