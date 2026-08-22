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

    await unlink(toFilePath(image.pathname));
  },
};
