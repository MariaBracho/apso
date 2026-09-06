import type { NextConfig } from "next";

/**
 * El dominio de Supabase tiene que estar autorizado o next/image se niega a
 * servir las fotos. Se deriva de la propia variable de entorno para que apunte
 * al proyecto correcto en cada entorno — local y nube tienen dominios
 * distintos, y una lista fija se desincronizaría.
 */
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
  : null;

const enDesarrollo = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabase
      ? [
          {
            protocol: supabase.protocol.replace(":", "") as "http" | "https",
            hostname: supabase.hostname,
            port: supabase.port || undefined,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],

    // Next 16 bloquea optimizar imágenes alojadas en IPs privadas: es una
    // defensa contra SSRF. En local el Supabase de desarrollo vive en
    // 127.0.0.1 y sin esto las fotos no cargan. Queda atado a desarrollo a
    // propósito — en producción el permiso sí sería un agujero.
    dangerouslyAllowLocalIP: enDesarrollo,
  },
};

export default nextConfig;
