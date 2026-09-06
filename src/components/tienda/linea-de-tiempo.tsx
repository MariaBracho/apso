import {
  CONTEXTO_ESTADO,
  type EstadoPedido,
  NOMBRE_ESTADO,
  secuenciaDe,
} from "@/lib/estados";

/**
 * Línea de tiempo del pedido, del lado del cliente.
 *
 * Cada estado va con su línea de contexto: el objetivo del flujo 06 es que la
 * persona sepa dónde está su pedido sin tener que escribir. Un estado a secas
 * («Armando») no responde eso; «Lo estamos armando y probando antes de
 * entregártelo» sí.
 */
export function LineaDeTiempo({
  estado,
  esEncargo,
}: {
  estado: EstadoPedido;
  esEncargo: boolean;
}) {
  const secuencia = secuenciaDe(esEncargo);
  const actual = secuencia.indexOf(estado);

  return (
    <ol className="space-y-3">
      {secuencia.map((paso, i) => {
        const hecho = i < actual;
        const esAhora = i === actual;

        return (
          <li key={paso} className="flex gap-3">
            <span className="flex flex-col items-center pt-1">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  esAhora ? "bg-cian" : hecho ? "bg-cian/40" : "bg-superficie-3"
                }`}
              />
              {i < secuencia.length - 1 && (
                <span
                  className={`mt-1 w-px flex-1 ${
                    hecho ? "bg-cian/40" : "bg-superficie-3"
                  }`}
                />
              )}
            </span>

            <div className={i < secuencia.length - 1 ? "pb-1" : ""}>
              <p
                className={`text-sm ${
                  esAhora
                    ? "text-texto font-medium"
                    : hecho
                      ? "text-texto-2"
                      : "text-texto-meta"
                }`}
              >
                {NOMBRE_ESTADO[paso]}
              </p>
              {esAhora && (
                <p className="text-texto-2 mt-0.5 text-xs leading-relaxed">
                  {CONTEXTO_ESTADO[paso]}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
