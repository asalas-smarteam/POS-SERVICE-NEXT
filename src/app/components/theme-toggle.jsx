"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useThemeStore } from "../../store/themeStore";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className = "" }) {
  const t = useTranslations("ThemeToggle");
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === "dark";

  // Sin tooltip a proposito: el boton ya muestra su etiqueta y, al abrir el
  // menu movil, Radix Dialog enfoca el primer elemento tabulable que no sea un
  // enlace (todos los items de navegacion lo son), es decir este boton. Un
  // Tooltip de Radix se abre al recibir foco, asi que aparecia "Cambiar tema"
  // cada vez que se abria el menu.
  return (
    <Button
      aria-label={t("switchTheme")}
      title={t("switchTheme")}
      className={`h-10 rounded-lg border px-3 text-sm font-semibold transition-all duration-300 ${
        isDark
          ? "border-slate-700 bg-[#0c1f30] text-slate-100 hover:bg-[#10283f]"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
      } ${className}`.trim()}
      onClick={toggleTheme}
      size="sm"
      type="button"
      variant="outline"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      <span>{isDark ? t("lightMode") : t("darkMode")}</span>
    </Button>
  );
}
