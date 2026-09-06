import { enlaceWhatsapp } from "@/lib/contacto";

/**
 * Banda de asesoría al pie del listado.
 *
 * La asesoría uno a uno es lo que separa a apso del resto, así que aparece
 * como una persona con nombre y no como un formulario de contacto. El tono es
 * el del manual: preguntar el uso antes de dar precio.
 */
export function BandaAsesoria() {
  return (
    <section className="bg-superficie-alta rounded-panel mt-10 flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center">
      <Avatar iniciales="JM" />

      <div className="flex-1">
        <h2 className="font-display text-texto tracking-titular text-lg font-semibold">
          ¿No sabes cuál te sirve?
        </h2>
        <p className="text-texto-2 mt-1 max-w-xl text-sm leading-relaxed">
          Cuéntame qué necesitas y para qué lo vas a usar, y te digo la opción
          que más te rinde. Hoy atiende José M.
        </p>
      </div>

      <a
        href={enlaceWhatsapp(
          "Hola, soy de la tienda apso. Quiero asesoría para elegir un equipo.",
        )}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 shrink-0 px-5 py-2.5 text-sm font-semibold transition-colors"
      >
        Escribir por WhatsApp
      </a>
    </section>
  );
}

export function Avatar({
  iniciales,
  enLinea = true,
}: {
  iniciales: string;
  enLinea?: boolean;
}) {
  return (
    <div className="relative shrink-0">
      <div className="bg-hueso text-violeta font-display flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold">
        {iniciales}
      </div>
      {enLinea && (
        <span
          className="bg-exito border-superficie-alta absolute right-0 bottom-0 h-4 w-4 rounded-full border-2"
          aria-label="En línea ahora"
        />
      )}
    </div>
  );
}
