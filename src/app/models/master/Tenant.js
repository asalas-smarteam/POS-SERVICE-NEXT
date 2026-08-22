import mongoose from 'mongoose';

const TenantSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  dbName: {
    type: String,
    required: true,
    unique: true,
  },
  plan: {
    type: String,
    required: true,
  },
  internalDomain: {
    type: String,
    required: true,
  },
  // Empresa a la que pertenece esta sede. Null/undefined = tenant standalone
  // (registros antiguos previos a multi-sede).
  companyId: {
    type: String,
    default: null,
    index: true,
  },
  // Nombre visible de la sede (ej. "Sede 1"). Solo aplica cuando hay empresa.
  sedeLabel: {
    type: String,
    default: null,
  },
  // Orden de la sede dentro de la empresa (1..N).
  sedeIndex: {
    type: Number,
    default: null,
  },
  // Entitlements resueltos, denormalizados desde Company.features hacia cada
  // sede. resolveTenant ya carga este documento en cada request autenticado,
  // asi que es la fuente autoritativa mas barata para el gate de la API.
  features: {
    type: [String],
    default: [],
  },
  // Slug del menu publico (/m/<slug>). Vive aca y no en la base de la sede
  // porque resolver el link tiene que pasar antes de saber a que base conectarse.
  // `sparse` es necesario: sin el, todas las sedes sin menu colisionarian en null
  // contra el indice unico.
  menuSlug: {
    type: String,
    default: null,
    lowercase: true,
    trim: true,
    unique: true,
    sparse: true,
  },
  status: {
    type: String,
    default: 'active',
  },
}, { timestamps: true });

export function TenantModel(conn) {
  return conn.model('Tenant', TenantSchema);
}
