"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { MenuBlockList } from "@/components/menu/menu-blocks";
import { createMenuPriceFormatter } from "@/lib/menu/menuFormat";
import { renderableBlocks } from "@/lib/menu/menuSchema";

const READY_MESSAGE = "menu-preview-ready";
const BLOCKS_MESSAGE = "menu-preview-blocks";

// El compilador de React no soporta condicionales, `??`, `?.` ni operadores
// logicos dentro de un try/catch: si aparecen ahi, deja al componente entero
// sin compilar y sin avisar. Por eso el parseo de la respuesta vive aca afuera
// y dentro del try de abajo solo hay llamadas y asignaciones planas.
function readPreviewData(body) {
  const source = body || {};
  return {
    categories: Array.isArray(source.categories) ? source.categories : [],
    products: Array.isArray(source.products) ? source.products : [],
    sizes: Array.isArray(source.sizes) ? source.sizes : [],
    currency: source.currency || null,
    truncated: source.truncated === true,
  };
}

export default function MenuPreviewPage() {
  const t = useTranslations("OnlineMenu");
  const params = useParams();
  const tenantId = String(params?.tenantId ?? "");

  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    async function loadPreviewData() {
      try {
        const res = await fetch(`/api/company/sedes/${tenantId}/menu/preview-data`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setFailed(true);
          return;
        }
        setData(readPreviewData(body));
        setFailed(false);
      } catch {
        setFailed(true);
      }
    }

    loadPreviewData();
  }, [tenantId]);

  // El aviso de "listo" es lo que evita la carrera al montar: el padre puede
  // mandar la primera lista antes de que este listener exista, y ese primer
  // dibujo saldria vacio sin motivo aparente.
  useEffect(() => {
    const origin = window.location.origin;

    function handleMessage(event) {
      // Validar el origen no es defensivo, es obligatorio: un iframe de mismo
      // origen dentro de una pagina autenticada es exactamente el escenario
      // donde un postMessage sin filtrar se vuelve un canal de inyeccion desde
      // cualquier ventana que tenga una referencia a esta.
      if (event.origin !== origin) {
        return;
      }
      const message = event.data;
      if (!message || message.type !== BLOCKS_MESSAGE) {
        return;
      }
      setBlocks(Array.isArray(message.blocks) ? message.blocks : []);
    }

    window.addEventListener("message", handleMessage);
    window.parent.postMessage({ type: READY_MESSAGE }, origin);

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const categoryMap = useMemo(() => {
    const rows = data ? data.categories : [];
    return new Map(rows.map((category) => [category.id, { ...category, active: true }]));
  }, [data]);

  const productsByCategory = useMemo(() => {
    const grouped = new Map();
    const rows = data ? data.products : [];
    for (const product of rows) {
      if (!grouped.has(product.categoryId)) {
        grouped.set(product.categoryId, []);
      }
      grouped.get(product.categoryId).push(product);
    }
    return grouped;
  }, [data]);

  const sizeOrderMap = useMemo(() => {
    const rows = data ? data.sizes : [];
    return new Map(rows.map((size) => [size.id, { label: size.label, order: size.order }]));
  }, [data]);

  const formatPrice = useMemo(
    () => createMenuPriceFormatter(data ? data.currency : null),
    [data],
  );

  // El estado vacio se decide DESPUES de filtrar, con el mismo renderableBlocks
  // que aplica MenuBlockList adentro. Decidirlo sobre `blocks` (la lista sin
  // filtrar) hacia que con todos los bloques ocultos hubiera blocks.length > 0
  // y por lo tanto ni el aviso ni contenido: una pagina en blanco, justo en el
  // caso en que el dueno mas necesita entender que oculto todo.
  const visibleBlocks = useMemo(
    () => renderableBlocks(blocks, categoryMap),
    [blocks, categoryMap],
  );

  // Y solo cuenta como vacio si los datos ya llegaron: con `data` en null el
  // categoryMap esta vacio, todo bloque de categoria se filtra, y un menu que
  // solo tiene categorias se leeria como "sin bloques" durante la carga.
  const isEmpty = data !== null && visibleBlocks.length === 0;

  if (failed) {
    return (
      <main className="mx-auto min-h-screen max-w-2xl bg-white p-6 text-neutral-500">
        {t("previewError")}
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-white text-neutral-900">
      {data?.truncated ? (
        <p className="bg-amber-100 px-5 py-2 text-center text-xs text-amber-900">
          {t("previewTruncated")}
        </p>
      ) : null}
      {isEmpty ? (
        <p className="px-5 py-16 text-center text-sm text-neutral-400">{t("previewEmpty")}</p>
      ) : (
        <MenuBlockList
          blocks={blocks}
          categoryMap={categoryMap}
          productsByCategory={productsByCategory}
          sizeOrderMap={sizeOrderMap}
          formatPrice={formatPrice}
        />
      )}
    </main>
  );
}
