-- ============================================================================
-- apso · Que la caja diga la verdad
--
-- Dos huecos que hacían que el saldo mostrara más plata de la que hay.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- La compra de mercancía sale de la caja
--
-- El costo de una entrada se guardaba solo para calcular margen: comprar 500
-- dólares de RAM no restaba de ningún lado. La caja quedaba inflada por todo
-- lo que se ha comprado desde que existe la tienda.
--
-- No se resuelve con un gasto. Comprar inventario no es gastar — es cambiar
-- efectivo por mercancía, y se vuelve gasto cuando se vende. Anotarlo en
-- `gastos` restaría el costo dos veces: una en el margen de la venta y otra en
-- la caja, y la ganancia saldría negativa siempre.
--
-- Se resuelve donde ya está el dato: la entrada dice cuánto costó, y ahora
-- también de dónde salió la plata. Nulo cuando no se sabe, que es preferible a
-- inventar un método.
-- ---------------------------------------------------------------------------

alter table public.movimientos_inventario
  add column metodo public.metodo_pago;

comment on column public.movimientos_inventario.metodo is
  'De dónde salió la plata de una compra. Solo tiene sentido en las entradas con costo; el inventario inicial no lo lleva porque esa mercancía se pagó antes de que existiera este registro.';

alter table public.movimientos_inventario
  add constraint metodo_solo_en_compras check (
    metodo is null
    or (motivo = 'entrada' and costo_unitario_usd is not null)
  );

-- ---------------------------------------------------------------------------
-- Se puede devolver dinero
--
-- `pagos` solo aceptaba montos positivos, así que un pedido cancelado después
-- de cobrado devolvía el stock y borraba la comisión, pero el dinero seguía
-- contado como ingreso. No había forma de arreglarlo desde el panel.
--
-- Con un tipo y no con montos negativos: un «−120» en una lista de cobros se
-- lee mal y se suma peor. Así la fila dice qué es, y el signo lo pone quien
-- suma.
-- ---------------------------------------------------------------------------

create type public.tipo_pago as enum ('cobro', 'reembolso');

alter table public.pagos
  add column tipo public.tipo_pago not null default 'cobro';

comment on column public.pagos.tipo is
  'Si el dinero entró o salió. Un reembolso guarda su monto en positivo igual que un cobro; el signo lo pone quien suma.';

-- La referencia única sigue valiendo para los dos: una devolución también
-- tiene su comprobante y tampoco puede aparecer dos veces.
