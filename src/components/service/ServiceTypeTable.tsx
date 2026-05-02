"use client";
import { Edit, Trash2 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { usePosStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

interface ServiceTypeTableProps {
  onEdit: (type: any) => void;
}

export default function ServiceTypeTable({ onEdit }: ServiceTypeTableProps) {
  const { serviceTypes, deleteServiceType } = usePosStore();

  return (
    <div className="bg-card rounded-lg border shadow-sm">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="px-8 py-4 text-xs font-bold uppercase text-muted-foreground">Nama Jasa</TableHead>
            <TableHead className="px-8 py-4 text-xs font-bold uppercase text-muted-foreground">Kategori</TableHead>
            <TableHead className="px-8 py-4 text-xs font-bold uppercase text-muted-foreground text-right">Harga Standar</TableHead>
            <TableHead className="px-8 py-4 text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(serviceTypes || []).map(type => (
            <TableRow key={type.id} className="group hover:bg-muted/30">
              <TableCell className="px-8 py-4 font-bold text-sm">{type.name}</TableCell>
              <TableCell className="px-8 py-4">
                <span className="text-[10px] font-bold uppercase text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {type.category || 'Umum'}
                </span>
              </TableCell>
              <TableCell className="px-8 py-4 text-right font-bold">{formatCurrency(type.price)}</TableCell>
              <TableCell className="px-8 py-4 text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onEdit(type)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:bg-red-50" onClick={() => deleteServiceType(type.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>

            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
