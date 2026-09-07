import { INSTAGRAM } from "@/lib/contacto";

/**
 * Enlace al Instagram de la tienda.
 *
 * Vive aparte porque va en dos pies distintos: el de la portada y el del
 * catálogo, que son componentes separados. Escrito dos veces, el día que
 * cambie el usuario se corrige uno y se olvida el otro.
 */
export function EnlaceInstagram({ clase = "" }: { clase?: string }) {
  return (
    // Otra pestaña: saca de la tienda, y quien está viendo productos no
    // debería perder dónde estaba por mirar el Instagram.
    <a
      href={INSTAGRAM.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`hover:text-texto-2 inline-flex shrink-0 items-center gap-2 transition-colors ${clase}`}
    >
      <IconoInstagram />
      <span>@{INSTAGRAM.usuario}</span>
    </a>
  );
}

/** Trazo de 2 px, extremos rectos, monocromo (manual de marca, §10). */
function IconoInstagram() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <line x1="17.5" y1="6.5" x2="17.5" y2="6.5" />
    </svg>
  );
}
