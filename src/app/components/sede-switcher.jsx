"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import { resolveLandingPath } from "@/lib/auth/landing";
import { useAuthStore } from "../../store/authStore";

const PANEL_VALUE = "__panel__";

// Selector visible solo para el dueño: permite saltar entre el panel
// administrativo y cada sede reemitiendo el token via /api/auth/switch-sede.
export function SedeSwitcher() {
  const t = useTranslations("Navigation");
  const router = useRouter();
  const params = useParams();
  const locale = String(params?.locale ?? "");

  const isOwner = useAuthStore((state) => state.isOwner);
  const availableSedes = useAuthStore((state) => state.availableSedes);
  const tenantId = useAuthStore((state) => state.tenantId);
  const companyId = useAuthStore((state) => state.companyId);
  const loginSuccess = useAuthStore((state) => state.loginSuccess);

  const [switching, setSwitching] = useState(false);

  if (!isOwner) {
    return null;
  }

  const sedes = Array.isArray(availableSedes) ? availableSedes : [];
  // La sede visible se toma de la URL (que el middleware garantiza igual al
  // token/cookie), no del store, que puede quedar viejo tras cambiar de sesion.
  const urlTenantId = String(params?.tenantId ?? "");
  const current = urlTenantId || (tenantId ? String(tenantId) : PANEL_VALUE);

  const handleChange = async (event) => {
    const value = event.target.value;
    const body = value === PANEL_VALUE ? { tenantId: null } : { tenantId: value };

    try {
      setSwitching(true);
      const res = await fetch("/api/auth/switch-sede", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return;
      }

      loginSuccess({
        token: data.token ?? null,
        user: data.user ?? null,
        tenant: data.tenant ?? null,
        tenantId: data.tenantId,
        companyId: data.companyId,
        kind: data.kind,
        availableSedes: data.availableSedes ?? sedes,
        features: data.features ?? [],
        navMain: data.navMain ?? [],
      });

      const panelPath = `/${locale}/admin/${data.companyId ?? companyId}`;

      if (value === PANEL_VALUE) {
        router.push(panelPath);
      } else {
        // El destino sale del nav ya filtrado por plan: /dashboard no existe en
        // todos los planes.
        const landing = resolveLandingPath({
          locale,
          tenantId: value,
          navMain: data.navMain,
          role: data.user?.role,
        });
        router.push(landing ?? panelPath);
      }
    } catch {
      // silencioso: el usuario puede reintentar
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <Building2 className="size-4 text-muted-foreground" />
      <select
        value={current}
        onChange={handleChange}
        disabled={switching}
        aria-label={t("sedeSelector")}
        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      >
        <option value={PANEL_VALUE}>{t("adminPanel")}</option>
        {sedes.map((sede) => (
          <option key={sede.tenantId} value={sede.tenantId}>
            {sede.sedeLabel || sede.name}
          </option>
        ))}
      </select>
    </div>
  );
}
