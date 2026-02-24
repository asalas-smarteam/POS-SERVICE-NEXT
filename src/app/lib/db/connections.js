import mongoose from 'mongoose';

const tenantConnections = {};

export async function getTenantConnection(dbName) {
  if (tenantConnections[dbName]) {
    return tenantConnections[dbName];
  }

  const uri = process.env.MONGO_URI;

  const conn = await mongoose.createConnection(
    `${uri}/${dbName}`
  );

  console.log(`✅ Connected to TENANT DB: ${dbName}`);

  tenantConnections[dbName] = conn;
  return conn;
}
