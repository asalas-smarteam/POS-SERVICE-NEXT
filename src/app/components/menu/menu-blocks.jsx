import { renderableBlocks } from "@/lib/menu/menuSchema";
import { groupProductsBySize } from "@/lib/menu/groupProductsBySize";
import { CategoryBlock, SizedCategoryBlock } from "@/components/menu/category-blocks";

export function HeroBlock({ data }) {
  if (!data.title && !data.subtitle) {
    return null;
  }

  return (
    <header className="border-b border-neutral-200 px-5 py-10 text-center">
      {data.title ? (
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">{data.title}</h1>
      ) : null}
      {data.subtitle ? (
        <p className="mt-2 text-sm text-neutral-500">{data.subtitle}</p>
      ) : null}
    </header>
  );
}

export function FooterBlock({ data }) {
  if (!data.text && !data.phone && !data.address) {
    return null;
  }

  return (
    <footer className="border-t border-neutral-200 px-5 py-8 text-center text-sm text-neutral-500">
      {data.text ? <p>{data.text}</p> : null}
      {data.address ? <p className="mt-1">{data.address}</p> : null}
      {data.phone ? (
        <p className="mt-1">
          <a className="underline" href={`tel:${data.phone}`}>{data.phone}</a>
        </p>
      ) : null}
    </footer>
  );
}

// Despacho bloque -> componente. Vive aca y no en la pagina publica porque la
// vista previa del editor renderiza exactamente esto: si hubiera dos copias
// del despacho, la previa mostraria algo distinto de lo que el visitante ve el
// dia que alguien toque una sola de las dos.
//
// El filtrado con renderableBlocks va adentro, no afuera: ocultar un bloque y
// desactivar una categoria tienen que comportarse igual en la previa que en el
// menu publico sin que cada consumidor tenga que acordarse de filtrar. La
// pagina publica igual llama a renderableBlocks por su cuenta, porque necesita
// la lista filtrada antes de renderizar (para armar la consulta de productos y
// para su notFound de menu sin contenido visible); que se calcule dos veces es
// irrelevante al lado de que las dos vistas filtren distinto.
export function MenuBlockList({
  blocks,
  categoryMap,
  productsByCategory,
  sizeOrderMap,
  formatPrice,
}) {
  return renderableBlocks(blocks, categoryMap).map((block) => {
    if (block.type === "hero") {
      return <HeroBlock key={block.id} data={block.data} />;
    }

    if (block.type === "footer") {
      return <FooterBlock key={block.id} data={block.data} />;
    }

    const category = categoryMap.get(block.data.categoryId);
    const categoryProducts = productsByCategory.get(block.data.categoryId) ?? [];

    // El agrupado por talle es presentacional: lo decide el flag `hasSizes` de
    // la categoria (el mismo que usa el resto del POS), no un campo nuevo del
    // bloque. Una categoria sin talles se sigue renderando plana.
    if (category?.hasSizes) {
      return (
        <SizedCategoryBlock
          key={block.id}
          label={category?.label ?? ""}
          dishes={groupProductsBySize(categoryProducts, sizeOrderMap)}
          showPhotos={block.data.showPhotos}
          showDescriptions={block.data.showDescriptions}
          formatPrice={formatPrice}
        />
      );
    }

    return (
      <CategoryBlock
        key={block.id}
        label={category?.label ?? ""}
        products={categoryProducts}
        showPhotos={block.data.showPhotos}
        showDescriptions={block.data.showDescriptions}
        formatPrice={formatPrice}
      />
    );
  });
}
