"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Building2, ChevronRight, Loader2, Plus, Store, Users } from "lucide-react";
import { getAssignableRoles } from "@/lib/auth/roles";
import { resolveLandingPath } from "@/lib/auth/landing";
import { ThemeToggle } from "@/components/theme-toggle";
import { PriceTag } from "@/components/price-tag";
import { usePlanLabels } from "@/components/plan-i18n";
import { useAuthStore } from "../../../../store/authStore";

function SubscriptionPanel({ onFeatureActivated }) {
  const t = useTranslations("AdminPanel");
  const tPlans = useTranslations("Plans");
  const { planName, planDescription, featureName, featureDescription } = usePlanLabels();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/company/subscription");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error || t("loadError"));
        return;
      }
      setData(body);
      setError("");
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const activate = async (key) => {
    setActivating(key);
    setError("");
    try {
      const res = await fetch("/api/company/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error || t("activateError"));
        return;
      }
      await load();
      onFeatureActivated?.();
    } finally {
      setActivating("");
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Loader2 className="size-4 animate-spin" /> {t("loading")}
      </div>
    );
  }

  if (!data) {
    return error ? (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
        {error}
      </div>
    ) : null;
  }

  const { plan, breakdown, features, availableFeatures } = data;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1f30]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {tPlans("currentPlan")}
          </p>
          <p className="text-lg font-semibold">{planName(plan?.slug, plan?.name)}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {planDescription(plan?.slug, plan?.description)}
          </p>
        </div>
        <div className="text-right">
          <PriceTag
            original={breakdown.originalTotal}
            final={breakdown.finalTotal}
            suffix={tPlans("perMonthShort")}
            className="text-xl font-bold"
            emphasis
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {tPlans("branchCountLabel", { count: data.branchCount })}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {features.map((key) => (
          <span
            key={key}
            className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400"
          >
            {featureName(key)}
          </span>
        ))}
      </div>

      {availableFeatures.length ? (
        <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {tPlans("addOns")}
          </p>
          <ul className="space-y-2">
            {availableFeatures.map((item) => (
              <li
                key={item.key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
              >
                <div>
                  <p className="text-sm font-medium">{featureName(item.key)}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {featureDescription(item.key)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <PriceTag
                    original={item.monthlyPrice}
                    final={item.monthlyPrice}
                    suffix={tPlans("perMonthShort")}
                    className="text-sm font-semibold"
                  />
                  <button
                    type="button"
                    disabled={!item.available || activating === item.key}
                    onClick={() => activate(item.key)}
                    className="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
                  >
                    {activating === item.key ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    {activating === item.key ? tPlans("activating") : tPlans("activate")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
    </div>
  );
}

function SedeCard({ sede, locale, companyId, onEnter }) {
  const t = useTranslations("AdminPanel");
  const tMenu = useTranslations("OnlineMenu");
  const [expanded, setExpanded] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "CASHIER" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [count, setCount] = useState(sede.userCount ?? 0);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setError("");
    try {
      const res = await fetch(`/api/company/sedes/${sede.tenantId}/users`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const list = Array.isArray(data.users) ? data.users : [];
        setUsers(list);
        setCount(list.length);
      }
    } finally {
      setLoadingUsers(false);
    }
  }, [sede.tenantId]);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && users.length === 0) {
      loadUsers();
    }
  };

  const handleField = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.username || !form.email || form.password.length < 6) {
      setError(t("invalidForm"));
      return;
    }
    try {
      setCreating(true);
      const res = await fetch(`/api/company/sedes/${sede.tenantId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || t("createError"));
        return;
      }
      setForm({ username: "", email: "", password: "", role: "CASHIER" });
      await loadUsers();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0c1f30]">
      <div className="flex items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
            <Store className="size-5" />
          </div>
          <div>
            <p className="text-lg font-semibold">{sede.sedeLabel || sede.name}</p>
            <p className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
              <Users className="size-3.5" /> {t("userCount", { count })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sede.features?.includes("online-menu") ? (
            <Link
              href={`/${locale}/admin/${companyId}/menu/${sede.tenantId}`}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium transition hover:border-blue-500 dark:border-slate-700"
            >
              {tMenu("title")}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={toggle}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium transition hover:border-blue-500 dark:border-slate-700"
          >
            {t("manageUsers")}
          </button>
          <button
            type="button"
            onClick={() => onEnter(sede.tenantId)}
            className="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
          >
            {t("enterSede")} <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-slate-200 p-5 dark:border-slate-800">
          <div className="mb-4">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {t("usersTitle")}
            </p>
            {loadingUsers ? (
              <p className="text-sm text-slate-400">{t("loading")}</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-slate-400">{t("noUsers")}</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                {users.map((u) => (
                  <li key={u._id || u.email} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{u.username} <span className="text-slate-400">· {u.email}</span></span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {u.role}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
            <p className="sm:col-span-2 flex items-center gap-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <Plus className="size-4" /> {t("newUser")}
            </p>
            <input
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
              placeholder={t("username")}
              value={form.username}
              onChange={handleField("username")}
            />
            <input
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
              placeholder={t("email")}
              value={form.email}
              onChange={handleField("email")}
            />
            <input
              type="password"
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
              placeholder={t("password")}
              value={form.password}
              onChange={handleField("password")}
            />
            <select
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
              value={form.role}
              onChange={handleField("role")}
            >
              {getAssignableRoles(sede.features).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {error ? (
              <p className="sm:col-span-2 text-sm text-red-500">{error}</p>
            ) : null}
            <button
              type="submit"
              disabled={creating}
              className="sm:col-span-2 flex items-center justify-center gap-2 rounded-lg bg-blue-500 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
            >
              {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {t("createUser")}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminPanelPage() {
  const t = useTranslations("AdminPanel");
  const router = useRouter();
  const params = useParams();
  const locale = String(params?.locale ?? "");

  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isOwner = useAuthStore((state) => state.isOwner);
  const user = useAuthStore((state) => state.user);
  const companyId = useAuthStore((state) => state.companyId);
  const loginSuccess = useAuthStore((state) => state.loginSuccess);

  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Se recarga tambien tras activar un feature: las sedes traen su lista de
  // entitlements, que decide que roles se pueden crear en cada una.
  const reloadSedes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/company/sedes");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || t("loadError"));
        return;
      }
      setSedes(Array.isArray(data.sedes) ? data.sedes : []);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isOwner) {
      router.replace(`/${locale}/login`);
      return;
    }

    let mounted = true;
    (async () => {
      const res = await fetch("/api/company/sedes");
      const data = await res.json().catch(() => ({}));
      if (!mounted) return;
      if (!res.ok) {
        setError(data?.error || t("loadError"));
      } else {
        setSedes(Array.isArray(data.sedes) ? data.sedes : []);
      }
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [hasHydrated, isOwner, locale, router, t]);

  const enterSede = async (tenantId) => {
    try {
      const res = await fetch("/api/auth/switch-sede", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      loginSuccess({
        token: data.token ?? null,
        user: data.user ?? null,
        tenant: data.tenant ?? null,
        tenantId: data.tenantId,
        companyId: data.companyId,
        kind: data.kind,
        availableSedes: data.availableSedes ?? [],
        features: data.features ?? [],
        navMain: data.navMain ?? [],
      });

      // El aterrizaje depende del plan: con Basic no existe /dashboard y el
      // middleware devolveria al panel en un bucle.
      const landing = resolveLandingPath({
        locale,
        tenantId,
        navMain: data.navMain,
        role: data.user?.role,
      });
      router.push(landing ?? `/${locale}/admin/${data.companyId}`);
    } catch {
      // reintentar
    }
  };

  if (!hasHydrated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#061426] dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-[#061426]/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500 p-2 text-white">
              <Building2 className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{t("title")}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8">
          <SubscriptionPanel onFeatureActivated={reloadSedes} />
        </div>

        <div className="mb-6 flex items-center gap-2">
          <Store className="size-5 text-blue-500" />
          <h2 className="text-2xl font-bold">{t("sedesTitle")}</h2>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="size-4 animate-spin" /> {t("loading")}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
            {error}
          </div>
        ) : sedes.length === 0 ? (
          <p className="text-slate-400">{t("noSedes")}</p>
        ) : (
          <div className="space-y-4">
            {sedes.map((sede) => (
              <SedeCard key={sede.tenantId} sede={sede} locale={locale} companyId={companyId} onEnter={enterSede} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
