# Fotos y descripciones de producto — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un producto pueda tener una foto y una descripción, con almacenamiento intercambiable entre disco local (desarrollo) y Vercel Blob (producción).

**Architecture:** Un adaptador de almacenamiento con dos drivers aísla el resto del código de dónde viven los archivos. La validación de imágenes es lógica pura sin I/O, probada con Vitest. El cliente comprime antes de subir; el servidor revalida todo desde los bytes reales. Dos endpoints nuevos bajo `/api/products/[id]/image` son los únicos que escriben el campo `image`.

**Tech Stack:** Next.js 16 (App Router), Mongoose (una base de datos por tenant), next-intl, Vitest, `image-size`, `@vercel/blob`.

**Spec:** `docs/superpowers/specs/2026-08-21-product-images-design.md`

## Global Constraints

- Formatos permitidos: **JPEG, PNG, WebP**. SVG está prohibido (vector de XSS).
- Tamaño máximo del archivo: **4 MB** (4 \* 1024 \* 1024 bytes). El tope de body de una función Vercel es ~4.5 MB.
- Dimensiones máximas: **4000 px por lado** y **12.000.000 px totales**. El tope de área es menor que 4000x4000 a propósito: si fuera igual, el chequeo no rechazaría nada que el límite por lado no rechace ya.
- Largo máximo de `description`: **300** caracteres.
- Compresión en cliente: máximo **1600 px** de lado largo, JPEG calidad **0.82**.
- Variable de entorno `STORAGE_DRIVER`: valores `local` (default) o `vercel-blob`.
- Variable de entorno `BLOB_READ_WRITE_TOKEN`: solo con driver `vercel-blob`.
- Clave de almacenamiento: `tenants/<tenantId>/products/<productId>-<8 hex>.<ext>`. Nunca se usa el nombre del archivo subido.
- Los endpoints nuevos usan `requireModuleAccess(req, "products")`, el gate canónico.
- El campo `image` **no** es escribible desde `POST`/`PUT /api/products`.
- Los archivos de test se llaman `*.test.js`, viven junto al código que prueban, e importan `describe`/`it`/`expect` explícitamente desde `vitest` (sin globals, para no tocar la config de ESLint).
- Todos los archivos del repo usan CRLF (`core.autocrlf=true`). No convertir a LF.
- Textos de interfaz siempre por `next-intl`, en `messages/es.json` y `messages/en.json`. Nunca hardcodeados.
- Comentarios de código en español, como el resto del repo, y solo donde expliquen un *por qué* que no se lee del código.

---

## Estructura de archivos

**Crear:**

| Archivo | Responsabilidad |
|---|---|
| `vitest.config.mjs` | Config de Vitest con el alias `@` |
| `src/app/lib/storage/storageKeys.js` | Construir la clave de almacenamiento. Puro. |
| `src/app/lib/storage/storageKeys.test.js` | Tests de lo anterior |
| `src/app/lib/storage/imageValidation.js` | Validar formato, tamaño y dimensiones desde los bytes. Puro. |
| `src/app/lib/storage/imageValidation.test.js` | Tests de lo anterior |
| `src/app/lib/storage/index.js` | Selección de driver por variable de entorno |
| `src/app/lib/storage/localDriver.js` | Driver de disco para desarrollo |
| `src/app/lib/storage/vercelBlobDriver.js` | Driver de Vercel Blob para producción |
| `src/app/lib/products/productFields.js` | Whitelist de campos escribibles. Puro. |
| `src/app/lib/products/productFields.test.js` | Tests de lo anterior |
| `src/app/lib/images/compressImage.js` | Compresión en el navegador antes de subir |
| `src/app/api/products/[id]/image/route.js` | `POST` y `DELETE` de la imagen |
| `src/app/components/products/product-image-field.jsx` | Campo de imagen del formulario |

**Modificar:**

| Archivo | Cambio |
|---|---|
| `package.json` | Dependencias y script `test` |
| `.gitignore` | Ignorar `/public/uploads` |
| `.env.example` | `STORAGE_DRIVER` y `BLOB_READ_WRITE_TOKEN` |
| `next.config.mjs` | `images.remotePatterns` para el host de Blob |
| `src/app/models/tenant/Product.js` | Campos `description` e `image` |
| `src/app/api/products/route.js` | Whitelist en `POST` |
| `src/app/api/products/[id]/route.js` | Whitelist en `PUT` |
| `src/store/productsStore.js` | `createProduct` devuelve el producto; métodos de imagen |
| `src/app/components/products/product-dialog.jsx` | Descripción, campo de imagen y flujo de guardado |
| `src/app/components/products/product-card.jsx` | Mostrar la foto |
| `src/app/components/sales/product-card.jsx` | Mostrar la foto |
| `messages/es.json`, `messages/en.json` | Textos nuevos en `Products` |

## Nota sobre TDD en este plan

Las tareas 1 a 3 son TDD estricto: test que falla, implementación mínima, test que pasa.

Las tareas 4 a 10 no tienen tests automatizados, por decisión explícita del spec: probar los route handlers requiere mockear las conexiones por tenant y el cliente de Blob, que es un trabajo comparable al del sub-proyecto entero. Esas tareas cierran con **pasos de verificación manual concretos**, con el resultado esperado escrito. No son opcionales: si la verificación no da lo esperado, la tarea no está terminada.

---

### Task 1: Arnés de Vitest y clave de almacenamiento

Instala Vitest y entrega la primera unidad pura probada. La clave de almacenamiento se hace primero porque es la más simple: si sus tests corren, el arnés está bien montado.

