-- =====================================================================
-- PORVENIR TRABAJA · 0003 · Catálogos iniciales (datos de configuración reales, NO de demostración)
-- El catálogo de requisitos es orientativo y versionado. Debe ser revisado
-- periódicamente por la administración contra las fuentes oficiales.
-- =====================================================================

insert into public.job_categories (slug, name, sort_order) values
  ('calzado', 'Calzado', 10),
  ('cuero', 'Cuero y marroquinería', 20),
  ('confeccion', 'Confección y textil', 30),
  ('ventas', 'Ventas', 40),
  ('gastronomia', 'Gastronomía', 50),
  ('comercio', 'Comercio', 60),
  ('almacen', 'Almacén y logística', 70),
  ('transporte', 'Transporte', 80),
  ('servicios', 'Servicios', 90),
  ('otros', 'Otros', 999)
on conflict (slug) do nothing;

insert into public.skills (slug, name) values
  ('aparado', 'Aparado de calzado'),
  ('corte-cuero', 'Corte de cuero'),
  ('pegado-suelas', 'Pegado de suelas'),
  ('armado-calzado', 'Armado de calzado'),
  ('acabado-calzado', 'Acabado de calzado'),
  ('diseno-calzado', 'Diseño de calzado'),
  ('costura-industrial', 'Costura industrial'),
  ('corte-tela', 'Corte de tela'),
  ('patronaje', 'Patronaje'),
  ('bordado', 'Bordado'),
  ('atencion-cliente', 'Atención al cliente'),
  ('ventas', 'Ventas'),
  ('manejo-caja', 'Manejo de caja'),
  ('cocina', 'Cocina'),
  ('reposteria', 'Repostería'),
  ('atencion-mesa', 'Atención en mesa'),
  ('manejo-almacen', 'Manejo de almacén'),
  ('control-inventario', 'Control de inventario'),
  ('empaque', 'Empaque y despacho'),
  ('conduccion', 'Conducción de vehículos'),
  ('reparto', 'Reparto y distribución'),
  ('limpieza', 'Limpieza'),
  ('contabilidad-basica', 'Contabilidad básica'),
  ('ofimatica', 'Ofimática'),
  ('redes-sociales', 'Redes sociales'),
  ('trabajo-equipo', 'Trabajo en equipo'),
  ('mantenimiento-maquinaria', 'Mantenimiento de maquinaria'),
  ('carpinteria', 'Carpintería'),
  ('soldadura', 'Soldadura')
on conflict (slug) do nothing;

insert into public.matching_config (id, version, weights) values
  (1, 1, '{"skills": 40, "experience": 25, "availability": 15, "location_modality": 10, "preferences": 10}')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Catálogo de requisitos de formalización (v1)
-- applies_when: reglas verificables evaluadas por el motor determinista.
--   {} = aplica siempre. Formato: {"all":[{field,op,value}],"any":[...]}
--   ops: eq, neq, in, gte, lte, truthy
-- ---------------------------------------------------------------------
insert into public.formalization_requirements
  (code, version, category, title, summary, plain_explanation, documents, applies_when, caveats, source_label, source_url, sort_order)
values
('RUC_INSCRIPCION', 1, 'tributaria',
 'Inscripción en el RUC (SUNAT)',
 'El RUC es el registro tributario que identifica a tu negocio ante SUNAT.',
 'Si todavía no tienes RUC, el primer paso de la formalización tributaria es inscribirte en el Registro Único de Contribuyentes de SUNAT. Con el RUC puedes elegir un régimen tributario y emitir comprobantes de pago.',
 '["DNI vigente del titular", "Dirección del domicilio fiscal", "Descripción de la actividad económica"]',
 '{"all":[{"field":"ruc_status","op":"in","value":["no_tiene","en_tramite","no_sabe"]}]}',
 'Tener RUC NO equivale a contar con autorización municipal ni cumplir obligaciones laborales. Son trámites distintos.',
 'SUNAT – Portal institucional', 'https://www.sunat.gob.pe/', 10),

