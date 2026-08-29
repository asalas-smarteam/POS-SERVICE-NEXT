"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { MenuBlockList } from "@/components/menu/menu-blocks";
import { createMenuPriceFormatter } from "@/lib/menu/menuFormat";
import { renderableBlocks } from "@/lib/menu/menuSchema";
import { buildPreviewMaps } from "@/lib/menu/previewMaps";

const READY_MESSAGE = "menu-preview-ready";
const BLOCKS_MESSAGE = "menu-preview-blocks";

// Esta pagina ya no carga nada: el editor hace el fetch y le manda todo por el
// mismo canal que le manda los bloques. Es lo que le permite al editor calcular
// el aviso de la tabla que cae con el mismo modulo que renderiza aca, en vez de
// con una segunda implementacion de la regla en el servidor. El precio es que la
// primera pintura espera al fetch del padre.
export default function MenuPreviewPage() {
  const t = useTranslations("OnlineMenu");
  const [payload, setPayload] = useState(null);

  // El aviso de "listo" es lo que evita la carrera al montar: el padre puede
  // mandar antes de que este listener exista, y ese primer dibujo saldria vacio
  // sin motivo aparente.
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
      setPayload({
        blocks: Array.isArray(message.blocks) ? message.blocks : [],
        data: message.data || null,
      });
    }

    window.addEventListener("message", handleMessage);
    window.parent.postMessage({ type: READY_MESSAGE }, origin);

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Memoizado: sin esto, un payload nulo arma un `[]` literal nuevo en cada
  // render, y eso alcanza para que el useMemo de mas abajo (que depende de
  // blocks) crea que blocks cambio en cada render y se recalcule sin razon.
  const blocks = useMemo(() => (payload ? payload.blocks : []), [payload]);
  const data = payload ? payload.data : null;

  const maps = useMemo(() => buildPreviewMaps(data), [data]);
  const formatPrice = useMemo(
    () => createMenuPriceFormatter(data ? data.currency : null),
    [data],
  );

  // El estado vacio se decide DESPUES de filtrar, con el mismo renderableBlocks
  // que aplica MenuBlockList adentro. Decidirlo sobre `blocks` hacia que con
  // todos los bloques ocultos hubiera blocks.length > 0 y por lo tanto ni aviso
  // ni contenido: una pagina en blanco, justo en el caso en que el dueno mas
  // necesita entender que oculto todo.
  const visibleBlocks = useMemo(
    () => renderableBlocks(blocks, maps.categoryMap),
    [blocks, maps],
  );

  // Y solo cuenta como vacio si los datos ya llegaron: con `data` en null el
  // categoryMap esta vacio, todo bloque de categoria se filtra, y un menu que
  // solo tiene categorias se leeria como "sin bloques" durante la carga.
  const isEmpty = data !== null && visibleBlocks.length === 0;

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
          categoryMap={maps.categoryMap}
          productsByCategory={maps.productsByCategory}
          sizeOrderMap={maps.sizeOrderMap}
          formatPrice={formatPrice}
        />
      )}
    </main>
  );
}
