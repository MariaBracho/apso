import * as yup from "yup";

/**
 * Esquemas de validación, compartidos entre el formulario y el server action.
 *
 * Un solo esquema por formulario, usado en los dos lados. Tener uno en el
 * cliente y otro en el servidor los deja desincronizarse en silencio: el
 * formulario acepta algo que la acción rechaza, o al revés, y el fallo aparece
 * meses después.
 *
 * La validación del cliente es comodidad — enterarse del error sin ir y volver
 * del servidor. La del servidor es la que protege: un server action se puede
 * llamar sin pasar por el formulario.
 */

/** Los diez dígitos venezolanos, sin el 0 inicial ni el prefijo. */
const WHATSAPP = /^[0-9]{10}$/;

/** Minúsculas, números y guiones. Es lo que va en la dirección de la ficha. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Convierte "" a null en campos opcionales.
 *
 * Un input vacío manda cadena vacía, pero en la base esos campos son nulos, y
 * `''` colaría como valor válido donde queremos ausencia.
 */
const vacioANulo = (valor: unknown, original: unknown) =>
  original === "" || original === undefined ? null : valor;

/** Acepta coma decimal, que es como se escriben los precios aquí. */
const numeroConComa = (valor: unknown, original: unknown) => {
  if (original === "" || original === null || original === undefined) return null;
  const limpio = String(original).replace(",", ".");
  const convertido = Number(limpio);
  return Number.isFinite(convertido) ? convertido : Number.NaN;
};

// ---------------------------------------------------------------------------
// Entrada al panel
// ---------------------------------------------------------------------------

export const esquemaEntrada = yup.object({
  correo: yup
    .string()
    .trim()
    .required("Escribe tu correo.")
    .email("Ese correo no parece válido."),
  clave: yup.string().required("Escribe tu contraseña."),
});

export type DatosEntrada = yup.InferType<typeof esquemaEntrada>;

// ---------------------------------------------------------------------------
// Producto
// ---------------------------------------------------------------------------

export const esquemaProducto = yup.object({
  nombre: yup.string().trim().required("El nombre no puede quedar vacío."),
  slug: yup
    .string()
    .trim()
    .required("Hace falta una dirección.")
    .matches(SLUG, "Solo minúsculas, números y guiones."),
  categoria_id: yup.string().required("Elige una categoría."),
  marca_id: yup.string().nullable().transform(vacioANulo).defined(),

  resumen: yup
    .string()
    .trim()
    .max(200, "El resumen no puede pasar de 200 caracteres.")
    .nullable()
    .transform(vacioANulo)
    .defined(),
  descripcion: yup.string().trim().nullable().transform(vacioANulo).defined(),

  // Una fila a medias se descartaba en silencio al guardar: se escribía la
  // etiqueta, se enviaba, y la especificación no aparecía en ninguna parte.
  // Mejor rechazarla y decirlo.
  especificaciones: yup
    .array(
      yup.object({
        clave: yup.string().trim().default(""),
        valor: yup.string().trim().default(""),
      }),
    )
    .default([])
    .test(
      "especificacion-completa",
      "Hay una especificación a medias. Llena la etiqueta y el valor, o quita la fila.",
      (filas) =>
        (filas ?? []).every(
          (fila) => (fila.clave === "") === (fila.valor === ""),
        ),
    ),

  precio_usd: yup
    .number()
    .transform(numeroConComa)
    .typeError("El precio tiene que ser un número.")
    .required("Hace falta el precio.")
    .positive("El precio tiene que ser mayor que cero."),

  precio_referencia_usd: yup
    .number()
    .transform(numeroConComa)
    .typeError("El precio de referencia tiene que ser un número.")
    .nullable()
    .positive("El precio de referencia tiene que ser mayor que cero.")
    .defined()
    // Sin ahorro que mostrar, el bloque de comparación mentiría.
    .test(
      "mayor-que-el-tuyo",
      "Tiene que ser mayor que tu precio; si no, no hay ahorro que mostrar.",
      (valor, ctx) => valor === null || valor === undefined || valor > ctx.parent.precio_usd,
    ),

  stock: yup
    .number()
    .transform(numeroConComa)
    .typeError("El stock tiene que ser un número.")
    .required("Pon el stock, aunque sea cero.")
    .integer("El stock va en unidades enteras.")
    .min(0, "El stock no puede ser negativo."),

  dias_encargo: yup
    .number()
    .transform(numeroConComa)
    .typeError("El plazo tiene que ser un número.")
    .nullable()
    .integer("El plazo va en días enteros.")
    .positive("El plazo tiene que ser mayor que cero.")
    .defined(),

  condicion: yup
    .string()
    .oneOf(["nuevo", "reacondicionado"] as const)
    .required(),

  garantia_vitalicia: yup.boolean().default(false),
  garantia_meses: yup
    .number()
    .transform(numeroConComa)
    .typeError("La garantía tiene que ser un número.")
    .nullable()
    .integer("La garantía va en meses enteros.")
    .positive("La garantía tiene que ser mayor que cero.")
    .defined(),

  destacado: yup.boolean().default(false),
  activo: yup.boolean().default(true),
});

export type DatosProducto = yup.InferType<typeof esquemaProducto>;

