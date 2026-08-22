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
import { formatCurrencyAmount } from "@/lib/formatCurrencyAmount";
import { defaultLocale } from "../../../../i18n";
import { CategoryBlock, FooterBlock, HeroBlock } from "./menu-blocks";

// Cacheada un minuto. Los precios cambian en el modulo de productos, no al
// publicar el menu, asi que revalidar solo al publicar dejaria precios viejos
// para siempre. Y una mesa entera escaneando el QR a la vez recibe el mismo HTML
// sin tocar la base.
export const revalidate = 60;

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

  const [categoryMap, settings] = await Promise.all([
    getProductCategoryMap(conn),
    getSystemSettings(conn),
  ]);

  const blocks = renderableBlocks(menu.published.blocks, categoryMap);
  if (!blocks.length) {
    notFound();
  }

  // Una sola consulta para todas las categorias: un menu de ocho secciones no
  // debe costar ocho viajes a la base.
  const categoryIds = referencedCategoryIds(blocks);
  const products = categoryIds.length
    ? await ProductModel(conn)
        .find({ categoryId: { $in: categoryIds } })
        .select("name price description image categoryId")
        .sort({ name: 1 })
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

        return (
          <CategoryBlock
            key={block.id}
            label={categoryMap.get(block.data.categoryId)?.label ?? ""}
            products={productsByCategory.get(block.data.categoryId) ?? []}
            showPhotos={block.data.showPhotos}
            showDescriptions={block.data.showDescriptions}
            formatPrice={formatPrice}
          />
        );
      })}
    </main>
  );
}
