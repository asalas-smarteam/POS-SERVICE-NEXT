"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDescriptionLabel } from "@/lib/settings/settingLabels";

export function SettingsTable({ settings, onEdit }) {
  const t = useTranslations("Settings");
  const locale = useLocale();

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("descriptionColumn")}</TableHead>
            <TableHead className="w-[140px]">{t("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {settings.map((setting) => (
            <TableRow key={setting._id}>
              <TableCell className="font-medium">
                {getDescriptionLabel(setting.description, locale)}
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => onEdit(setting)}>
                  {t("editSetting")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