**Files:**
- Create: `vitest.config.mjs`
- Create: `src/app/lib/storage/storageKeys.js`
- Test: `src/app/lib/storage/storageKeys.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: nada.
- Produces: `buildProductImageKey({ tenantId, productId, format, random })` → `string`. Lanza `Error` si `tenantId` o `productId` son inválidos, o si el formato no está soportado. `random` es una función opcional inyectable que devuelve el sufijo; su default son 4 bytes hex de `node:crypto`. Formatos aceptados: `jpg`, `jpeg`, `png`, `webp`; `jpeg` normaliza a extensión `jpg`.

El spec pide que la clave nunca use el nombre del archivo subido. No hay un test para eso porque la función **no recibe** un nombre de archivo: el requisito se cumple estructuralmente, y esa es una garantía más fuerte que un test. Quien modifique esta firma para aceptar un nombre está rompiendo el requisito.

- [ ] **Step 1: Instalar Vitest**

```bash
npm install --save-dev vitest
```

- [ ] **Step 2: Crear la config de Vitest**

El alias `@` tiene que apuntar a `src/app`, igual que en `jsconfig.json`, o los imports del proyecto no resuelven.

Crear `vitest.config.mjs`:

```js
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src/app"),
    },
  },
});
```

- [ ] **Step 3: Agregar el script de test**

En `package.json`, dentro de `"scripts"`, agregar:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Escribir el test que falla**

Crear `src/app/lib/storage/storageKeys.test.js`:

```js
import { describe, expect, it } from "vitest";
import { buildProductImageKey } from "@/lib/storage/storageKeys";

const VALID = {
  tenantId: "tenant-abc",
  productId: "650f1c2d3e4f5a6b7c8d9e0f",
  random: () => "a1b2c3d4",
};

describe("buildProductImageKey", () => {
  it("construye la clave con tenant, producto, sufijo y extension", () => {
    expect(buildProductImageKey({ ...VALID, format: "png" })).toBe(
      "tenants/tenant-abc/products/650f1c2d3e4f5a6b7c8d9e0f-a1b2c3d4.png"
    );
  });

  it("normaliza jpeg a jpg", () => {
    expect(buildProductImageKey({ ...VALID, format: "jpeg" })).toMatch(/\.jpg$/);
  });

  it("acepta el formato en mayusculas", () => {
    expect(buildProductImageKey({ ...VALID, format: "WEBP" })).toMatch(/\.webp$/);
  });

  it("rechaza un formato no soportado", () => {
    expect(() => buildProductImageKey({ ...VALID, format: "svg" })).toThrow(
      /Unsupported format/
    );
  });

  it("rechaza un productId que no es ObjectId", () => {
    expect(() =>
      buildProductImageKey({ ...VALID, productId: "../../etc/passwd", format: "png" })
    ).toThrow(/Invalid productId/);
  });

  it("rechaza un tenantId con separadores de ruta", () => {
    expect(() =>
      buildProductImageKey({ ...VALID, tenantId: "a/../b", format: "png" })
    ).toThrow(/Invalid tenantId/);
  });

  it("genera sufijos distintos en llamadas sucesivas sin random inyectado", () => {
    const first = buildProductImageKey({
      tenantId: VALID.tenantId,
      productId: VALID.productId,
      format: "png",
    });
    const second = buildProductImageKey({
      tenantId: VALID.tenantId,
      productId: VALID.productId,
      format: "png",
    });
    expect(first).not.toBe(second);
  });
});
```

- [ ] **Step 5: Correr el test para verificar que falla**

Run: `npm test`
Expected: FAIL — no se puede resolver `@/lib/storage/storageKeys`.

- [ ] **Step 6: Implementar**

Crear `src/app/lib/storage/storageKeys.js`:

```js
import { randomBytes } from "node:crypto";

// El nombre del archivo subido es entrada controlada por el usuario, asi que la
// clave se construye entera desde datos que el servidor ya validó. Los patrones
// no son cosmeticos: son lo que impide que un id inyecte segmentos de ruta.
const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;
const TENANT_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

const EXTENSION_BY_FORMAT = Object.freeze({
  jpg: "jpg",
  jpeg: "jpg",
  png: "png",
  webp: "webp",
});

const defaultRandom = () => randomBytes(4).toString("hex");

export function buildProductImageKey({
  tenantId,
  productId,
  format,
  random = defaultRandom,
} = {}) {
  if (!TENANT_ID_PATTERN.test(String(tenantId ?? ""))) {
    throw new Error("Invalid tenantId");
  }

  if (!OBJECT_ID_PATTERN.test(String(productId ?? ""))) {
    throw new Error("Invalid productId");
  }

  const extension = EXTENSION_BY_FORMAT[String(format ?? "").toLowerCase()];
  if (!extension) {
    throw new Error(`Unsupported format '${format}'`);
  }

  return `tenants/${tenantId}/products/${productId}-${random()}.${extension}`;
}
```

- [ ] **Step 7: Correr el test para verificar que pasa**

Run: `npm test`
Expected: PASS, 7 tests.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.mjs src/app/lib/storage/storageKeys.js src/app/lib/storage/storageKeys.test.js
git commit -m "test: agregar vitest y la construccion de claves de almacenamiento"
```

---

### Task 2: Validación de imágenes

