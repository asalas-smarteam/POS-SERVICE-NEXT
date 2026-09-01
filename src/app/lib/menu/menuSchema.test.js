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
      data: {
        categoryId: "postres",
        showPhotos: true,
        showDescriptions: true,
        variant: "sizeRows",
        columns: 1,
      },
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

  it("conserva la version 1 guardada", () => {
    expect(normalizeMenuDocument({ version: 1 }).version).toBe(1);
  });

  it("conserva una version desconocida pero valida (entero positivo)", () => {
    expect(normalizeMenuDocument({ version: 99 }).version).toBe(99);
  });

  it("usa la version actual cuando falta o es basura", () => {
    expect(normalizeMenuDocument({}).version).toBe(MENU_SCHEMA_VERSION);
    expect(normalizeMenuDocument({ version: 0 }).version).toBe(MENU_SCHEMA_VERSION);
    expect(normalizeMenuDocument({ version: -1 }).version).toBe(MENU_SCHEMA_VERSION);
    expect(normalizeMenuDocument({ version: "1" }).version).toBe(MENU_SCHEMA_VERSION);
    expect(normalizeMenuDocument({ version: null }).version).toBe(MENU_SCHEMA_VERSION);
  });

  // Garantia central de 1b-2: un documento guardado antes de que existieran
  // `variant`/`columns` tiene que sobrevivir el round-trip de
  // normalizeMenuDocument sin que ningun campo previo cambie de forma o valor.
  // Los menus ya publicados se sirven hoy por QR a clientes reales: si este
  // round-trip alterara un campo, cambiaria lo que ven esos clientes.
  it("un documento publicado antes de 1b-2 sobrevive el round-trip sin cambiar ningun campo previo", () => {
    const preExistingBlocks = [
      { id: "h1", type: "hero", data: { title: "Pizzeria", subtitle: "Desde 1998" } },
      {
        id: "c-bebidas",
        type: "category",
        data: { categoryId: "bebidas", showPhotos: true, showDescriptions: false },
      },
      { id: "f1", type: "footer", data: { text: "Gracias", phone: "22334455", address: "Centro" } },
    ];
    const legacyDocument = {
      version: 1,
      draft: { blocks: preExistingBlocks },
      published: { blocks: preExistingBlocks },
      publishedAt: "2020-01-15T09:30:00.000Z",
    };

    const result = normalizeMenuDocument(legacyDocument);

    const expectedBlocks = [
      { id: "h1", type: "hero", visible: true, data: { title: "Pizzeria", subtitle: "Desde 1998" } },
      {
        id: "c-bebidas",
        type: "category",
        visible: true,
        data: {
          categoryId: "bebidas",
          showPhotos: true,
          showDescriptions: false,
          variant: "sizeRows",
          columns: 1,
        },
      },
      {
        id: "f1",
        type: "footer",
        visible: true,
        data: { text: "Gracias", phone: "22334455", address: "Centro" },
      },
    ];

    expect(result).toEqual({
      version: 1,
      draft: { blocks: expectedBlocks },
      published: { blocks: expectedBlocks },
      publishedAt: "2020-01-15T09:30:00.000Z",
    });
  });
});

