import { BLOCK_TYPES } from "@/lib/menu/menuSchema";

// Portada y pie son bloques como cualquier otro —se arrastran, se ocultan y se
// quitan— pero uno solo de cada. Un menu con dos pies no significa nada, y
// permitirlo obliga a inventar que hace el renderizador con el segundo.
const SINGLETON_TYPES = Object.freeze(["hero", "footer"]);

const EMPTY_DATA = Object.freeze({
  hero: { title: "", subtitle: "" },
  footer: { text: "", phone: "", address: "" },
});

export function blockIdFor(type, data) {
  if (type === "category") {
    return `category-${data?.categoryId ?? ""}`;
  }
  return type;
}

function withoutMutating(blocks) {
  return Array.isArray(blocks) ? [...blocks] : [];
}

export function moveBlock(blocks, fromIndex, toIndex) {
  const next = withoutMutating(blocks);
  const lastIndex = next.length - 1;

  const outOfRange =
    !Number.isInteger(fromIndex) ||
    !Number.isInteger(toIndex) ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex > lastIndex ||
    toIndex > lastIndex;

  if (outOfRange || fromIndex === toIndex) {
    return next;
  }

  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function removeBlock(blocks, blockId) {
  return withoutMutating(blocks).filter((block) => block.id !== blockId);
}

export function toggleBlockVisibility(blocks, blockId) {
  return withoutMutating(blocks).map((block) =>
    block.id === blockId ? { ...block, visible: block.visible === false } : block,
  );
}

export function updateBlockData(blocks, blockId, patch) {
  return withoutMutating(blocks).map((block) =>
    block.id === blockId ? { ...block, data: { ...block.data, ...patch } } : block,
  );
}

export function canAddType(blocks, type) {
  if (!BLOCK_TYPES.includes(type)) {
    return false;
  }
  if (!SINGLETON_TYPES.includes(type)) {
    return true;
  }
  return !withoutMutating(blocks).some((block) => block.type === type);
}

// Agrega siempre al final, tambien la portada. La regla uniforme ("lo que
// agregas aparece abajo y lo arrastras a donde quieras") es mas facil de
// predecir que una excepcion para el hero, y es coherente con tratarlo como un
// bloque mas.
export function addBlock(blocks, type, data) {
  if (!canAddType(blocks, type)) {
    return withoutMutating(blocks);
  }

  if (type === "category") {
    const categoryId = String(data?.categoryId ?? "").trim();
    if (!categoryId) {
      return withoutMutating(blocks);
    }
    const alreadyThere = withoutMutating(blocks).some(
      (block) => block.type === "category" && block.data.categoryId === categoryId,
    );
    if (alreadyThere) {
      return withoutMutating(blocks);
    }

    return [
      ...withoutMutating(blocks),
      {
        id: blockIdFor("category", { categoryId }),
        type: "category",
        visible: true,
        data: { categoryId, showPhotos: true, showDescriptions: true },
      },
    ];
  }

  return [
    ...withoutMutating(blocks),
    {
      id: blockIdFor(type),
      type,
      visible: true,
      data: { ...EMPTY_DATA[type] },
    },
  ];
}

// Un bloque oculto cuenta como usado: la categoria ya esta en el menu, apagada.
// Ofrecerla de nuevo en "Agregar" produciria dos bloques de la misma categoria,
// que normalizeMenuDraft despues descarta en silencio.
export function availableCategories(blocks, categories) {
  const used = new Set(
    withoutMutating(blocks)
      .filter((block) => block.type === "category")
      .map((block) => block.data.categoryId),
  );

  return (Array.isArray(categories) ? categories : []).filter(
    (category) => !used.has(category.id),
  );
}
