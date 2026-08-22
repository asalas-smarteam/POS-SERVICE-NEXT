import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// Driver de desarrollo. Next sirve `public/` leyendo del disco en cada request,
// asi que un archivo escrito en runtime queda accesible sin ruta adicional. La
// URL es relativa, por lo que tampoco necesita `images.remotePatterns`.
const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");
const URL_PREFIX = "/uploads";

// La clave usa "/" siempre; el path del filesystem se arma con path.join para
// que funcione igual en Windows (desarrollo) y Linux (deploy).
const toFilePath = (key) => path.join(UPLOADS_ROOT, ...String(key).split("/"));

export const localDriver = {
  async put(buffer, { key }) {
    const target = toFilePath(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, buffer);

    return { url: `${URL_PREFIX}/${key}`, pathname: key };
  },

  async remove(image) {
    if (!image?.pathname) {
      return;
    }

    try {
      await unlink(toFilePath(image.pathname));
    } catch (error) {
      // ENOENT ("No such file") no es un error: el objetivo es que el archivo no exista,
      // y ya no existe. Cualquier otro error (permisos, archivo abierto, etc) se propaga
      // para que el caller vea problemas reales.
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  },
};
