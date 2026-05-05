"use client";
import { Edit, Trash2 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePosStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

interface ServiceTypeTableProps {
  onEdit: (type: any) => void;
}

function formatFee(feeType?: string, feeValue?: number): string {
  if (!feeValue || feeValue === 0) return "-";
  if (feeType === "Percentage") return `+${feeValue}%`;
  return `+${formatCurrency(feeValue)}`;
}

function formatIncentive(incentiveType?: string, incentiveValue?: number): string {
  if (!incentiveValue || incentiveValue === 0) return "-";
  if (incentiveType === "Percentage") return `${incentiveValue}%`;
  return formatCurrency(incentiveValue);
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
            <TableHead className="px-8 py-4 text-xs font-bold uppercase text-muted-foreground text-right">Fee Tambahan</TableHead>
            <TableHead className="px-8 py-4 text-xs font-bold uppercase text-muted-foreground text-right">Insentif Teknisi</TableHead>
            <TableHead className="px-8 py-4 text-xs font-bold uppercase text-muted-foreground">Device</TableHead>
            <TableHead className="px-8 py-4 text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(serviceTypes || []).map((type) => {
            const deviceList = (type.deviceModels ?? []).map(
              (dm: any) => dm.deviceModel?.name ?? dm.name ?? ""
            ).filter(Boolean);

            return (
              <TableRow key={type.id} className="group hover:bg-muted/30">
                <TableCell className="px-8 py-4 font-bold text-sm">{type.name}</TableCell>
                <TableCell className="px-8 py-4">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {type.category || "Umum"}
                  </span>
                </TableCell>
                <TableCell className="px-8 py-4 text-right font-bold">
                  {formatCurrency(type.price)}
                </TableCell>
                <TableCell className="px-8 py-4 text-right">
                  {type.feeValue && type.feeValue > 0 ? (
                    <span className="text-sm font-semibold text-emerald-600">
                      {formatFee(type.feeType, type.feeValue)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="px-8 py-4 text-right">
                  {type.incentiveValue && type.incentiveValue > 0 ? (
                    <span className="text-sm font-semibold text-blue-600">
                      {formatIncentive(type.incentiveType, type.incentiveValue)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="px-8 py-4">
                  {deviceList.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {deviceList.slice(0, 3).map((name: string) => (
                        <Badge key={name} variant="outline" className="text-[10px] px-1.5 py-0">
                          {name}
                        </Badge>
                      ))}
                      {deviceList.length > 3 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                          +{deviceList.length - 3}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Semua</span>
                  )}
                </TableCell>
                <TableCell className="px-8 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onEdit(type)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-red-500 hover:bg-red-50"
                      onClick={() => deleteServiceType(type.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
