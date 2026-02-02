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
import { useAuthStore } from "../../store/authStore";

const emailRegex = /^[^@]+@[^@]+\.[^@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const loginSuccess = useAuthStore((state) => state.loginSuccess);
  const tenant = useAuthStore((state) => state.tenant);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("Por favor ingresa email y contraseña.");
      return;
    }

    if (!emailRegex.test(formData.email)) {
      setError("El email no tiene un formato válido.");
      return;
    }

    if (!tenant?.slug) {
      setError(
        "Necesitas un tenant activo. Registra tu restaurante o verifica tu slug antes de iniciar sesión."
      );
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant": tenant.slug,
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          data.message || data.error || "No pudimos iniciar sesión. Intenta otra vez."
        );
        return;
      }

      loginSuccess({
        token: data.token,
        user: data.user,
        tenant,
      });

      router.push("/home");
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
          <CardTitle>Iniciar sesión</CardTitle>
          <CardDescription>
            Accede con el email y contraseña de tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="ui-stack" onSubmit={handleSubmit}>
            <div className="ui-field">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@mirestaurante.com"
                value={formData.email}
                onChange={handleChange("email")}
                required
              />
            </div>
            <div className="ui-field">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Tu contraseña"
                value={formData.password}
                onChange={handleChange("password")}
                required
              />
            </div>
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Ups</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={loading} aria-busy={loading}>
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <div className="ui-inline">
            ¿Aún no tienes tenant?
            <Link className="ui-link" href="/register">
              Crear cuenta
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
