import {
  Esqueleto,
  Hueso,
  TarjetaEsqueleto,
} from "@/components/tienda/esqueleto";

/**
 * Lo que se ve mientras carga una categoría.
 *
 * Con este archivo la navegación deja de esperar al servidor: Next cambia de
 * ruta al instante, así que la categoría en la barra queda marcada de una vez y
 * aquí abajo aparecen los huesos hasta que llegan los productos. Sin él, la
 * pantalla anterior se quedaba quieta y el clic parecía perdido.
 *
 * Ocho tarjetas porque es lo que llena la primera pantalla en escritorio; más
 * sería dibujar debajo del borde inferior.
 */
export default function CargandoCategoria() {
  return (
    <Esqueleto aviso="Cargando productos…">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <header className="mb-8">
          <Hueso className="h-8 w-52" />
          <Hueso className="mt-3 h-4 w-full max-w-md" />
        </header>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
          <aside className="hidden w-full shrink-0 space-y-6 lg:block lg:w-60">
            {[0, 1, 2].map((grupo) => (
              <div key={grupo}>
                <Hueso className="h-2.5 w-24" />
                <div className="mt-3 space-y-2">
                  <Hueso className="h-3.5 w-full" />
                  <Hueso className="h-3.5 w-4/5" />
                  <Hueso className="h-3.5 w-3/5" />
                </div>
              </div>
            ))}
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-5 flex items-center justify-between">
              <Hueso className="h-3 w-20" />
              <Hueso className="h-8 w-36" />
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <TarjetaEsqueleto key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Esqueleto>
  );
}
