"use client";

import { useMemo } from "react";
import { AppAlert } from "@/components/app-alert";
import { AppSpinner } from "@/components/app-spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DynamicJsonTableEditor } from "@/components/settings/dynamic-json-table-editor";

export function SettingsEditorDialog({
  open,
  setting,
  editorData,
  saving,
  alert,
  onOpenChange,
  onEditorChange,
  onSave,
}) {
  const settingId = setting?._id;

  const canSave = useMemo(() => {
    return Boolean(settingId) && editorData !== null;
  }, [editorData, settingId]);

  const handleSave = () => {
    if (!canSave) {
      return;
    }
    onSave(settingId, editorData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Editar {setting?.description}</DialogTitle>
          <DialogDescription>
            Actualiza los valores de esta configuración del tenant.
          </DialogDescription>
        </DialogHeader>

        {alert ? <AppAlert type={alert.type} message={alert.message} /> : null}

        <div className="py-2">
          {editorData === null ? (
            <p className="text-sm text-muted-foreground">Selecciona una configuración.</p>
          ) : (
            <DynamicJsonTableEditor data={editorData} onChange={onEditorChange} />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <AppSpinner inline size={16} />
                Guardando...
              </span>
            ) : (
              "Guardar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