describe("canPublish", () => {
  // El mismo shape que devuelve getProductCategoryMap: id -> fila cruda de
  // ajustes. Es lo que la ruta de publicacion le pasa y lo que la pagina
  // publica ya usa para su notFound().
  const catalog = new Map([
    ["bebidas", { id: "bebidas", label: "Bebidas", active: true }],
    ["viejo", { id: "viejo", label: "Viejo", active: false }],
    ["sinFlag", { id: "sinFlag", label: "Sin flag" }],
  ]);

  it("rechaza un borrador vacio", () => {
    expect(canPublish(createEmptyMenu(), catalog)).toBe("empty_draft");
  });

  it("rechaza un borrador cuyos bloques son todos invalidos", () => {
    expect(canPublish({ draft: { blocks: [{ type: "nope" }] } }, catalog)).toBe("empty_draft");
  });

  it("acepta un borrador con al menos un bloque valido", () => {
    expect(canPublish({ draft: { blocks: [heroRaw] } }, catalog)).toBeNull();
  });

  it("rechaza un hero y un footer sin un solo campo con texto: renderean null y dejarian la pagina publica en blanco", () => {
    const draft = {
      blocks: [
        { type: "hero", data: { title: "", subtitle: "" } },
        { type: "footer", data: { text: "", phone: "", address: "" } },
      ],
    };
    expect(canPublish({ draft }, catalog)).toBe("empty_draft");
  });

  it("acepta un hero y un footer vacios si hay ademas un bloque de categoria activa", () => {
    const draft = {
      blocks: [
        { type: "hero", data: { title: "", subtitle: "" } },
        catRaw("bebidas"),
        { type: "footer", data: { text: "", phone: "", address: "" } },
      ],
    };
    expect(canPublish({ draft }, catalog)).toBeNull();
  });

  it("acepta un borrador con unicamente un hero que tiene titulo", () => {
    const draft = { blocks: [{ type: "hero", data: { title: "Pizzeria", subtitle: "" } }] };
    expect(canPublish({ draft }, catalog)).toBeNull();
  });

  it("acepta un borrador con unicamente un footer que tiene telefono", () => {
    const draft = { blocks: [{ type: "footer", data: { text: "", phone: "22334455", address: "" } }] };
    expect(canPublish({ draft }, catalog)).toBeNull();
  });

  // Ocultar todo y publicar publicaba "con exito" un menu que renderableBlocks
  // deja vacio y que /m/<slug> contesta con notFound() a todos los clientes.
  // El codigo es nothing_visible y no empty_draft: hay contenido escrito, el
  // problema es que nada de eso se veria, y se arregla en otro lado.
  it("rechaza con nothing_visible un borrador cuyo unico bloque de categoria esta oculto", () => {
    const draft = { blocks: [{ ...catRaw("bebidas"), visible: false }] };
    expect(canPublish({ draft }, catalog)).toBe("nothing_visible");
  });

  it("rechaza con nothing_visible un borrador con todos los bloques ocultos, aunque tengan contenido", () => {
    const draft = {
      blocks: [
        { ...heroRaw, visible: false },
        { ...catRaw("bebidas"), visible: false },
        { ...footerRaw, visible: false },
      ],
    };
    expect(canPublish({ draft }, catalog)).toBe("nothing_visible");
  });

  it("acepta si queda al menos un bloque visible con contenido entre varios ocultos", () => {
    const draft = {
      blocks: [
        { ...heroRaw, visible: false },
        { ...catRaw("bebidas"), visible: false },
        footerRaw,
      ],
    };
    expect(canPublish({ draft }, catalog)).toBeNull();
  });

  it("no alcanza con un bloque visible sin contenido si el unico bloque con contenido esta oculto", () => {
    const draft = {
      blocks: [
        { ...heroRaw, visible: false },
        { type: "footer", data: { text: "", phone: "", address: "" } },
      ],
    };
    expect(canPublish({ draft }, catalog)).toBe("nothing_visible");
  });

  it("acepta una categoria activa visible aunque el hero con texto este oculto", () => {
    const draft = { blocks: [{ ...heroRaw, visible: false }, catRaw("bebidas")] };
    expect(canPublish({ draft }, catalog)).toBeNull();
  });

  // La brecha gemela de la anterior: el bloque esta visible, pero la categoria
  // que referencia se desactivo o se borro en Ajustes. renderableBlocks la
  // descarta, la pagina publica hace notFound(), y hasta ahora publicar decia
  // que todo habia salido bien. El guard usa el mismo predicado justamente para
  // que no puedan divergir.
  it("rechaza un borrador cuyo unico bloque referencia una categoria desactivada", () => {
    const draft = { blocks: [catRaw("viejo")] };
    expect(canPublish({ draft }, catalog)).toBe("nothing_visible");
  });

  it("rechaza un borrador cuyo unico bloque referencia una categoria que ya no existe", () => {
    const draft = { blocks: [catRaw("fantasma")] };
    expect(canPublish({ draft }, catalog)).toBe("nothing_visible");
  });

  it("rechaza un borrador cuyo unico bloque referencia una categoria sin el flag active", () => {
    const draft = { blocks: [catRaw("sinFlag")] };
    expect(canPublish({ draft }, catalog)).toBe("nothing_visible");
  });

  it("rechaza cuando todas las categorias del menu estan desactivadas y el hero esta en blanco", () => {
    const draft = {
      blocks: [
        { type: "hero", data: { title: "", subtitle: "" } },
        catRaw("viejo"),
        catRaw("fantasma"),
      ],
    };
    expect(canPublish({ draft }, catalog)).toBe("nothing_visible");
  });

  it("acepta si el hero visible tiene texto aunque su unica categoria este desactivada", () => {
    const draft = { blocks: [heroRaw, catRaw("viejo")] };
    expect(canPublish({ draft }, catalog)).toBeNull();
  });

  it("acepta si queda una categoria activa entre varias desactivadas", () => {
    const draft = { blocks: [catRaw("viejo"), catRaw("bebidas"), catRaw("sinFlag")] };
    expect(canPublish({ draft }, catalog)).toBeNull();
  });

  // Un borrador sin nada escrito sigue siendo empty_draft aunque el mapa este
  // completo: los dos codigos no se pisan.
  it("distingue empty_draft de nothing_visible con el mismo catalogo", () => {
    expect(canPublish({ draft: { blocks: [] } }, catalog)).toBe("empty_draft");
    expect(canPublish({ draft: { blocks: [{ ...heroRaw, visible: false }] } }, catalog)).toBe(
      "nothing_visible",
    );
  });

  // El mapa es obligatorio, y olvidarlo tiene que fallar hacia el lado seguro:
  // sin catalogo ninguna categoria puede probarse activa, asi que un menu de
  // puras categorias se rechaza en vez de publicarse a ciegas.
  it("sin categoryMap rechaza un menu de puras categorias en vez de aprobarlo", () => {
    expect(canPublish({ draft: { blocks: [catRaw("bebidas")] } })).toBe("nothing_visible");
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
        data: {
          categoryId: "bebidas",
          showPhotos: true,
          showDescriptions: true,
          variant: "sizeRows",
          columns: 1,
        },
      },
    ]);
  });
});

