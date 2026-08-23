"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { availableCategories, canAddType } from "@/lib/menu/menuBlockList";
import { createAutosave } from "@/lib/menu/createAutosave";
import { BlockCanvas } from "./block-canvas";
import { PreviewPanel } from "./preview-panel";

// Los errores del servidor llegan como codigos y se traducen aca, para que el
// servidor no imponga el idioma de la interfaz.
function buildErrorText(t) {
  return (code, fallbackKey) => {
    const key = `error_${code}`;
    return t.has(key) ? t(key) : t(fallbackKey);
  };
}

// El compilador de React (BuildHIR::lowerStatement) todavia no soporta
// expresiones condicionales, `??`/`?.` ni logicas dentro de un try/catch: si
// aparecen ahi, deja a todo el componente sin compilar sin avisar en el
// build. Por eso el parseo de las respuestas vive en funciones puras aparte,
// y dentro de los try de mas abajo solo quedan llamadas y asignaciones planas.
function readErrorCode(body) {
  return body && body.error;
}

function readMenuSlug(menuBody) {
  return (menuBody && menuBody.menuSlug) || "";
}

function readMenuBlocks(menuBody) {
  const menu = menuBody && menuBody.menu;
  const draft = menu && menu.draft;
  const blocks = draft && draft.blocks;
  return blocks || [];
}

function readPublishedAt(menuBody) {
  const menu = menuBody && menuBody.menu;
  return (menu && menu.publishedAt) || null;
}

function readCategoriesList(categoryBody) {
  const list = categoryBody && categoryBody.categories;
  return Array.isArray(list) ? list : [];
}

