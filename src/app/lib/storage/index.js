import { localDriver } from "@/lib/storage/localDriver";
import { vercelBlobDriver } from "@/lib/storage/vercelBlobDriver";

const DRIVERS = {
  local: localDriver,
  "vercel-blob": vercelBlobDriver,
};

export function getStorage() {
  const name = String(process.env.STORAGE_DRIVER || "local").toLowerCase();
  const driver = DRIVERS[name];

  if (!driver) {
    throw new Error(
      `Unknown STORAGE_DRIVER '${name}'. Use 'local' or 'vercel-blob'.`
    );
  }

  return driver;
}
