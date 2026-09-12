import * as yup from "yup";

import { CATEGORIAS_GASTO } from "@/lib/gasto";
import { CONDICIONES, RESPALDOS } from "@/lib/producto";
import { ESTADOS, esDestinoValido } from "@/lib/venezuela";

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

  // No es columna de `productos`: se guarda como la declaración de costo del
  // inventario que hay. Se pide aquí porque es donde se busca.
  costo_usd: yup
    .number()
    .transform(numeroConComa)
    .typeError("El costo tiene que ser un número.")
    .nullable()
    .min(0, "El costo no puede ser negativo.")
    .defined(),

  procedencia: yup
    .string()
    .trim()
    .required("Di de dónde viene: es lo que la ficha promete.")
    .max(60, "Con el país o la ciudad basta."),

  garantia_respalda: yup
    .string()
    .oneOf(RESPALDOS, "Elige quién responde por la garantía.")
    .required("Elige quién responde por la garantía."),

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

  // De la misma lista que el selector y el filtro: escrita aparte, agregar una
  // condición dejaba el formulario rechazándola en silencio.
  condicion: yup.string().oneOf(CONDICIONES).required(),

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

/** Lo que se toca en «Precios de la tienda»: el recargo y cómo se anuncia. */
export const esquemaPrecios = yup.object({
  recargo_bs_pct: yup
    .number()
    .transform(numeroConComa)
    .typeError("El recargo tiene que ser un número.")
    .required("Escribe el recargo.")
    .min(0, "El recargo no puede ser negativo.")
    // El tope está también en la base. Tres dígitos casi siempre es un cero de
    // más, y esto se paga en lo que cobra el cliente.
    .max(100, "Un recargo de más de 100 % no parece intencional. Revísalo."),

  // Solo cambia lo que se anuncia en el catálogo y la ficha. Lo que se cobra
  // sigue dependiendo del método de pago.
  mostrar_precio_divisa: yup.boolean().required(),

  comision_venta_pct: yup
    .number()
    .transform(numeroConComa)
    .typeError("La comisión tiene que ser un número.")
    .required("Escribe la comisión.")
    .min(0, "La comisión no puede ser negativa.")
    // Más del margen entero sería pagar por vender.
    .max(100, "La comisión no puede pasar del 100 % del margen."),
});

export type DatosPrecios = yup.InferType<typeof esquemaPrecios>;


// ---------------------------------------------------------------------------
// Caja: pagos que entran y gastos que salen
// ---------------------------------------------------------------------------

const METODOS_PAGO = [
  "pago_movil",
  "transferencia_bs",
  "zelle",
  "binance",
  "efectivo",
  "tarjeta_internacional",
] as const;

/**
 * Un pago de un pedido.
 *
 * El monto se escribe en la moneda del método: bolívares para Pago Móvil y
 * transferencia, dólares para el resto. Convertirlo es del servidor, con la
 * tasa que se guarda al lado.
 */
export const esquemaPago = yup.object({
  tipo: yup
    .string()
    .oneOf(["cobro", "reembolso"] as const)
    .required(),
  monto: yup
    .number()
    .transform(numeroConComa)
    .typeError("El monto tiene que ser un número.")
    .required("Escribe el monto.")
    .positive("El monto tiene que ser mayor que cero."),
  metodo: yup
    .string()
    .oneOf(METODOS_PAGO)
    .required("Di por dónde entró el pago."),
  // La referencia es lo que permite reconocer un comprobante repetido, así que
  // se pide para todo lo que no sea efectivo en mano.
  referencia: yup
    .string()
    .trim()
    .nullable()
    .transform(vacioANulo)
    .defined()
    .when("metodo", {
      is: "efectivo",
      otherwise: (esquema) =>
        esquema.required("Pon la referencia del pago."),
    }),
});

export type DatosPago = yup.InferType<typeof esquemaPago>;

/**
 * Un gasto.
 *
 * Igual que el pago: el monto va en la moneda del método. La fecha es la del
 * gasto y no la de cuando se anota, porque se cargan en lote y todos caerían
 * el mismo día.
 */
export const esquemaGasto = yup.object({
  fecha: yup
    .string()
    .required("Pon la fecha del gasto.")
    .matches(/^\d{4}-\d{2}-\d{2}$/, "La fecha no es válida."),
  categoria: yup
    .string()
    .oneOf(CATEGORIAS_GASTO)
    .required("Elige la categoría."),
  descripcion: yup
    .string()
    .trim()
    .required("Di en qué se gastó.")
    .max(200, "La descripción no puede pasar de 200 caracteres."),
  monto: yup
    .number()
    .transform(numeroConComa)
    .typeError("El monto tiene que ser un número.")
    .required("Escribe el monto.")
    .positive("El monto tiene que ser mayor que cero."),
  metodo: yup
    .string()
    .oneOf(METODOS_PAGO)
    .required("Di de dónde salió la plata."),
});

