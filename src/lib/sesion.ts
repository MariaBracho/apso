import "server-only";

import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/servidor";

/** Lo que puede hacer alguien. Se acumulan: quien administra suele vender. */
export type Rol = "cliente" | "admin" | "vendedor";

export type Sesion = {
  id: string;
  nombre: string;
  correo: string;
  roles: Rol[];
  /** En E.164 (+58XXXXXXXXXX). Nulo mientras no haya completado el perfil. */
  whatsapp: string | null;
  esAdmin: boolean;
};

/**
 * Capa de acceso a datos de sesión.
 *
 * La comprobación de verdad se hace aquí, contra el servidor de auth, y no en
 * el proxy: el proxy solo mira la cookie para redirigir rápido. Los docs de
 * Next son explícitos en que el proxy no es una solución de autorización.
 */
export async function obtenerSesion(): Promise<Sesion | null> {
  const supabase = await crearClienteServidor();

  // getUser valida el token contra Supabase. getSession solo lee la cookie y
  // por eso no sirve para decidir permisos.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre, correo, whatsapp, roles")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil) return null;

  return {
    id: user.id,
    nombre: perfil.nombre,
    correo: perfil.correo,
    whatsapp: perfil.whatsapp,
    roles: perfil.roles,
    // Atajo del rol que decide si se entra al panel, que es el que más se
    // pregunta. Los demás se miran en `roles`.
    esAdmin: perfil.roles.includes("admin"),
  };
}

/** Corta el paso a quien no sea admin. Para usar en el layout del panel. */
export async function exigirAdmin(): Promise<Sesion> {
  const sesion = await obtenerSesion();

  if (!sesion) redirect("/admin/entrar");
  if (!sesion.esAdmin) redirect("/");

  return sesion;
}