**Files:**
- Create: `src/app/lib/storage/imageValidation.js`
- Test: `src/app/lib/storage/imageValidation.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `validateImageBuffer(buffer)` → `{ format, width, height, contentType }`. `format` es `"jpg" | "png" | "webp"`. Lanza `ImageValidationError`.
  - `class ImageValidationError extends Error` con propiedad `status` (`400` o `413`).
  - Constantes `MAX_BYTES`, `MAX_SIDE`, `MAX_PIXELS`.

- [ ] **Step 1: Instalar image-size**

`image-size` parsea solo los headers de la imagen, sin decodificarla, y detecta el formato desde los bytes reales. Eso cubre a la vez la lectura de dimensiones y la verificación de tipo.

```bash
npm install image-size@^2
```

- [ ] **Step 2: Verificar la forma del import**

La v2 exporta `imageSize` con nombre; versiones anteriores usaban export default. Confirmar antes de escribir código contra la API equivocada:

```bash
node -e "const m = require('image-size'); console.log(Object.keys(m))"
```
Expected: la salida incluye `imageSize`. Si no aparece, revisar la versión instalada y ajustar el import del Step 4.

- [ ] **Step 3: Escribir el test que falla**

Los buffers se arman a mano con los bytes de header de cada formato, que es exactamente lo que hace que el test valga: prueba que la detección mira los bytes y no la extensión ni el `type` declarado.

Crear `src/app/lib/storage/imageValidation.test.js`:

```js
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

  it("rechaza SVG aunque image-size lo reconozca", () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>');
    expect(() => validateImageBuffer(svg)).toThrow(/Unsupported image format/);
  });

  it("rechaza GIF", () => {
    expect(() => validateImageBuffer(gifBuffer())).toThrow(/Unsupported image format/);
  });

  it("rechaza un PDF", () => {
    const pdf = Buffer.from("%PDF-1.7\n1 0 obj\n<< >>\nendobj\n");
    expect(() => validateImageBuffer(pdf)).toThrow(
      /Unsupported image format|Unrecognized image format/
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
```

- [ ] **Step 4: Correr el test para verificar que falla**

Run: `npm test`
Expected: FAIL — no se puede resolver `@/lib/storage/imageValidation`.

- [ ] **Step 5: Implementar**

Crear `src/app/lib/storage/imageValidation.js`:

```js
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

  if (width * height > MAX_PIXELS) {
    throw new ImageValidationError(
      `Image exceeds ${MAX_PIXELS} total pixels`,
      400
    );
  }

  return { format, width, height, contentType: CONTENT_TYPE_BY_FORMAT[format] };
}
```

- [ ] **Step 6: Correr el test para verificar que pasa**

Run: `npm test`
Expected: PASS. Si el test de SVG falla porque `image-size` lanza en lugar de reconocerlo, el mensaje será `Unrecognized image format`: en ese caso ajustar ese test para aceptar cualquiera de los dos mensajes, ya que ambos rechazan el archivo, que es la propiedad que importa.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/app/lib/storage/imageValidation.js src/app/lib/storage/imageValidation.test.js
git commit -m "test: validar formato, tamano y dimensiones de imagen desde los bytes"
```

---

### Task 3: Whitelist de campos de producto

Cierra la asignación masiva de `Product.create(body)` antes de que `image` exista en el esquema. Si este orden se invierte, hay una ventana en la que un cliente puede escribir una URL arbitraria en el campo.

**Files:**
- Create: `src/app/lib/products/productFields.js`
- Test: `src/app/lib/products/productFields.test.js`
- Modify: `src/app/api/products/route.js`
- Modify: `src/app/api/products/[id]/route.js`

**Interfaces:**
- Consumes: nada.
- Produces: `pickProductFields(body)` → objeto con solo las claves de `PRODUCT_WRITABLE_FIELDS` que estén definidas en `body`. Y la constante `PRODUCT_WRITABLE_FIELDS` (array congelado).

- [ ] **Step 1: Escribir el test que falla**

Crear `src/app/lib/products/productFields.test.js`:

```js
import { describe, expect, it } from "vitest";
import { pickProductFields } from "@/lib/products/productFields";

describe("pickProductFields", () => {
  it("conserva los campos escribibles", () => {
    const result = pickProductFields({
      name: "Pizza",
      price: 5000,
      categoryId: "plato_fuerte",
      description: "Con albahaca",
      type: "SIMPLE",
      allowsHalf: true,
      allowsExtras: false,
      requiresKitchen: "YES",
      productSizeId: "large",
      ingredients: [],
    });

    expect(result).toEqual({
      name: "Pizza",
      price: 5000,
      categoryId: "plato_fuerte",
      description: "Con albahaca",
      type: "SIMPLE",
      allowsHalf: true,
      allowsExtras: false,
      requiresKitchen: "YES",
      productSizeId: "large",
      ingredients: [],
    });
  });

  it("descarta image, que solo escriben los endpoints de imagen", () => {
    const result = pickProductFields({
      name: "Pizza",
      image: { url: "https://atacante.example/x.jpg", pathname: "x" },
    });

    expect(result).toEqual({ name: "Pizza" });
  });

  it("descarta claves desconocidas", () => {
    expect(pickProductFields({ name: "Pizza", _id: "abc", createdAt: 1 })).toEqual({
      name: "Pizza",
    });
  });

  it("omite las claves ausentes en vez de ponerlas en undefined", () => {
    expect(Object.keys(pickProductFields({ name: "Pizza" }))).toEqual(["name"]);
  });

  it("conserva un valor null explicito", () => {
    expect(pickProductFields({ categoryId: null })).toEqual({ categoryId: null });
  });

  it("tolera un body vacio o ausente", () => {
    expect(pickProductFields({})).toEqual({});
    expect(pickProductFields()).toEqual({});
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npm test`
Expected: FAIL — no se puede resolver `@/lib/products/productFields`.

- [ ] **Step 3: Implementar el helper**

Crear `src/app/lib/products/productFields.js`:

```js
// Las rutas de products hacian `Product.create(body)` con el body completo. Con
// `image` en el esquema eso permitiria escribir una URL arbitraria salteandose
// toda la validacion de subida, asi que los campos aceptados son explicitos.
// `image` NO esta en la lista: solo lo escriben los endpoints de imagen.
export const PRODUCT_WRITABLE_FIELDS = Object.freeze([
  "name",
  "price",
  "categoryId",
  "productSizeId",
  "type",
  "ingredients",
  "allowsHalf",
  "allowsExtras",
  "requiresKitchen",
  "description",
]);

export function pickProductFields(body = {}) {
  const source = body ?? {};
  const picked = {};

  for (const field of PRODUCT_WRITABLE_FIELDS) {
    if (source[field] !== undefined) {
      picked[field] = source[field];
    }
  }

  return picked;
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npm test`
Expected: PASS, 6 tests nuevos.

- [ ] **Step 5: Usar el helper en POST**

En `src/app/api/products/route.js`, agregar el import:

```js
import { pickProductFields } from '@/lib/products/productFields';
```

Y reemplazar el bloque desde `const body = await req.json();` hasta `const product = await Product.create(body);` por:

```js
    const body = await req.json();
    const fields = pickProductFields(body);

    if (fields.categoryId !== undefined && fields.categoryId !== null && typeof fields.categoryId !== "string") {
      return NextResponse.json({ error: "categoryId debe ser un string." }, { status: 400 });
    }
    if (typeof fields.categoryId === "string" && fields.categoryId.trim() === "") {
      fields.categoryId = null;
    }

    const product = await Product.create(fields);
```

- [ ] **Step 6: Usar el helper en PUT**

En `src/app/api/products/[id]/route.js`, agregar el mismo import y reemplazar el bloque desde `const body = await req.json();` hasta la llamada a `findByIdAndUpdate` por:

```js
    const body = await req.json();
    const fields = pickProductFields(body);

    if (fields.categoryId !== undefined && fields.categoryId !== null && typeof fields.categoryId !== "string") {
      return NextResponse.json({ error: "categoryId debe ser un string." }, { status: 400 });
    }
    if (typeof fields.categoryId === "string" && fields.categoryId.trim() === "") {
      fields.categoryId = null;
    }

    const updated = await Product.findByIdAndUpdate(orderId, fields, {
      new: true,
      runValidators: true,
    });
```

- [ ] **Step 7: Verificar que no hay regresión**

Run: `npm test && npx eslint src && npm run build`
Expected: tests PASS, ESLint con los mismos 11 problemas preexistentes (4 errores, 7 warnings) y ninguno nuevo, build `✓ Compiled successfully`.

Verificación manual: con la app corriendo, crear un producto y editarlo desde `/products`. Ambas operaciones siguen funcionando igual que antes.

- [ ] **Step 8: Commit**

```bash
git add src/app/lib/products src/app/api/products
git commit -m "fix(products): aceptar solo campos explicitos en POST y PUT"
```

---

### Task 4: Adaptador de almacenamiento

**Files:**
- Create: `src/app/lib/storage/index.js`
- Create: `src/app/lib/storage/localDriver.js`
- Create: `src/app/lib/storage/vercelBlobDriver.js`
- Modify: `.gitignore`
- Modify: `.env.example`
- Modify: `package.json`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `getStorage()` → un driver. Lanza `Error` si `STORAGE_DRIVER` tiene un valor desconocido.
  - Contrato del driver: `put(buffer, { key, contentType })` → `Promise<{ url, pathname }>`; `remove(image)` → `Promise<void>`, donde `image` es `{ url, pathname }`.

- [ ] **Step 1: Instalar el cliente de Vercel Blob**

```bash
npm install @vercel/blob
```

- [ ] **Step 2: Crear el driver local**

Crear `src/app/lib/storage/localDriver.js`:

```js
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
```

- [ ] **Step 3: Crear el driver de Vercel Blob**

Crear `src/app/lib/storage/vercelBlobDriver.js`:

```js
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
```

- [ ] **Step 4: Crear la selección de driver**

Crear `src/app/lib/storage/index.js`:

```js
import { localDriver } from "@/lib/storage/localDriver";
import { vercelBlobDriver } from "@/lib/storage/vercelBlobDriver";

const DRIVERS = {
  local: localDriver,
  "vercel-blob": vercelBlobDriver,
};

export function getStorage() {
  const name = String(process.env.STORAGE_DRIVER || "local").toLowerCase();
  const driver = DRIVERS[name];

  if (!driver) {
    throw new Error(
      `Unknown STORAGE_DRIVER '${name}'. Use 'local' or 'vercel-blob'.`
    );
  }

  return driver;
}
```

- [ ] **Step 5: Ignorar los archivos subidos en local**

Agregar al final de `.gitignore`:

```
# uploads del driver de almacenamiento local (desarrollo)
/public/uploads
```

- [ ] **Step 6: Documentar las variables de entorno**

Agregar al final de `.env.example`:

```bash
# ─────────────────────────────────────────────
# Almacenamiento de archivos
# ─────────────────────────────────────────────
# 'local' escribe en public/uploads y no necesita credenciales: es el modo de
# desarrollo. 'vercel-blob' es el de produccion.
STORAGE_DRIVER=local

# Solo con STORAGE_DRIVER=vercel-blob
BLOB_READ_WRITE_TOKEN=
```

- [ ] **Step 7: Verificar**

Run: `npx eslint src && npm run build`
Expected: sin problemas nuevos, build exitoso.

Verificación manual del driver local en un REPL de Node, que confirma que escribe, devuelve la URL correcta y borra:

```bash
node --input-type=module -e "
const { localDriver } = await import('./src/app/lib/storage/localDriver.js');
const key = 'tenants/demo/products/deadbeefdeadbeefdeadbeef-a1b2c3d4.png';
const stored = await localDriver.put(Buffer.from([1,2,3]), { key });
console.log(stored);
const { existsSync } = await import('node:fs');
console.log('existe:', existsSync('public/uploads/' + key));
await localDriver.remove(stored);
console.log('existe tras borrar:', existsSync('public/uploads/' + key));
"
```
Expected: imprime `{ url: '/uploads/tenants/demo/...', pathname: 'tenants/demo/...' }`, luego `existe: true` y `existe tras borrar: false`.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json .gitignore .env.example src/app/lib/storage
git commit -m "feat(storage): adaptador con drivers local y vercel-blob"
```

---

### Task 5: Campos del modelo Product

**Files:**
- Modify: `src/app/models/tenant/Product.js`

**Interfaces:**
- Consumes: nada.
- Produces: `Product.description` (String, default `''`, máximo 300) y `Product.image` (`{ url, pathname, width, height }`, opcional). No requiere migración: ambos son opcionales.

- [ ] **Step 1: Agregar el sub-esquema de imagen y los campos**

En `src/app/models/tenant/Product.js`, después de la definición de `ProductIngredientSchema` y antes de `ProductSchema`, agregar:

```js
// `pathname` es lo que permite borrar el archivo del almacenamiento. Guardando
// solo la url, cada reemplazo de foto dejaria un huerfano ocupando espacio para
// siempre. Las dimensiones se guardan para que next/image pueda reservar el
// aspecto y el layout no salte al cargar.
const ProductImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    pathname: { type: String, required: true },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
  },
  // `_id: false` es una opcion del schema, no un path. Puesto dentro del primer
  // objeto, mongoose lo interpretaria como un campo llamado "_id" de tipo
  // booleano y el subdocumento igual tendria su propio ObjectId.
  { _id: false },
);
```

- [ ] **Step 2: Declarar los campos en ProductSchema**

Dentro de `ProductSchema`, justo después del campo `price`, agregar:

```js
  description: { type: String, default: '', trim: true, maxlength: 300 },
  image: { type: ProductImageSchema, default: null },