export type DatosGasto = yup.InferType<typeof esquemaGasto>;

/**
 * Un cambio de una moneda a otra.
 *
 * Los dos montos van en la moneda de su método: se escribe lo que salió y lo
 * que llegó, tal como se ve en cada aplicación. La pérdida sale de restarlos,
 * y no se pide, porque pedirla sería hacer la cuenta a mano justo donde el
 * error no se nota.
 */
export const esquemaConversion = yup.object({
  fecha: yup
    .string()
    .required("Pon la fecha del cambio.")
    .matches(/^\d{4}-\d{2}-\d{2}$/, "La fecha no es válida."),
  metodo_origen: yup
    .string()
    .oneOf(METODOS_PAGO)
    .required("Di de dónde salió."),
  monto_origen: yup
    .number()
    .transform(numeroConComa)
    .typeError("El monto tiene que ser un número.")
    .required("Escribe cuánto salió.")
    .positive("El monto tiene que ser mayor que cero."),
  metodo_destino: yup
    .string()
    .oneOf(METODOS_PAGO)
    .required("Di a dónde entró.")
    .test(
      "distinto",
      "Cambiar al mismo método no es un cambio.",
      (valor, ctx) => valor !== ctx.parent.metodo_origen,
    ),
  monto_destino: yup
    .number()
    .transform(numeroConComa)
    .typeError("El monto tiene que ser un número.")
    .required("Escribe cuánto llegó.")
    .positive("El monto tiene que ser mayor que cero."),
});

export type DatosConversion = yup.InferType<typeof esquemaConversion>;

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

