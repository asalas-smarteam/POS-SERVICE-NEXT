"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppSpinner({ size = 20, className, inline = false }) {
  return (
    <div className={cn(inline ? "inline-flex" : "flex items-center justify-center", className)}>
      <Loader2 className="animate-spin" style={{ width: size, height: size }} />
    </div>
  );
}
