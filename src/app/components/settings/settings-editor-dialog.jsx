"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
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
import { CategorySizesEditor } from "@/components/settings/category-sizes-editor";
import { getDescriptionLabel } from "@/lib/settings/settingLabels";

export function SettingsEditorDialog({
  open,
  setting,
  editorData,
  allSettings = [],
  saving,
  alert,
  onOpenChange,
  onEditorChange,
  onSave,
}) {
  const t = useTranslations("Settings");
  const locale = useLocale();
  const settingId = setting?._id;
  const isCategorySetting = setting?.description === "Product Category";
  const productSizes = useMemo(() => {
    const sizesSetting = allSettings.find((item) => item?.description === "Product Sizes");
    const sizes = Array.isArray(sizesSetting?.data) ? sizesSetting.data : [];
    return sizes.filter((size) => size?.active !== false);
  }, [allSettings]);

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
          <DialogTitle>
            {t("editSetting")} {getDescriptionLabel(setting?.description, locale)}
          </DialogTitle>
          <DialogDescription>
            {t("updateTenantValues")}
          </DialogDescription>
        </DialogHeader>

        {alert ? <AppAlert type={alert.type} message={alert.message} /> : null}

        <div className="py-2">
          {editorData === null ? (
            <p className="text-sm text-muted-foreground">{t("selectSetting")}</p>
          ) : isCategorySetting ? (
            <CategorySizesEditor
              data={editorData}
              onChange={onEditorChange}
              sizes={productSizes}
              t={t}
            />
          ) : (
            <DynamicJsonTableEditor data={editorData} onChange={onEditorChange} />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <AppSpinner inline size={16} />
                {t("saving")}
              </span>
            ) : (
              t("save")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
