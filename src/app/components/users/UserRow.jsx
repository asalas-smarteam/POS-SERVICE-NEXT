"use client";

import { MoreHorizontal, Pencil, Power, Trash2, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";

const roleClasses = {
  ADMIN: "bg-blue-50 text-blue-700 border-blue-200",
  KITCHEN: "bg-orange-50 text-orange-700 border-orange-200",
  CASHIER: "bg-sky-50 text-sky-700 border-sky-200",
};

const statusClasses = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-500",
};

const palette = ["bg-blue-100 text-blue-600", "bg-orange-100 text-orange-600", "bg-indigo-100 text-indigo-600", "bg-purple-100 text-purple-600"];

const toInitials = (value = "") =>
  String(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";

const formatLastLogin = (value, neverLabel) => {
  if (!value) return neverLabel;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return neverLabel;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

export function UserRow({ user, index, isBusy, isSelf, onEdit, onDelete, onDeactivate, onResetPassword }) {
  const t = useTranslations("Users");
  const tRoles = useTranslations("Roles");
  const tStatus = useTranslations("UserStatus");
  const roleLabel = user.role || "OTHER";
  const statusKey = user.isActive ? "active" : "inactive";

  return (
    <TableRow className="border-slate-200 hover:bg-slate-50/80">
      <TableCell className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Avatar className={`size-10 ${palette[index % palette.length]}`}>
            <AvatarFallback className="bg-transparent font-bold">{toInitials(user.username)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900">{user.username}</span>
            <span className="text-xs text-slate-400">ID: #{String(user._id || "").slice(-4)}</span>
          </div>
        </div>
      </TableCell>

      <TableCell className="px-6 py-4 text-sm text-slate-600">{user.email || "-"}</TableCell>

      <TableCell className="px-6 py-4">
        <Badge className={`rounded-full border text-xs font-medium ${roleClasses[roleLabel] || "bg-slate-100 text-slate-700 border-slate-200"}`} variant="outline">
          {tRoles.has(roleLabel) ? tRoles(roleLabel) : roleLabel}
        </Badge>
      </TableCell>

      <TableCell className="px-6 py-4">
        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${statusClasses[statusKey]}`}>
          <span className={`size-1.5 rounded-full ${user.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
          {user.isActive ? tStatus("ACTIVE") : tStatus("INACTIVE")}
        </span>
      </TableCell>

      <TableCell className="px-6 py-4 text-sm text-slate-500">{formatLastLogin(user.lastLoginAt || user.updatedAt, t("never"))}</TableCell>

      <TableCell className="px-6 py-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="text-slate-500 hover:text-slate-700" size="icon" variant="ghost">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem disabled={isBusy} onClick={() => onEdit(user)}>
              <Pencil className="mr-2 size-4" />
              {t("edit")}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isBusy || isSelf || !user.isActive} onClick={() => onDeactivate(user)}>
              <Power className="mr-2 size-4" />
              {t("deactivate")}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isBusy} onClick={() => onResetPassword(user)}>
              <Undo2 className="mr-2 size-4" />
              {t("resetPassword")}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600 focus:text-red-600" disabled={isBusy || isSelf || !user.isActive} onClick={() => onDelete(user)}>
              <Trash2 className="mr-2 size-4" />
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
