"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function IngredientSearchSelect({
  value,
  onValueChange,
  searchValue,
  onSearchChange,
  items = [],
  placeholder = "Selecciona un ingrediente",
  emptyMessage = "Sin resultados.",
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <div className="p-2">
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder="Buscar ingrediente..."
            onKeyDown={(event) => event.stopPropagation()}
          />
        </div>
        {items.length > 0 ? (
          items.map((ingredient) => (
            <SelectItem key={ingredient._id} value={ingredient._id}>
              {ingredient.name}
            </SelectItem>
          ))
        ) : (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {emptyMessage}
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
