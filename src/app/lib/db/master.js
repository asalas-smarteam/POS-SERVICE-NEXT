import mongoose from "mongoose";

let masterConnectionPromise = null;

// Se memoiza la promesa en vuelo, no la conexion resuelta. `createConnection`
// no es thenable (ver el JSDoc de mongoose), asi que "await"earla resuelve
// casi al instante, sin esperar el handshake real. Si el cache guardara el
// valor resuelto, cada llamada concurrente que llegue antes de esa asignacion
// veria el cache vacio y abriria su propio pool: N requests frios y
// simultaneos == N conexiones a la master DB, N-1 de ellas sin referencia y
// filtradas para siempre. Guardando la promesa, la asignacion al cache ocurre
// de forma sincronica antes de cualquier await, asi que cualquier llamada
// concurrente posterior encuentra el cache ya ocupado.
export async function connectMasterDB() {
  if (!masterConnectionPromise) {
    masterConnectionPromise = openMasterConnection().catch((error) => {
      // Un intento fallido no debe envenenar el cache para siempre: se borra
      // la entrada para que el proximo request pueda reintentar la conexion.
      masterConnectionPromise = null;
      throw error;
    });
  }

  return masterConnectionPromise;
}

async function openMasterConnection() {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.MASTER_DB_NAME;

  const conn = await mongoose.createConnection(`${uri}/${dbName}`);

  console.log("✅ Connected to MASTER DB");

  return conn;
}
