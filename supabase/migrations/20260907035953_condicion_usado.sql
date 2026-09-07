-- ============================================================================
-- apso · La condición «usado»
--
-- Faltaba: había nuevo y reacondicionado, pero no lo que se vende tal como
-- llegó, sin pasar por taller. Son cosas distintas y el cliente las paga
-- distinto, así que meterlas en el mismo cajón sería impreciso justo donde la
-- tienda promete procedencia clara.
--
-- Va después de reacondicionado a propósito: el orden del enum es el que usa
-- Postgres para ordenar, y así queda de mejor a peor estado.
-- ============================================================================

alter type public.condicion_producto add value if not exists 'usado'
  after 'reacondicionado';
