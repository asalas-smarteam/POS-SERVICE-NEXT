"use client";

// El limite del servidor es 4 MB y una foto de celular pesa mas, asi que sin
// este paso la subida fallaria en el caso normal. Ademas es lo que hace que el
// menu publico cargue rapido con datos moviles.
const MAX_SIDE = 1600;
const QUALITY = 0.82;

export async function compressImage(file) {
  if (!file) {
    return null;
  }

  try {
    // `imageOrientation: 'from-image'` aplica la rotacion EXIF. Sin esto, las
    // fotos verticales de telefono se dibujan de costado en el canvas.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", QUALITY);
    });

    if (!blob) {
      return file;
    }

    return new File([blob], "product.jpg", { type: "image/jpeg" });
  } catch {
    // Safari en iOS puede fallar al decodificar imagenes muy grandes. Se
    // devuelve el original: si esta bajo el limite el servidor lo acepta, y si
    // no, lo rechaza con un mensaje que la UI ya sabe mostrar.
    return file;
  }
}