```

- [ ] **Step 3: Verificar**

Run: `npm run build`
Expected: build exitoso.

Verificación manual: con la app corriendo, abrir `/products`. La lista carga igual y los productos existentes se muestran sin cambios, porque ambos campos son opcionales.

- [ ] **Step 4: Commit**

```bash
git add src/app/models/tenant/Product.js
git commit -m "feat(products): campos description e image en el modelo"
```

---

### Task 6: Endpoints de imagen

**Files:**
- Create: `src/app/api/products/[id]/image/route.js`

**Interfaces:**
- Consumes: `requireModuleAccess` de `@/lib/security/featureAccess`; `validateImageBuffer` e `ImageValidationError` de `@/lib/storage/imageValidation`; `buildProductImageKey` de `@/lib/storage/storageKeys`; `getStorage` de `@/lib/storage`.
- Produces: `POST /api/products/[id]/image` (multipart, campo `file`) y `DELETE /api/products/[id]/image`. Ambos devuelven el documento del producto actualizado en JSON.

- [ ] **Step 1: Escribir el handler**

Crear `src/app/api/products/[id]/image/route.js`:

```js
import { NextResponse } from 'next/server';
import { requireModuleAccess } from '@/lib/security/featureAccess';
import { getTenantConnection } from '@/lib/db/connections';
import { ProductModel } from '@/models/tenant/Product';
import { getStorage } from '@/lib/storage';
import { buildProductImageKey } from '@/lib/storage/storageKeys';
import { ImageValidationError, validateImageBuffer } from '@/lib/storage/imageValidation';

