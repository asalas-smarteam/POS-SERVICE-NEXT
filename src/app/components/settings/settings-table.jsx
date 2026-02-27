"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function SettingsTable({ settings, onEdit }) {
  const t = useTranslations("Settings");

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
              <TableCell className="font-medium">{setting.description}</TableCell>
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
