import "server-only";

import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/servidor";

export type Sesion = {
  id: string;
  nombre: string;
  correo: string;
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
    .select("nombre, correo, rol")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil) return null;

  return {
    id: user.id,
    nombre: perfil.nombre,
    correo: perfil.correo,
    esAdmin: perfil.rol === "admin",
  };
}

/** Corta el paso a quien no sea admin. Para usar en el layout del panel. */
export async function exigirAdmin(): Promise<Sesion> {
  const sesion = await obtenerSesion();

  if (!sesion) redirect("/admin/entrar");
  if (!sesion.esAdmin) redirect("/");

  return sesion;
}
