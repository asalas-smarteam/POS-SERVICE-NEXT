import { describe, expect, it } from "vitest";
import {
  ImageValidationError,
  MAX_BYTES,
  validateImageBuffer,
} from "@/lib/storage/imageValidation";

// PNG minimo: firma + IHDR con ancho y alto explicitos.
function pngBuffer(width, height) {
  const buffer = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  buffer[24] = 8;
  buffer[25] = 6;
  return buffer;
}

function gifBuffer() {
  const buffer = Buffer.alloc(13);
  buffer.write("GIF89a", 0, "ascii");
  buffer.writeUInt16LE(10, 6);
  buffer.writeUInt16LE(10, 8);
  return buffer;
}

describe("validateImageBuffer", () => {
  it("acepta un PNG y devuelve formato, dimensiones y content type", () => {
    expect(validateImageBuffer(pngBuffer(800, 600))).toEqual({
      format: "png",
      width: 800,
      height: 600,
      contentType: "image/png",
    });
  });

  it("rechaza un buffer vacio", () => {
    expect(() => validateImageBuffer(Buffer.alloc(0))).toThrow(ImageValidationError);
  });

  it("rechaza un archivo mas grande que el limite con status 413", () => {
    const oversized = Buffer.alloc(MAX_BYTES + 1);
    pngBuffer(10, 10).copy(oversized, 0);
    try {
      validateImageBuffer(oversized);
      throw new Error("deberia haber lanzado");
    } catch (error) {
      expect(error).toBeInstanceOf(ImageValidationError);
      expect(error.status).toBe(413);
    }
  });

  it("rechaza texto renombrado a imagen", () => {
    expect(() => validateImageBuffer(Buffer.from("no soy una imagen"))).toThrow(
      /Unrecognized image format/
    );
  });

  // image-size si reconoce el SVG (type "svg"), por eso el rechazo ocurre en
  // nuestra lista de formatos permitidos, no en el parseo del header.
  it("rechaza SVG aunque image-size lo reconozca", () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>');
    expect(() => validateImageBuffer(svg)).toThrow("Unsupported image format 'svg'");
  });

  it("rechaza GIF", () => {
    expect(() => validateImageBuffer(gifBuffer())).toThrow(/Unsupported image format/);
  });

  // image-size no reconoce el header de un PDF y lanza al parsearlo, por eso
  // el mensaje es el de formato no reconocido, no el de formato no soportado.
  it("rechaza un PDF", () => {
    const pdf = Buffer.from("%PDF-1.7\n1 0 obj\n<< >>\nendobj\n");
    expect(() => validateImageBuffer(pdf)).toThrow("Unrecognized image format");
  });

  it("rechaza un lado mayor al maximo", () => {
    expect(() => validateImageBuffer(pngBuffer(4001, 10))).toThrow(/dimensions/);
  });

  it("rechaza demasiados pixeles totales aunque cada lado este permitido", () => {
    expect(() => validateImageBuffer(pngBuffer(4000, 4000))).toThrow(/pixels/);
  });

  it("asigna status 400 a los errores de formato", () => {
    try {
      validateImageBuffer(gifBuffer());
      throw new Error("deberia haber lanzado");
    } catch (error) {
      expect(error.status).toBe(400);
    }
  });
});
