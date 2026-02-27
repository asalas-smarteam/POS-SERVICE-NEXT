"use client";

import { Clock3, BriefcaseBusiness, Users, UserCheck2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";

const formatDate = (value, emptyLabel) => {
  if (!value) return emptyLabel;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return emptyLabel;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
};

export function UsersStats({ stats, loading }) {
  const t = useTranslations("Users");
  const CARD_STYLES = [
    { title: t("totalStaff"), icon: Users, iconWrap: "bg-blue-100", iconColor: "text-[#137fec]", valueKey: "totalUsers" },
    { title: t("activeUsers"), icon: UserCheck2, iconWrap: "bg-emerald-100", iconColor: "text-emerald-600", valueKey: "activeUsers" },
    { title: t("rolesCount"), icon: BriefcaseBusiness, iconWrap: "bg-orange-100", iconColor: "text-orange-600", valueKey: "rolesCount" },
    { title: t("lastUserCreated"), icon: Clock3, iconWrap: "bg-slate-100", iconColor: "text-slate-600", valueKey: "lastCreatedUserDate", isDate: true },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {CARD_STYLES.map((item) => {
        const Icon = item.icon;
        const value = item.isDate ? formatDate(stats?.[item.valueKey], t("noUsersYet")) : Number(stats?.[item.valueKey] ?? 0);

        return (
          <Card key={item.title} className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0c1f30]">
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`flex size-12 items-center justify-center rounded-lg ${item.iconWrap}`}>
                <Icon className={`size-5 ${item.iconColor}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-300">{item.title}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-50">{loading ? "..." : value}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
