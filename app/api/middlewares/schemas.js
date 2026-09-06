const { z } = require('zod');

const institutionTypeEnum = z.enum(['UNIVERSIDAD', 'TSU', 'ACADEMIA', 'CURSO']);
const gestionEnum = z.enum(['PUBLICA', 'PRIVADA']);
const modalityEnum = z.enum(['PRESENCIAL', 'ONLINE', 'HIBRIDA']);
const upperCase = (value) => (typeof value === 'string' ? value.toUpperCase() : value);
const boolFromString = (value) => {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return value;
};

exports.registerSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  apellido: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email(),
  password: z.string().min(8).max(128),
}).refine(data => data.name || (data.nombre && data.apellido), {
  message: "Se requiere 'name' o combinación de 'nombre' y 'apellido'",
  path: ["name"],
});

// Registro público de instituciones. Sin login. La institución queda en
// estado PENDING hasta que un Admin la apruebe (ver adminController).
exports.registerInstitutionSchema = z.object({
  name: z.string().min(2).max(100), // nombre de la persona de contacto
  email: z.string().email(),
  password: z.string().min(8).max(128),
  institution: z.object({
    name: z.string().min(2).max(200),
    type: institutionTypeEnum,
    description: z.string().max(1000).optional(),
    website: z.string().url().optional(),
    location: z.string().max(200).optional(),
    estado: z.string().max(100).optional(),
    ciudad: z.string().max(100).optional(),
    phone: z.string().max(20).optional(),
    gestion: gestionEnum.optional(),
  }),
});

exports.createUserSchema = z.discriminatedUnion('role', [
  z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    role: z.literal('STUDENT')
  }),
  z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    role: z.literal('ADMIN')
  }),
  z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    role: z.literal('INSTITUTION'),
    institution: z.object({
      name: z.string().min(2).max(200),
      type: institutionTypeEnum,
      description: z.string().max(1000).optional(),
      website: z.string().url().optional(),
      location: z.string().max(200).optional(),
      estado: z.string().max(100).optional(),
      ciudad: z.string().max(100).optional(),
      phone: z.string().max(20).optional(),
      gestion: gestionEnum.optional(),
    })
  })
]);

exports.loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

exports.institutionSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  website: z.string().url().optional(),
  location: z.string().max(200).optional(),
  estado: z.string().max(100).optional(),
  ciudad: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  type: institutionTypeEnum,
  gestion: gestionEnum.optional(),
});

// Búsqueda pública. NO expone `status` como filtro a propósito: el
// controlador siempre fuerza status = 'APPROVED', para que nadie pueda
// pedir ?status=PENDING y ver instituciones sin revisar.
exports.institutionQuerySchema = z.object({
  name: z.string().trim().max(200).optional(),
  type: z.preprocess(
    (value) => (typeof value === 'string' ? value.toUpperCase() : value),
    institutionTypeEnum.optional()
  ),
  estado: z.string().trim().max(100).optional(),
  ciudad: z.string().trim().max(100).optional(),
  area: z.string().trim().max(100).optional(),
  acreditada: z.preprocess(boolFromString, z.boolean().optional()),
  gestion: z.preprocess(upperCase, gestionEnum.optional()),
  modality: z.preprocess(upperCase, modalityEnum.optional()),
  isFree: z.preprocess(boolFromString, z.boolean().optional()),
  duration: z.preprocess(upperCase, z.enum(['CORTA', 'MEDIA', 'LARGA']).optional()),
  page: z.coerce.number().int().positive().max(100).default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Cola de revisión del Admin: sí puede elegir qué status listar.
exports.adminInstitutionQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
  page: z.coerce.number().int().positive().max(1000).default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

exports.institutionStatusUpdateSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

exports.favoriteSchema = z.object({
  institutionId: z.number().int().positive(),
});

exports.programSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  duration: z.string().min(1).max(50), // texto libre para mostrar, ej. "5 años"
  durationMonths: z.number().int().positive().max(240), // valor real usado para filtrar
  modality: z.enum(['PRESENCIAL', 'ONLINE', 'HIBRIDA']),
  area: z.string().min(2).max(100),
  type: z.enum(['CARRERA', 'TSU', 'DIPLOMADO', 'CURSO', 'TALLER']),
  institutionId: z.number().int().positive(),
  isFree: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  study_plan: z.string().min(1),
});

// Buckets del filtro de duración en el buscador público.
exports.durationBucketEnum = z.enum(['CORTA', 'MEDIA', 'LARGA']);

exports.programQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(100).default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
