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
import { MenuBlockList } from "@/components/menu/menu-blocks";
import { createMenuPriceFormatter } from "@/lib/menu/menuFormat";
import { MAX_MENU_PRODUCTS } from "@/lib/menu/menuLimits";

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

// Titulo neutro para cuando el slug no resuelve a nada publicable: no hay
// locale en esta ruta (vive fuera de [locale]) asi que no vale la pena tirar
// de next-intl para una sola palabra generica.
const FALLBACK_MENU_TITLE = "Menú";

// generateMetadata corre antes (y por separado) del componente de la pagina,
// asi que repite su propia resolucion de tenant + menu. Nunca puede tirar: si
// lo hiciera, un slug desconocido mostraria una pantalla de error 500 en vez
// del 404 prolijo que el componente de abajo ya arma con notFound().
export async function generateMetadata({ params }) {
  try {
    const { slug } = await params;

    const masterConn = await connectMasterDB();
    const tenant = await findTenantByMenuSlug(masterConn, slug);
    if (!tenant || !hasFeature(tenant.features, "online-menu")) {
      return { title: FALLBACK_MENU_TITLE };
    }

    const conn = await getTenantConnection(tenant.dbName);
    const menu = await readMenuDocument(conn);

    // Mismo gate que el componente de la pagina, y por la misma razon: un
    // menu nunca publicado tiene que devolver el mismo titulo generico que un
    // slug que no existe. Si aca se usara el nombre de la sede o el hero de
    // un draft sin publicar, el <title> distinguiria "esta sede existe, esta
    // activa y paga el modulo, pero nunca publico" de "este slug no es de
    // nadie" — exactamente el oraculo que notFound() en el componente evita
    // fusionando las cuatro causas (slug desconocido, sede inactiva, feature
    // no contratado, nunca publicado) en una sola respuesta indistinguible.
    if (!menu.published?.blocks?.length) {
      return { title: FALLBACK_MENU_TITLE };
    }

    const heroBlock = menu.published.blocks.find((block) => block.type === "hero");
    const heroData = heroBlock?.data ?? {};

    const title = heroData.title || tenant.name || FALLBACK_MENU_TITLE;
    if (heroData.subtitle) {
      return { title, description: heroData.subtitle };
    }
    return { title };
  } catch {
    return { title: FALLBACK_MENU_TITLE };
  }
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

  const formatPrice = createMenuPriceFormatter(settings?.currency);

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-white text-neutral-900">
      <MenuBlockList
        blocks={blocks}
        categoryMap={categoryMap}
        productsByCategory={productsByCategory}
        sizeOrderMap={sizeOrderMap}
        formatPrice={formatPrice}
      />
    </main>
  );
}
