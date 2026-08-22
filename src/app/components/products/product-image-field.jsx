"use client";

import { useEffect, useMemo, useRef } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function ProductImageField({
  currentUrl = null,
  file = null,
  onSelect,
  onRemove,
  disabled = false,
}) {
  const t = useTranslations("Products");
  const inputRef = useRef(null);

  // El object URL se deriva de `file`, no se sincroniza con un estado propio:
  // así el efecto solo limpia (revoca el blob anterior), sin llamar setState
  // dentro del efecto.
  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  // Un object URL retiene el blob hasta que se revoca. Sin esta limpieza, cada
  // foto que el usuario prueba y descarta queda en memoria.
  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  const preview = objectUrl ?? currentUrl;

  const handleChange = (event) => {
    const selected = event.target.files?.[0];
    if (selected) {
      onSelect?.(selected);
    }
    // Permite volver a elegir el mismo archivo tras quitarlo.
    event.target.value = "";
  };

  return (
    <div className="space-y-2">
      <Label>{t("photo")}</Label>
      <div className="flex items-start gap-3">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-lg border bg-muted/40">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- previsualizacion local: la fuente puede ser un blob: URL, que next/image no acepta
            <img
              src={preview}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-xs text-muted-foreground">
              {t("noPhoto")}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus className="size-4" />
              {preview ? t("replacePhoto") : t("addPhoto")}
            </Button>
            {preview ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => onRemove?.()}
              >
                <Trash2 className="size-4" />
                {t("removePhoto")}
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{t("photoHint")}</p>
          {file ? (
            <p className="text-xs font-medium text-primary">{t("photoPending")}</p>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
