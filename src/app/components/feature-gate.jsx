"use client";

import { useAuthStore } from "../../store/authStore";
import { hasFeature } from "@/lib/features/featureRegistry";

/**
 * Indica si la cuenta tiene contratado un feature.
 *
 * Solo para presentacion: sirve para no mostrar UI de un modulo que el cliente
 * no compro. El acceso real lo deciden el middleware (paginas) y
 * requireModuleAccess (API), que leen Tenant.features desde la DB.
 */
export function useFeature(key) {
  const features = useAuthStore((state) => state.features);
  return hasFeature(features, key);
}

export function FeatureGate({ feature, children, fallback = null }) {
  const enabled = useFeature(feature);
  return enabled ? children : fallback;
}
