"use client";
import { useState, useEffect } from "react";
import { PackageCheck, Check } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePosStore } from "@/lib/store";
import { PurchaseOrder } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface GoodsReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  po: PurchaseOrder | null;
}

interface ReceiptItemState {
  itemId: string;
  itemName: string;
  poQty: number;
  receivedQty: number;
  remainingQty: number;
  qtyToReceive: number;
  unitPrice: number;
}

export default function GoodsReceiptDialog({
  open,
  onOpenChange,
  po,
}: GoodsReceiptDialogProps) {
  const { createGoodsReceipt, branches, inventory } = usePosStore();

  const [receiptItems, setReceiptItems] = useState<ReceiptItemState[]>([]);
  const [receiptDate, setReceiptDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  // Initialize form when dialog opens or PO changes
  useEffect(() => {
    if (open && po) {
      const today = new Date().toISOString().split("T")[0];
      setReceiptDate(today);
      setNotes("");
      setServerError("");

      const items: ReceiptItemState[] = po.items
        .filter((item) => item.quantity > item.receivedQty)
        .map((item) => {
          const remaining = item.quantity - item.receivedQty;
          const itemName =
            item.item?.name ??
            inventory.find((i) => i.id === item.itemId)?.name ??
            item.itemId;
          return {
            itemId: item.itemId,
            itemName,
            poQty: item.quantity,
            receivedQty: item.receivedQty,
            remainingQty: remaining,
            qtyToReceive: remaining,
            unitPrice: item.unitPrice,
          };
        });

      setReceiptItems(items);
    }
  }, [open, po, inventory]);

  if (!po) return null;

  const branch = branches.find((b) => b.id === po.branchId);
  const hasRemainingItems = receiptItems.length > 0;

  const handleQtyChange = (itemId: string, value: string) => {
    const qty = parseFloat(value);
    setReceiptItems((prev) =>
      prev.map((it) => {
        if (it.itemId !== itemId) return it;
        const clamped = isNaN(qty) ? 0 : Math.min(Math.max(0, qty), it.remainingQty);
        return { ...it, qtyToReceive: clamped };
      })
    );
  };

  const handlePriceChange = (itemId: string, value: string) => {
    const price = parseFloat(value);
    setReceiptItems((prev) =>
      prev.map((it) => {
        if (it.itemId !== itemId) return it;
        return { ...it, unitPrice: isNaN(price) ? 0 : Math.max(0, price) };
      })
    );
  };

  const totalValue = receiptItems.reduce(
    (sum, it) => sum + it.qtyToReceive * it.unitPrice,
    0
  );

  const itemsToSubmit = receiptItems.filter((it) => it.qtyToReceive > 0);

  const validate = (): boolean => {
    if (itemsToSubmit.length === 0) {
      setServerError("Minimal 1 item harus memiliki qty penerimaan lebih dari 0.");
      return false;
    }
    for (const it of receiptItems) {
      if (it.qtyToReceive < 0 || it.qtyToReceive > it.remainingQty) {
        setServerError(`Qty terima untuk "${it.itemName}" tidak valid.`);
        return false;
      }
      if (it.unitPrice < 0) {
        setServerError(`Harga aktual untuk "${it.itemName}" tidak valid.`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    setServerError("");
    if (!validate()) return;

    setLoading(true);
    try {
      await createGoodsReceipt({
        poId: po.id,
        branchId: po.branchId,
        receiptDate: receiptDate || undefined,
        notes: notes.trim() || undefined,
        items: itemsToSubmit.map((it) => ({
          itemId: it.itemId,
          quantity: it.qtyToReceive,
          unitPrice: it.unitPrice,
        })),
      });
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
        aria-describedby="gr-form-desc"
      >
        <DialogHeader className="p-5 border-b">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <PackageCheck className="h-4 w-4" />
            Terima Barang
          </DialogTitle>
          <DialogDescription id="gr-form-desc" className="text-xs text-muted-foreground">
            Catat penerimaan barang dari Purchase Order.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* PO Info Card */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-muted/20 rounded-xl border border-border/40">
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                No. PO
              </p>
              <p className="text-xs font-semibold">{po.poNumber}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                Supplier
              </p>
              <p className="text-xs font-semibold">{po.supplier?.name ?? "—"}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                Cabang
              </p>
              <p className="text-xs font-semibold">{branch?.name ?? "—"}</p>
            </div>
          </div>

          {/* Receipt Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gr-receipt-date" className="text-xs font-semibold">
                Tanggal Penerimaan
              </Label>
              <Input
                id="gr-receipt-date"
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Item yang Diterima
            </h4>

            {hasRemainingItems ? (
              <div className="rounded-xl border border-border/40 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableHead className="text-xs font-semibold py-2 pl-4">
                        Produk
                      </TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-center w-20">
                        Qty PO
                      </TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-center w-24">
                        Sudah Diterima
                      </TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-center w-16">
                        Sisa
                      </TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-center w-28">
                        Qty Terima
                      </TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-right w-36 pr-4">
                        Harga Aktual
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receiptItems.map((it) => (
                      <TableRow key={it.itemId} className="hover:bg-muted/10">
                        <TableCell className="py-3 pl-4 text-sm font-medium">
                          {it.itemName}
                        </TableCell>
                        <TableCell className="py-3 text-center text-sm">
                          {it.poQty}
                        </TableCell>
                        <TableCell className="py-3 text-center text-sm">
                          <span className={it.receivedQty > 0 ? "text-amber-600 font-semibold" : "text-muted-foreground"}>
                            {it.receivedQty}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-center text-sm font-semibold text-blue-600">
                          {it.remainingQty}
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <Input
                            type="number"
                            min={0}
                            max={it.remainingQty}
                            value={it.qtyToReceive}
                            onChange={(e) => handleQtyChange(it.itemId, e.target.value)}
                            className="h-7 w-20 text-xs text-center mx-auto"
                          />
                        </TableCell>
                        <TableCell className="py-3 pr-4">
                          <Input
                            type="number"
                            min={0}
                            value={it.unitPrice}
                            onChange={(e) => handlePriceChange(it.itemId, e.target.value)}
                            className="h-7 w-28 text-xs text-right ml-auto"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="h-24 flex flex-col items-center justify-center border-2 border-dashed border-border/30 rounded-xl bg-muted/5">
                <PackageCheck className="h-5 w-5 text-emerald-500/50 mb-1" />
                <p className="text-xs text-muted-foreground/70 font-medium">
                  Semua item sudah diterima penuh
                </p>
              </div>
            )}
          </div>

          {/* Running Total */}
          {hasRemainingItems && (
            <div className="flex justify-between items-center px-4 py-3 bg-muted/20 rounded-xl border border-border/40">
              <span className="text-sm font-semibold text-muted-foreground">
                Total Nilai Penerimaan
              </span>
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(totalValue)}
              </span>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="gr-notes" className="text-xs font-semibold">
              Catatan
            </Label>
            <Textarea
              id="gr-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan penerimaan barang..."
              className="min-h-[60px] resize-none text-sm"
            />
          </div>

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
            Batal
          </Button>
          <Button
            className="flex-1 h-9 text-xs gap-1.5"
            onClick={handleSubmit}
            disabled={loading || !hasRemainingItems}
          >
            {loading ? (
              "Menyimpan..."
            ) : (
              <>
                <Check className="h-4 w-4" />
                Simpan Penerimaan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
