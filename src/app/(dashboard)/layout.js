"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";

const SAFE_DEFAULT_PATH = "/home";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const hasAccess = useAuthStore((state) => state.hasAccess);
  // Se usa hasAccess del store para reutilizar el cache de permisos.

  const normalizedPath = useMemo(() => {
    if (!pathname) {
      return SAFE_DEFAULT_PATH;
    }
    if (pathname === "/") {
      return "/";
    }
    return pathname.endsWith("/") && pathname !== "/"
      ? pathname.slice(0, -1)
      : pathname;
  }, [pathname]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!hasAccess(normalizedPath)) {
      if (normalizedPath !== SAFE_DEFAULT_PATH) {
        router.replace(SAFE_DEFAULT_PATH);
      }
    }
  }, [hasHydrated, isAuthenticated, hasAccess, normalizedPath, router]);

  if (!hasHydrated || !isAuthenticated) {
    return null;
  }

  if (!hasAccess(normalizedPath) && normalizedPath !== SAFE_DEFAULT_PATH) {
    return null;
  }

  return children;
}
