"use client";

import { useTranslations } from "next-intl";

/**
 * Nombres y descripciones de planes y features, resueltos por slug.
 *
 * Los planes guardan `name`/`description` en la DB, pero en ingles: sembrarlos
 * ahi hacia que el registro mostrara "Basic / Up to 50 orders per day" tambien
 * en español. La DB queda como fallback y el texto real sale de i18n.
 */
export function usePlanLabels() {
  const t = useTranslations("Plans");
  const safe = (key, fallback) => (t.has(key) ? t(key) : fallback);

  return {
    planName: (slug, fallback) => safe(`plan.${slug}.name`, fallback || slug || ""),
    planDescription: (slug, fallback) =>
      safe(`plan.${slug}.description`, fallback || ""),
    featureName: (key) => safe(`feature.${key}.name`, key),
    featureDescription: (key) => safe(`feature.${key}.description`, ""),
  };
}
