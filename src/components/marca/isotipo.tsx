/**
 * Isotipo de apso: escudo de lados rectos con cuatro barras caladas.
 * Un solo trazo con regla de relleno evenodd, para que funcione en un color
 * sobre cualquier fondo. La geometría no se redibuja (manual de marca, §7).
 */
export function Isotipo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 65 70"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M0 0H65V45L32.5 70L0 45Z
           M15 10H20V35H15Z
           M25 10H30V45H25Z
           M35 10H40V45H35Z
           M45 10H50V35H45Z"
      />
    </svg>
  );
}

/**
 * Logo horizontal: símbolo + logotipo. El nombre va siempre en minúsculas,
 * en Sora SemiBold con interletrado cerrado a −5,5%.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <Isotipo className="text-cian h-7 w-auto" />
      <span className="font-display text-texto tracking-display text-2xl leading-none font-semibold lowercase">
        apso
      </span>
    </span>
  );
}