('REGIMEN_TRIBUTARIO', 1, 'tributaria',
 'Elegir el régimen tributario que corresponde',
 'Cada régimen tiene límites y obligaciones distintas.',
 'Después de tener RUC debes escoger un régimen tributario (por ejemplo Nuevo RUS, Régimen Especial, Régimen MYPE Tributario o Régimen General). La opción correcta depende de tus ingresos, tipo de actividad y de si vendes a empresas. Confirma las condiciones vigentes con SUNAT.',
 '["RUC activo", "Estimación de ingresos mensuales"]',
 '{}',
 'Los límites y condiciones de cada régimen pueden cambiar. Verifica siempre en SUNAT.',
 'SUNAT – Portal institucional', 'https://www.sunat.gob.pe/', 20),

('COMPROBANTES_PAGO', 1, 'tributaria',
 'Emisión de comprobantes de pago',
 'Qué comprobantes puedes emitir depende de tu régimen.',
 'Una vez inscrito, debes emitir los comprobantes de pago que correspondan a tu régimen cuando vendes o prestas servicios (por ejemplo boletas o facturas). Consulta en SUNAT qué comprobantes puedes emitir y cómo hacerlo.',
 '["RUC activo", "Clave SOL (la gestionas tú directamente en SUNAT)"]',
 '{}',
 'Esta plataforma nunca te pedirá tu clave SOL ni credenciales de entidades del Estado.',
 'SUNAT – Portal institucional', 'https://www.sunat.gob.pe/', 30),

('LICENCIA_FUNCIONAMIENTO', 1, 'municipal',
 'Licencia de funcionamiento municipal',
 'Autorización de la municipalidad para operar en un local o establecimiento.',
 'Si tu negocio opera en un local, taller o en un inmueble donde atiendes público o realizas la actividad, normalmente necesitas la licencia de funcionamiento que otorga la municipalidad distrital. Los requisitos dependen de la actividad, la zonificación y el nivel de riesgo. Consulta en la Municipalidad Distrital de El Porvenir.',
 '["RUC (según el caso)", "Datos del local y de la actividad", "Documentos de propiedad o autorización de uso del local"]',
 '{"all":[{"field":"premises","op":"in","value":["local_fijo","taller","domicilio","otro"]}]}',
 'Es independiente del RUC. Los requisitos exactos los define la municipalidad. Esta plataforma no emite licencias.',
 'Municipalidad Distrital de El Porvenir (consultar en ventanilla o portal institucional)', null, 40),

('COMPATIBILIDAD_USO', 1, 'municipal',
 'Compatibilidad de uso / zonificación',
 'Verificar que tu actividad esté permitida en la zona donde funciona.',
 'Antes o durante la licencia, conviene confirmar con la municipalidad que la actividad que realizas es compatible con la zonificación de tu local.',
 '["Dirección exacta del local", "Descripción de la actividad"]',
 '{"all":[{"field":"premises","op":"in","value":["local_fijo","taller","domicilio"]}]}',
 'La decisión corresponde a la municipalidad.',
 'Municipalidad Distrital de El Porvenir (consultar en ventanilla o portal institucional)', null, 50),

('ITSE', 1, 'municipal',
 'Inspección técnica de seguridad en edificaciones (ITSE)',
 'Verificación de condiciones de seguridad del local.',
 'Algunos locales deben pasar por una inspección técnica de seguridad. Si te corresponde, cuándo se hace y qué exigen depende del nivel de riesgo del establecimiento. Pregunta a la municipalidad.',
 '["Plano o croquis del local (según nivel de riesgo)", "Condiciones de seguridad (extintores, señalización, etc.)"]',
 '{"all":[{"field":"premises","op":"in","value":["local_fijo","taller"]}]}',
 'No todos los negocios tienen las mismas exigencias; consulta a la municipalidad.',
 'Municipalidad Distrital de El Porvenir (consultar en ventanilla o portal institucional)', null, 60),

