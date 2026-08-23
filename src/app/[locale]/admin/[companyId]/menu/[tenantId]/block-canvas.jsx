"use client";

import { useEffect, useRef, useState } from "react";
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

const menuTriggerId = "add-block-trigger";
const menuId = "add-block-menu";

export function BlockCanvas({
  blocks,
  categoryLabels,
  categoriesFailed,
  availableCategoryRows,
  canAddHero,
  canAddFooter,
  onChange,
}) {
  const t = useTranslations("OnlineMenu");
  const [expandedId, setExpandedId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuContainerRef = useRef(null);
  const menuTriggerRef = useRef(null);

  const closeMenu = () => {
    setMenuOpen(false);
    const trigger = menuTriggerRef.current;
    if (trigger) {
      trigger.focus();
    }
  };

  // El menu "Agregar" es un popover casero, no un componente de UI con su
  // propio manejo de foco: sin este efecto se queda abierto al hacer click
  // afuera o al apretar Escape, y el foco se pierde en el body al elegir un
  // item (el boton clickeado se desmonta con el resto del menu). Los
  // handlers cierran y reenfocan en linea, sin llamar a closeMenu de arriba,
  // para no tener que listar esa funcion (nueva en cada render) como
  // dependencia del efecto.
  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    function closeAndRefocus() {
      setMenuOpen(false);
      const trigger = menuTriggerRef.current;
      if (trigger) {
        trigger.focus();
      }
    }

    function handlePointerDown(event) {
      const container = menuContainerRef.current;
      const clickedInside = container && container.contains(event.target);
      if (!clickedInside) {
        closeAndRefocus();
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closeAndRefocus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const toggleMenu = () => {
    if (menuOpen) {
      closeMenu();
      return;
    }
    setMenuOpen(true);
  };

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

  // Una categoria puede desactivarse o borrarse en Ajustes despues de que su
  // bloque ya esta en el menu. categoryLabels solo trae categorias activas
  // (ver el comentario en el endpoint /menu/categories), asi que un
  // categoryId ausente ahi es la senal de que renderableBlocks va a
  // descartar ese bloque en silencio en el menu publico. No se borra el
  // bloque -eso perderia la configuracion si el dueno reactiva la
  // categoria- pero la fila tiene que avisar en vez de mostrarse normal.
  //
  // Salvo cuando la lista de categorias directamente no cargo: ahi
  // categoryLabels esta vacio por un fallo de red o del endpoint, no porque
  // el dueno haya desactivado nada, y este aviso -que es la unica senal que
  // distingue "la categoria se desactivo" de "no cargaron las categorias"-
  // marcaria TODAS las filas con un diagnostico falso sobre el estado de sus
  // ajustes. En ese caso calla, y el aviso de carga fallida de mas abajo dice
  // la verdad una sola vez.
  const warningFor = (block) => {
    if (categoriesFailed) {
      return null;
    }
    if (block.type !== "category") {
      return null;
    }
    if (categoryLabels.has(block.data.categoryId)) {
      return null;
    }
    return t("categoryInactiveWarning");
  };

  // El menu "Agregar" queda vacio por tres motivos distintos y el dueno
  // necesita saber cual: no hay categorias activas, ya estan todas puestas, o
  // no las pudimos leer.
  const emptyCategoriesText = () => {
    if (categoriesFailed) {
      return t("categoriesLoadFailed");
    }
    if (categoryLabels.size === 0) {
      return t("noActiveCategories");
    }
    return t("noCategoriesLeft");
  };

  const add = (type, data) => {
    onChange(addBlock(blocks, type, data));
    closeMenu();
  };

  const remove = (blockId) => {
    onChange(removeBlock(blocks, blockId));
    if (expandedId === blockId) {
      setExpandedId(null);
    }
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

        <div className="relative" ref={menuContainerRef}>
          <button
            ref={menuTriggerRef}
            type="button"
            id={menuTriggerId}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={toggleMenu}
            className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium dark:border-slate-700"
          >
            <Plus className="size-4" /> {t("addBlock")}
          </button>

          {menuOpen ? (
            <div
              id={menuId}
              role="menu"
              aria-labelledby={menuTriggerId}
              className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-[#0c1f30]"
            >
              <button
                type="button"
                role="menuitem"
                disabled={!canAddHero}
                onClick={() => add("hero")}
                className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
              >
                {t("addHero")}
              </button>
              <button
                type="button"
                role="menuitem"
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
                <p className="px-2 py-1.5 text-xs text-slate-400">{emptyCategoriesText()}</p>
              ) : (
                availableCategoryRows.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    role="menuitem"
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

      {categoriesFailed ? (
        <p
          role="status"
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-400"
        >
          {t("categoriesLoadFailed")}
        </p>
      ) : null}

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
                  warning={warningFor(block)}
                  expanded={expandedId === block.id}
                  onToggleExpand={() => setExpandedId(expandedId === block.id ? null : block.id)}
                  onPatch={(patch) => onChange(updateBlockData(blocks, block.id, patch))}
                  onToggleVisible={() => onChange(toggleBlockVisibility(blocks, block.id))}
                  onRemove={() => remove(block.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
