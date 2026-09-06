import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Actualiza la tasa del día desde el BCV.
 *
 * El BCV no publica una API propia: bcv.today raspa su web y la sirve en JSON.
 * Por eso esta función desconfía del dato que recibe — si el tercero cambia el
 * formato o devuelve basura, es preferible quedarse con la tasa de ayer que
 * publicar precios en bolívares que no son.
 *
 * Nunca pisa la tasa anterior: agrega una vigencia nueva. El historial es lo
 * que permite explicar con qué tasa se calculó un pedido de hace semanas.
 */

const FUENTE = "https://bcv.today/api/v1/rate.json";

/**
 * Un movimiento diario mayor a esto se trata como fallo del proveedor, no como
 * realidad. El bolívar se devalúa rápido, pero la tasa oficial no salta la
 * mitad de un día para otro; es mucho más probable que sea un error de raspado.
 * Ante la duda, se deja la tasa vieja y se avisa: una tasa vencida se nota a
 * simple vista en el panel, una tasa equivocada no.
 */
const SALTO_MAXIMO = 0.5;

type RespuestaBcv = {
  USD?: unknown;
  effective_date?: unknown;
};

Deno.serve(async () => {
  const responder = (estado: number, cuerpo: Record<string, unknown>) =>
    new Response(JSON.stringify(cuerpo), {
      status: estado,
      headers: { "Content-Type": "application/json" },
    });

  let crudo: RespuestaBcv;
  try {
    const respuesta = await fetch(FUENTE, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!respuesta.ok) {
      return responder(502, {
        error: `El BCV respondió ${respuesta.status}`,
      });
    }

    crudo = await respuesta.json();
  } catch (error) {
    return responder(502, {
      error: `No se pudo consultar la tasa: ${error instanceof Error ? error.message : error}`,
    });
  }

  const valor = Number(crudo.USD);
  if (!Number.isFinite(valor) || valor <= 0) {
    return responder(422, {
      error: "La tasa recibida no es un número válido",
      recibido: crudo.USD,
    });
  }

  // El BCV publica un día con efecto al siguiente, y la API ya trae esa
  // distinción hecha. Si falta, se usa el momento actual.
  const vigenteDesde =
    typeof crudo.effective_date === "string" && crudo.effective_date !== ""
      ? new Date(`${crudo.effective_date}T00:00:00Z`).toISOString()
      : new Date().toISOString();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Si ya se guardó la tasa de esta vigencia, no se duplica. Pasa todos los
  // fines de semana: el cron corre igual pero el BCV no publica.
  const { data: yaExiste } = await supabase
    .from("tasas_cambio")
    .select("id")
    .eq("fuente", "bcv")
    .eq("vigente_desde", vigenteDesde)
    .maybeSingle();

  if (yaExiste) {
    return responder(200, {
      estado: "sin cambios",
      motivo: "esa vigencia ya estaba guardada",
      vigente_desde: vigenteDesde,
    });
  }

  const { data: ultima } = await supabase
    .from("tasas_cambio")
    .select("valor")
    .order("vigente_desde", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ultima) {
    const anterior = Number(ultima.valor);
    const salto = Math.abs(valor - anterior) / anterior;

    if (salto > SALTO_MAXIMO) {
      return responder(409, {
        error: "El salto es demasiado grande, no se guardó",
        anterior,
        recibido: valor,
        salto: `${Math.round(salto * 100)}%`,
        que_hacer: "Revisa la tasa y fíjala a mano desde /admin/tasa",
      });
    }
  }

  const { error } = await supabase.from("tasas_cambio").insert({
    valor,
    fuente: "bcv",
    vigente_desde: vigenteDesde,
  });

  if (error) {
    return responder(500, { error: `No se pudo guardar: ${error.message}` });
  }

  return responder(200, {
    estado: "actualizada",
    valor,
    vigente_desde: vigenteDesde,
  });
});
