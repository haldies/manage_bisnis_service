"use client";
import { useState } from "react";
import { RotateCcw, AlertTriangle, Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ServiceTicket } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { usePosStore } from "@/lib/store";

interface ReturnDialogProps {
  ticket: ServiceTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (updatedTicket: ServiceTicket) => void;
}

export default function ReturnDialog({ ticket, open, onOpenChange, onSuccess }: ReturnDialogProps) {
  const { currentUser } = usePosStore();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!ticket) return null;

  const totalCost =
    (ticket.spareparts?.reduce((s, p) => s + Number(p.price) * (p.quantity || 1), 0) || 0) +
    Number(ticket.serviceFee || 0);

  // Cek masa garansi
  const warrantyExpiry = ticket.warrantyExpiry ? new Date(ticket.warrantyExpiry) : null;
  const isInWarranty = warrantyExpiry ? new Date() <= warrantyExpiry : false;
  const warrantyLabel = warrantyExpiry
    ? warrantyExpiry.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError("Alasan return wajib diisi");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/services/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: ticket.id,
          returnReason: reason.trim(),
          cashierId: currentUser?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Gagal memproses return");
        return;
      }
      // Normalize all date fields from API (Prisma returns ISO strings, store expects timestamps)
      const t = data.ticket;
      const updated: ServiceTicket = {
        ...t,
        dateOpened: t.dateOpened ? new Date(t.dateOpened).getTime() : Date.now(),
        dateClosed: t.dateClosed ? new Date(t.dateClosed).getTime() : undefined,
        updatedAt: t.updatedAt ? new Date(t.updatedAt).getTime() : undefined,
        warrantyExpiry: t.warrantyExpiry ? new Date(t.warrantyExpiry).getTime() : undefined,
        pickedUpAt: t.pickedUpAt ? new Date(t.pickedUpAt).getTime() : undefined,
        returnedAt: t.returnedAt ? new Date(t.returnedAt).getTime() : undefined,
        spareparts: t.spareparts?.map((p: any) => ({
          ...p,
          id: p.itemId || p.id,
          name: p.item?.name || p.name || "Sparepart",
          price: Number(p.price),
          quantity: p.quantity,
          category: "Sparepart",
          costPrice: 0,
        })) || [],
      };
      onSuccess(updated);
      onOpenChange(false);
      setReason("");
    } catch {
      setError("Gagal menghubungi server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden" aria-describedby="return-desc">
        <DialogHeader className="p-5 border-b bg-amber-50">
          <DialogTitle className="flex items-center gap-2 text-base text-amber-800">
            <RotateCcw className="h-5 w-5" />
            Return Servis — Klaim Garansi
          </DialogTitle>
          <DialogDescription id="return-desc" className="text-xs text-amber-700">
            Proses return akan membuat transaksi koreksi yang mengurangi pendapatan.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Info tiket */}
          <div className="rounded-xl border bg-muted/20 p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Device</span>
              <span className="font-bold">{ticket.deviceModel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pelanggan</span>
              <span className="font-bold">{ticket.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Servis</span>
              <span className="font-bold text-primary">{formatCurrency(totalCost)}</span>
            </div>
            {warrantyLabel && (
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Garansi s/d</span>
                <span className={`font-bold ${isInWarranty ? "text-emerald-600" : "text-red-500"}`}>
                  {warrantyLabel} {isInWarranty ? "✓" : "(Habis)"}
                </span>
              </div>
            )}
          </div>

          {!isInWarranty && warrantyExpiry && (
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Masa garansi sudah habis. Return tetap bisa diproses secara manual.</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Alasan Return / Keluhan</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Jelaskan keluhan pelanggan atau alasan return..."
              className="min-h-[80px] text-xs resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="p-5 pt-0 gap-2">
          <Button variant="outline" className="flex-1 h-9 text-xs" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            className="flex-1 h-9 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700"
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
          >
            {loading ? "Memproses..." : (
              <><Check className="h-4 w-4" /> Proses Return</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
