"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";

const EMPTY_HERO = { title: "", subtitle: "" };
const EMPTY_FOOTER = { text: "", phone: "", address: "" };

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

function pickHero(blocks) {
  const heroBlock = blocks.find((b) => b.type === "hero");
  return heroBlock ? { ...EMPTY_HERO, ...heroBlock.data } : EMPTY_HERO;
}

function pickFooter(blocks) {
  const footerBlock = blocks.find((b) => b.type === "footer");
  return footerBlock ? { ...EMPTY_FOOTER, ...footerBlock.data } : EMPTY_FOOTER;
}

function buildCategoryRows(activeCategories, blocks) {
  const categoryBlocks = blocks.filter((b) => b.type === "category");
  return activeCategories.map((category) => {
    const index = categoryBlocks.findIndex((b) => b.data.categoryId === category.id);
    const block = index >= 0 ? categoryBlocks[index] : null;
    return {
      id: category.id,
      label: category.label || category.id,
      included: Boolean(block),
      order: index >= 0 ? index + 1 : activeCategories.length,
      showPhotos: block ? block.data.showPhotos : true,
      showDescriptions: block ? block.data.showDescriptions : true,
    };
  });
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
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [alert, setAlert] = useState(null);

  const [slug, setSlug] = useState("");
  const [hero, setHero] = useState(EMPTY_HERO);
  const [footer, setFooter] = useState(EMPTY_FOOTER);
  const [categories, setCategories] = useState([]);
  const [publishedAt, setPublishedAt] = useState(null);

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
        const blocks = readMenuBlocks(menuBody);

        setSlug(readMenuSlug(menuBody));
        setHero(pickHero(blocks));
        setFooter(pickFooter(blocks));
        setPublishedAt(readPublishedAt(menuBody));
        setCategories(buildCategoryRows(activeCategories, blocks));
        setAlert(null);
        setLoading(false);
      } catch {
        setAlert({ type: "error", message: t("loadError") });
        setLoading(false);
      }
    }

    loadMenu();
  }, [tenantId, t, errorText]);

  const buildDraft = () => ({
    blocks: [
      { id: "hero", type: "hero", visible: true, data: hero },
      ...categories
        .filter((category) => category.included)
        .sort((a, b) => a.order - b.order)
        .map((category) => ({
          id: `category-${category.id}`,
          type: "category",
          visible: true,
          data: {
            categoryId: category.id,
            showPhotos: category.showPhotos,
            showDescriptions: category.showDescriptions,
          },
        })),
      { id: "footer", type: "footer", visible: true, data: footer },
    ],
  });

  const saveDraft = async () => {
    setSaving(true);
    setAlert(null);
    try {
      const res = await fetch(`/api/company/sedes/${tenantId}/menu`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuSlug: slug, draft: buildDraft() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = readErrorCode(body);
        setAlert({ type: "error", message: errorText(code, "saveError") });
        setSaving(false);
        return false;
      }
      setAlert({ type: "success", message: t("draftSaved") });
      setSaving(false);
      return true;
    } catch {
      setAlert({ type: "error", message: t("saveError") });
      setSaving(false);
      return false;
    }
  };

  const publish = async () => {
    // Publicar guarda primero: publicar un borrador que quedo sin guardar
    // publicaria la version anterior, que es lo contrario de lo que el boton dice.
    const saved = await saveDraft();
    if (!saved) {
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

  const busy = saving || publishing;

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900 dark:bg-[#061426] dark:text-slate-100">
      <div className="mx-auto max-w-3xl space-y-6">
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
            </section>

            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1f30]">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {t("heroTitle")}
              </h2>
              <input
                value={hero.title}
                onChange={(event) => setHero({ ...hero, title: event.target.value })}
                placeholder={t("heroTitleField")}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-transparent"
              />
              <input
                value={hero.subtitle}
                onChange={(event) => setHero({ ...hero, subtitle: event.target.value })}
                placeholder={t("heroSubtitleField")}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-transparent"
              />
            </section>

            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1f30]">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {t("categoriesTitle")}
              </h2>
              <p className="text-xs text-slate-500">{t("categoriesHint")}</p>
              {categories.length === 0 ? (
                <p className="text-sm text-slate-400">{t("noCategories")}</p>
              ) : (
                <ul className="space-y-2">
                  {categories.map((category, index) => (
                    <li
                      key={category.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
                    >
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={category.included}
                          onChange={(event) => {
                            const next = [...categories];
                            next[index] = { ...category, included: event.target.checked };
                            setCategories(next);
                          }}
                        />
                        {category.label}
                      </label>
                      <label className="flex items-center gap-1 text-xs text-slate-500">
                        {t("order")}
                        <input
                          type="number"
                          min="1"
                          value={category.order}
                          onChange={(event) => {
                            const next = [...categories];
                            next[index] = { ...category, order: Number(event.target.value) || 1 };
                            setCategories(next);
                          }}
                          className="w-16 rounded-md border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-transparent"
                        />
                      </label>
                      <label className="flex items-center gap-1 text-xs text-slate-500">
                        <input
                          type="checkbox"
                          checked={category.showPhotos}
                          onChange={(event) => {
                            const next = [...categories];
                            next[index] = { ...category, showPhotos: event.target.checked };
                            setCategories(next);
                          }}
                        />
                        {t("showPhotos")}
                      </label>
                      <label className="flex items-center gap-1 text-xs text-slate-500">
                        <input
                          type="checkbox"
                          checked={category.showDescriptions}
                          onChange={(event) => {
                            const next = [...categories];
                            next[index] = { ...category, showDescriptions: event.target.checked };
                            setCategories(next);
                          }}
                        />
                        {t("showDescriptions")}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1f30]">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {t("footerTitle")}
              </h2>
              <input
                value={footer.text}
                onChange={(event) => setFooter({ ...footer, text: event.target.value })}
                placeholder={t("footerTextField")}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-transparent"
              />
              <input
                value={footer.address}
                onChange={(event) => setFooter({ ...footer, address: event.target.value })}
                placeholder={t("footerAddressField")}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-transparent"
              />
              <input
                value={footer.phone}
                onChange={(event) => setFooter({ ...footer, phone: event.target.value })}
                placeholder={t("footerPhoneField")}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-transparent"
              />
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {publishedAt
                  ? t("publishedAt", { date: new Date(publishedAt).toLocaleString() })
                  : t("neverPublished")}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={busy}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-slate-700"
                >
                  {saving ? t("saving") : t("saveDraft")}
                </button>
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
