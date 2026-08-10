"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AppAlert } from "@/components/app-alert";
import { AppSkeleton } from "@/components/app-skeleton";
import { SettingsEditorDialog } from "@/components/settings/settings-editor-dialog";
import { SettingsTable } from "@/components/settings/settings-table";
import { getTenantHeaders } from "../../../store/tenantHeaders";

const cloneData = (value) => JSON.parse(JSON.stringify(value));

export function SettingsPage() {
  const t = useTranslations("Settings");
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [dialogAlert, setDialogAlert] = useState(null);
  const [globalAlert, setGlobalAlert] = useState(null);
  const [selectedSetting, setSelectedSetting] = useState(null);
  const [editorData, setEditorData] = useState(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/settings", {
        headers: {
          ...getTenantHeaders(),
        },
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || t("loadError"));
      }

      setSettings(Array.isArray(body) ? body : []);
    } catch (fetchError) {
      setError(fetchError?.message || t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleOpenEdit = (setting) => {
    setDialogAlert(null);
    setSelectedSetting(setting);
    setEditorData(cloneData(setting.data));
  };

  const handleCloseDialog = (open) => {
    if (!open) {
      setSelectedSetting(null);
      setEditorData(null);
      setDialogAlert(null);
    }
  };

  const handleSave = async (id, data) => {
    setSaving(true);
    setDialogAlert(null);
    
    try {
      const response = await fetch(`/api/settings/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getTenantHeaders(),
        },
        body: JSON.stringify({ data }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || t("saveError"));
      }

      setDialogAlert({ type: "success", message: t("saved") });
      setGlobalAlert({ type: "success", message: t("changesApplied") });
      setSelectedSetting(null);
      setEditorData(null);
      await fetchSettings();
    } catch (saveError) {
      setDialogAlert({
        type: "error",
        message: saveError?.message || t("saveError"),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
        <div>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>

        {globalAlert ? (
          <AppAlert type={globalAlert.type} message={globalAlert.message} className="max-w-xl" />
        ) : null}

        {loading ? (
          <AppSkeleton variant="table" count={4} />
        ) : error ? (
          <AppAlert type="error" message={error} />
        ) : settings.length === 0 ? (
          <AppAlert type="info" message={t("empty")} />
        ) : (
          <>
            <SettingsTable settings={settings} onEdit={handleOpenEdit} />
          </>
        )}
      </div>

      <SettingsEditorDialog
        open={Boolean(selectedSetting)}
        setting={selectedSetting}
        editorData={editorData}
        saving={saving}
        alert={dialogAlert}
        onOpenChange={handleCloseDialog}
        onEditorChange={setEditorData}
        onSave={handleSave}
      />
    </div>
  );
}