('AUTORIZACION_AMBULANTE', 1, 'municipal',
 'Autorización municipal para comercio en la vía pública',
 'El comercio ambulatorio se rige por ordenanzas de cada municipalidad.',
 'Si vendes en la vía pública, la autorización depende de las ordenanzas municipales vigentes, de las zonas permitidas y de cupos. No es la misma licencia de un local y no todos los comerciantes ambulantes pueden obtener la misma autorización. Consulta en la municipalidad.',
 '["DNI", "Datos del giro y del lugar de venta", "Los que indique la ordenanza vigente"]',
 '{"all":[{"field":"premises","op":"eq","value":"ambulante"}]}',
 'Puede que tu actividad no sea autorizable en la zona solicitada. Esta plataforma no gestiona ni garantiza autorizaciones.',
 'Municipalidad Distrital de El Porvenir (consultar en ventanilla o portal institucional)', null, 70),

('REMYPE', 1, 'laboral',
 'Registro de la micro y pequeña empresa (REMYPE)',
 'Registro ante el MTPE para acceder al régimen laboral especial MYPE.',
 'Si tienes trabajadores a cargo, puedes acreditar tu condición de micro o pequeña empresa ante el Ministerio de Trabajo (REMYPE) para acceder al régimen laboral especial que corresponda. Verifica requisitos y beneficios vigentes en el MTPE.',
 '["RUC activo", "Al menos un trabajador registrado (según requisitos vigentes)"]',
 '{"all":[{"field":"workers_count","op":"gte","value":1}]}',
 'Requisitos y beneficios pueden variar. Confirma en fuentes oficiales.',
 'MTPE – gob.pe', 'https://www.gob.pe/mtpe', 80),

('T_REGISTRO_PLANILLA', 1, 'laboral',
 'Registro de trabajadores y planilla electrónica',
 'Los trabajadores dependientes deben registrarse ante SUNAT.',
 'Si tienes trabajadores bajo relación de dependencia, debes registrarlos (T-Registro) y declarar la planilla electrónica ante SUNAT conforme a lo que corresponda.',
 '["RUC activo", "Datos y DNI de cada trabajador"]',
 '{"all":[{"field":"workers_count","op":"gte","value":1}]}',
 'Las obligaciones exactas dependen del tipo de relación (dependiente o no) y del régimen laboral.',
 'SUNAT – Portal institucional', 'https://www.sunat.gob.pe/', 90),

('ESSALUD', 1, 'laboral',
 'Afiliación de trabajadores a EsSalud',
 'Seguro de salud de los trabajadores dependientes.',
 'Los trabajadores dependientes deben contar con seguro de salud. Revisa en EsSalud cómo inscribir a tus trabajadores y cumplir los aportes que correspondan.',
 '["RUC activo", "Registro de trabajadores"]',
 '{"all":[{"field":"workers_count","op":"gte","value":1}]}',
 null,
 'EsSalud – gob.pe', 'https://www.gob.pe/essalud', 100),

('OBLIGACIONES_LABORALES', 1, 'laboral',
 'Contratos y obligaciones laborales según tu régimen',
 'Antes y al contratar, conoce tus obligaciones laborales.',
 'Si ya tienes trabajadores o piensas contratar, revisa con el MTPE los contratos, jornada, remuneración y beneficios que corresponden a tu régimen. Las prácticas son una modalidad formativa y no equivalen a un empleo dependiente.',
 '["Contrato por escrito (según la modalidad)", "Información del régimen laboral aplicable"]',
 '{"any":[{"field":"workers_count","op":"gte","value":1},{"field":"wants_hire","op":"truthy"}]}',
 'Esta orientación no reemplaza asesoría legal ni la opinión del MTPE.',
 'MTPE – gob.pe', 'https://www.gob.pe/mtpe', 110),

('SEGURIDAD_SALUD_TRABAJO', 1, 'laboral',
 'Seguridad y salud en el trabajo',
 'Medidas básicas para proteger a tus trabajadores.',
 'Con trabajadores a cargo existen obligaciones de seguridad y salud en el trabajo cuya exigencia depende del tamaño y del riesgo de la actividad (por ejemplo en talleres de calzado o cuero se manejan pegamentos y maquinaria). Consulta las exigencias aplicables en el MTPE.',
 '["Identificación de riesgos de tu taller o local", "Registro de capacitaciones (según corresponda)"]',
 '{"all":[{"field":"workers_count","op":"gte","value":1}]}',
 null,
 'MTPE – gob.pe', 'https://www.gob.pe/mtpe', 120)
