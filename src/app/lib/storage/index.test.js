import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getStorage } from "@/lib/storage";
import { localDriver } from "@/lib/storage/localDriver";
import { vercelBlobDriver } from "@/lib/storage/vercelBlobDriver";

let original;

beforeEach(() => {
  original = process.env.STORAGE_DRIVER;
});

afterEach(() => {
  if (original === undefined) {
    delete process.env.STORAGE_DRIVER;
  } else {
    process.env.STORAGE_DRIVER = original;
  }
});

describe("getStorage", () => {
  it("usa el driver local cuando la variable no esta definida", () => {
    delete process.env.STORAGE_DRIVER;
    expect(getStorage()).toBe(localDriver);
  });

  it("resuelve los dos drivers por su nombre exacto", () => {
    process.env.STORAGE_DRIVER = "local";
    expect(getStorage()).toBe(localDriver);

    process.env.STORAGE_DRIVER = "vercel-blob";
    expect(getStorage()).toBe(vercelBlobDriver);
  });

  it("ignora mayusculas", () => {
    process.env.STORAGE_DRIVER = "Vercel-Blob";
    expect(getStorage()).toBe(vercelBlobDriver);
  });

  // El caso que rompio en produccion: el valor se pego en el panel de Vercel
  // con un espacio al final. La interfaz no recorta ni muestra el espacio, y
  // como la variable estaba marcada Sensitive tampoco se podia releer para
  // notarlo. El resultado era un 500 enmascarado en cada subida de foto.
  it("recorta espacios alrededor del valor", () => {
    for (const value of ["vercel-blob ", " vercel-blob", "  vercel-blob  ", "\tvercel-blob\n"]) {
      process.env.STORAGE_DRIVER = value;
      expect(getStorage()).toBe(vercelBlobDriver);
    }
  });

  it("trata un valor de solo espacios como ausente", () => {
    process.env.STORAGE_DRIVER = "   ";
    expect(getStorage()).toBe(localDriver);
  });

  it("trata la cadena vacia como ausente", () => {
    process.env.STORAGE_DRIVER = "";
    expect(getStorage()).toBe(localDriver);
  });

  it("rechaza un nombre desconocido nombrando el valor recibido", () => {
    process.env.STORAGE_DRIVER = "s3";
    expect(() => getStorage()).toThrow(/'s3'/);
  });

  // El mensaje va al log del servidor, no al cliente: si citara el valor sin
  // delimitarlo, un espacio invisible seguiria siendo invisible en el log.
  it("delimita el valor en el mensaje para que un espacio se vea", () => {
    process.env.STORAGE_DRIVER = "vercel blob";
    expect(() => getStorage()).toThrow("'vercel blob'");
  });
});
