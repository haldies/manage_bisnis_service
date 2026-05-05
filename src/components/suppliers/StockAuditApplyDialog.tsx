"use client";
import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePosStore } from "@/lib/store";
import { StockAudit, StockAuditItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface StockAuditApplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audit: StockAudit | null;
}

interface DiscrepancyRow {
  id: string;
  itemId: string;
  itemName: string;
  systemQty: number;
  physicalQty: number;
  discrepancy: number;
  unitCost: number;
  valueDiscrepancy: number;
}

function DiscrepancyBadge({ discrepancy }: { discrepancy: number }) {
  if (discrepancy === 0) {
    return (
      <Badge variant="secondary" className="text-xs font-semibold">
        0
      </Badge>
    );
  }
  if (discrepancy > 0) {
    return (
      <Badge className="text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
        +{discrepancy}
      </Badge>
    );
  }
  return (
    <Badge className="text-xs font-semibold bg-red-100 text-red-600 hover:bg-red-100 border-red-200">
      {discrepancy}
    </Badge>
  );
}

export default function StockAuditApplyDialog({
  open,
  onOpenChange,
  audit,
}: StockAuditApplyDialogProps) {
  const { applyStockAudit, inventory } = usePosStore();

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  if (!audit) return null;

  // Build rows for items with discrepancy != 0
  const discrepancyRows: DiscrepancyRow[] = audit.items
    .filter(
      (item): item is StockAuditItem & { physicalQty: number } =>
        item.physicalQty !== undefined &&
        item.physicalQty !== null &&
        item.physicalQty !== item.systemQty
    )
    .map((item) => {
      const discrepancy = item.physicalQty - item.systemQty;
      const inventoryItem =
        item.item ?? inventory.find((i) => i.id === item.itemId);
      const itemName = inventoryItem?.name ?? item.itemId;
      const unitCost = inventoryItem?.costPrice ?? 0;
      const valueDiscrepancy = discrepancy * unitCost;

      return {
        id: item.id,
        itemId: item.itemId,
        itemName,
        systemQty: item.systemQty,
        physicalQty: item.physicalQty,
        discrepancy,
        unitCost,
        valueDiscrepancy,
      };
    });

  const totalValueDiscrepancy = discrepancyRows.reduce(
    (sum, row) => sum + row.valueDiscrepancy,
    0
  );

  const handleApply = async () => {
    setLoading(true);
    setServerError("");

    try {
      await applyStockAudit(audit.id);
      onOpenChange(false);
    } catch (err: any) {
      setServerError(err?.message || "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl rounded-2xl p-0 overflow-hidden"
        aria-describedby="apply-audit-desc"
      >
        <DialogHeader className="p-5 border-b">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Terapkan Hasil Audit
          </DialogTitle>
          <DialogDescription
            id="apply-audit-desc"
            className="text-xs text-muted-foreground"
          >
            Ringkasan penyesuaian stok yang akan diterapkan dari audit{" "}
            <strong>{audit.auditNumber}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Warning Banner */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">
              <strong>Perhatian:</strong> Tindakan ini akan memperbarui stok
              sistem sesuai stok fisik yang telah diinput. Setiap penyesuaian
              akan dicatat sebagai transaksi koreksi.{" "}
              <strong>Tindakan ini tidak dapat dibatalkan.</strong>
            </p>
          </div>

          {/* Discrepancy Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Item dengan Selisih
            </h4>

            {discrepancyRows.length > 0 ? (
              <div className="rounded-xl border border-border/40 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableHead className="text-xs font-semibold py-2 pl-4">
                        Nama Item
                      </TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-center w-24">
                        Stok Sistem
                      </TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-center w-24">
                        Stok Fisik
                      </TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-center w-24">
                        Selisih
                      </TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-right w-28">
                        HPP / Unit
                      </TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-right w-32 pr-4">
                        Nilai Selisih
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discrepancyRows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/10">
                        <TableCell className="py-2.5 pl-4 text-sm font-medium">
                          {row.itemName}
                        </TableCell>
                        <TableCell className="py-2.5 text-center text-sm text-muted-foreground">
                          {row.systemQty}
                        </TableCell>
                        <TableCell className="py-2.5 text-center text-sm">
                          {row.physicalQty}
                        </TableCell>
                        <TableCell className="py-2.5 text-center">
                          <DiscrepancyBadge discrepancy={row.discrepancy} />
                        </TableCell>
                        <TableCell className="py-2.5 text-right text-sm text-muted-foreground">
                          {formatCurrency(row.unitCost)}
                        </TableCell>
                        <TableCell
                          className={`py-2.5 text-right text-sm font-semibold pr-4 ${
                            row.valueDiscrepancy > 0
                              ? "text-emerald-600"
                              : row.valueDiscrepancy < 0
                              ? "text-red-500"
                              : "text-muted-foreground"
                          }`}
                        >
                          {row.valueDiscrepancy > 0 ? "+" : ""}
                          {formatCurrency(row.valueDiscrepancy)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="h-20 flex flex-col items-center justify-center border-2 border-dashed border-border/30 rounded-xl bg-muted/5">
                <p className="text-xs text-muted-foreground/60">
                  Tidak ada item dengan selisih stok.
                </p>
              </div>
            )}
          </div>

          {/* Total Value Discrepancy */}
          {discrepancyRows.length > 0 && (
            <div className="flex justify-between items-center px-4 py-3 bg-muted/20 rounded-xl border border-border/40">
              <span className="text-sm font-semibold text-muted-foreground">
                Total Nilai Selisih
              </span>
              <span
                className={`text-lg font-bold ${
                  totalValueDiscrepancy > 0
                    ? "text-emerald-600"
                    : totalValueDiscrepancy < 0
                    ? "text-red-500"
                    : "text-foreground"
                }`}
              >
                {totalValueDiscrepancy > 0 ? "+" : ""}
                {formatCurrency(totalValueDiscrepancy)}
              </span>
            </div>
          )}

          {/* Server error */}
          {serverError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {serverError}
            </p>
          )}
        </div>

        <DialogFooter className="p-5 pt-0 gap-2">
          <Button
            variant="outline"
            className="flex-1 h-9 text-xs"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Batalkan
          </Button>
          <Button
            className="flex-1 h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleApply}
            disabled={loading}
          >
            {loading ? (
              "Menerapkan..."
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Terapkan Hasil Audit
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
