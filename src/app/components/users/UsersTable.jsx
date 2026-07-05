"use client";

import { useTranslations } from "next-intl";
import { AppSpinner } from "@/components/app-spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserRow } from "@/components/users/UserRow";

export function UsersTable({ users, loading, busyId, currentUserId, onEdit, onDelete, onDeactivate, onActivate, onResetPassword }) {
  const t = useTranslations("Users");

  if (loading) {
    return <AppSpinner className="h-48" />;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-200 bg-slate-100/80 hover:bg-slate-100/80 dark:border-slate-800 dark:bg-[#0f2538] dark:hover:bg-[#0f2538]">
            <TableHead className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-300">{t("user")}</TableHead>
            <TableHead className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-300">{t("email")}</TableHead>
            <TableHead className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-300">{t("role")}</TableHead>
            <TableHead className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-300">{t("status")}</TableHead>
            <TableHead className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-300">{t("lastLogin")}</TableHead>
            <TableHead className="px-6 py-4 text-right text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-300">{t("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500">
                {t("noResults")}
              </TableCell>
            </TableRow>
          ) : (
            users.map((item, index) => (
              <UserRow
                key={item._id}
                user={item}
                index={index}
                isBusy={busyId === item._id}
                isSelf={Boolean(currentUserId && String(item._id) === String(currentUserId))}
                onEdit={onEdit}
                onDelete={onDelete}
                onDeactivate={onDeactivate}
                onActivate={onActivate}
                onResetPassword={onResetPassword}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
