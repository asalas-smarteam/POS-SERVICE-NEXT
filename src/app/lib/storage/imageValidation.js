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

const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// `image-size@2.0.2` tiene bugs de loop infinito sin fix disponible en los
// parsers de ICNS (GHSA-w3rx-r6r6-pgpr) y de JXL/HEIF (GHSA-5p2g-fcmc-qvqq):
// un archivo de pocos bytes con la firma correcta cuelga el handler para
// siempre. La unica forma de no quedar expuestos es no dejar que esos parsers
// corran nunca, asi que el formato se identifica por los bytes ANTES de
// llamar a `imageSize`, y solo se lo llama para los tres formatos que
// realmente soportamos. Cualquier otro contenedor (los vulnerables incluidos)
// se descarta aqui mismo, sin que su parser exista siquiera la oportunidad de
// ejecutarse.
function sniffFormat(buffer) {
  if (buffer.length >= JPEG_SIGNATURE.length && buffer.subarray(0, 3).equals(JPEG_SIGNATURE)) {
    return "jpg";
  }

  if (buffer.length >= PNG_SIGNATURE.length && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return "png";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }

  return null;
}

export function validateImageBuffer(buffer) {
  if (!buffer || buffer.length === 0) {
    throw new ImageValidationError("Empty file", 400);
  }

  if (buffer.length > MAX_BYTES) {
    throw new ImageValidationError("File too large", 413);
  }

  // El formato en el que confia el resto de la funcion es el de la firma, no
  // el que reporte `imageSize`. Si la firma no es una de las tres permitidas,
  // rechazamos sin llamar a `imageSize` -- por lo tanto nunca sabemos (ni nos
  // interesa saber) que formato era realmente.
  const sniffed = sniffFormat(buffer);
  if (!sniffed) {
    throw new ImageValidationError("Unsupported image format 'unknown'", 400);
  }

  let metadata;
  try {
    metadata = imageSize(buffer);
  } catch {
    throw new ImageValidationError("Unrecognized image format", 400);
  }

  const format = FORMAT_ALIASES[String(metadata?.type ?? "").toLowerCase()];
  // La firma y lo que decodifica `imageSize` deberian coincidir siempre para
  // los tres formatos permitidos. Si no coinciden, algo esta mal (un archivo
  // con firma valida pero contenido inconsistente) y se trata igual que un
  // formato no soportado, en vez de confiar en cualquiera de los dos.
  if (!format || format !== sniffed) {
    throw new ImageValidationError("Unsupported image format 'unknown'", 400);
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
