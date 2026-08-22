import { del, put } from "@vercel/blob";

// `addRandomSuffix: false` porque la clave ya trae su propio sufijo aleatorio,
// generado por buildProductImageKey. Con el sufijo del SDK activado, el
// `pathname` devuelto no coincidiria con la clave pedida.
export const vercelBlobDriver = {
  async put(buffer, { key, contentType }) {
    const result = await put(key, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: false,
    });

    return { url: result.url, pathname: result.pathname ?? key };
  },

  async remove(image) {
    // El SDK borra por URL, no por pathname. Por eso `remove` recibe el objeto
    // guardado completo en vez de solo la clave: cada driver usa el
    // identificador que su backend necesita.
    if (!image?.url) {
      return;
    }

    await del(image.url);
  },
};
