/**
 * Piezas del esqueleto de carga.
 *
 * No son adorno: mientras Next trae la página nueva, la anterior se queda
 * congelada en pantalla y parece que el clic no hizo nada. El esqueleto ocupa
 * el sitio de lo que viene, con la misma forma, para que el salto al contenido
 * real no mueva nada de sitio.
 *
 * Todo va dentro de un solo `animate-pulse` y no uno por hueso: latiendo cada
 * uno por su cuenta el conjunto parpadea y cansa la vista.
 */

export function Hueso({ className = "" }: { className?: string }) {
  return <div className={`bg-superficie-2 rounded ${className}`} />;
}

/**
 * El marco de un esqueleto, con su aviso para quien no ve la pantalla.
 *
 * Los huesos son cajas vacías: sin este texto, un lector de pantalla no diría
 * nada y la espera sería silencio.
 */
export function Esqueleto({
  aviso,
  children,
}: {
  aviso: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" className="animate-pulse">
      <span className="sr-only">{aviso}</span>
      {children}
    </div>
  );
}

/** Del tamaño de `TarjetaProducto`, para que la rejilla no dé un salto. */
export function TarjetaEsqueleto() {
  return (
    <div className="bg-superficie border-borde-sutil rounded-tarjeta flex flex-col border p-3">
      <Hueso className="aspect-[4/3] w-full rounded-[10px]" />

      <div className="mt-3 flex flex-1 flex-col">
        <Hueso className="h-2.5 w-20" />
        <Hueso className="mt-2 h-3.5 w-full" />
        <Hueso className="mt-1.5 h-3.5 w-2/3" />

        <div className="mt-auto pt-3">
          <Hueso className="h-5 w-24" />
          <Hueso className="mt-1.5 h-3 w-20" />
        </div>
      </div>
    </div>
  );
}
