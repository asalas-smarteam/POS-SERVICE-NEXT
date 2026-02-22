"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "../../store/themeStore";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label="Switch Theme"
          className={`transition-colors duration-300 ${className}`.trim()}
          onClick={toggleTheme}
          size="icon"
          type="button"
          variant="ghost"
        >
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">Switch Theme</TooltipContent>
    </Tooltip>
  );
}
