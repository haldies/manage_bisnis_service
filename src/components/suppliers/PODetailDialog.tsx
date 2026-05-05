"use client";
import { useState } from "react";
import { Send, X, Package, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { PurchaseOrder, PurchaseOrderStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface PODetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  po: PurchaseOrder | null;
}

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const config: Record<
    PurchaseOrderStatus,
    { label: string; className: string }
  > = {
    Draft: {
      label: "Draft",
      className:
        "text-slate-600 bg-slate-50 border-slate-200/50",
    },
    Sent: {
      label: "Dikirim",
      className:
        "text-blue-600 bg-blue-50 border-blue-200/50",
    },
    Partial: {
      label: "Sebagian Diterima",
      className:
        "text-amber-600 bg-amber-50 border-amber-200/50",
    },
    Received: {
      label: "Diterima",
      className:
        "text-emerald-600 bg-emerald-50 border-emerald-200/50",
    },
    Cancelled: {
      label: "Dibatalkan",
      className:
        "text-red-600 bg-red-50 border-red-200/50",
    },
  };

  const { label, className } = config[status] ?? {
    label: status,
    className: "text-muted-foreground bg-muted",
  };

  return (
    <Badge
      variant="outline"
      className={`gap-0 py-1 px-3 rounded-full uppercase text-[10px] font-bold ${className}`}
    >
      {label}
    </Badge>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-muted-foreground font-medium shrink-0">
        {label}
      </span>
      <span className="text-xs font-semibold text-right">{value}</span>
    </div>
  );
}

export default function PODetailDialog({
  open,
  onOpenChange,
  po,
}: PODetailDialogProps) {
  const { sendPurchaseOrder, cancelPurchaseOrder, inventory, branches } = usePosStore();

  const [sendLoading, setSendLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (!po) return null;

  const canSend = po.status === "Draft";
  const canCancel = po.status === "Draft" || po.status === "Sent";

  const getItemName = (itemId: string) =>
    po.items.find((it) => it.itemId === itemId)?.item?.name ??
    inventory.find((i) => i.id === itemId)?.name ??
    itemId;

  const handleSend = async () => {
    setSendLoading(true);
    setServerError("");
    try {
      await sendPurchaseOrder(po.id);
      onOpenChange(false);
    } catch (err: any) {
      setServerError(err?.message || "Gagal mengirim PO. Silakan coba lagi.");
    } finally {
      setSendLoading(false);
    }
  };

  const handleCancel = async () => {
    setCancelLoading(true);
    setServerError("");
    try {
      await cancelPurchaseOrder(po.id);
      setShowCancelConfirm(false);
      onOpenChange(false);
    } catch (err: any) {
      setServerError(err?.message || "Gagal membatalkan PO. Silakan coba lagi.");
    } finally {
      setCancelLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const isOverdue =
    po.expectedDate &&
    po.status !== "Received" &&
    po.status !== "Cancelled" &&
    new Date(po.expectedDate) < new Date();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-2xl rounded-2xl p-0 overflow-hidden"
          aria-describedby="po-detail-desc"
        >
          <DialogHeader className="p-5 border-b">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {po.poNumber}
                </DialogTitle>
                <DialogDescription id="po-detail-desc" className="text-xs text-muted-foreground">
                  Detail Purchase Order
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={po.status} />
                {isOverdue && (
                  <Badge
                    variant="outline"
                    className="text-orange-600 bg-orange-50 border-orange-200/50 gap-1 py-1 px-2 rounded-full uppercase text-[10px] font-bold"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Overdue
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* PO Info */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 p-4 bg-muted/20 rounded-xl border border-border/40">
              <DetailRow
                label="Supplier"
                value={po.supplier?.name ?? "—"}
              />
              <DetailRow
                label="Cabang"
                value={branches.find((b) => b.id === po.branchId)?.name ?? "—"}
              />
              <DetailRow
                label="Tanggal PO"
                value={formatDate(po.orderDate)}
              />
              <DetailRow
                label="Estimasi Tiba"
                value={
                  <span className={isOverdue ? "text-orange-600" : ""}>
                    {formatDate(po.expectedDate)}
                  </span>
                }
              />
              {po.notes && (
                <div className="col-span-2">
                  <DetailRow label="Catatan" value={po.notes} />
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Daftar Item
              </h4>
              <div className="rounded-xl border border-border/40 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableHead className="text-xs font-semibold py-2 pl-4">
                        Produk
                      </TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-center w-24">
                        Qty Pesan
                      </TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-center w-24">
                        Qty Terima
                      </TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-right w-36">
                        Harga Beli
                      </TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-right w-36 pr-4">
                        Subtotal
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {po.items.length > 0 ? (
                      po.items.map((item) => (
                        <TableRow
                          key={item.id}
                          className="hover:bg-muted/10"
                        >
                          <TableCell className="py-3 pl-4 text-sm font-medium">
                            {getItemName(item.itemId)}
                          </TableCell>
                          <TableCell className="py-3 text-center text-sm">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="py-3 text-center text-sm">
                            <span
                              className={
                                item.receivedQty >= item.quantity
                                  ? "text-emerald-600 font-semibold"
                                  : item.receivedQty > 0
                                  ? "text-amber-600 font-semibold"
                                  : "text-muted-foreground"
                              }
                            >
                              {item.receivedQty}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-right text-sm">
                            {formatCurrency(item.unitPrice)}
                          </TableCell>
                          <TableCell className="py-3 text-right text-sm font-semibold pr-4">
                            {formatCurrency(item.quantity * item.unitPrice)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-20 text-center text-xs text-muted-foreground"
                        >
                          Tidak ada item
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center px-4 py-3 bg-muted/20 rounded-xl border border-border/40">
              <span className="text-sm font-semibold text-muted-foreground">
                Total PO
              </span>
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(po.totalAmount)}
              </span>
            </div>

            {/* Server error */}
            {serverError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {serverError}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          {(canSend || canCancel) && (
            <div className="p-5 pt-0 flex gap-2">
              {canCancel && (
                <Button
                  variant="outline"
                  className="flex-1 h-9 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={cancelLoading || sendLoading}
                >
                  <X className="h-4 w-4" />
                  Batalkan
                </Button>
              )}
              {canSend && (
                <Button
                  className="flex-1 h-9 text-xs gap-1.5"
                  onClick={handleSend}
                  disabled={sendLoading || cancelLoading}
                >
                  {sendLoading ? (
                    "Mengirim..."
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Kirim PO
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b">
            <DialogTitle className="text-base font-bold">
              Batalkan Purchase Order?
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              PO <span className="font-semibold text-foreground">{po.poNumber}</span> akan
              dibatalkan dan tidak dapat diubah kembali. Lanjutkan?
            </DialogDescription>
          </DialogHeader>
          <div className="p-5 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-9 text-xs"
              onClick={() => setShowCancelConfirm(false)}
              disabled={cancelLoading}
            >
              Tidak
            </Button>
            <Button
              className="flex-1 h-9 text-xs bg-red-600 hover:bg-red-700 text-white"
              onClick={handleCancel}
              disabled={cancelLoading}
            >
              {cancelLoading ? "Membatalkan..." : "Ya, Batalkan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
