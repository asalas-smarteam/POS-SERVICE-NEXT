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
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [publishing, setPublishing] = useState(false);
  const [savingLink, setSavingLink] = useState(false);
  const [alert, setAlert] = useState(null);

  const [slug, setSlug] = useState("");
  // El slug que ya confirmó el servidor (por la carga o por "Guardar
  // enlace"), distinto del valor en edicion de `slug`. El link "Ver menú
  // público" de la cabecera usa este, nunca el del input: si usara `slug`,
  // escribir un enlace nuevo que despues falla por slug_taken dejaria ese
  // link apuntando al menu de otra sede antes de que nadie lo confirmara.
  const [confirmedSlug, setConfirmedSlug] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [categoryRows, setCategoryRows] = useState([]);
  const [publishedAt, setPublishedAt] = useState(null);

  // Guarda la referencia exacta del array de bloques que acabamos de fijar
  // nosotros mismos (el `[]` inicial del mount, o el que trae la carga del
  // servidor), para que el efecto de autoguardado de mas abajo lo reconozca
  // por identidad y no lo autoguarde como si fuera una edicion del dueno. Un
  // booleano tipo "yaCargue" no alcanza aca: React 19 batchea el
  // setBlocks(loadedBlocks) junto con el resto de los setState de la carga,
  // asi que para cuando ese efecto vuelve a correr el booleano ya estaria en
  // true y no bloquearia nada. Comparar por identidad de array si funciona,
  // porque nunca lo tocamos salvo cuando nosotros mismos acabamos de
  // asignarlo.
  const skipAutosaveBlocksRef = useRef(blocks);

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
      setLoadFailed(false);
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
          setLoadFailed(true);
          return;
        }

        const categoryBody = await categoriesRes.json().catch(() => ({}));
        const activeCategories = readCategoriesList(categoryBody);
        const loadedSlug = readMenuSlug(menuBody);
        const loadedBlocks = readMenuBlocks(menuBody);

        // Se fija antes de setBlocks, con la misma referencia: es lo que el
        // efecto de autoguardado de mas abajo va a comparar para saber que
        // este cambio de `blocks` vino de la carga, no del dueno.
        skipAutosaveBlocksRef.current = loadedBlocks;

        setSlug(loadedSlug);
        setConfirmedSlug(loadedSlug);
        setBlocks(loadedBlocks);
        setCategoryRows(activeCategories);
        setPublishedAt(readPublishedAt(menuBody));
        setAlert(null);
        setLoading(false);
      } catch {
        setAlert({ type: "error", message: t("loadError") });
        setLoading(false);
        setLoadFailed(true);
      }
    }

    loadMenu();
  }, [tenantId, t, errorText, loadAttempt]);

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

  // Cada cambio de bloques programa un guardado, salvo el que llega de
  // nosotros mismos (el `[]` del mount o el `setBlocks` de la carga): ese
  // valor ya esta en el servidor, autoguardarlo seria reescribir lo mismo.
  // Ver el comentario de skipAutosaveBlocksRef mas arriba para el porque de
  // comparar por identidad en vez de con un booleano.
  useEffect(() => {
    if (blocks === skipAutosaveBlocksRef.current) {
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
    // El "en vuelo" arranca aca, antes del flush, no despues: flush() puede
    // ser un round trip completo, y si `busy` no lo cubre un segundo click
    // manda un segundo POST /publish mientras el primero todavia viaja.
    setPublishing(true);
    try {
      // Publicar vacia primero la cola: publicar con un cambio todavia dentro
      // del debounce publicaria la version anterior, que es lo contrario de
      // lo que el boton dice. flush() esta dentro de este try: es una
      // promesa ajena (de createAutosave) y puede rechazar por su defensa en
      // profundidad; sin el try ese rechazo quedaria sin manejar y el click
      // moriria en silencio.
      const flushed = await autosave.flush();
      if (!flushed) {
        setAlert({ type: "error", message: t("saveError") });
        setPublishing(false);
        return;
      }

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
    setSavingLink(true);
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
        setSavingLink(false);
        return;
      }
      const savedSlug = readMenuSlug(body);
      setSlug(savedSlug);
      setConfirmedSlug(savedSlug);
      setAlert({ type: "success", message: t("linkSaved") });
      setSavingLink(false);
    } catch {
      setAlert({ type: "error", message: t("saveError") });
      setSavingLink(false);
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
          {confirmedSlug ? (
            <a
              href={`/m/${confirmedSlug}`}
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
        ) : null}

        {!loading && loadFailed ? (
          <>
            {alert ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
                {alert.message}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setLoadAttempt((attempt) => attempt + 1)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
            >
              {t("retry")}
            </button>
          </>
        ) : null}

        {!loading && !loadFailed ? (
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
                disabled={savingLink || busy}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-slate-700"
              >
                {savingLink ? t("statusSaving") : t("saveLink")}
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
        ) : null}
      </div>
    </div>
  );
}