const errorStatus = (error) => {
  if (error instanceof ImageValidationError) {
    return error.status;
  }
  return error?.status ?? 500;
};

// Un borrado fallido deja un huerfano; abortar la operacion dejaria al producto
// apuntando a un archivo que ya no queremos. El huerfano es el menor de los dos
// males, asi que se registra y se sigue.
async function removeQuietly(storage, image) {
  if (!image) {
    return;
  }

  try {
    await storage.remove(image);
  } catch (error) {
    console.warn('No se pudo borrar el archivo anterior', image.pathname, error);
  }
}

const previousImageOf = (product) =>
  product?.image?.pathname
    ? { url: product.image.url, pathname: product.image.pathname }
    : null;

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const { tenant } = await requireModuleAccess(req, 'products');
    const conn = await getTenantConnection(tenant.dbName);
    const Product = ProductModel(conn);

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'file is required.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { format, width, height, contentType } = validateImageBuffer(buffer);

    const key = buildProductImageKey({
      tenantId: tenant.tenantId,
      productId: String(product._id),
      format,
    });

    const storage = getStorage();
    const stored = await storage.put(buffer, { key, contentType });
    const previous = previousImageOf(product);

    const updated = await Product.findByIdAndUpdate(
      product._id,
      { $set: { image: { url: stored.url, pathname: stored.pathname, width, height } } },
      { new: true, runValidators: true },
    );

    await removeQuietly(storage, previous);

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: errorStatus(error) });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const { tenant } = await requireModuleAccess(req, 'products');
    const conn = await getTenantConnection(tenant.dbName);
    const Product = ProductModel(conn);

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    const previous = previousImageOf(product);

    // Idempotente: sobre un producto sin foto no hay nada que borrar.
    if (!previous) {
      return NextResponse.json(product);
    }

    const updated = await Product.findByIdAndUpdate(
      product._id,
      { $unset: { image: 1 } },
      { new: true },
    );

    await removeQuietly(getStorage(), previous);

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: errorStatus(error) });
  }
}
```

- [ ] **Step 2: Verificar**

Run: `npx eslint src && npm run build`
Expected: sin problemas nuevos, build exitoso. En la salida del build tiene que aparecer la ruta `ƒ /api/products/[id]/image`.

- [ ] **Step 3: Verificación manual con curl**

Requiere la app corriendo, `STORAGE_DRIVER=local`, sesión iniciada como admin de una sede, y el id de un producto existente. La cookie se copia de las DevTools del navegador.

```bash
curl -i -X POST http://localhost:3000/api/products/<PRODUCT_ID>/image \
  -H "Cookie: auth_token=<TOKEN>" \
  -F "file=@/ruta/a/foto.jpg"
```
Expected: `200` y un JSON con `image.url` apuntando a `/uploads/tenants/...`. El archivo existe en `public/uploads/`.

```bash
curl -i -X POST http://localhost:3000/api/products/<PRODUCT_ID>/image \
  -H "Cookie: auth_token=<TOKEN>" \
  -F "file=@package.json"
```
Expected: `400` con `Unrecognized image format`.

```bash
curl -i -X DELETE http://localhost:3000/api/products/<PRODUCT_ID>/image \
  -H "Cookie: auth_token=<TOKEN>"
```
Expected: `200`, el JSON ya no trae `image`, y el archivo desapareció de `public/uploads/`. Repetir el mismo DELETE: `200` otra vez, sin error.

```bash
curl -i -X DELETE http://localhost:3000/api/products/<PRODUCT_ID>/image
```
Expected: `500`, no 401. Es comportamiento preexistente de toda la API: `requireModuleAccess` llama primero a `resolveTenant`, que sin cookie ni headers lanza un Error pelado sin `.status`, y el mapeo cae al 500 por defecto. Lo que este paso verifica es que la ruta no deja pasar a alguien sin sesion; el codigo equivocado es deuda anotada aparte.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/products/[id]/image/route.js"
git commit -m "feat(products): endpoints para subir y borrar la foto de un producto"
```

