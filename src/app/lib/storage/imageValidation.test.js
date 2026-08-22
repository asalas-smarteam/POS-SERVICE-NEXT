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

// Reproduce el payload de 16 bytes que cuelga el parser de ICNS de
// image-size@2.0.2 (GHSA-w3rx-r6r6-pgpr): firma "icns" + largo total + un
// registro "ic07" con largo 0.
function icnsHangBuffer() {
  const buffer = Buffer.alloc(16);
  buffer.write("icns", 0, "ascii");
  buffer.writeUInt32BE(16, 4);
  buffer.write("ic07", 8, "ascii");
  buffer.writeUInt32BE(0, 12);
  return buffer;
}

// Codestream JXL "desnudo" (sin envoltorio ISOBMFF): arranca con el marcador
// 0xFF 0x0A. Parte del mismo advisory que el ISOBMFF de abajo
// (GHSA-5p2g-fcmc-qvqq).
function jxlBareCodestreamBuffer() {
  return Buffer.from([0xff, 0x0a, 0x00, 0x00]);
}

// JXL envuelto en un box ISOBMFF: tamaño + "ftyp" + "jxl ".
function jxlIsobmffBuffer() {
  const buffer = Buffer.alloc(12);
  buffer.writeUInt32BE(12, 0);
  buffer.write("ftyp", 4, "ascii");
  buffer.write("jxl ", 8, "ascii");
  return buffer;
}

// HEIF envuelto en un box ISOBMFF: tamaño + "ftyp" + "heic".
function heifIsobmffBuffer() {
  const buffer = Buffer.alloc(12);
  buffer.writeUInt32BE(12, 0);
  buffer.write("ftyp", 4, "ascii");
  buffer.write("heic", 8, "ascii");
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

  // Ninguna de estas firmas coincide con JPEG/PNG/WebP, asi que el rechazo
  // ocurre en el sniff de bytes, antes de que `imageSize` llegue a correr. El
  // nombre real del formato ya no es algo que la funcion pueda conocer.
  it("rechaza texto renombrado a imagen", () => {
    expect(() => validateImageBuffer(Buffer.from("no soy una imagen"))).toThrow(
      "Unsupported image format 'unknown'"
    );
  });

  it("rechaza SVG aunque image-size lo reconozca", () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>');
    expect(() => validateImageBuffer(svg)).toThrow("Unsupported image format 'unknown'");
  });

  it("rechaza GIF", () => {
    expect(() => validateImageBuffer(gifBuffer())).toThrow("Unsupported image format 'unknown'");
  });

  it("rechaza un PDF", () => {
    const pdf = Buffer.from("%PDF-1.7\n1 0 obj\n<< >>\nendobj\n");
    expect(() => validateImageBuffer(pdf)).toThrow("Unsupported image format 'unknown'");
  });

  // Regresion de la vulnerabilidad real: este payload de 16 bytes cuelga
  // `image-size@2.0.2` si llega a su parser de ICNS (GHSA-w3rx-r6r6-pgpr).
  // Con el sniff de firma corriendo antes, se rechaza sin invocar `imageSize`.
  it("rechaza un payload ICNS que cuelga a image-size", () => {
    expect(() => validateImageBuffer(icnsHangBuffer())).toThrow(
      "Unsupported image format 'unknown'"
    );
  });

  // Mismo advisory que ICNS pero para JXL/HEIF (GHSA-5p2g-fcmc-qvqq), en sus
  // dos formas: codestream desnudo y envoltorio ISOBMFF.
  it("rechaza un codestream JXL desnudo", () => {
    expect(() => validateImageBuffer(jxlBareCodestreamBuffer())).toThrow(
      "Unsupported image format 'unknown'"
    );
  });

  it("rechaza JXL envuelto en ISOBMFF", () => {
    expect(() => validateImageBuffer(jxlIsobmffBuffer())).toThrow(
      "Unsupported image format 'unknown'"
    );
  });

  it("rechaza HEIF envuelto en ISOBMFF", () => {
    expect(() => validateImageBuffer(heifIsobmffBuffer())).toThrow(
      "Unsupported image format 'unknown'"
    );
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
