"use client";

import { useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";

const SUPPORTED_LOCALES = ["es", "en"];
const LOCALE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;

const buildLocalizedPath = (pathname = "/", currentLocale = "", nextLocale = "") => {
  const safePath = pathname || "/";
  const parts = safePath.split("/").filter(Boolean);

  if (parts.length && LOCALE_PATTERN.test(parts[0])) {
    parts[0] = nextLocale;
    return `/${parts.join("/")}`;
  }

  if (currentLocale) {
    return safePath.replace(`/${currentLocale}`, `/${nextLocale}`);
  }

  return `/${nextLocale}${safePath === "/" ? "" : safePath}`;
};

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const currentLocale = useMemo(
    () => String(params?.locale || "es").toLowerCase(),
    [params]
  );
  const [isSaving, setIsSaving] = useState(false);

  const onSwitch = async (nextLocale) => {
    if (!nextLocale || nextLocale === currentLocale || isSaving) {
      return;
    }

    const nextPath = buildLocalizedPath(pathname, currentLocale, nextLocale);

    try {
      setIsSaving(true);

      if (user?.id && token) {
        await fetch(`/api/users/${user.id}/language`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ language: nextLocale }),
        });

        useAuthStore.setState((state) => ({
          user: state.user ? { ...state.user, language: nextLocale } : state.user,
        }));
      }
    } catch (error) {
      console.error("Failed to persist language", error);
    } finally {
      setIsSaving(false);
      router.replace(nextPath);
    }
  };

  return (
    <div className="flex items-center gap-1 text-xs font-medium">
      {SUPPORTED_LOCALES.map((locale) => {
        const isActive = currentLocale === locale;

        return (
          <button
            key={locale}
            type="button"
            disabled={isSaving}
            onClick={() => onSwitch(locale)}
            className={`rounded px-2 py-1 transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            aria-pressed={isActive}
          >
            {locale.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
