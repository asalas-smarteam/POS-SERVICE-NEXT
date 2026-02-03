"use client";

import { CheckCircle2, Info, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const variantConfig = {
  success: {
    icon: CheckCircle2,
    variant: "success",
    title: "Éxito",
  },
  error: {
    icon: XCircle,
    variant: "destructive",
    title: "Error",
  },
  info: {
    icon: Info,
    variant: "default",
    title: "Información",
  },
};

export function AppAlert({
  type = "info",
  title,
  message,
  className,
}) {
  const config = variantConfig[type] ?? variantConfig.info;
  const Icon = config.icon;

  return (
    <Alert variant={config.variant} className={cn("flex items-start gap-3", className)}>
      <Icon className="mt-0.5 size-4" />
      <div className="space-y-1">
        <AlertTitle>{title ?? config.title}</AlertTitle>
        {message ? <AlertDescription>{message}</AlertDescription> : null}
      </div>
    </Alert>
  );
}
