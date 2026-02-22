"use client";

import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";

export default function Providers({ children }) {
  const hydrate = useAuthStore((state) => state.hydrate);
  const { initializeTheme } = useThemeStore();

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return children;
}
