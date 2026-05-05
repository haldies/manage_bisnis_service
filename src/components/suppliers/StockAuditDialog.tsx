"use client";
import { useState, useEffect } from "react";
import { ClipboardList, Check, Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePosStore } from "@/lib/store";
import { StockAudit } from "@/lib/types";

interface StockAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, dialog is in edit/fill mode. If null, dialog is in create mode. */
  audit: StockAudit | null;
}

interface AuditItemState {
  id: string;
  itemId: string;
  itemName: string;
  systemQty: number;
  physicalQty: string; // string for controlled input
}

function getDiscrepancy(physicalQty: string, systemQty: number): number | null {
  const parsed = parseInt(physicalQty, 10);
  if (isNaN(parsed)) return null;
  return parsed - systemQty;
}

function DiscrepancyCell({ discrepancy }: { discrepancy: number | null }) {
  if (discrepancy === null) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  if (discrepancy === 0) {
    return <span className="text-muted-foreground font-semibold text-xs">0</span>;
  }
  if (discrepancy > 0) {
    return (
      <span className="text-emerald-600 font-semibold text-xs">
        +{discrepancy}
      </span>
    );
  }
  return (
    <span className="text-red-500 font-semibold text-xs">{discrepancy}</span>
  );
}

export default function StockAuditDialog({
  open,
  onOpenChange,
  audit,
}: StockAuditDialogProps) {
  const { branches, inventory, createStockAudit, updateStockAuditItems } =
    usePosStore();

  // Create mode state
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [branchError, setBranchError] = useState("");

  // Edit mode state
  const [auditItems, setAuditItems] = useState<AuditItemState[]>([]);

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const isEditMode = audit !== null;
  const isCompleted = audit?.status === "Completed";

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setServerError("");
      setBranchError("");

      if (audit) {
        // Edit mode: populate items from audit
        const items: AuditItemState[] = audit.items.map((item) => {
          const itemName =
            item.item?.name ??
            inventory.find((i) => i.id === item.itemId)?.name ??
            item.itemId;
          return {
            id: item.id,
            itemId: item.itemId,
            itemName,
            systemQty: item.systemQty,
            physicalQty:
              item.physicalQty !== undefined && item.physicalQty !== null
                ? String(item.physicalQty)
                : "",
          };
        });
        setAuditItems(items);
      } else {
        // Create mode: reset branch selection
        setSelectedBranchId("");
        setAuditItems([]);
      }
    }
  }, [open, audit, inventory]);

  const handlePhysicalQtyChange = (id: string, value: string) => {
    // Allow empty string or non-negative integers only
    if (value !== "" && !/^\d+$/.test(value)) return;
    setAuditItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, physicalQty: value } : it))
    );
  };

  const handleCreateSubmit = async () => {
    if (!selectedBranchId) {
      setBranchError("Pilih cabang terlebih dahulu");
      return;
    }

    setLoading(true);
    setServerError("");

    try {
      await createStockAudit(selectedBranchId);
      onOpenChange(false);
    } catch (err: any) {
      setServerError(err?.message || "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!audit) return;

    // Validate: all items must have physicalQty filled
    const hasEmpty = auditItems.some((it) => it.physicalQty === "");
    if (hasEmpty) {
      setServerError("Semua item harus diisi stok fisiknya sebelum disimpan.");
      return;
    }

    setLoading(true);
    setServerError("");

    try {
      await updateStockAuditItems(
        audit.id,
        auditItems.map((it) => ({
          id: it.id,
          physicalQty: parseInt(it.physicalQty, 10),
        }))
      );
      onOpenChange(false);
    } catch (err: any) {
      setServerError(err?.message || "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = isEditMode ? handleEditSubmit : handleCreateSubmit;

  const dialogTitle = isEditMode
    ? `Isi Audit Stok — ${audit?.auditNumber}`
    : "Buat Audit Stok Baru";

  const dialogDesc = isEditMode
    ? isCompleted
      ? "Audit ini sudah selesai. Data ditampilkan dalam mode baca saja."
      : "Masukkan stok fisik untuk setiap item. Selisih dihitung otomatis."
    : "Pilih cabang untuk memulai sesi audit stok. Sistem akan mengambil snapshot stok saat ini.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl rounded-2xl p-0 overflow-hidden"
        aria-describedby="audit-dialog-desc"
      >
        <DialogHeader className="p-5 border-b">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription
            id="audit-dialog-desc"
            className="text-xs text-muted-foreground"
          >
            {dialogDesc}
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* ── CREATE MODE ── */}
          {!isEditMode && (
            <div className="space-y-1.5">
              <Label htmlFor="audit-branch" className="text-xs font-semibold">
                Cabang <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedBranchId}
                onValueChange={(v) => {
                  setSelectedBranchId(v);
                  setBranchError("");
                }}
              >
                <SelectTrigger
                  id="audit-branch"
                  className={branchError ? "border-red-400" : ""}
                >
                  <SelectValue placeholder="Pilih cabang..." />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {branchError && (
                <p className="text-xs text-red-500">{branchError}</p>
              )}

              {/* Info box */}
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700">
                    Setelah audit dibuat, sistem akan mengambil snapshot stok
                    saat ini sebagai <strong>Stok Sistem</strong>. Anda kemudian
                    dapat mengisi stok fisik untuk setiap item.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── EDIT MODE: Audit Info ── */}
          {isEditMode && audit && (
            <>
              <div className="grid grid-cols-3 gap-3 p-4 bg-muted/20 rounded-xl border border-border/40">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                    No. Audit
                  </p>
                  <p className="text-xs font-semibold">{audit.auditNumber}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                    Cabang
                  </p>
                  <p className="text-xs font-semibold">
                    {audit.branch?.name ??
                      branches.find((b) => b.id === audit.branchId)?.name ??
                      "—"}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                    Status
                  </p>
                  <p className="text-xs font-semibold">
                    {audit.status === "Open"
                      ? "Terbuka"
                      : audit.status === "InProgress"
                      ? "Sedang Berjalan"
                      : "Selesai"}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Daftar Item Audit
                </h4>

                {auditItems.length > 0 ? (
                  <div className="rounded-xl border border-border/40 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableHead className="text-xs font-semibold py-2 pl-4">
                            Nama Item
                          </TableHead>
                          <TableHead className="text-xs font-semibold py-2 text-center w-28">
                            Stok Sistem
                          </TableHead>
                          <TableHead className="text-xs font-semibold py-2 text-center w-32">
                            Stok Fisik
                          </TableHead>
                          <TableHead className="text-xs font-semibold py-2 text-center w-28">
                            Selisih
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditItems.map((it) => {
                          const discrepancy = getDiscrepancy(
                            it.physicalQty,
                            it.systemQty
                          );
                          return (
                            <TableRow
                              key={it.id}
                              className="hover:bg-muted/10"
                            >
                              <TableCell className="py-2.5 pl-4 text-sm font-medium">
                                {it.itemName}
                              </TableCell>
                              <TableCell className="py-2.5 text-center text-sm text-muted-foreground">
                                {it.systemQty}
                              </TableCell>
                              <TableCell className="py-2.5 text-center">
                                <Input
                                  type="number"
                                  min="0"
                                  value={it.physicalQty}
                                  onChange={(e) =>
                                    handlePhysicalQtyChange(
                                      it.id,
                                      e.target.value
                                    )
                                  }
                                  disabled={isCompleted}
                                  placeholder="0"
                                  className="h-7 w-20 text-xs text-center mx-auto disabled:opacity-60"
                                />
                              </TableCell>
                              <TableCell className="py-2.5 text-center">
                                <DiscrepancyCell discrepancy={discrepancy} />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="h-24 flex flex-col items-center justify-center border-2 border-dashed border-border/30 rounded-xl bg-muted/5">
                    <ClipboardList className="h-5 w-5 text-muted-foreground/30 mb-1" />
                    <p className="text-xs text-muted-foreground/50">
                      Tidak ada item dalam audit ini.
                    </p>
                  </div>
                )}
              </div>
            </>
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
            {isCompleted ? "Tutup" : "Batal"}
          </Button>
          {!isCompleted && (
            <Button
              className="flex-1 h-9 text-xs gap-1.5"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                "Menyimpan..."
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {isEditMode ? "Simpan Stok Fisik" : "Buat Audit"}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
