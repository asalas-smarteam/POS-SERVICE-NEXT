"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../components/ui/select";
import { useAuthStore } from "../../store/authStore";

const slugRegex = /^[a-z0-9-]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const loginSuccess = useAuthStore((state) => state.loginSuccess);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    plan: "basic",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handlePlanChange = (value) => {
    setFormData((prev) => ({ ...prev, plan: value }));
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
      // TODO: reemplazar opciones de plan con fetch a /api/plans cuando exista.
      const response = await fetch("http://localhost:3000/api/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          plan: formData.plan || "basic",
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          data.message || data.error || "No pudimos crear el tenant. Intenta otra vez."
        );
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
    } catch (err) {
      setError("Ocurrió un error inesperado. Intenta más tarde.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ui-page">
      <Card>
        <CardHeader>
          <CardTitle>Crear tenant</CardTitle>
          <CardDescription>
            Registra tu restaurante y elige un plan inicial.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="ui-stack" onSubmit={handleSubmit}>
            <div className="ui-field">
              <Label htmlFor="name">Nombre del restaurante</Label>
              <Input
                id="name"
                placeholder="Mi Restaurante"
                value={formData.name}
                onChange={handleChange("name")}
                required
              />
            </div>
            <div className="ui-field">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                placeholder="mirestaurante"
                value={formData.slug}
                onChange={handleChange("slug")}
                required
              />
              <span className="ui-hint">Ej: mirestaurante</span>
            </div>
            <div className="ui-field">
              <Label htmlFor="plan">Plan</Label>
              <Select>
                <SelectTrigger
                  id="plan"
                  value={formData.plan}
                  onValueChange={handlePlanChange}
                >
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </SelectTrigger>
              </Select>
            </div>
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {success ? (
              <Alert variant="success">
                <AlertTitle>Listo</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={loading} aria-busy={loading}>
              {loading ? "Creando..." : "Crear tenant"}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <div className="ui-inline">
            ¿Ya tienes cuenta?
            <Link className="ui-link" href="/login">
              Ir a iniciar sesión
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
