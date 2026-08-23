"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Monitor, Smartphone } from "lucide-react";

const READY_MESSAGE = "menu-preview-ready";
const BLOCKS_MESSAGE = "menu-preview-blocks";
const PHONE_WIDTH = 390;

export function PreviewPanel({ previewUrl, blocks }) {
  const t = useTranslations("OnlineMenu");
  const frameRef = useRef(null);
  const blocksRef = useRef(blocks);
  const [phone, setPhone] = useState(false);

  const send = useCallback(() => {
    const frame = frameRef.current;
    if (!frame || !frame.contentWindow) {
      return;
    }
    // Nunca '*': el destino es siempre este mismo origen.
    frame.contentWindow.postMessage(
      { type: BLOCKS_MESSAGE, blocks: blocksRef.current },
      window.location.origin,
    );
  }, []);

  // Espera el "listo" de la previa antes del primer envio. Sin esto hay una
  // carrera: el padre puede mandar antes de que el iframe tenga su listener y
  // el primer dibujo sale vacio.
  useEffect(() => {
    function handleMessage(event) {
      if (event.origin !== window.location.origin) {
        return;
      }
      const message = event.data;
      if (!message || message.type !== READY_MESSAGE) {
        return;
      }
      send();
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [send]);

  // Sincroniza la ref y reenvia, en ese orden y en el mismo efecto. La lista
  // viaja por una ref ademas del estado porque el listener de "listo" y el
  // handler de "load" se registran una sola vez y necesitan leer la version mas
  // reciente sin volver a suscribirse. La asignacion va dentro de un efecto y no
  // en el cuerpo del componente: escribir una ref durante el render es
  // justamente lo que el compilador de React marca.
  useEffect(() => {
    blocksRef.current = blocks;
    send();
  }, [blocks, send]);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t("previewTitle")}
        </h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setPhone(true)}
            aria-pressed={phone}
            className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
              phone
                ? "border-blue-500 text-blue-500"
                : "border-slate-300 text-slate-500 dark:border-slate-700"
            }`}
          >
            <Smartphone className="size-3.5" /> {t("previewPhone")}
          </button>
          <button
            type="button"
            onClick={() => setPhone(false)}
            aria-pressed={!phone}
            className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
              phone
                ? "border-slate-300 text-slate-500 dark:border-slate-700"
                : "border-blue-500 text-blue-500"
            }`}
          >
            <Monitor className="size-3.5" /> {t("previewDesktop")}
          </button>
        </div>
      </div>

      <div className="flex justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-2 dark:border-slate-800 dark:bg-slate-900">
        <iframe
          ref={frameRef}
          src={previewUrl}
          title={t("previewTitle")}
          onLoad={send}
          style={phone ? { width: PHONE_WIDTH } : undefined}
          className={`h-[70vh] rounded-lg border-0 bg-white ${phone ? "" : "w-full"}`}
        />
      </div>
    </section>
  );
}
