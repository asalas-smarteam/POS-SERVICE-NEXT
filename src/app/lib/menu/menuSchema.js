// Version del esquema de bloques. Es lo unico que no se puede agregar despues:
// sin ella, migrar un menu ya publicado no tiene punto de apoyo.
export const MENU_SCHEMA_VERSION = 1;

export const BLOCK_TYPES = Object.freeze(["hero", "category", "footer"]);

export const MENU_ERRORS = Object.freeze({
  EMPTY_DRAFT: "empty_draft",
});

const text = (value, max) => String(value ?? "").trim().slice(0, max);

const TEXT_LIMITS = Object.freeze({
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

export function normalizeMenuDocument(raw) {
  if (!raw) {
    return createEmptyMenu();
  }

  const publishedRaw = raw.published;

  return {
    version: MENU_SCHEMA_VERSION,
    draft: normalizeMenuDraft(raw.draft),
    published: publishedRaw ? normalizeMenuDraft(publishedRaw) : null,
    publishedAt: typeof raw.publishedAt === "string" ? raw.publishedAt : null,
  };
}

export function canPublish(menu) {
  const draft = normalizeMenuDraft(menu?.draft);
  return draft.blocks.length ? null : MENU_ERRORS.EMPTY_DRAFT;
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
