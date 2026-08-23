"use client";

import { useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import {
  addBlock,
  moveBlock,
  removeBlock,
  toggleBlockVisibility,
  updateBlockData,
} from "@/lib/menu/menuBlockList";
import { BlockRow } from "./block-row";

export function BlockCanvas({ blocks, categoryLabels, availableCategoryRows, canAddHero, canAddFooter, onChange }) {
  const t = useTranslations("OnlineMenu");
  const [expandedId, setExpandedId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const from = blocks.findIndex((block) => block.id === active.id);
    const to = blocks.findIndex((block) => block.id === over.id);
    onChange(moveBlock(blocks, from, to));
  };

  const titleFor = (block) => {
    if (block.type === "hero") {
      return t("blockHero");
    }
    if (block.type === "footer") {
      return t("blockFooter");
    }
    return categoryLabels.get(block.data.categoryId) || block.data.categoryId;
  };

  const add = (type, data) => {
    setMenuOpen(false);
    onChange(addBlock(blocks, type, data));
  };

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1f30]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t("blocksTitle")}
          </h2>
          <p className="text-xs text-slate-500">{t("blocksHint")}</p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium dark:border-slate-700"
          >
            <Plus className="size-4" /> {t("addBlock")}
          </button>

          {menuOpen ? (
            <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-[#0c1f30]">
              <button
                type="button"
                disabled={!canAddHero}
                onClick={() => add("hero")}
                className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
              >
                {t("addHero")}
              </button>
              <button
                type="button"
                disabled={!canAddFooter}
                onClick={() => add("footer")}
                className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
              >
                {t("addFooter")}
              </button>

              <p className="mt-1 border-t border-slate-200 px-2 pt-2 text-[10px] uppercase tracking-wide text-slate-400 dark:border-slate-700">
                {t("addCategoryGroup")}
              </p>
              {availableCategoryRows.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-slate-400">{t("noCategoriesLeft")}</p>
              ) : (
                availableCategoryRows.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => add("category", { categoryId: category.id })}
                    className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {category.label}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>

      {blocks.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">{t("noBlocks")}</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blocks.map((block) => block.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {blocks.map((block) => (
                <BlockRow
                  key={block.id}
                  block={block}
                  title={titleFor(block)}
                  expanded={expandedId === block.id}
                  onToggleExpand={() => setExpandedId(expandedId === block.id ? null : block.id)}
                  onPatch={(patch) => onChange(updateBlockData(blocks, block.id, patch))}
                  onToggleVisible={() => onChange(toggleBlockVisibility(blocks, block.id))}
                  onRemove={() => onChange(removeBlock(blocks, block.id))}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
