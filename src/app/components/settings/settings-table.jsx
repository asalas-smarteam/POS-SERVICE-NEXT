"use client";

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
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>description</TableHead>
            <TableHead className="w-[140px]">acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {settings.map((setting) => (
            <TableRow key={setting._id}>
              <TableCell className="font-medium">{setting.description}</TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => onEdit(setting)}>
                  Editar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
