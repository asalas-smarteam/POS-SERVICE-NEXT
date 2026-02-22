"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  User,
  UtensilsCrossed,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";

const slugRegex = /^[a-z0-9-]+$/;

const getFirstAllowedRoute = (navMain = []) => {
  const first = Array.isArray(navMain) ? navMain.find((item) => item?.href || item?.url) : null;
  return first?.href || first?.url || "/home";
};

const heroImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA53l-iE5HbCn9_s53LaqVLy5tz849IyFF0w6vlCaym5ZM_tGfpQTVEcpz-PYKKIwZ9VifMn5rU9Wv5mn3HuPet1Iv-99J-vvpqRzVzmnqb5VokP3vPGHBPt-n-TsN4-VpzRxDGgkbsdOKcGtxdMYQziN8KxMErti-yujhlaKTmWj92f48jsGXwwiAAhB9AV_jiEeycqg97e1sno33oxFvHAptPK1vFmgM2yl6VS_uxu1ovd7t7YFVKzpJOjfL_T-0KEtYHjvEx7IAH";

export default function LoginPage() {
  const router = useRouter();
  const loginSuccess = useAuthStore((state) => state.loginSuccess);
  const tenant = useAuthStore((state) => state.tenant);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    tenantSlug: "",
    remember: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (event) => {
    const value =
      field === "remember" ? event.target.checked : event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.username || !formData.password) {
      setError("Por favor ingresa usuario y contraseña.");
      return;
    }

    const resolvedTenantSlug = tenant?.slug || formData.tenantSlug.trim();

    if (!resolvedTenantSlug) {
      setError(
        "Ingresa el slug del tenant para continuar con el inicio de sesión."
      );
      return;
    }

    if (!slugRegex.test(resolvedTenantSlug)) {
      setError("El slug solo puede contener minúsculas, números y guiones.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant": resolvedTenantSlug,
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          data.message ||
            data.error ||
            "No pudimos iniciar sesión. Intenta otra vez."
        );
        return;
      }

      loginSuccess({
        token: data.token,
        user: data.user,
        navMain: data.navMain,
        tenant: data.tenant ?? {
          ...tenant,
          slug: resolvedTenantSlug,
        },
      });

      router.push(getFirstAllowedRoute(data.navMain));
    } catch {
      setError("Ocurrió un error inesperado. Intenta más tarde.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1726] text-slate-100">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        <section className="relative hidden items-end overflow-hidden p-12 lg:flex lg:w-1/2 xl:w-3/5">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0b1726] via-[#0b1726]/45 to-transparent" />
            <div
              aria-label="Interior de un restaurante moderno"
              className="h-full w-full scale-105 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${heroImage})` }}
            />
          </div>

          <div className="relative z-20 max-w-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#137fec] p-2">
                <UtensilsCrossed className="size-7 text-white" />
              </div>
              <span className="text-3xl font-black uppercase tracking-tight text-white">
                GastroPOS
              </span>
            </div>

            <h1 className="text-5xl leading-tight font-black tracking-tight text-white">
              La inteligencia detrás de <span className="text-[#137fec]">tu cocina.</span>
            </h1>
            <p className="text-xl text-slate-300">
              Optimice sus operaciones, gestione pedidos en tiempo real y aumente la
              satisfacción de sus clientes con nuestra plataforma líder.
            </p>
          </div>
        </section>

        <section className="flex flex-1 items-center justify-center bg-[#0f1b2a] px-6 py-12 lg:px-20">
          <div className="w-full max-w-md space-y-8">
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <div className="rounded-lg bg-[#137fec] p-2">
                <UtensilsCrossed className="size-6 text-white" />
              </div>
              <span className="text-xl font-black uppercase tracking-tight text-white">
                GastroPOS
              </span>
            </div>

            <div className="text-center lg:text-left">
              <h2 className="text-4xl font-black tracking-tight text-white">
                Acceso al Sistema POS
              </h2>
              <p className="mt-3 text-lg text-slate-400">
                Bienvenido de nuevo. Por favor, ingrese sus credenciales.
              </p>
            </div>

            <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label
                    className="ml-1 text-sm font-semibold text-slate-300"
                    htmlFor="username"
                  >
                    Usuario
                  </label>
                  <div className="group relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <User className="size-5 text-slate-400 transition-colors group-focus-within:text-[#137fec]" />
                    </div>
                    <input
                      className="block w-full rounded-xl border border-slate-800 bg-[#0b1624] py-4 pr-4 pl-11 text-slate-100 placeholder:text-slate-500 outline-none transition-all focus:border-[#137fec] focus:ring-2 focus:ring-[#137fec]/20"
                      id="username"
                      name="username"
                      placeholder="nombre_usuario"
                      required
                      type="text"
                      value={formData.username}
                      onChange={handleChange("username")}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label
                      className="ml-1 text-sm font-semibold text-slate-300"
                      htmlFor="password"
                    >
                      Contraseña
                    </label>
                    <button
                      className="text-xs font-medium text-[#137fec] hover:underline"
                      type="button"
                    >
                      ¿Olvidó su contraseña?
                    </button>
                  </div>
                  <div className="group relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Lock className="size-5 text-slate-400 transition-colors group-focus-within:text-[#137fec]" />
                    </div>
                    <input
                      className="block w-full rounded-xl border border-slate-800 bg-[#0b1624] py-4 pr-12 pl-11 text-slate-100 placeholder:text-slate-500 outline-none transition-all focus:border-[#137fec] focus:ring-2 focus:ring-[#137fec]/20"
                      id="password"
                      name="password"
                      placeholder="••••••••"
                      required
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange("password")}
                    />
                    <button
                      aria-label={
                        showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                      }
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition-colors hover:text-slate-200"
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                </div>

                {!tenant?.slug ? (
                  <div className="flex flex-col gap-2">
                    <label
                      className="ml-1 text-sm font-semibold text-slate-300"
                      htmlFor="tenantSlug"
                    >
                      Slug del tenant
                    </label>
                    <input
                      className="block w-full rounded-xl border border-slate-800 bg-[#0b1624] px-4 py-4 text-slate-100 placeholder:text-slate-500 outline-none transition-all focus:border-[#137fec] focus:ring-2 focus:ring-[#137fec]/20"
                      id="tenantSlug"
                      name="tenantSlug"
                      placeholder="mirestaurante"
                      required
                      value={formData.tenantSlug}
                      onChange={handleChange("tenantSlug")}
                    />
                  </div>
                ) : null}
              </div>

              {error ? (
                <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                <input
                  checked={formData.remember}
                  className="h-4 w-4 rounded border-slate-700 bg-[#0b1624] text-[#137fec] focus:ring-[#137fec]/20"
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  onChange={handleChange("remember")}
                />
                <label className="text-sm text-slate-400" htmlFor="remember-me">
                  Recordar sesión en este equipo
                </label>
              </div>

              <div>
                <button
                  aria-busy={loading}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#137fec] px-6 py-4 text-base font-bold text-white shadow-lg shadow-[#137fec]/20 transition-all hover:bg-[#137fec]/90 focus:ring-2 focus:ring-[#137fec] focus:ring-offset-2 focus:ring-offset-[#0f1b2a] focus:outline-none"
                  disabled={loading}
                  type="submit"
                >
                  <span>{loading ? "Ingresando..." : "Iniciar Sesión"}</span>
                  <LogIn className="size-5" />
                </button>
              </div>
            </form>

            <div className="mt-10">
              <div className="relative">
                <div aria-hidden="true" className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-sm font-medium">
                  <span className="bg-[#0f1b2a] px-4 text-slate-500">¿Nuevo en GastroPOS?</span>
                </div>
              </div>
              <div className="mt-6 text-center">
                <Link
                  className="inline-flex items-center gap-2 font-bold text-[#137fec] transition-colors hover:text-[#137fec]/80"
                  href="/register"
                >
                  <span>Registrar nuevo restaurante</span>
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>

            <footer className="pt-10 text-center">
              <p className="text-xs text-slate-600">
                © 2024 GastroPOS Systems Inc.
                <span className="mx-2">•</span>
                <button className="hover:text-slate-400" type="button">
                  Privacidad
                </button>
                <span className="mx-2">•</span>
                <button className="hover:text-slate-400" type="button">
                  Términos
                </button>
              </p>
            </footer>
          </div>
        </section>
      </div>
    </div>
  );
}
