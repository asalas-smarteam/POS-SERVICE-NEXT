import { localDriver } from "@/lib/storage/localDriver";
import { vercelBlobDriver } from "@/lib/storage/vercelBlobDriver";

const DRIVERS = {
  local: localDriver,
  "vercel-blob": vercelBlobDriver,
};

// El trim no es cosmetico. El panel de variables de entorno de Vercel guarda el
// valor tal cual se pega, sin recortar y sin mostrar los espacios, y si la
// variable esta marcada Sensitive tampoco se puede releer para notarlos. Un
// "vercel-blob " con un espacio al final caia aca en el driver desconocido, y el
// endpoint de subida enmascara los 500, asi que el sintoma era una foto que no
// sube y ningun motivo visible en ninguna parte.
//
// El fallback se aplica DESPUES del trim, no con `||` antes: una variable
// definida con solo espacios es truthy, asi que con `||` se colaba hasta el
// lookup en vez de contar como ausente.
export function getStorage() {
  const name = String(process.env.STORAGE_DRIVER ?? "").trim().toLowerCase() || "local";
  const driver = DRIVERS[name];

  if (!driver) {
    throw new Error(
      `Unknown STORAGE_DRIVER '${name}'. Use 'local' or 'vercel-blob'.`
    );
  }

  return driver;
}
