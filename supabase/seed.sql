-- ============================================================================
-- apso · Datos de ejemplo para desarrollo
--
-- Se ejecuta con `supabase db reset`. Los productos, precios y la tasa son de
-- ejemplo y hay que reemplazarlos por los reales antes de publicar.
--
-- Las fotos son deliberadamente placeholders: el handoff de diseño usa
-- recuadros con la palabra "FOTO" hasta que haya fotografía real de producto,
-- así que la tabla de imágenes queda vacía y la interfaz dibuja el recuadro.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tasa del día
-- ---------------------------------------------------------------------------

-- Tasa realista para desarrollo. Los prototipos del diseño usaban Bs 36,50,
-- que era el valor de cuando se dibujaron; sembrarlo hoy dejaría todos los
-- precios en bolívares veinte veces por debajo de lo que son.
insert into public.tasas_cambio (valor, fuente, vigente_desde)
values (807.3862, 'bcv', now() - interval '4 hours');

-- ---------------------------------------------------------------------------
-- Categorías
-- ---------------------------------------------------------------------------

insert into public.categorias (slug, nombre, padre_id, orden) values
  ('componentes', 'Componentes', null, 1),
  ('laptops', 'Laptops', null, 2),
  ('pc-a-medida', 'PC a medida', null, 3);

insert into public.categorias (slug, nombre, padre_id, orden)
select v.slug, v.nombre, c.id, v.orden
from (values
  ('ram', 'Memoria RAM', 1),
  ('graficas', 'Tarjetas gráficas', 2),
  ('almacenamiento', 'Almacenamiento', 3)
) as v (slug, nombre, orden)
cross join (select id from public.categorias where slug = 'componentes') as c;

-- ---------------------------------------------------------------------------
-- Marcas
-- ---------------------------------------------------------------------------

insert into public.marcas (slug, nombre) values
  ('corsair', 'Corsair'),
  ('kingston', 'Kingston'),
  ('samsung', 'Samsung'),
  ('crucial', 'Crucial'),
  ('asus', 'ASUS'),
  ('msi', 'MSI'),
  ('lenovo', 'Lenovo'),
  ('hp', 'HP');

-- ---------------------------------------------------------------------------
-- Productos
--
-- precio_referencia_usd es lo que cuesta el mismo producto en un marketplace
-- con comisión. Es el número tachado del bloque de ahorro.
-- ---------------------------------------------------------------------------

insert into public.productos (
  slug, nombre, categoria_id, marca_id, resumen, especificaciones,
  precio_usd, precio_referencia_usd, stock, dias_encargo,
  garantia_meses, garantia_vitalicia, destacado
)
select
  v.slug, v.nombre,
  (select id from public.categorias where slug = v.categoria),
  (select id from public.marcas where slug = v.marca),
  v.resumen, v.especificaciones::jsonb,
  v.precio_usd, v.precio_referencia_usd, v.stock, v.dias_encargo,
  v.garantia_meses, v.garantia_vitalicia, v.destacado