---

### Task 7: Compresión en el cliente

**Files:**
- Create: `src/app/lib/images/compressImage.js`

**Interfaces:**
- Consumes: nada.
- Produces: `compressImage(file)` → `Promise<File>`. Devuelve un JPEG reescalado, o el `File` original si la compresión no es posible. Nunca lanza.

- [ ] **Step 1: Implementar**

Crear `src/app/lib/images/compressImage.js`:

```js
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
```

- [ ] **Step 2: Verificar**

Run: `npx eslint src && npm run build`
Expected: sin problemas nuevos, build exitoso.

La verificación funcional real ocurre en la tarea 9, cuando el diálogo ya usa esta función.

- [ ] **Step 3: Commit**

```bash
git add src/app/lib/images/compressImage.js
git commit -m "feat(products): comprimir imagenes en el navegador antes de subir"
```

---

### Task 8: Métodos del store

**Files:**
- Modify: `src/store/productsStore.js`

**Interfaces:**
- Consumes: los endpoints de la tarea 6.
- Produces:
  - `createProduct(payload)` → `{ success, product?, message? }`. **Cambio de contrato:** antes devolvía solo `{ success }`; ahora incluye el producto creado, porque el diálogo necesita su `_id` para subir la foto.
  - `uploadProductImage(id, file)` → `{ success, message? }`.
  - `deleteProductImage(id)` → `{ success, message? }`.

- [ ] **Step 1: Hacer que createProduct devuelva el producto**

En `src/store/productsStore.js`, dentro de `createProduct`, reemplazar:

```js
      if (!response.ok) {
        throw new Error("No se pudo crear el producto.");
      }
      await get().fetchProducts();
      set({ actionLoading: false });
      return { success: true };
```

por:

```js
      if (!response.ok) {
        throw new Error("No se pudo crear el producto.");
      }
      // El diálogo necesita el _id recién creado para poder subir la foto: al
      // crear todavía no existe id al que asociarla.
      const created = await response.json().catch(() => null);
      await get().fetchProducts();
      set({ actionLoading: false });
      return { success: true, product: created };
```

- [ ] **Step 2: Agregar los métodos de imagen**

En el mismo archivo, después del método `updateProduct` y antes del cierre del store, agregar:

```js
  uploadProductImage: async (id, file) => {
    set({ actionLoading: true });
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/products/${id}/image`, {
        method: "POST",
        headers: { ...getTenantHeaders() },
        body: formData,
      });

      if (!response.ok) {
        // Un 413 puede venir de la plataforma antes de llegar al handler, y en
        // ese caso no hay cuerpo JSON que leer.
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || `Error ${response.status}`);
      }

      await get().fetchProducts();
      set({ actionLoading: false });
      return { success: true };
    } catch (error) {
      set({ actionLoading: false });
      return { success: false, message: error?.message };
    }
  },
  deleteProductImage: async (id) => {
    set({ actionLoading: true });
    try {
      const response = await fetch(`/api/products/${id}/image`, {
        method: "DELETE",
        headers: { ...getTenantHeaders() },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || `Error ${response.status}`);
      }

      await get().fetchProducts();
      set({ actionLoading: false });
      return { success: true };
    } catch (error) {
      set({ actionLoading: false });
      return { success: false, message: error?.message };
    }
  },