on conflict (code, version) do nothing;

-- ---------------------------------------------------------------------
-- Base de conocimiento inicial para el asistente
-- ---------------------------------------------------------------------
insert into public.knowledge_sources (title, content, category, url, is_official, last_updated) values
('Cómo postular a un empleo en PORVENIR TRABAJA',
 'Crea tu cuenta como trabajador, completa tu perfil (habilidades, disponibilidad y experiencia) y entra a Buscar empleo. Abre una oferta, revisa los requisitos y pulsa Postular. Debes autorizar que la empresa vea tu perfil. No puedes postular dos veces a la misma oferta. En Mis postulaciones ves el estado: enviada, en revisión, preseleccionada, entrevista, seleccionada o descartada.',
 'empleo', null, false, current_date),
('Cómo crear tu CV con CV Inteligente',
 'En Mi CV inteligente puedes escribir tu experiencia o grabar/subir un audio contándola. Si el servicio de transcripción está configurado, el audio se convierte en texto; luego se proponen habilidades y experiencias que tú debes revisar, corregir y confirmar. Después descargas el CV en PDF. El sistema no inventa títulos, experiencia ni certificaciones. También puedes subir tu propio CV en PDF.',
 'empleo', null, false, current_date),
('Certificado Único Laboral (CUL)',
 'El Certificado Único Laboral es un documento oficial que reúne información laboral y académica de una persona y que se tramita en el portal del Estado peruano. PORVENIR TRABAJA no emite ni simula el CUL: el botón de la plataforma abre la página oficial en gob.pe.',
 'laboral', 'https://www.gob.pe/47089-obtener-tu-certificado-unico-laboral-cul', true, current_date),
('Formalización de negocios: lo básico',
 'Formalizarse tiene varias partes distintas: la formalización tributaria (RUC y régimen en SUNAT), las autorizaciones municipales (licencia de funcionamiento, zonificación, ITSE o comercio ambulatorio según el caso) y las obligaciones laborales (si tienes trabajadores). Tener RUC no equivale a tener licencia municipal. Usa IA Formaliza para obtener una ruta personalizada y consulta siempre las fuentes oficiales.',
 'formalizacion', 'https://www.gob.pe/', true, current_date),
('Verificación de la plataforma vs. autorización del Estado',
 'La insignia de negocio verificado en PORVENIR TRABAJA significa que la administración revisó documentos que el negocio presentó. No es una licencia ni una autorización emitida por SUNAT, el MTPE o la municipalidad, y no garantiza que el negocio esté legalmente autorizado.',
 'formalizacion', null, false, current_date),
('Protección de tus datos personales',
 'Tratamos tus datos conforme a la Ley N.º 29733 de Protección de Datos Personales y su reglamento. Puedes solicitar acceso, rectificación, oposición o eliminación de tus datos desde Privacidad en tu panel. Tu perfil solo se comparte con las empresas a las que postulas, o con quienes lo hagas visible.',
 'privacidad', null, false, current_date),
('Trámites ante SUNAT',
 'SUNAT administra el RUC, los regímenes tributarios, los comprobantes de pago y el registro de trabajadores (T-Registro). Los trámites se realizan en los canales oficiales de SUNAT con tus propias credenciales; nunca compartas tu clave SOL con terceros ni con esta plataforma.',
 'formalizacion', 'https://www.sunat.gob.pe/', true, current_date),
('Ministerio de Trabajo y Promoción del Empleo (MTPE)',
 'El MTPE orienta sobre obligaciones laborales, contratos, registro de la micro y pequeña empresa (REMYPE) y servicios de empleo. Consulta su información oficial en gob.pe.',
 'laboral', 'https://www.gob.pe/mtpe', true, current_date);