// ---------------------------------------------------------------------------
// Marca
// ---------------------------------------------------------------------------

export const esquemaMarca = yup.object({
  nombre: yup
    .string()
    .trim()
    .required("Escribe el nombre de la marca.")
    .max(60, "El nombre no puede pasar de 60 caracteres."),
  // Se deja vacío y se deriva del nombre; solo hace falta escribirlo cuando el
  // automático choca con otro que ya existe.
  slug: yup
    .string()
    .trim()
    .default("")
    .test(
      "slug-valido",
      "Solo minúsculas, números y guiones.",
      (valor) => valor === "" || SLUG.test(valor ?? ""),
    ),
});

export type DatosMarca = yup.InferType<typeof esquemaMarca>;

// ---------------------------------------------------------------------------
// Tasa de cambio
// ---------------------------------------------------------------------------

export const esquemaTasa = yup.object({
  valor: yup
    .number()
    .transform(numeroConComa)
    .typeError("La tasa tiene que ser un número.")
    .required("Escribe la tasa.")
    .positive("La tasa tiene que ser mayor que cero.")
    .max(100000, "Esa tasa no parece real. Revísala."),
  fuente: yup
    .string()
    .oneOf(["bcv", "manual", "promedio"] as const)
    .required(),
});

export type DatosTasa = yup.InferType<typeof esquemaTasa>;

export const esquemaRecargo = yup.object({
  recargo_bs_pct: yup
    .number()
    .transform(numeroConComa)
    .typeError("El recargo tiene que ser un número.")
    .required("Escribe el recargo.")
    .min(0, "El recargo no puede ser negativo.")
    // El tope está también en la base. Tres dígitos casi siempre es un cero de
    // más, y esto se paga en lo que cobra el cliente.
    .max(100, "Un recargo de más de 100 % no parece intencional. Revísalo."),
});

export type DatosRecargo = yup.InferType<typeof esquemaRecargo>;


// ---------------------------------------------------------------------------
// Perfil del cliente
// ---------------------------------------------------------------------------

export const esquemaWhatsapp = yup.object({
  whatsapp: yup
    .string()
    .trim()
    .required("Escribe tu WhatsApp.")
    .matches(WHATSAPP, "Son 10 dígitos, sin el 0 ni el +58."),
});

export type DatosWhatsapp = yup.InferType<typeof esquemaWhatsapp>;

// ---------------------------------------------------------------------------
// Serial
// ---------------------------------------------------------------------------

export const esquemaSerial = yup.object({
  serial: yup
    .string()
    .trim()
    .required("Escribe el serial.")
    .min(3, "Un serial tiene al menos 3 caracteres.")
    .max(100, "Ese serial es demasiado largo. Revísalo."),
});

// ---------------------------------------------------------------------------
// Pedido
// ---------------------------------------------------------------------------

export const esquemaPedido = yup.object({
  cliente_nombre: yup
    .string()
    .trim()
    .required("Escribe tu nombre.")
    .min(2, "Escribe tu nombre completo."),
  whatsapp: yup
    .string()
    .trim()
    .required("Escribe tu WhatsApp.")
    .matches(WHATSAPP, "Son 10 dígitos, sin el 0 ni el +58."),
  cliente_correo: yup
    .string()
    .trim()
    .email("Ese correo no parece válido.")
    .nullable()
    .transform(vacioANulo)
    .defined(),

  entrega: yup
    .string()
    .oneOf(["punto_fijo", "envio_nacional"] as const)
    .required(),
  ciudad_destino: yup
    .string()
    .trim()
    .nullable()
    .transform(vacioANulo)
    .defined()
    .when("entrega", {
      is: "envio_nacional",
      then: (esquema) => esquema.required("Dinos a qué ciudad enviamos."),
    }),

  metodo_pago: yup
    .string()
    .oneOf([
      "pago_movil",
      "transferencia_bs",
      "zelle",
      "binance",
      "efectivo",
      "tarjeta_internacional",
    ] as const)
    .required("Elige cómo piensas pagar."),

  para_que_lo_usa: yup
    .string()
    .trim()
    .nullable()
    .transform(vacioANulo)
    .defined(),
});

export type DatosPedido = yup.InferType<typeof esquemaPedido>;

/**
 * Valida en el servidor y devuelve el primer error legible.
 *
 * Los server actions reciben datos crudos, vengan del formulario o de donde
 * sea. Esto los pasa por el mismo esquema que el cliente y devuelve una unión
 * etiquetada para que quien llame no tenga que interpretar excepciones.
 */
export async function validar<T extends yup.AnyObjectSchema>(
  esquema: T,
  datos: unknown,
): Promise<
  { ok: true; valores: yup.InferType<T> } | { ok: false; error: string }
> {
  try {
    const valores = await esquema.validate(datos, {
      abortEarly: true,
      stripUnknown: true,
    });
    return { ok: true, valores: valores as yup.InferType<T> };
  } catch (error) {
    const mensaje =
      error instanceof yup.ValidationError
        ? error.errors[0]
        : "Revisa los datos del formulario.";
    return { ok: false, error: mensaje ?? "Revisa los datos del formulario." };
  }
}