```

Nota: no se pone `Content-Type` en el `POST`. Con `FormData`, el navegador tiene que fijarlo él para incluir el `boundary`; fijarlo a mano rompe el parseo del multipart en el servidor.

- [ ] **Step 3: Verificar**

Run: `npx eslint src && npm run build`
Expected: sin problemas nuevos, build exitoso.

Verificación manual: crear un producto desde `/products`. Sigue funcionando; el cambio de contrato de `createProduct` es aditivo y el diálogo todavía solo mira `result.success`.

- [ ] **Step 4: Commit**

```bash
git add src/store/productsStore.js
git commit -m "feat(products): metodos de store para subir y borrar la foto"
```

---

### Task 9: Descripción y foto en el diálogo

La tarea más grande del plan. Entrega el campo de imagen, el de descripción, y el flujo de guardado que las une.

**Decisión de diseño:** el archivo se guarda en el estado del diálogo y **todas las operaciones de imagen ocurren al guardar**, nunca al seleccionar. Un solo camino sirve para crear y para editar, cerrar el diálogo descarta los cambios como cualquier otro campo, y no hace falta un `id` que al crear todavía no existe.

**Files:**
- Create: `src/app/components/products/product-image-field.jsx`
- Modify: `src/app/components/products/product-dialog.jsx`
- Modify: `messages/es.json`, `messages/en.json`

**Interfaces:**
- Consumes: `compressImage` (tarea 7); `uploadProductImage`, `deleteProductImage`, `createProduct` (tarea 8).
- Produces: componente `ProductImageField({ currentUrl, file, onSelect, onRemove, disabled })`. `currentUrl` es la foto ya guardada (o `null`), `file` el archivo en espera de subida (o `null`), `onSelect(file)` y `onRemove()` son callbacks. El componente no sube nada.

- [ ] **Step 1: Agregar los textos**

En `messages/es.json`, dentro del objeto `Products`:

```json
"description": "Descripción",
"descriptionPlaceholder": "Ej: Pizza con salsa de tomate, mozzarella y albahaca",
"descriptionRemaining": "{count} caracteres restantes",
"photo": "Foto",
"addPhoto": "Agregar foto",
"replacePhoto": "Reemplazar",
"removePhoto": "Quitar foto",
"photoHint": "JPG, PNG o WebP. Máximo 4 MB.",
"photoPending": "Se subirá al guardar",
"photoUploadError": "El producto se guardó, pero la foto no se pudo subir: {reason}",
"noPhoto": "Sin foto",
```

Los mismos en `messages/en.json`:

```json
"description": "Description",
"descriptionPlaceholder": "E.g. Pizza with tomato sauce, mozzarella and basil",
"descriptionRemaining": "{count} characters left",
"photo": "Photo",
"addPhoto": "Add photo",
"replacePhoto": "Replace",
"removePhoto": "Remove photo",
"photoHint": "JPG, PNG or WebP. 4 MB max.",
"photoPending": "Will be uploaded on save",
"photoUploadError": "The product was saved, but the photo could not be uploaded: {reason}",
"noPhoto": "No photo",
```

- [ ] **Step 2: Crear el campo de imagen**

Crear `src/app/components/products/product-image-field.jsx`:

```jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function ProductImageField({
  currentUrl = null,
  file = null,
  onSelect,
  onRemove,
  disabled = false,
}) {
  const t = useTranslations("Products");
  const inputRef = useRef(null);
  const [objectUrl, setObjectUrl] = useState(null);

  // Un object URL retiene el blob hasta que se revoca. Sin esta limpieza, cada
  // foto que el usuario prueba y descarta queda en memoria.
  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setObjectUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const preview = objectUrl ?? currentUrl;

  const handleChange = (event) => {
    const selected = event.target.files?.[0];
    if (selected) {
      onSelect?.(selected);
    }
    // Permite volver a elegir el mismo archivo tras quitarlo.
    event.target.value = "";
  };

  return (
    <div className="space-y-2">
      <Label>{t("photo")}</Label>
      <div className="flex items-start gap-3">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-lg border bg-muted/40">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- previsualizacion local: la fuente puede ser un blob: URL, que next/image no acepta
            <img
              src={preview}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-xs text-muted-foreground">
              {t("noPhoto")}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus className="size-4" />
              {preview ? t("replacePhoto") : t("addPhoto")}
            </Button>
            {preview ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => onRemove?.()}
              >
                <Trash2 className="size-4" />
                {t("removePhoto")}
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{t("photoHint")}</p>
          {file ? (
            <p className="text-xs font-medium text-primary">{t("photoPending")}</p>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Conectar el diálogo — imports y estado**

En `src/app/components/products/product-dialog.jsx`, agregar a los imports:

```jsx
import { ProductImageField } from "@/components/products/product-image-field";
import { compressImage } from "@/lib/images/compressImage";
```

Agregar `description: ""` al objeto `emptyForm`, después de `price: ""`.

Extender el destructuring del store para incluir los métodos nuevos:

```jsx
  const {
    ingredients,
    fetchIngredients,
    actionLoading,
    createProduct,
    updateProduct,
    uploadProductImage,
    deleteProductImage,
  } = useProductsStore((state) => ({
    ingredients: state.ingredients,
    fetchIngredients: state.fetchIngredients,
    actionLoading: state.actionLoading,
    createProduct: state.createProduct,
    updateProduct: state.updateProduct,
    uploadProductImage: state.uploadProductImage,
    deleteProductImage: state.deleteProductImage,
  }));
```

Agregar dos estados junto a los existentes:

```jsx
  const [imageFile, setImageFile] = useState(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
```

- [ ] **Step 4: Conectar el diálogo — sincronizar al abrir y cerrar**

En el `useEffect` que reacciona a `[open, product, duplicateFrom]`, reemplazar la rama de cierre y la de `source` por:

```jsx
    if (!open) {
      setForm(emptyForm);
      setAlert(null);
      setSelectValue("");
      setIngredientSearch("");
      setImageFile(null);
      setRemoveExistingImage(false);
      return;
    }

    const source = product ?? duplicateFrom;

    if (source) {
      setForm({
        name: source?.name ?? "",
        price: source?.price ?? "",
        description: source?.description ?? "",
        type: source?.type ?? "SIMPLE",
        ingredients: normalizeIngredients(source?.ingredients ?? []),
        categoryId: source?.categoryId ?? "",
        allowsHalf: Boolean(source?.allowsHalf),
        productSizeId: source?.productSizeId ?? "",
        requiresKitchen: source?.requiresKitchen ?? "INHERIT",
      });
    } else {
      setForm(emptyForm);
    }
```

Una nota importante: al **duplicar** un producto no se copia la imagen. `duplicateFrom` trae el `image` del original, pero copiar el archivo en el almacenamiento no está en el alcance de este sub-proyecto. La foto del duplicado arranca vacía, y por eso el `currentUrl` del Step 6 se lee de `product`, no de `source`.

- [ ] **Step 5: Conectar el diálogo — el flujo de guardado**

Reemplazar el bloque final de `handleSubmit`, desde `const result = isEditing` hasta el cierre de la función, por:

```jsx
    payload.description = form.description.trim();

    const result = isEditing
      ? await updateProduct(product._id, payload)
      : await createProduct(payload);

    if (!result?.success) {
      setAlert({
        type: "error",
        message: result?.message || t("saveError"),
      });
      return;
    }

    // El producto ya está guardado. Si falla la imagen no se reporta como error
    // de guardado, porque no lo es: se avisa aparte y el diálogo queda abierto
    // para poder reintentar.
    const productId = isEditing ? product._id : result.product?._id;
    let imageError = null;

    if (productId && imageFile) {
      const compressed = await compressImage(imageFile);
      const upload = await uploadProductImage(productId, compressed);
      if (!upload.success) {
        imageError = upload.message;
      }
    } else if (productId && removeExistingImage && product?.image?.url) {
      const removal = await deleteProductImage(productId);
      if (!removal.success) {
        imageError = removal.message;
      }
    }

    if (imageError) {
      setImageFile(null);
      setAlert({
        type: "error",
        message: t("photoUploadError", { reason: imageError }),
      });
      onSuccess?.();
      return;
    }

    setAlert({ type: "success", message: t("savedSuccessfully") });
    onSuccess?.();
    onOpenChange?.(false);
```

- [ ] **Step 6: Conectar el diálogo — los campos en el formulario**

En el JSX, después del `div.grid` que contiene nombre y precio, insertar:

```jsx
          <div className="space-y-2">
            <Label htmlFor="product-description">{t("description")}</Label>
            <textarea
              id="product-description"
              rows={3}
              maxLength={300}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder={t("descriptionPlaceholder")}
            />
            <p className="text-right text-xs text-muted-foreground">
              {t("descriptionRemaining", { count: 300 - form.description.length })}
            </p>
          </div>

          <ProductImageField
            currentUrl={removeExistingImage ? null : product?.image?.url ?? null}
            file={imageFile}
            disabled={actionLoading}
            onSelect={(file) => {
              setImageFile(file);
              setRemoveExistingImage(false);
            }}
            onRemove={() => {
              setImageFile(null);
              setRemoveExistingImage(true);
            }}
          />
```

- [ ] **Step 7: Verificar**

Run: `npx eslint src && npm run build`
Expected: sin problemas nuevos, build exitoso.

- [ ] **Step 8: Verificación manual**

Con la app corriendo y `STORAGE_DRIVER=local`, en `/products`:

1. Crear un producto nuevo con nombre, precio, descripción y foto. Se guarda y la foto aparece. Confirma que la subida tras la creación funciona, que es el caso sin `id` previo.
2. Editar ese producto y reemplazar la foto. El archivo anterior desaparece de `public/uploads/`.
3. Editar y quitar la foto. El campo queda vacío.
4. Elegir una foto, cerrar el diálogo con Cancelar, reabrir. La foto elegida no se subió.
5. Subir una foto vertical tomada con celular. Se ve derecha, no de costado.
6. Renombrar un `.txt` a `.jpg` y elegirlo. El guardado del producto tiene éxito y aparece el aviso de foto no subida, no un error de guardado.
7. Escribir 300 caracteres en la descripción. El contador llega a 0 y el campo no acepta más.
8. Duplicar un producto con foto. El duplicado se crea sin foto.

- [ ] **Step 9: Commit**

```bash
git add src/app/components/products messages/es.json messages/en.json
git commit -m "feat(products): descripcion y foto en el dialogo de producto"
```

---

### Task 10: Mostrar la foto en las tarjetas

**Files:**
- Modify: `src/app/components/products/product-card.jsx`
- Modify: `src/app/components/sales/product-card.jsx`
- Modify: `next.config.mjs`

**Interfaces:**
- Consumes: `product.image` del modelo (tarea 5).
- Produces: nada que otras tareas consuman.

- [ ] **Step 1: Permitir el host de Blob en next/image**

En `next.config.mjs`, reemplazar el objeto `nextConfig` por:

```js
const nextConfig = {
  reactCompiler: true,
  images: {
    // El driver local devuelve rutas relativas y no necesita entrada aca; esto
    // es solo para las URLs del CDN de Vercel Blob.
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
    ],
  },
};
```

- [ ] **Step 2: Mostrar la foto en la tarjeta del catálogo**

En `src/app/components/products/product-card.jsx`, agregar el import:

```jsx
import Image from "next/image";
```

Y justo después de la etiqueta `<Card className="h-full">`, insertar:

```jsx
      {product?.image?.url ? (
        <div className="relative -mt-6 mb-0 aspect-[4/3] w-full overflow-hidden rounded-t-xl border-b">
          <Image
            src={product.image.url}
            alt={product?.name ?? ""}
            fill
            sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 33vw"
            className="object-cover"
          />
        </div>
      ) : null}
```

El `-mt-6` compensa el `py-6` que `Card` aplica, para que la imagen quede pegada al borde superior.

- [ ] **Step 3: Mostrar la foto en la tarjeta de venta**

En `src/app/components/sales/product-card.jsx`, agregar el import:

```jsx
import Image from "next/image";
```

Y reemplazar el `<Coffee className="size-10 text-muted-foreground" />` que está dentro del contenedor `relative flex h-28 …` por:

```jsx
          {product?.image?.url ? (
            <Image
              src={product.image.url}
              alt={product?.name ?? ""}
              fill
              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, (max-width: 1535px) 25vw, 20vw"
              className="rounded-xl object-cover"
            />
          ) : (
            <Coffee className="size-10 text-muted-foreground" />
          )}
```

El `span` del destello y el check de confirmación se dejan tal como están: vienen después en el DOM y tienen `absolute inset-0`, así que quedan sobre la imagen.

- [ ] **Step 4: Verificar**

Run: `npx eslint src && npm run build`
Expected: sin problemas nuevos, build exitoso.

- [ ] **Step 5: Verificación manual**

1. En `/products`, un producto con foto la muestra arriba de la tarjeta; uno sin foto se ve igual que antes.
2. En `/orders`, un producto con foto la muestra en el recuadro; uno sin foto sigue mostrando el ícono de café.
3. En `/orders` a 375 px de ancho, tocar una tarjeta con foto: el destello y el check se ven **encima** de la imagen, y el producto entra a la orden.
4. Con el navegador en modo lento, la tarjeta no salta de tamaño al cargar la imagen: las dimensiones guardadas reservan el espacio.

- [ ] **Step 6: Commit**

```bash
git add next.config.mjs src/app/components/products/product-card.jsx src/app/components/sales/product-card.jsx
git commit -m "feat(products): mostrar la foto del producto en las tarjetas"
```

---

## Verificación final

Después de la tarea 10, correr la suite completa:

```bash
npm test && npx eslint src && npm run build
```

Expected:
- Tests: PASS (23 tests en 3 archivos: 7 de claves, 10 de validacion, 6 de whitelist).
- ESLint: los mismos 11 problemas preexistentes (4 errores, 7 warnings), ninguno nuevo. Los preexistentes están en `settings/product-dialog`-adyacentes, `order-item-notes-dialog.jsx`, `split-payment-dialog.jsx` y `ui/sidebar.jsx`.
- Build: `✓ Compiled successfully`, con `ƒ /api/products/[id]/image` en la lista de rutas.

Y el recorrido de la sección "Verificación manual" del spec, punto por punto.
