"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Lock,
  Store,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const params = useParams();
  const locale = String(params?.locale ?? "");
  const [formData, setFormData] = useState({
    name: "",
    plan: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };


  useEffect(() => {
    let isMounted = true;

    const loadPlans = async () => {
      try {
        setPlansLoading(true);
        const response = await fetch('/api/master/plans');
        const data = await response.json().catch(() => []);

        if (!response.ok || !Array.isArray(data)) {
          throw new Error('Unable to load available plans.');
        }

        if (!isMounted) return;

        setPlans(data);
        setFormData((prev) => ({
          ...prev,
          plan: prev.plan || data?.[0]?.slug || '',
        }));
      } catch (fetchError) {
        if (!isMounted) return;
        setError(fetchError.message || 'Unable to load available plans.');
      } finally {
        if (isMounted) {
          setPlansLoading(false);
        }
      }
    };

    loadPlans();

    return () => {
      isMounted = false;
    };
  }, []);


  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.name) {
      setError("Company name is required.");
      return;
    }

    if (!formData.adminEmail || !formData.adminPassword) {
      setError("Admin email and password are required.");
      return;
    }

    if (!emailRegex.test(formData.adminEmail)) {
      setError("Please enter a valid admin email.");
      return;
    }

    if (formData.adminPassword.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (!formData.plan) {
      setError("Please select a valid plan.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: formData.name.trim(),
        plan: formData.plan,
        adminEmail: formData.adminEmail.trim().toLowerCase(),
        adminPassword: formData.adminPassword,
      };

      const response = await fetch("/api/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message || data.error || "Unable to register tenant. Please try again.");
        return;
      }

      setSuccess("Tenant registered successfully. Redirecting to login...");
      router.push(`/${locale}/login`);
    } catch {
      setError("Unexpected error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[#061426] dark:text-slate-100">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-[#061426]/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500 p-2">
              <Store className="size-5" />
            </div>
            <h2 className="text-2xl font-bold">RestoPOS <span className="text-blue-500">Admin</span></h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden gap-8 text-sm font-medium text-slate-600 dark:text-slate-300 md:flex">
              <a className="hover:text-blue-400" href="#">Support</a>
              <a className="hover:text-blue-400" href="#">Documentation</a>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl items-center justify-center px-6 py-10 lg:py-14">
        <div className="grid w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0c1f30] md:grid-cols-[320px_1fr]">
          <aside className="border-b border-slate-200 bg-slate-50 p-8 dark:border-slate-800 dark:bg-[#10283f] md:border-b-0 md:border-r">
            <h1 className="mb-4 text-5xl font-black leading-tight">Set Up Your Business</h1>
            <p className="mb-8 text-lg leading-relaxed text-slate-300">
              Join thousands of restaurants already optimizing operations with our leading POS platform.
            </p>
            <ul className="space-y-4 text-xl">
              {[
                "Real-time inventory management",
                "Custom digital menu and QR",
                "Advanced sales reporting",
              ].map((item) => (
                <li className="flex items-start gap-3" key={item}>
                  <CheckCircle2 className="mt-0.5 size-5 text-blue-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-10 h-56 rounded-xl bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuC2mRoMe6AKnmdKvTuH5qC3aVgp-KMQeQroi1yfJ1eOkoVH2_zhVdvgBIOidIgTXnAH1oQRtNUALfSNR0n1a39TpId5dNeZATcDuB-UtfSpQEd2VzoAPcr8uXFRJ3j9lIE_975hogsER72TPkYRlkDidWLcIgs2Vg8iZ6xGroDg5qGEJ40-mm50MsKJXWoJd1ePKUHqi0cXyzsqrqpGGrkvDbWeyo79RUl4rOzlQSfZ6mbzS4glgeKgISv_f52optvWrQePdoqhqRjv')] bg-cover bg-center" />
          </aside>

          <section className="max-h-[85vh] overflow-y-auto p-8 lg:p-10">
            <form className="space-y-8" onSubmit={handleSubmit}>
              <div>
                <div className="mb-6 flex items-center gap-2">
                  <Store className="size-5 text-blue-500" />
                  <h3 className="text-3xl font-bold">Restaurant Details</h3>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-lg font-semibold text-slate-700 dark:text-slate-200" htmlFor="name">Restaurant Name</label>
                    <input id="name" className="w-full rounded-lg border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-4 py-3 text-lg placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" placeholder="e.g. Downtown Bistro" value={formData.name} onChange={handleChange("name")} required />
                  </div>


                  <div className="space-y-2">
                    <label className="text-lg font-semibold text-slate-700 dark:text-slate-200" htmlFor="plan">Select a Plan</label>
                    <select id="plan" value={formData.plan} onChange={handleChange("plan")} className="w-full rounded-lg border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-4 py-3 text-lg focus:border-blue-500 focus:outline-none" disabled={plansLoading || plans.length === 0}>
                      {plansLoading ? (
                        <option value="">Loading plans...</option>
                      ) : null}
                      {!plansLoading && plans.length === 0 ? (
                        <option value="">No plans available</option>
                      ) : null}
                      {!plansLoading ? plans.map((plan) => (
                        <option key={plan.slug} value={plan.slug}>
                          {plan.name} - ${plan.priceMonthly}/month
                        </option>
                      )) : null}
                    </select>
                    {plansLoading ? <p className="text-sm text-slate-400">Loading plans...</p> : null}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-8">
                <div className="mb-6 flex items-center gap-2">
                  <Lock className="size-5 text-blue-500" />
                  <h3 className="text-3xl font-bold">Admin Credentials</h3>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-lg font-semibold text-slate-700 dark:text-slate-200" htmlFor="adminEmail">Admin Email</label>
                    <div className="relative">
                      <input id="adminEmail" type="email" className="w-full rounded-lg border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 py-3 px-4 text-lg placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" placeholder="admin@company.com" value={formData.adminEmail} onChange={handleChange("adminEmail")} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-lg font-semibold text-slate-700 dark:text-slate-200" htmlFor="adminPassword">Admin Password</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                      <input id="adminPassword" type="password" className="w-full rounded-lg border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 py-3 pl-10 pr-4 text-lg placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" placeholder="••••••••" value={formData.adminPassword} onChange={handleChange("adminPassword")} required minLength={8} />
                    </div>
                  </div>
                </div>
              </div>

              {error ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300">{error}</div> : null}
              {success ? <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-300">{success}</div> : null}

              <div className="space-y-3 pt-2">
                <button type="submit" disabled={loading || plansLoading || !formData.plan} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 py-4 text-lg font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-600 disabled:opacity-60">
                  <span>{loading ? "Registering..." : "Register Restaurant"}</span>
                  <ArrowRight className="size-5" />
                </button>
                <div className="text-center">
                  <Link className="text-sm font-medium text-slate-400 hover:text-blue-400" href={`/${locale}/login`}>
                    Back to Login
                  </Link>
                </div>
              </div>
            </form>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200 px-6 py-6 text-center text-xs text-slate-500 dark:border-slate-800">
        © 2024 RestoPOS System. All rights reserved. |
        <a className="ml-1 underline decoration-blue-500/30 hover:text-blue-400" href="#">Terms of Service</a>
      </footer>
    </div>
  );
}
