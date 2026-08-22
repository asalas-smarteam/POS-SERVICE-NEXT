import { describe, expect, it } from "vitest";
import {
  BLOCK_TYPES,
  MENU_SCHEMA_VERSION,
  canPublish,
  createEmptyMenu,
  normalizeMenuDocument,
  normalizeMenuDraft,
  publishDraft,
  referencedCategoryIds,
  renderableBlocks,
} from "@/lib/menu/menuSchema";

const heroRaw = { id: "h1", type: "hero", data: { title: "Pizzeria", subtitle: "Desde 1998" } };
const catRaw = (categoryId, extra = {}) => ({
  id: `c-${categoryId}`,
  type: "category",
  data: { categoryId, ...extra },
});
const footerRaw = { id: "f1", type: "footer", data: { text: "Gracias", phone: "22334455", address: "Centro" } };

describe("createEmptyMenu", () => {
  it("arranca versionado, con borrador vacio y sin publicar", () => {
    expect(createEmptyMenu()).toEqual({
      version: MENU_SCHEMA_VERSION,
      draft: { blocks: [] },
      published: null,
      publishedAt: null,
    });
  });
});

describe("normalizeMenuDraft", () => {
  it("conserva los tres tipos validos y su orden", () => {
    const result = normalizeMenuDraft({ blocks: [heroRaw, catRaw("bebidas"), footerRaw] });
    expect(result.blocks.map((b) => b.type)).toEqual(["hero", "category", "footer"]);
  });

  it("descarta tipos desconocidos", () => {
    const result = normalizeMenuDraft({ blocks: [heroRaw, { type: "carousel", data: {} }] });
    expect(result.blocks).toHaveLength(1);
  });

  it("descarta un bloque de categoria sin categoryId", () => {
    const result = normalizeMenuDraft({ blocks: [{ type: "category", data: {} }] });
    expect(result.blocks).toEqual([]);
  });

  it("deduplica categorias repetidas conservando la primera", () => {
    const result = normalizeMenuDraft({
      blocks: [catRaw("bebidas", { showPhotos: false }), catRaw("bebidas", { showPhotos: true })],
    });
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].data.showPhotos).toBe(false);
  });

  it("rellena defaults de un bloque de categoria", () => {
    const [block] = normalizeMenuDraft({ blocks: [catRaw("postres")] }).blocks;
    expect(block).toEqual({
      id: "c-postres",
      type: "category",
      visible: true,
      data: { categoryId: "postres", showPhotos: true, showDescriptions: true },
    });
  });

  it("respeta visible false", () => {
    const [block] = normalizeMenuDraft({ blocks: [{ ...heroRaw, visible: false }] }).blocks;
    expect(block.visible).toBe(false);
  });

  it("genera un id cuando falta", () => {
    const [block] = normalizeMenuDraft({ blocks: [{ type: "hero", data: {} }] }).blocks;
    expect(block.id).toBe("hero-0");
  });

  it("reasigna el id cuando dos bloques traen el mismo id explicito", () => {
    const result = normalizeMenuDraft({
      blocks: [
        { id: "dup", type: "hero", data: {} },
        { id: "dup", type: "footer", data: {} },
      ],
    });
    const [first, second] = result.blocks;
    expect(first.id).toBe("dup");
    expect(second.id).toBe("footer-1");
    expect(first.id).not.toBe(second.id);
  });

  it("reasigna el id cuando un id explicito coincide con el fallback generado de otro bloque", () => {
    const result = normalizeMenuDraft({
      blocks: [
        { id: "hero-1", type: "footer", data: {} },
        { type: "hero", data: {} },
      ],
    });
    const [first, second] = result.blocks;
    expect(first.id).toBe("hero-1");
    expect(second.id).not.toBe("hero-1");
    expect(second.id).not.toBe(first.id);
  });

  it("tolera entradas basura", () => {
    expect(normalizeMenuDraft(null).blocks).toEqual([]);
    expect(normalizeMenuDraft({ blocks: "no soy un array" }).blocks).toEqual([]);
    expect(normalizeMenuDraft({ blocks: [null, 3, "x"] }).blocks).toEqual([]);
  });

  it("recorta los textos del hero y del footer a string", () => {
    const [hero] = normalizeMenuDraft({ blocks: [{ type: "hero", data: { title: "  Pizza  " } }] }).blocks;
    expect(hero.data.title).toBe("Pizza");
    expect(hero.data.subtitle).toBe("");
  });
});

describe("normalizeMenuDocument", () => {
  it("reconstruye un documento ausente", () => {
    expect(normalizeMenuDocument(null)).toEqual(createEmptyMenu());
  });

  it("normaliza draft y published por separado", () => {
    const doc = normalizeMenuDocument({
      version: 1,
      draft: { blocks: [heroRaw, { type: "nope" }] },
      published: { blocks: [catRaw("bebidas")] },
      publishedAt: "2026-08-22T10:00:00.000Z",
    });
    expect(doc.draft.blocks).toHaveLength(1);
    expect(doc.published.blocks).toHaveLength(1);
    expect(doc.publishedAt).toBe("2026-08-22T10:00:00.000Z");
  });

  it("siempre sella la version actual", () => {
    expect(normalizeMenuDocument({ version: 99 }).version).toBe(MENU_SCHEMA_VERSION);
  });
});

