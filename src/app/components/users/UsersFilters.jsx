import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

export function UsersFilters({ search, status, onSearchChange, onStatusChange }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
      <div className="relative flex-1">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="h-10 border-0 bg-slate-100 pl-10 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:ring-[#137fec]/20"
          placeholder="Search by name, email or role..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="flex w-full items-center rounded-lg bg-slate-100 p-1 md:w-auto">
        {FILTERS.map((item) => {
          const active = status === item.value;
          return (
            <button
              key={item.value}
              className={`flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors md:flex-none ${active ? "bg-white text-[#137fec] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              onClick={() => onStatusChange(item.value)}
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <Button className="h-10 w-full gap-2 border-slate-200 text-slate-600 md:w-auto" variant="outline" type="button">
        <SlidersHorizontal className="size-4" />
        Filters
      </Button>
    </div>
  );
}
