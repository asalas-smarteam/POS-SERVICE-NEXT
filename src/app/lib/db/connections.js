import mongoose from 'mongoose';

const tenantConnectionPromises = {};

// Se memoiza la promesa en vuelo, no la conexion resuelta (mismo motivo que
// connectMasterDB en db/master.js: `createConnection` no es thenable, y
// guardar el valor ya resuelto deja una ventana donde llamadas concurrentes
// ven el cache vacio y cada una abre su propio pool). El menu publico es la
// primera puerta que un cliente sin autenticar puede golpear a la
// concurrencia que quiera, asi que esa ventana ya no es solo teorica.
export async function getTenantConnection(dbName) {
  if (!tenantConnectionPromises[dbName]) {
    tenantConnectionPromises[dbName] = openTenantConnection(dbName).catch((error) => {
      // Un intento fallido no debe envenenar el cache para siempre: se borra
      // la entrada para que el proximo request pueda reintentar la conexion.
      delete tenantConnectionPromises[dbName];
      throw error;
    });
  }

  return tenantConnectionPromises[dbName];
}

async function openTenantConnection(dbName) {
  const uri = process.env.MONGO_URI;

  const conn = await mongoose.createConnection(
    `${uri}/${dbName}`
  );

  console.log(`✅ Connected to TENANT DB: ${dbName}`);

  return conn;
}
