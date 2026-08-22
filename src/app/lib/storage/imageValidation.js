import { imageSize } from "image-size";

export const MAX_BYTES = 4 * 1024 * 1024;
export const MAX_SIDE = 4000;
export const MAX_PIXELS = 12_000_000;

// El formato se decide por los bytes del archivo, nunca por la extension ni por
// el `type` del File, que los elige el cliente. SVG queda fuera a proposito: es
// un documento que puede contener script, y servirlo desde el mismo origen es un
// vector de XSS.
const CONTENT_TYPE_BY_FORMAT = Object.freeze({
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
});

const FORMAT_ALIASES = Object.freeze({
  jpg: "jpg",
  jpeg: "jpg",
  png: "png",
  webp: "webp",
});

export class ImageValidationError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ImageValidationError";
    this.status = status;
  }
}

export function validateImageBuffer(buffer) {
  if (!buffer || buffer.length === 0) {
    throw new ImageValidationError("Empty file", 400);
  }

  if (buffer.length > MAX_BYTES) {
    throw new ImageValidationError("File too large", 413);
  }

  let metadata;
  try {
    metadata = imageSize(buffer);
  } catch {
    throw new ImageValidationError("Unrecognized image format", 400);
  }

  const format = FORMAT_ALIASES[String(metadata?.type ?? "").toLowerCase()];
  if (!format) {
    throw new ImageValidationError(
      `Unsupported image format '${metadata?.type ?? "unknown"}'`,
      400
    );
  }

  const width = Number(metadata?.width) || 0;
  const height = Number(metadata?.height) || 0;

  if (width <= 0 || height <= 0) {
    throw new ImageValidationError("Could not read image dimensions", 400);
  }

  if (width > MAX_SIDE || height > MAX_SIDE) {
    throw new ImageValidationError(
      `Image dimensions exceed ${MAX_SIDE}px`,
      400
    );
  }

  // MAX_PIXELS es menor que MAX_SIDE al cuadrado a proposito: asi el chequeo
  // rechaza imagenes de area grande (4000x4000, 3500x3500) aunque cada lado
  // sea legal por si solo, en vez de quedar subsumido por el limite por lado.
  if (width * height > MAX_PIXELS) {
    throw new ImageValidationError(
      `Image exceeds ${MAX_PIXELS} total pixels`,
      400
    );
  }

  return { format, width, height, contentType: CONTENT_TYPE_BY_FORMAT[format] };
}
