import mongoose from "mongoose";

let masterConnection = null;

export async function connectMasterDB() {
  if (masterConnection) return masterConnection;

  const uri = process.env.MONGO_URI;
  const dbName = process.env.MASTER_DB_NAME;

  masterConnection = await mongoose.createConnection(`${uri}/${dbName}`);

  console.log("✅ Connected to MASTER DB");

  return masterConnection;
}
