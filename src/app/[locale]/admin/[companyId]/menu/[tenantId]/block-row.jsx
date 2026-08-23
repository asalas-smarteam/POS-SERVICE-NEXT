"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import { ChevronDown, Eye, EyeOff, GripVertical, Trash2 } from "lucide-react";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-transparent";

function HeroFields({ data, onPatch }) {
  const t = useTranslations("OnlineMenu");
  return (
    <div className="space-y-2">
      <input
        value={data.title}
        onChange={(event) => onPatch({ title: event.target.value })}
        placeholder={t("heroTitleField")}
        className={inputClass}
      />
      <input
        value={data.subtitle}
        onChange={(event) => onPatch({ subtitle: event.target.value })}
        placeholder={t("heroSubtitleField")}
        className={inputClass}
      />
    </div>
  );
}

function FooterFields({ data, onPatch }) {
  const t = useTranslations("OnlineMenu");
  return (
    <div className="space-y-2">
      <input
        value={data.text}
        onChange={(event) => onPatch({ text: event.target.value })}
        placeholder={t("footerTextField")}
        className={inputClass}
      />
      <input
        value={data.address}
        onChange={(event) => onPatch({ address: event.target.value })}
        placeholder={t("footerAddressField")}
        className={inputClass}
      />
      <input
        value={data.phone}
        onChange={(event) => onPatch({ phone: event.target.value })}
        placeholder={t("footerPhoneField")}
        className={inputClass}
      />
    </div>
  );
}

function CategoryFields({ data, onPatch }) {
  const t = useTranslations("OnlineMenu");
  return (
    <div className="flex flex-wrap gap-4">
      <label className="flex items-center gap-2 text-xs text-slate-500">
        <input
          type="checkbox"
          checked={data.showPhotos}
          onChange={(event) => onPatch({ showPhotos: event.target.checked })}
        />
        {t("showPhotos")}
      </label>
      <label className="flex items-center gap-2 text-xs text-slate-500">
        <input
          type="checkbox"
          checked={data.showDescriptions}
          onChange={(event) => onPatch({ showDescriptions: event.target.checked })}
        />
        {t("showDescriptions")}
      </label>
    </div>
  );
}

export function BlockRow({ block, title, warning, expanded, onToggleExpand, onPatch, onToggleVisible, onRemove }) {
  const t = useTranslations("OnlineMenu");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const hidden = block.visible === false;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative rounded-lg border bg-white dark:bg-[#0c1f30] ${
        isDragging ? "z-10 border-blue-400 shadow-lg" : "border-slate-200 dark:border-slate-800"
      } ${hidden ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          type="button"
          className="cursor-grab touch-none p-1 text-slate-400"
          aria-label={`${t("dragHandle")}: ${title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={expanded}
          className="flex flex-1 items-center gap-2 text-left text-sm font-medium"
        >
          <ChevronDown aria-hidden="true" className={`size-4 text-slate-400 ${expanded ? "" : "-rotate-90"}`} />
          <span>{title}</span>
          {hidden ? (
            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {t("hiddenBadge")}
            </span>
          ) : null}
          <span className="sr-only">{t("expandBlock")}</span>
        </button>

        <button
          type="button"
          onClick={onToggleVisible}
          aria-label={hidden ? t("showBlock") : t("hideBlock")}
          className="p-1 text-slate-400 hover:text-slate-600"
        >
          {hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        </button>

        <button
          type="button"
          onClick={onRemove}
          aria-label={t("removeBlock")}
          className="p-1 text-slate-400 hover:text-red-500"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {warning ? (
        <p className="border-t border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-400">
          {warning}
        </p>
      ) : null}

      {expanded ? (
        <div className="border-t border-slate-200 px-3 py-3 dark:border-slate-800">
          {block.type === "hero" ? <HeroFields data={block.data} onPatch={onPatch} /> : null}
          {block.type === "footer" ? <FooterFields data={block.data} onPatch={onPatch} /> : null}
          {block.type === "category" ? <CategoryFields data={block.data} onPatch={onPatch} /> : null}
        </div>
      ) : null}
    </li>
  );
}