describe("BLOCK_TYPES", () => {
  it("son exactamente los tres del alcance de 1a", () => {
    expect([...BLOCK_TYPES]).toEqual(["hero", "category", "footer"]);
  });
});

describe("normalizeMenuDraft: variant y columns", () => {
  const categoryBlock = (data) => ({
    blocks: [{ id: "b1", type: "category", data: { categoryId: "pizzas", ...data } }],
  });

  // Es la garantia de compatibilidad entera de esta rama: un menu publicado
  // antes de 1b-2 no tiene estos campos y tiene que renderizar identico.
  it("un bloque sin variant ni columns recibe los defaults que reproducen el render actual", () => {
    const { blocks } = normalizeMenuDraft(categoryBlock({}));

    expect(blocks[0].data.variant).toBe("sizeRows");
    expect(blocks[0].data.columns).toBe(1);
  });

  it("conserva una variante valida", () => {
    const { blocks } = normalizeMenuDraft(categoryBlock({ variant: "sizeTable" }));

    expect(blocks[0].data.variant).toBe("sizeTable");
  });

  it("cae al default con una variante desconocida", () => {
    const { blocks } = normalizeMenuDraft(categoryBlock({ variant: "tarjetas" }));

    expect(blocks[0].data.variant).toBe("sizeRows");
  });

  it("acepta columns 2", () => {
    const { blocks } = normalizeMenuDraft(categoryBlock({ columns: 2 }));

    expect(blocks[0].data.columns).toBe(2);
  });

  // Este modulo corre sobre el body de una request arbitraria. Solo el numero 2
  // vale: la cadena "2", un 3 o un booleano caen a una columna, que es la
  // presentacion que ya existia y por lo tanto la respuesta segura.
  it("cualquier otro valor de columns cae a 1", () => {
    for (const value of ["2", 3, 0, -1, true, null, undefined, {}]) {
      const { blocks } = normalizeMenuDraft(categoryBlock({ columns: value }));
      expect(blocks[0].data.columns).toBe(1);
    }
  });

  it("los bloques hero y footer no ganan campos de presentacion", () => {
    const { blocks } = normalizeMenuDraft({
      blocks: [
        { id: "h", type: "hero", data: { title: "Hola", variant: "sizeTable", columns: 2 } },
        {
          id: "f",
          type: "footer",
          data: { text: "Chau", phone: "", address: "", variant: "sizeTable", columns: 2 },
        },
      ],
    });

    expect(blocks[0].data).toEqual({ title: "Hola", subtitle: "" });
    expect(blocks[1].data).toEqual({ text: "Chau", phone: "", address: "" });
  });
});