describe("canPublish", () => {
  it("rechaza un borrador vacio", () => {
    expect(canPublish(createEmptyMenu())).toBe("empty_draft");
  });

  it("rechaza un borrador cuyos bloques son todos invalidos", () => {
    expect(canPublish({ draft: { blocks: [{ type: "nope" }] } })).toBe("empty_draft");
  });

  it("acepta un borrador con al menos un bloque valido", () => {
    expect(canPublish({ draft: { blocks: [heroRaw] } })).toBeNull();
  });
});

describe("publishDraft", () => {
  it("copia el borrador a publicado y sella la fecha inyectada", () => {
    const menu = normalizeMenuDocument({ draft: { blocks: [heroRaw, catRaw("bebidas")] } });
    const published = publishDraft(menu, "2026-08-22T12:00:00.000Z");

    expect(published.published).toEqual(published.draft);
    expect(published.publishedAt).toBe("2026-08-22T12:00:00.000Z");
    expect(published.version).toBe(MENU_SCHEMA_VERSION);
  });

  it("no comparte referencia entre draft y published", () => {
    const menu = normalizeMenuDocument({ draft: { blocks: [heroRaw] } });
    const published = publishDraft(menu, "2026-08-22T12:00:00.000Z");
    published.draft.blocks.push(footerRaw);
    expect(published.published.blocks).toHaveLength(1);
  });
});

describe("referencedCategoryIds", () => {
  it("junta los ids de los bloques de categoria visibles, sin repetir", () => {
    const { blocks } = normalizeMenuDraft({
      blocks: [heroRaw, catRaw("bebidas"), catRaw("postres"), footerRaw],
    });
    expect(referencedCategoryIds(blocks)).toEqual(["bebidas", "postres"]);
  });

  it("ignora los bloques invisibles", () => {
    const { blocks } = normalizeMenuDraft({
      blocks: [{ ...catRaw("bebidas"), visible: false }, catRaw("postres")],
    });
    expect(referencedCategoryIds(blocks)).toEqual(["postres"]);
  });
});

describe("renderableBlocks", () => {
  const categories = new Map([
    ["bebidas", { id: "bebidas", label: "Bebidas", active: true }],
    ["viejo", { id: "viejo", label: "Viejo", active: false }],
    ["sinFlag", { id: "sinFlag", label: "Sin flag" }],
    ["indefinida", { id: "indefinida", label: "Indefinida", active: undefined }],
  ]);

  it("omite los bloques invisibles", () => {
    const { blocks } = normalizeMenuDraft({ blocks: [{ ...heroRaw, visible: false }, footerRaw] });
    expect(renderableBlocks(blocks, categories).map((b) => b.type)).toEqual(["footer"]);
  });

  it("omite un bloque cuya categoria no existe", () => {
    const { blocks } = normalizeMenuDraft({ blocks: [catRaw("fantasma")] });
    expect(renderableBlocks(blocks, categories)).toEqual([]);
  });

  it("omite un bloque cuya categoria esta inactiva", () => {
    const { blocks } = normalizeMenuDraft({ blocks: [catRaw("viejo")] });
    expect(renderableBlocks(blocks, categories)).toEqual([]);
  });

  it("omite un bloque cuya categoria no tiene el campo active", () => {
    const { blocks } = normalizeMenuDraft({ blocks: [catRaw("sinFlag")] });
    expect(renderableBlocks(blocks, categories)).toEqual([]);
  });

  it("omite un bloque cuya categoria tiene active undefined", () => {
    const { blocks } = normalizeMenuDraft({ blocks: [catRaw("indefinida")] });
    expect(renderableBlocks(blocks, categories)).toEqual([]);
  });

  it("conserva hero y footer sin importar las categorias", () => {
    const { blocks } = normalizeMenuDraft({ blocks: [heroRaw, footerRaw] });
    expect(renderableBlocks(blocks, new Map()).map((b) => b.type)).toEqual(["hero", "footer"]);
  });

  it("conserva unicamente el bloque cuya categoria tiene active true", () => {
    const { blocks } = normalizeMenuDraft({
      blocks: [catRaw("bebidas"), catRaw("viejo"), catRaw("sinFlag"), catRaw("indefinida")],
    });
    expect(renderableBlocks(blocks, categories)).toEqual([
      {
        id: "c-bebidas",
        type: "category",
        visible: true,
        data: { categoryId: "bebidas", showPhotos: true, showDescriptions: true },
      },
    ]);
  });
});

describe("BLOCK_TYPES", () => {
  it("son exactamente los tres del alcance de 1a", () => {
    expect([...BLOCK_TYPES]).toEqual(["hero", "category", "footer"]);
  });
});