/**
 * El pedido de quien compra sin cuenta.
 *
 * Pide los datos de contacto porque no hay perfil de dónde sacarlos, y ningún
 * pedido puede llegar sin una forma de responderle. Registrarse después
 * reclama estos pedidos por el WhatsApp.
 */
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
  // Estado y ciudad de la lista, no texto libre: «mcbo» y «Maracaibo» eran dos
  // destinos distintos para la base, y ninguno decía el estado, que es lo que
  // pide la encomienda para cotizar.
  estado_destino: yup
    .string()
    .trim()
    .nullable()
    .transform(vacioANulo)
    .defined()
    .when("entrega", {
      is: "envio_nacional",
      then: (esquema) =>
        esquema
          .required("Elige el estado.")
          .oneOf(
            ESTADOS.map((e) => e.nombre),
            "Ese estado no está en la lista.",
          ),
    }),
  ciudad_destino: yup
    .string()
    .trim()
    .nullable()
    .transform(vacioANulo)
    .defined()
    .when("entrega", {
      is: "envio_nacional",
      then: (esquema) =>
        esquema.required("Elige la ciudad.").test(
          "ciudad-del-estado",
          "Esa ciudad no es de ese estado.",
          // Se comprueba el par y no cada uno por su lado: los dos llegan del
          // navegador, y «Zulia + Punto Fijo» manda la encomienda a ninguna
          // parte aunque las dos existan.
          (ciudad, ctx) =>
            !ciudad || esDestinoValido(ctx.parent.estado_destino ?? "", ciudad),
        ),
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
 * El pedido de quien tiene cuenta.
 *
 * Es el mismo con el contacto descartado: el nombre y el correo los puso
 * Google y el WhatsApp está en el perfil, así que volver a pedirlos sería
 * hacer escribir tres veces lo mismo. `strip` y no `optional` a propósito —
 * si algo llega en esos campos se tira, y el servidor los lee del perfil, que
 * es la única versión en la que se puede confiar.
 */
export const esquemaPedidoConCuenta = esquemaPedido.shape({
  cliente_nombre: yup.string().strip(),
  whatsapp: yup.string().strip(),
  cliente_correo: yup.string().strip(),
});

export type DatosPedidoConCuenta = yup.InferType<typeof esquemaPedidoConCuenta>;

/** Por dónde entró un pedido que se carga a mano. La web no es una opción. */
export const ORIGENES_MANUALES = ["mostrador", "whatsapp"] as const;

/**
 * El pedido que registra el panel por una venta que ya ocurrió.
 *
 * Es el de invitado más tres cosas: por dónde entró, qué se llevó y si ya está
 * entregado. Las líneas se cargan a mano porque no hay carrito detrás — la
 * venta pasó en el mostrador o por chat.
 *
 * El precio por unidad se escribe y no se calcula. Lo carga quien vende, que
 * es quien sabe si hubo descuento; el formulario lo propone según el método de
 * pago, pero la última palabra es suya.
 */
export const esquemaPedidoManual = esquemaPedido.shape({
  // En el mostrador puede no haberlo: alguien compra un cable en efectivo y se
  // va. Exigirlo obligaría a inventar un número, y un número falso en la base
  // se ve igual que uno verdadero.
  whatsapp: yup
    .string()
    .trim()
    .nullable()
    .transform(vacioANulo)
    .defined()
    .matches(WHATSAPP, {
      message: "Son 10 dígitos, sin el 0 ni el +58.",
      excludeEmptyString: true,
    }),
}).concat(
  yup.object({
    origen: yup
      .string()
      .oneOf(ORIGENES_MANUALES, "Di si fue en el mostrador o por WhatsApp.")
      .required("Di por dónde entró."),

    // Una venta de mostrador ya pasó: se cobró y el equipo salió. Marcarlo
    // aquí evita tener que recorrer el flujo entero después.
    ya_entregado: yup.boolean().default(false),

    items: yup
      .array()
      .of(
        yup.object({
          producto_id: yup.string().required("Elige el producto."),
          cantidad: yup
            .number()
            .transform(numeroConComa)
            .typeError("La cantidad tiene que ser un número.")
            .required("Pon la cantidad.")
            .integer("Las unidades son enteras.")
            .min(1, "Mínimo una unidad."),
          precio_usd: yup
            .number()
            .transform(numeroConComa)
            .typeError("El precio tiene que ser un número.")
            .required("Pon el precio.")
            .min(0, "El precio no puede ser negativo."),
        }),
      )
      .required()
      .min(1, "Agrega al menos un producto."),
  }),
);

export type DatosPedidoManual = yup.InferType<typeof esquemaPedidoManual>;

/**
 * Los datos de un pedido que sí se pueden corregir después.
 *
 * Están los del cliente y los de la entrega: un nombre mal escrito o una
 * ciudad equivocada son errores de captura y arreglarlos no mueve dinero.
 *
 * No están las líneas ni los precios. Esos quedaron congelados al venderse y
 * de ellos cuelgan el total, el inventario descontado y una comisión que puede
 * estar pagada; cambiarlos por detrás dejaría tres cosas diciendo cifras
 * distintas de la misma venta. Para eso está cancelar y volver a registrar.
 */
export const esquemaPedidoEditado = yup.object({
  cliente_nombre: yup
    .string()
    .trim()
    .required("Escribe el nombre.")
    .min(2, "Escribe el nombre completo."),
  whatsapp: yup
    .string()
    .trim()
    .nullable()
    .transform(vacioANulo)
    .defined()
    .matches(WHATSAPP, {
      message: "Son 10 dígitos, sin el 0 ni el +58.",
      excludeEmptyString: true,
    }),
  cliente_correo: yup
    .string()
    .trim()
    .email("Ese correo no parece válido.")
    .nullable()
    .transform(vacioANulo)
    .defined(),
  // Puede quedar sin decidir: un pedido de la web puede estar por acordar, y
  // exigirlo aquí obligaría a inventar un método de pago para poder arreglar
  // un nombre mal escrito.
  metodo_pago: yup
    .string()
    .trim()
    .nullable()
    .transform(vacioANulo)
    .defined()
    .oneOf([...METODOS_PAGO, null], "Ese método de pago no existe."),
  entrega: yup
    .string()
    .oneOf(["punto_fijo", "envio_nacional"] as const)
    .required(),
  estado_destino: yup
    .string()
    .trim()
    .nullable()
    .transform(vacioANulo)
    .defined()
    .when("entrega", {
      is: "envio_nacional",
      then: (esquema) =>
        esquema
          .required("Elige el estado.")
          .oneOf(
            ESTADOS.map((e) => e.nombre),
            "Ese estado no está en la lista.",
          ),
    }),
  ciudad_destino: yup
    .string()
    .trim()
    .nullable()
    .transform(vacioANulo)
    .defined()
    .when("entrega", {
      is: "envio_nacional",
      then: (esquema) =>
        esquema.required("Elige la ciudad.").test(
          "ciudad-del-estado",
          "Esa ciudad no es de ese estado.",
          (ciudad, ctx) =>
            !ciudad || esDestinoValido(ctx.parent.estado_destino ?? "", ciudad),
        ),
    }),
  para_que_lo_usa: yup
    .string()
    .trim()
    .nullable()
    .transform(vacioANulo)
    .defined(),
});

export type DatosPedidoEditado = yup.InferType<typeof esquemaPedidoEditado>;

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