export default function OnlineMenuEditorPage() {
  const t = useTranslations("OnlineMenu");
  const params = useParams();
  const locale = String(params?.locale ?? "");
  const companyId = String(params?.companyId ?? "");
  const tenantId = String(params?.tenantId ?? "");
  // Memoizado: sin esto, errorText es una funcion nueva en cada render, lo
  // que volveria a disparar el efecto de carga en cada render (bucle).
  const errorText = useMemo(() => buildErrorText(t), [t]);

  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("idle");
  const loadedRef = useRef(false);
  const [publishing, setPublishing] = useState(false);
  const [alert, setAlert] = useState(null);

  const [slug, setSlug] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [categoryRows, setCategoryRows] = useState([]);
  const [publishedAt, setPublishedAt] = useState(null);

  const categoryLabels = useMemo(
    () => new Map(categoryRows.map((category) => [category.id, category.label])),
    [categoryRows],
  );
  const availableCategoryRows = useMemo(
    () => availableCategories(blocks, categoryRows),
    [blocks, categoryRows],
  );

  // La carga vive dentro del propio efecto (no en un useCallback aparte): un
  // useCallback llamado desde un efecto dispara la regla set-state-in-effect
  // aunque el setState real ocurra despues de un await, y ademas evita
  // depender de una referencia de funcion que cambiaria en cada render.
  // Tampoco usa "finally" ni condicionales/optional-chaining dentro del try
  // (ver la nota sobre el compilador de React mas arriba).
  useEffect(() => {
    async function loadMenu() {
      setLoading(true);
      try {
        const [menuRes, categoriesRes] = await Promise.all([
          fetch(`/api/company/sedes/${tenantId}/menu`),
          fetch(`/api/company/sedes/${tenantId}/menu/categories`),
        ]);

        const menuBody = await menuRes.json().catch(() => ({}));
        if (!menuRes.ok) {
          const code = readErrorCode(menuBody);
          setAlert({ type: "error", message: errorText(code, "loadError") });
          setLoading(false);
          return;
        }

        const categoryBody = await categoriesRes.json().catch(() => ({}));
        const activeCategories = readCategoriesList(categoryBody);

        setSlug(readMenuSlug(menuBody));
        setBlocks(readMenuBlocks(menuBody));
        setCategoryRows(activeCategories);
        setPublishedAt(readPublishedAt(menuBody));
        setAlert(null);
        setLoading(false);
        loadedRef.current = true;
      } catch {
        setAlert({ type: "error", message: t("loadError") });
        setLoading(false);
      }
    }

    loadMenu();
  }, [tenantId, t, errorText]);

  // Se crea una sola vez con el inicializador perezoso de useState: recrearlo
  // en cada render perderia el temporizador y la cola. No se usa una ref con
  // asignacion condicional porque eso escribe la ref durante el render, que es
  // justamente lo que el compilador de React marca. `tenantId` sale de la ruta
  // y no cambia sin desmontar la pagina, asi que capturarlo aca es seguro.
  const [autosave] = useState(() =>
    createAutosave({
      save: async (draft) => {
        const res = await fetch(`/api/company/sedes/${tenantId}/menu`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draft }),
        });
        if (!res.ok) {
          throw new Error("save_failed");
        }
      },
      onStatusChange: setSaveStatus,
    }),
  );

  // Cada cambio de la lista programa un guardado. El guard de la primera vez
  // evita que el propio render inicial —el que acaba de leer del servidor—
  // dispare un PUT que reescribiria lo mismo.
  useEffect(() => {
    if (!loadedRef.current) {
      return;
    }
    autosave.schedule({ blocks });
  }, [blocks, autosave]);

  // Aviso al cerrar la pestaña con cambios sin guardar. Es lo unico que separa
  // "acomode el menu diez minutos" de "perdi diez minutos".
  useEffect(() => {
    function handleBeforeUnload(event) {
      if (!autosave.hasPending()) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [autosave]);

  const publish = async () => {
    // Publicar vacia primero la cola: publicar con un cambio todavia dentro del
    // debounce publicaria la version anterior, que es lo contrario de lo que el
    // boton dice.
    const flushed = await autosave.flush();
    if (!flushed) {
      return;
    }

    setPublishing(true);
    try {
      const res = await fetch(`/api/company/sedes/${tenantId}/menu/publish`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = readErrorCode(body);
        setAlert({ type: "error", message: errorText(code, "publishError") });
        setPublishing(false);
        return;
      }
      setPublishedAt(readPublishedAt(body));
      setAlert({ type: "success", message: t("published") });
      setPublishing(false);
    } catch {
      setAlert({ type: "error", message: t("publishError") });
      setPublishing(false);
    }
  };

  const saveLink = async () => {
    setAlert(null);
    try {
      const res = await fetch(`/api/company/sedes/${tenantId}/menu/slug`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuSlug: slug }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = readErrorCode(body);
        setAlert({ type: "error", message: errorText(code, "saveError") });
        return;
      }
      setSlug(readMenuSlug(body));
      setAlert({ type: "success", message: t("linkSaved") });
    } catch {
      setAlert({ type: "error", message: t("saveError") });
    }
  };

  const busy = publishing;

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900 dark:bg-[#061426] dark:text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 lg:hidden">
          {t("narrowScreen")}
        </p>

        <div className="flex items-center justify-between gap-4">
          <Link
            href={`/${locale}/admin/${companyId}`}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-500"
          >
            <ArrowLeft className="size-4" /> {t("backToPanel")}
          </Link>
          {slug ? (
            <a
              href={`/m/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-sm font-medium text-blue-500 hover:underline"
            >
              {t("openPublic")} <ExternalLink className="size-3.5" />
            </a>
          ) : null}
        </div>

        <h1 className="text-2xl font-bold">{t("title")}</h1>

        {loading ? (
          <p className="flex items-center gap-2 text-slate-400">
            <Loader2 className="size-4 animate-spin" /> {t("loading")}
          </p>
        ) : (
          <>
            {alert ? (
              <div
                className={`rounded-lg border p-3 text-sm ${
                  alert.type === "error"
                    ? "border-red-500/30 bg-red-500/10 text-red-500"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                }`}
              >
                {alert.message}
              </div>
            ) : null}

            <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1f30]">
              <label className="block text-sm font-semibold" htmlFor="menu-slug">
                {t("linkLabel")}
              </label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-slate-400">/m/</span>
                <input
                  id="menu-slug"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-transparent"
                  placeholder="pizzeria-luigi"
                />
              </div>
              <p className="text-xs text-slate-500">{t("linkHint")}</p>
              <p className="text-xs font-medium text-amber-600">{t("linkWarning")}</p>
              <button
                type="button"
                onClick={saveLink}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium dark:border-slate-700"
              >
                {t("saveLink")}
              </button>
            </section>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <BlockCanvas
                blocks={blocks}
                categoryLabels={categoryLabels}
                availableCategoryRows={availableCategoryRows}
                canAddHero={canAddType(blocks, "hero")}
                canAddFooter={canAddType(blocks, "footer")}
                onChange={setBlocks}
              />
              <PreviewPanel
                previewUrl={`/${locale}/admin/${companyId}/menu/${tenantId}/preview`}
                blocks={blocks}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {publishedAt
                  ? t("publishedAt", { date: new Date(publishedAt).toLocaleString() })
                  : t("neverPublished")}
              </p>
              <div className="flex items-center gap-2">
                {saveStatus === "saving" ? (
                  <span className="text-xs text-slate-500">{t("statusSaving")}</span>
                ) : null}
                {saveStatus === "saved" ? (
                  <span className="text-xs text-emerald-600">{t("statusSaved")}</span>
                ) : null}
                {saveStatus === "error" ? (
                  <span className="flex items-center gap-2 text-xs text-red-500">
                    {t("statusError")}
                    <button
                      type="button"
                      onClick={() => autosave.retry()}
                      className="underline"
                    >
                      {t("retry")}
                    </button>
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={publish}
                  disabled={busy}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {publishing ? t("publishing") : t("publish")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
