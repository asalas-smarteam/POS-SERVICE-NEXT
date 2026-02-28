"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AppAlert } from "@/components/app-alert";
import { AppSkeleton } from "@/components/app-skeleton";
import { AppSpinner } from "@/components/app-spinner";
import { SettingsEditorDialog } from "@/components/settings/settings-editor-dialog";
import { SettingsTable } from "@/components/settings/settings-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTenantHeaders } from "@/store/tenantHeaders";

const cloneData = (value) => JSON.parse(JSON.stringify(value));

const PRICING_STRATEGY_OPTIONS = [
  { value: "HIGHEST", labelKey: "chargeHighestPrice" },
  { value: "AVERAGE", labelKey: "chargeAveragePrice" },
  { value: "BASE_PLUS", labelKey: "chargeHighestPlusFee" },
];

const DEFAULT_HALF_AND_HALF_PRICING = {
  strategy: "HIGHEST",
  extraAmount: 0,
};

const normalizePricingForm = (value) => {
  const strategy = PRICING_STRATEGY_OPTIONS.some((option) => option.value === value?.strategy)
    ? value.strategy
    : DEFAULT_HALF_AND_HALF_PRICING.strategy;

  const numericExtraAmount = Number(value?.extraAmount);
  const extraAmount = Number.isFinite(numericExtraAmount) && numericExtraAmount >= 0 ? numericExtraAmount : 0;

  return {
    strategy,
    extraAmount,
  };
};

export function SettingsPage() {
  const t = useTranslations("Settings");
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [error, setError] = useState(null);
  const [dialogAlert, setDialogAlert] = useState(null);
  const [globalAlert, setGlobalAlert] = useState(null);
  const [selectedSetting, setSelectedSetting] = useState(null);
  const [editorData, setEditorData] = useState(null);
  const [halfAndHalfPricing, setHalfAndHalfPricing] = useState(DEFAULT_HALF_AND_HALF_PRICING);

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
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const baseSettings = useMemo(
    () => settings.find((setting) => setting?.description === "Settings") ?? null,
    [settings]
  );

  useEffect(() => {
    setHalfAndHalfPricing(normalizePricingForm(baseSettings?.data?.halfAndHalfPricing));
  }, [baseSettings]);

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

  const handleHalfAndHalfSave = async () => {
    if (!baseSettings?._id) {
      setGlobalAlert({ type: "error", message: t("settingsUnavailable") });
      return;
    }

    const normalizedHalfAndHalfPricing = normalizePricingForm(halfAndHalfPricing);

    const data = {
      ...(baseSettings?.data && typeof baseSettings.data === "object" && !Array.isArray(baseSettings.data)
        ? baseSettings.data
        : {}),
      halfAndHalfPricing: normalizedHalfAndHalfPricing,
    };

    setPricingSaving(true);
    try {
      const response = await fetch(`/api/settings/${baseSettings._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getTenantHeaders(),
        },
        body: JSON.stringify({ data }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || t("halfAndHalfSaveError"));
      }

      setGlobalAlert({ type: "success", message: t("halfAndHalfSaved") });
      await fetchSettings();
    } catch (saveError) {
      setGlobalAlert({
        type: "error",
        message: saveError?.message || t("halfAndHalfSaveError"),
      });
    } finally {
      setPricingSaving(false);
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
            <Card>
              <CardHeader>
                <CardTitle>{t("pricingTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="half-and-half-pricing-strategy">{t("pricingStrategy")}</Label>
                  <Select
                    value={halfAndHalfPricing.strategy}
                    onValueChange={(value) =>
                      setHalfAndHalfPricing((prev) => ({
                        ...prev,
                        strategy: value,
                      }))
                    }
                  >
                    <SelectTrigger id="half-and-half-pricing-strategy" className="max-w-md">
                      <SelectValue placeholder={t("selectPricingStrategy")} />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICING_STRATEGY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {t(option.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {halfAndHalfPricing.strategy === "BASE_PLUS" ? (
                  <div className="space-y-2 max-w-md">
                    <Label htmlFor="half-and-half-pricing-extra-amount">{t("extraAmount")}</Label>
                    <Input
                      id="half-and-half-pricing-extra-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={halfAndHalfPricing.extraAmount}
                      onChange={(event) =>
                        setHalfAndHalfPricing((prev) => ({
                          ...prev,
                          extraAmount: event.target.value,
                        }))
                      }
                    />
                  </div>
                ) : null}

                <Button onClick={handleHalfAndHalfSave} disabled={pricingSaving}>
                  {pricingSaving ? (
                    <span className="inline-flex items-center gap-2">
                      <AppSpinner inline size={16} />
                      {t("saving")}
                    </span>
                  ) : (
                    t("save")
                  )}
                </Button>
              </CardContent>
            </Card>

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
