"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  CloudUpload,
  KeyRound,
  Lock,
  Store,
  User,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";

const slugRegex = /^[a-z0-9-]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const loginSuccess = useAuthStore((state) => state.loginSuccess);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    plan: "pro",
    logo: null,
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setFormData((prev) => ({ ...prev, logo: null }));
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("El logo debe ser un PNG, JPG o WEBP.");
      event.target.value = "";
      setFormData((prev) => ({ ...prev, logo: null }));
      return;
    }

    setFormData((prev) => ({ ...prev, logo: file }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.name || !formData.slug) {
      setError("Completa el nombre y el slug para continuar.");
      return;
    }

    if (!slugRegex.test(formData.slug)) {
      setError("El slug solo puede contener minúsculas, números y guiones.");
      return;
    }

    try {
      setLoading(true);
      const payload = new FormData();
      payload.append("name", formData.name);
      payload.append("slug", formData.slug);
      payload.append("plan", formData.plan || "basic");
      if (formData.logo) {
        payload.append("logo", formData.logo);
      }

      const response = await fetch("http://localhost:3000/api/tenants", {
        method: "POST",
        body: payload,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message || data.error || "No pudimos crear el tenant. Intenta otra vez.");
        return;
      }

      loginSuccess({
        tenant: data.tenant ?? {
          name: formData.name,
          slug: formData.slug,
          plan: formData.plan || "basic",
        },
        token: data.token ?? null,
        user: data.user ?? null,
      });

      if (data.token) {
        router.push("/home");
        return;
      }

      setSuccess("Tenant creado correctamente. Ya puedes iniciar sesión.");
    } catch {
      setError("Ocurrió un error inesperado. Intenta más tarde.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1320] text-slate-100">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#09111d]/90 backdrop-blur px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500 p-2">
              <Store className="size-5" />
            </div>
            <h2 className="text-2xl font-bold">RestoPOS <span className="text-blue-500">Admin</span></h2>
          </div>
          <div className="flex gap-8 text-sm font-medium text-slate-300">
            <a className="hover:text-blue-400" href="#">Soporte</a>
            <a className="hover:text-blue-400" href="#">Documentación</a>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl items-center justify-center px-6 py-10 lg:py-14">
        <div className="grid w-full overflow-hidden rounded-2xl border border-slate-800 bg-[#132232] shadow-2xl md:grid-cols-[320px_1fr]">
          <aside className="border-b border-slate-800 bg-[#17304b] p-8 md:border-b-0 md:border-r">
            <h1 className="mb-4 text-5xl font-black leading-tight">Configura tu Negocio</h1>
            <p className="mb-8 text-lg leading-relaxed text-slate-300">
              Únete a miles de restaurantes que ya optimizan sus operaciones con nuestra plataforma POS líder en el mercado.
            </p>
            <ul className="space-y-4 text-xl">
              {[
                "Gestión de inventario en tiempo real",
                "Menú digital y QR personalizable",
                "Reportes avanzados de ventas",
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
                  <h3 className="text-3xl font-bold">Detalles del Restaurante</h3>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-lg font-semibold text-slate-200" htmlFor="name">Nombre del Restaurante</label>
                    <input id="name" className="w-full rounded-lg border border-slate-700 bg-[#0f2032] px-4 py-3 text-lg placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" placeholder="Ej. La Parrilla de Alberto" value={formData.name} onChange={handleChange("name")} required />
                  </div>

                  <div className="space-y-2">
                    <label className="text-lg font-semibold text-slate-200" htmlFor="slug">Slug / URL única</label>
                    <div className="flex">
                      <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-700 bg-slate-800 px-4 text-slate-400">restopos.com/</span>
                      <input id="slug" className="flex-1 rounded-r-lg border border-slate-700 bg-[#0f2032] px-4 py-3 text-lg placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" placeholder="mi-restaurante" value={formData.slug} onChange={handleChange("slug")} required />
                    </div>
                    <p className="text-sm text-slate-400">Esta será la dirección pública de tu menú digital.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-lg font-semibold text-slate-200" htmlFor="logo">Logo del Restaurante</label>
                    <label className="group flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-600 bg-[#0f2032] p-8 text-center hover:bg-[#13273d]" htmlFor="logo">
                      <CloudUpload className="mb-2 size-10 text-slate-400 group-hover:text-blue-400" />
                      <p className="text-slate-400">Arrastra tu logo aquí o <span className="font-semibold text-blue-400">haz clic para subir</span></p>
                      <p className="mt-1 text-sm text-slate-500">PNG, JPG hasta 5MB</p>
                      {formData.logo ? <p className="mt-2 text-sm text-emerald-400">Seleccionado: {formData.logo.name}</p> : null}
                    </label>
                    <input id="logo" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoChange} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-lg font-semibold text-slate-200" htmlFor="plan">Selecciona tu Plan</label>
                    <select id="plan" value={formData.plan} onChange={handleChange("plan")} className="w-full rounded-lg border border-slate-700 bg-[#0f2032] px-4 py-3 text-lg focus:border-blue-500 focus:outline-none">
                      <option value="basic">Básico - $29/mes (Hasta 50 pedidos/día)</option>
                      <option value="pro">Profesional - $79/mes (Ilimitado + Reportes)</option>
                      <option value="enterprise">Empresarial - Contactar ventas</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-8">
                <div className="mb-6 flex items-center gap-2">
                  <Lock className="size-5 text-blue-500" />
                  <h3 className="text-3xl font-bold">Credenciales de Usuario</h3>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-lg font-semibold text-slate-200" htmlFor="username">Usuario</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                      <input id="username" className="w-full rounded-lg border border-slate-700 bg-[#0f2032] py-3 pl-10 pr-4 text-lg placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" placeholder="nombre_usuario" value={formData.username} onChange={handleChange("username")} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-lg font-semibold text-slate-200" htmlFor="password">Contraseña</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                      <input id="password" type="password" className="w-full rounded-lg border border-slate-700 bg-[#0f2032] py-3 pl-10 pr-4 text-lg placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" placeholder="••••••••" value={formData.password} onChange={handleChange("password")} />
                    </div>
                  </div>
                </div>
              </div>

              {error ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div> : null}
              {success ? <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{success}</div> : null}

              <div className="space-y-3 pt-2">
                <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 py-4 text-lg font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-600 disabled:opacity-60">
                  <span>{loading ? "Registrando..." : "Registrar Restaurante"}</span>
                  <ArrowRight className="size-5" />
                </button>
                <div className="text-center">
                  <Link className="text-sm font-medium text-slate-400 hover:text-blue-400" href="/login">
                    Regresar al Login
                  </Link>
                </div>
              </div>
            </form>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-800 px-6 py-6 text-center text-xs text-slate-500">
        © 2024 RestoPOS System. Todos los derechos reservados. |
        <a className="ml-1 underline decoration-blue-500/30 hover:text-blue-400" href="#">Términos de Servicio</a>
      </footer>
    </div>
  );
}