from (values

  -- --- Memoria RAM ---
  ('corsair-vengeance-32gb-ddr5-6000', 'Corsair Vengeance 32 GB DDR5 6000',
   'ram', 'corsair',
   'El punto dulce para editar video y jugar sin quedarse corto.',
   '[{"clave": "Capacidad", "valor": "2 × 16 GB"}, {"clave": "Velocidad", "valor": "6000 MT/s"}, {"clave": "Latencia", "valor": "CL30"}, {"clave": "Tipo", "valor": "DDR5"}, {"clave": "Perfil", "valor": "XMP 3.0"}]',
   120.00, 138.00, 3, null, null, true, true),

  ('kingston-fury-beast-16gb-ddr5-5600', 'Kingston Fury Beast 16 GB DDR5 5600',
   'ram', 'kingston',
   'Suficiente para oficina y estudio. Sube a 32 GB si editas.',
   '[{"clave": "Capacidad", "valor": "2 × 8 GB"}, {"clave": "Velocidad", "valor": "5600 MT/s"}, {"clave": "Latencia", "valor": "CL36"}, {"clave": "Tipo", "valor": "DDR5"}, {"clave": "Perfil", "valor": "XMP 3.0"}]',
   62.00, 74.00, 8, null, null, true, false),

  ('corsair-vengeance-64gb-ddr5-6000', 'Corsair Vengeance 64 GB DDR5 6000',
   'ram', 'corsair',
   'Para proyectos de 4K con muchas capas. Se trae por encargo.',
   '[{"clave": "Capacidad", "valor": "2 × 32 GB"}, {"clave": "Velocidad", "valor": "6000 MT/s"}, {"clave": "Latencia", "valor": "CL30"}, {"clave": "Tipo", "valor": "DDR5"}, {"clave": "Perfil", "valor": "XMP 3.0"}]',
   232.00, 268.00, 0, 12, null, true, false),

  ('kingston-fury-beast-32gb-ddr4-3200', 'Kingston Fury Beast 32 GB DDR4 3200',
   'ram', 'kingston',
   'La mejora que más rinde en un equipo con placa DDR4.',
   '[{"clave": "Capacidad", "valor": "2 × 16 GB"}, {"clave": "Velocidad", "valor": "3200 MT/s"}, {"clave": "Latencia", "valor": "CL16"}, {"clave": "Tipo", "valor": "DDR4"}, {"clave": "Perfil", "valor": "XMP 2.0"}]',
   78.00, 92.00, 5, null, null, true, false),

  -- --- Tarjetas gráficas ---
  ('asus-dual-rtx-4060-ti-8gb', 'ASUS Dual GeForce RTX 4060 Ti 8 GB',
   'graficas', 'asus',
   'Juega en 1080p y 1440p con cuadros de sobra.',
   '[{"clave": "Memoria", "valor": "8 GB GDDR6"}, {"clave": "Interfaz", "valor": "PCIe 4.0 ×8"}, {"clave": "Salidas", "valor": "3 × DisplayPort, 1 × HDMI"}, {"clave": "Consumo", "valor": "160 W"}, {"clave": "Fuente sugerida", "valor": "550 W"}]',
   319.00, 368.00, 2, null, 36, false, true),

  ('msi-ventus-rtx-4060-8gb', 'MSI Ventus 2X GeForce RTX 4060 8 GB',
   'graficas', 'msi',
   'La opción de mejor precio por cuadro para 1080p.',
   '[{"clave": "Memoria", "valor": "8 GB GDDR6"}, {"clave": "Interfaz", "valor": "PCIe 4.0 ×8"}, {"clave": "Salidas", "valor": "3 × DisplayPort, 1 × HDMI"}, {"clave": "Consumo", "valor": "115 W"}, {"clave": "Fuente sugerida", "valor": "450 W"}]',
   268.00, 310.00, 1, null, 36, false, false),

  ('asus-dual-rx-7600-8gb', 'ASUS Dual Radeon RX 7600 8 GB',
   'graficas', 'asus',
   'Alternativa AMD para 1080p. Llega por encargo en dos semanas.',
   '[{"clave": "Memoria", "valor": "8 GB GDDR6"}, {"clave": "Interfaz", "valor": "PCIe 4.0 ×8"}, {"clave": "Salidas", "valor": "3 × DisplayPort, 1 × HDMI"}, {"clave": "Consumo", "valor": "165 W"}, {"clave": "Fuente sugerida", "valor": "550 W"}]',
   245.00, 282.00, 0, 14, 24, false, false),

  -- --- Almacenamiento ---
  ('samsung-990-pro-1tb', 'Samsung 990 PRO 1 TB NVMe',
   'almacenamiento', 'samsung',
   'El más rápido que vale la pena. Se nota al abrir proyectos pesados.',
   '[{"clave": "Capacidad", "valor": "1 TB"}, {"clave": "Interfaz", "valor": "PCIe 4.0 ×4 NVMe"}, {"clave": "Lectura", "valor": "7.450 MB/s"}, {"clave": "Escritura", "valor": "6.900 MB/s"}, {"clave": "Formato", "valor": "M.2 2280"}]',
   96.00, 112.00, 6, null, 60, false, true),

  ('crucial-p3-plus-1tb', 'Crucial P3 Plus 1 TB NVMe',
   'almacenamiento', 'crucial',
   'Para almacenar sin pagar de más. Rinde igual en uso diario.',
   '[{"clave": "Capacidad", "valor": "1 TB"}, {"clave": "Interfaz", "valor": "PCIe 4.0 ×4 NVMe"}, {"clave": "Lectura", "valor": "5.000 MB/s"}, {"clave": "Escritura", "valor": "3.600 MB/s"}, {"clave": "Formato", "valor": "M.2 2280"}]',
   64.00, 76.00, 9, null, 60, false, false),

  ('samsung-990-pro-2tb', 'Samsung 990 PRO 2 TB NVMe',
   'almacenamiento', 'samsung',
   'Si editas en 4K, el espacio se acaba antes que la velocidad.',
   '[{"clave": "Capacidad", "valor": "2 TB"}, {"clave": "Interfaz", "valor": "PCIe 4.0 ×4 NVMe"}, {"clave": "Lectura", "valor": "7.450 MB/s"}, {"clave": "Escritura", "valor": "6.900 MB/s"}, {"clave": "Formato", "valor": "M.2 2280"}]',
   178.00, 206.00, 2, null, 60, false, false),

  -- --- Laptops ---
  ('lenovo-ideapad-slim-3-15', 'Lenovo IdeaPad Slim 3 15',
   'laptops', 'lenovo',
   'Para estudiar y trabajar. Liviana y sin cuentos.',
   '[{"clave": "Procesador", "valor": "Ryzen 5 7520U"}, {"clave": "Memoria", "valor": "16 GB LPDDR5"}, {"clave": "Almacenamiento", "valor": "512 GB NVMe"}, {"clave": "Pantalla", "valor": "15,6\" FHD IPS"}, {"clave": "Batería", "valor": "hasta 9 h"}]',
   389.00, 448.00, 1, null, 12, false, false),

  ('hp-victus-15', 'HP Victus 15',
   'laptops', 'hp',
   'Laptop para jugar sin pagar precio de gama alta. Por encargo.',
   '[{"clave": "Procesador", "valor": "Core i5-12450H"}, {"clave": "Gráfica", "valor": "RTX 2050 4 GB"}, {"clave": "Memoria", "valor": "16 GB DDR4"}, {"clave": "Almacenamiento", "valor": "512 GB NVMe"}, {"clave": "Pantalla", "valor": "15,6\" FHD 144 Hz"}]',
   598.00, 689.00, 0, 10, 12, false, false)

) as v (
  slug, nombre, categoria, marca, resumen, especificaciones,
  precio_usd, precio_referencia_usd, stock, dias_encargo,
  garantia_meses, garantia_vitalicia, destacado
);

-- ---------------------------------------------------------------------------
-- Usuario admin de desarrollo
--
-- Solo para el entorno local. En producción el admin se crea desde el panel de
-- Supabase y esta contraseña no existe en ningún lado.
--   correo: admin@apso.com.ve
--   clave:  apso.admin.local
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-4111-8111-111111111111',
  'authenticated',
  'authenticated',
  'admin@apso.com.ve',
  crypt('apso.admin.local', gen_salt('bf')),
  now(), now(), now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "José M."}'::jsonb,
  '', '', '', ''
);

-- GoTrue exige la identidad además del usuario para el proveedor de correo.
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
values (
  gen_random_uuid(),
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  '{"sub": "11111111-1111-4111-8111-111111111111", "email": "admin@apso.com.ve", "email_verified": true, "phone_verified": false}'::jsonb,
  'email',
  now(), now(), now()
);

-- El perfil lo crea el trigger al_crear_usuario; aquí solo se le da el rol.
update public.perfiles
set rol = 'admin', whatsapp = '+584246056110', whatsapp_verificado = true
where id = '11111111-1111-4111-8111-111111111111';
