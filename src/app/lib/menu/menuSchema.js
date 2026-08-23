// Version del esquema de bloques. Es lo unico que no se puede agregar despues:
// sin ella, migrar un menu ya publicado no tiene punto de apoyo.
export const MENU_SCHEMA_VERSION = 1;

export const BLOCK_TYPES = Object.freeze(["hero", "category", "footer"]);

export const MENU_ERRORS = Object.freeze({
  EMPTY_DRAFT: "empty_draft",
});

const text = (value, max) => String(value ?? "").trim().slice(0, max);

// Exportado a proposito: los `maxLength` de los inputs del editor salen de
// aca. Si el editor repitiera los numeros, cualquier cambio en este objeto
// dejaria a la vista previa mostrando texto que este modulo recorta despues,
// en silencio, al guardar. Esa divergencia previa <-> menu publico es
// exactamente lo que el diseno declara peor que no tener previa.
export const TEXT_LIMITS = Object.freeze({
  title: 120,
  subtitle: 200,
  footerText: 300,
  phone: 40,
  address: 200,
});

function normalizeBlock(raw, index) {
  const type = String(raw?.type ?? "");
  if (!BLOCK_TYPES.includes(type)) {
    return null;
  }

  const rawId = typeof raw?.id === "string" ? raw.id.trim() : "";
  const id = rawId || `${type}-${index}`;
  const visible = raw?.visible !== false;
  const data = raw?.data ?? {};

  if (type === "hero") {
    return {
      id,
      type,
      visible,
      data: {
        title: text(data.title, TEXT_LIMITS.title),
        subtitle: text(data.subtitle, TEXT_LIMITS.subtitle),
      },
    };
  }

  if (type === "footer") {
    return {
      id,
      type,
      visible,
      data: {
        text: text(data.text, TEXT_LIMITS.footerText),
        phone: text(data.phone, TEXT_LIMITS.phone),
        address: text(data.address, TEXT_LIMITS.address),
      },
    };
  }

  // category: sin categoryId el bloque no referencia nada y no existe.
  const categoryId = text(data.categoryId, 80);
  if (!categoryId) {
    return null;
  }

  return {
    id,
    type,
    visible,
    data: {
      categoryId,
      showPhotos: data.showPhotos !== false,
      showDescriptions: data.showDescriptions !== false,
    },
  };
}

export function normalizeMenuDraft(raw) {
  const source = Array.isArray(raw?.blocks) ? raw.blocks : [];
  const seenCategories = new Set();
  const seenIds = new Set();
  const blocks = [];

  source.forEach((entry, index) => {
    const block = normalizeBlock(entry, index);
    if (!block) {
      return;
    }

    // Una categoria dos veces mostraria sus productos duplicados en el menu.
    if (block.type === "category") {
      if (seenCategories.has(block.data.categoryId)) {
        return;
      }
      seenCategories.add(block.data.categoryId);
    }

    // Este modulo corre sobre el body de una request arbitraria: un id
    // repetido (explicito o coincidente con un fallback ajeno) rompe las
    // keys de React en la pagina publica. Se reasigna, nunca se descarta el
    // bloque por eso.
    if (seenIds.has(block.id)) {
      let fallbackId = `${block.type}-${index}`;
      let attempt = 1;
      while (seenIds.has(fallbackId)) {
        attempt += 1;
        fallbackId = `${block.type}-${index}-${attempt}`;
      }
      block.id = fallbackId;
    }
    seenIds.add(block.id);

    blocks.push(block);
  });

  return { blocks };
}

export function createEmptyMenu() {
  return {
    version: MENU_SCHEMA_VERSION,
    draft: { blocks: [] },
    published: null,
    publishedAt: null,
  };
}

// Preserva la version guardada en vez de siempre sellar la actual: el dia que
// exista una migracion v1 -> v2, la primera lectura de un documento v1 sin
// migrar tiene que seguir devolviendo version 1. Si se sobreescribiera aca con
// MENU_SCHEMA_VERSION, ese v1 se leeria como "ya en v2", y el siguiente PUT
// (que hace read-modify-write) lo persistiria como v2 para siempre: no hay
// forma de distinguir despues un documento migrado de uno que nunca lo fue.
// Solo cuando el valor guardado no es un entero positivo (documento ausente,
// corrupto o recien creado) se usa el valor actual como default.
function resolveStoredVersion(rawVersion) {
  return Number.isInteger(rawVersion) && rawVersion > 0 ? rawVersion : MENU_SCHEMA_VERSION;
}

