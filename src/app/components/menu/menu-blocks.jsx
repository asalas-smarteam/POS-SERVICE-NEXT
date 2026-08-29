import { renderableBlocks } from "@/lib/menu/menuSchema";
import { groupProductsBySize } from "@/lib/menu/groupProductsBySize";
import {
  CategoryBlock,
  PriceColumnsBlock,
  SizeBadgesBlock,
  SizedCategoryBlock,
  SizeTableBlock,
} from "@/components/menu/category-blocks";
import { buildSizePriceTable, sizeColumnsOf } from "@/lib/menu/sizePriceTable";

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

    // El agrupado por talle lo sigue decidiendo el flag `hasSizes` de la
    // categoria -el mismo que usa el resto del POS-, no la variante: una
    // categoria sin talles no tiene nada que las cuatro variantes distingan, asi
    // que se renderiza plana aunque tenga una variante guardada. Y la variante
    // se guarda igual, porque hasSizes se puede encender en Ajustes despues de
    // publicar y en ese momento la eleccion del dueno tiene que valer.
    if (category?.hasSizes) {
      const dishes = groupProductsBySize(categoryProducts, sizeOrderMap);
      const table =
        block.data.variant === "sizeTable" ? buildSizePriceTable(dishes, sizeOrderMap) : null;

      // La caida no es una excepcion que se maneje aparte: es la misma decision
      // que el editor le muestra al dueno, tomada por el mismo modulo. Se
      // resuelve aca, en una variable, y no con un return adentro de la rama de
      // sizeTable, para que abajo haya UNA sola rama de priceColumns. Dos ramas
      // identicas son dos ramas que manana divergen, y la que divergiria es la
      // que ve el visitante.
      const variant = table?.fellBack ? "priceColumns" : block.data.variant;

      if (variant === "priceColumns") {
        return (
          <PriceColumnsBlock
            key={block.id}
            label={category.label ?? ""}
            dishes={dishes}
            sizeColumns={sizeColumnsOf(dishes, sizeOrderMap)}
            showDescriptions={block.data.showDescriptions}
            formatPrice={formatPrice}
          />
        );
      }

      if (variant === "sizeTable") {
        return (
          <SizeTableBlock
            key={block.id}
            label={category.label ?? ""}
            table={table}
            columns={block.data.columns}
            showDescriptions={block.data.showDescriptions}
            formatPrice={formatPrice}
          />
        );
      }

      if (variant === "sizeBadges") {
        return (
          <SizeBadgesBlock
            key={block.id}
            label={category.label ?? ""}
            dishes={dishes}
            columns={block.data.columns}
            showPhotos={block.data.showPhotos}
            showDescriptions={block.data.showDescriptions}
            formatPrice={formatPrice}
          />
        );
      }

      return (
        <SizedCategoryBlock
          key={block.id}
          label={category.label ?? ""}
          dishes={dishes}
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
