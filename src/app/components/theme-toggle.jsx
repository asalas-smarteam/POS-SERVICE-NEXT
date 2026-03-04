"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "../../store/themeStore";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === "dark";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label="Switch Theme"
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
          <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">Switch Theme</TooltipContent>
    </Tooltip>
  );
}
