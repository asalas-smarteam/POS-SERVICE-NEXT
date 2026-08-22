import { notFound } from "next/navigation";
import { connectMasterDB } from "@/lib/db/master";
import { getTenantConnection } from "@/lib/db/connections";
import { ProductModel } from "@/models/tenant/Product";
import { hasFeature } from "@/lib/features/featureRegistry";
import { findTenantByMenuSlug } from "@/lib/menu/menuTenant";
import { readMenuDocument } from "@/lib/menu/menuSettings";
import { referencedCategoryIds, renderableBlocks } from "@/lib/menu/menuSchema";
import { getProductCategoryMap } from "@/lib/tenant/categorySettings";
import { getSystemSettings } from "@/lib/tenant/systemSettings";
import { getProductSizeOrderMap } from "@/lib/tenant/productSizeSettings";
import { formatCurrencyAmount } from "@/lib/formatCurrencyAmount";
import { defaultLocale } from "../../../../i18n";
import { CategoryBlock, FooterBlock, HeroBlock, SizedCategoryBlock } from "./menu-blocks";

// Techo de productos por request: una sede real no tiene miles de productos en
// sus categorias publicadas, pero nada impide que las tenga. Sin un limite,
// un menu patologico deja que cualquier visitante anonimo pague (con tiempo de
// render y transferencia) una consulta arbitrariamente grande.
const MAX_MENU_PRODUCTS = 500;

// Cacheada un minuto. Los precios cambian en el modulo de productos, no al
// publicar el menu, asi que revalidar solo al publicar dejaria precios viejos
// para siempre. Y una mesa entera escaneando el QR a la vez recibe el mismo HTML
// sin tocar la base. Ojo: este valor por si solo no cachea nada — lo que activa
// el ISR on-demand (fallback: null, cacheado por pathname resuelto) es el
// generateStaticParams de abajo. Sin el, Next clasifica esta ruta dinamica
// como full dynamic y "revalidate" queda inerte: cada scan de QR volveria a
// correr el render completo contra la base.
export const revalidate = 60;

// Vacio a proposito: no hay slugs para prerenderizar en build time (dependen
// de que sedes existan en runtime), pero la sola presencia de esta funcion es
// lo que le dice a Next que trate la ruta como ISR on-demand en vez de full
// dynamic. Borrarla por "no hacer nada" apaga el cacheo de revalidate de arriba.
export async function generateStaticParams() {
  return [];
}

// Agrupa los productos de una categoria con talles en un plato por nombre
// (recortado) con una fila por talle debajo, en vez de repetir el plato una
// vez por talle. El nombre recortado es la unica clave que el modelo de datos
// ofrece para esto: Product no tiene un id de "plato" que una a sus variantes
// de talle (ver models/tenant/Product.js), solo `productSizeId` apuntando al
// talle. Dos platos genuinamente distintos que compartan nombre por error de
// carga se fusionarian en una sola entrada, mostrando la foto/descripcion de
// uno solo de ellos (el que quede primero segun el orden de talles) y sus
// talles todos mezclados bajo ese nombre.
function groupProductsBySize(categoryProducts, sizeOrderMap) {
  const groups = new Map();

  for (const product of categoryProducts) {
    const key = product.name.trim();
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(product);
  }

  const orderOf = (product) => sizeOrderMap.get(product.sizeId)?.order ?? Infinity;

  return Array.from(groups.entries()).map(([name, groupProducts]) => {
    // Un producto cuyo talle no resuelve en el ajuste (borrado o desactivado)
    // igual tiene que aparecer: se ordena al final y su fila no lleva
    // etiqueta de talle, pero no se descarta.
    const sorted = [...groupProducts].sort((a, b) => orderOf(a) - orderOf(b));
    const first = sorted[0];

    return {
      id: first.id,
      name,
      description: first.description,
      image: first.image,
      sizes: sorted.map((product) => ({
        id: product.id,
        label: sizeOrderMap.get(product.sizeId)?.label ?? "",
        price: product.price,
      })),
    };
  });
}

export default async function PublicMenuPage({ params }) {
  const { slug } = await params;

  const masterConn = await connectMasterDB();
  const tenant = await findTenantByMenuSlug(masterConn, slug);

  // Slug desconocido, sede inactiva y feature no contratado dan todos 404, sin
  // distinguirse: el link no sirve para averiguar que sedes existen ni quien
  // dejo de pagar. Y sin el chequeo de feature, un menu publicado seguiria vivo
  // despues de que el cliente deje de pagar el modulo.
  if (!tenant || !hasFeature(tenant.features, "online-menu")) {
    notFound();
  }

  const conn = await getTenantConnection(tenant.dbName);
  const menu = await readMenuDocument(conn);

  if (!menu.published?.blocks?.length) {
    notFound();
  }

  const [categoryMap, settings, sizeOrderMap] = await Promise.all([
    getProductCategoryMap(conn),
    getSystemSettings(conn),
    getProductSizeOrderMap(conn),
  ]);

  const blocks = renderableBlocks(menu.published.blocks, categoryMap);
  if (!blocks.length) {
    notFound();
  }

  // Una sola consulta para todas las categorias: un menu de ocho secciones no
  // debe costar ocho viajes a la base. `productSizeId` viaja tambien para
  // poder agrupar por talle mas abajo en las categorias que lo usan.
  const categoryIds = referencedCategoryIds(blocks);
  const products = categoryIds.length
    ? await ProductModel(conn)
        .find({ categoryId: { $in: categoryIds } })
        .select("name price description image categoryId productSizeId")
        .sort({ name: 1 })
        .limit(MAX_MENU_PRODUCTS)
        .lean()
    : [];

  const productsByCategory = new Map();
  for (const product of products) {
    const key = String(product.categoryId ?? "");
    if (!productsByCategory.has(key)) {
      productsByCategory.set(key, []);
    }
    productsByCategory.get(key).push({
      id: String(product._id),
      name: product.name,
      price: product.price,
      description: product.description || "",
      image: product.image?.url ? { url: product.image.url } : null,
      sizeId: product.productSizeId ? String(product.productSizeId) : null,
    });
  }

  const formatPrice = (amount) =>
    formatCurrencyAmount(amount, settings?.currency, defaultLocale);

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-white text-neutral-900">
      {blocks.map((block) => {
        if (block.type === "hero") {
          return <HeroBlock key={block.id} data={block.data} />;
        }

        if (block.type === "footer") {
          return <FooterBlock key={block.id} data={block.data} />;
        }

        const category = categoryMap.get(block.data.categoryId);
        const categoryProducts = productsByCategory.get(block.data.categoryId) ?? [];

        // El agrupado por talle es presentacional: lo decide el flag
        // `hasSizes` de la categoria (el mismo que usa el resto del POS),
        // no un campo nuevo del bloque. Una categoria sin talles se sigue
        // renderando plana, exactamente como antes.
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
      })}
    </main>
  );
}
