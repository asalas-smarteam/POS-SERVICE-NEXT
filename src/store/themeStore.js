"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "pos-theme";
let currentTheme = "light";
const listeners = new Set();

const getSystemTheme = () => {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const applyThemeClass = (theme) => {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.setAttribute("data-theme", theme);
};

const notify = () => {
  listeners.forEach((listener) => listener(currentTheme));
};

const setTheme = (theme) => {
  if (theme !== "light" && theme !== "dark") {
    return;
  }

  currentTheme = theme;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, theme);
  }

  applyThemeClass(theme);
  notify();
};

const initializeTheme = () => {
  if (typeof window === "undefined") {
    return;
  }

  const savedTheme = window.localStorage.getItem(STORAGE_KEY);
  const theme = savedTheme === "light" || savedTheme === "dark"
    ? savedTheme
    : getSystemTheme();

  currentTheme = theme;
  applyThemeClass(theme);
  notify();
};

const toggleTheme = () => {
  setTheme(currentTheme === "dark" ? "light" : "dark");
};

export const themeStore = {
  getTheme: () => currentTheme,
  initializeTheme,
  setTheme,
  toggleTheme,
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useThemeStore() {
  const [theme, setThemeState] = useState(themeStore.getTheme());

  useEffect(() => themeStore.subscribe(setThemeState), []);

  return {
    theme,
    initializeTheme: themeStore.initializeTheme,
    setTheme: themeStore.setTheme,
    toggleTheme: themeStore.toggleTheme,
  };
}