export function normalizeMenuDocument(raw) {
  if (!raw) {
    return createEmptyMenu();
  }

  const publishedRaw = raw.published;

  return {
    version: resolveStoredVersion(raw.version),
    draft: normalizeMenuDraft(raw.draft),
    published: publishedRaw ? normalizeMenuDraft(publishedRaw) : null,
    publishedAt: typeof raw.publishedAt === "string" ? raw.publishedAt : null,
  };
}

// Con solo contar bloques no alcanza, y sigue sin alcanzar ahora que el
// editor es un lienzo: agregar una portada desde el menu "Agregar" crea un
// bloque hero con los dos campos en blanco, y agregar un pie crea uno con los
// tres en blanco. Un borrador asi tiene 2 bloques y no tiene nada que
// mostrar: los componentes de hero y footer sin datos renderean null, asi que
// publicarlo dejaria /m/<slug> sin una sola linea de contenido -o en el 404
// de "sin bloques renderizables"- mientras el editor muestra la alerta verde
// de "Publicado". Por eso se exige contenido real: una categoria (siempre
// referencia algo) o un hero/footer con al menos un campo no vacio.
function hasRealContent(block) {
  if (block.type === "category") {
    return true;
  }
  return Object.values(block.data).some((value) => typeof value === "string" && value.trim() !== "");
}

// Y ademas visible. Antes del lienzo el editor no podia expresar
// `visible: false`, asi que mirar solo el contenido alcanzaba; hoy ocultar un
// bloque es un boton de un clic. Sin este filtro, ocultar el unico bloque con
// contenido publicaba "con exito" un menu cuyo renderableBlocks queda vacio y
// cuya pagina publica responde notFound() a todos los clientes, sin aviso en
// ninguna capa.
//
// Lo que este guard NO puede ver es si la categoria referenciada sigue activa:
// eso vive en los ajustes de la sede, no en el documento del menu. Un menu de
// una sola categoria desactivada todavia publica y todavia da 404; el editor lo
// avisa con categoryInactiveWarning en la fila.
function isPublishable(block) {
  return block.visible !== false && hasRealContent(block);
}

export function canPublish(menu) {
  const draft = normalizeMenuDraft(menu?.draft);
  return draft.blocks.some(isPublishable) ? null : MENU_ERRORS.EMPTY_DRAFT;
}

// La fecha entra por parametro para que el resultado sea determinista y testeable.
export function publishDraft(menu, publishedAtIso) {
  const draft = normalizeMenuDraft(menu?.draft);

  return {
    version: MENU_SCHEMA_VERSION,
    draft,
    // Copia estructural: si compartieran referencia, seguir editando el borrador
    // mutaria lo que ya esta publicado. JSON.parse(JSON.stringify(...)) es seguro
    // aqui solo porque normalizeBlock ya redujo cada campo a string o boolean:
    // quien toque normalizeBlock y le agregue un campo de otro tipo (Date, Map,
    // etc.) tiene que revisar tambien esta copia.
    published: JSON.parse(JSON.stringify(draft)),
    publishedAt: publishedAtIso,
  };
}

export function referencedCategoryIds(blocks) {
  const ids = [];

  for (const block of Array.isArray(blocks) ? blocks : []) {
    if (block?.type !== "category" || block?.visible === false) {
      continue;
    }
    if (!ids.includes(block.data.categoryId)) {
      ids.push(block.data.categoryId);
    }
  }

  return ids;
}

// Desactivar una categoria en ajustes la saca del menu sin tener que editar el
// menu; una categoria borrada tampoco deja un hueco roto.
//
// La comparacion es estricta (=== true) y no "!== false" a proposito: asi es
// como el propio POS decide si una categoria esta activa
// (src/store/settingsStore.js: `categories.filter((c) => c?.active === true)`).
// Un flag ausente, undefined o mal escrito (0, "false", etc.) no debe alcanzar
// para publicar una categoria en una pagina publica.
export function renderableBlocks(blocks, categoryMap) {
  const categories = categoryMap instanceof Map ? categoryMap : new Map();

  return (Array.isArray(blocks) ? blocks : []).filter((block) => {
    if (!block || block.visible === false) {
      return false;
    }
    if (block.type !== "category") {
      return true;
    }
    const category = categories.get(block.data.categoryId);
    return Boolean(category) && category.active === true;
  });
}
