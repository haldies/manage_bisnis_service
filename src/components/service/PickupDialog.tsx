"use client";
import { useState } from "react";
import { ScanLine, KeyRound, Check, AlertCircle, Banknote, QrCode, ArrowLeftRight } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, cn } from "@/lib/utils";
import { ServiceTicket } from "@/lib/types";

interface PickupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when a ticket is found, confirmed, and payment is processed */
  onConfirm: (ticket: ServiceTicket, pickedUpBy: string, paymentMethod: string, amountPaid: number) => void;
}

type Step = "search" | "confirm" | "payment" | "done";
type PaymentMethod = "Cash" | "QRIS" | "Transfer";

export default function PickupDialog({ open, onOpenChange, onConfirm }: PickupDialogProps) {
  const [step, setStep] = useState<Step>("search");
  const [code, setCode] = useState("");
  const [pickedUpBy, setPickedUpBy] = useState("");
  const [foundTicket, setFoundTicket] = useState<ServiceTicket | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [amountPaidStr, setAmountPaidStr] = useState("");

  const reset = () => {
    setStep("search");
    setCode("");
    setPickedUpBy("");
    setFoundTicket(null);
    setError("");
    setPaymentMethod("Cash");
    setAmountPaid(0);
    setAmountPaidStr("");
  };

  const totalCost = foundTicket
    ? (foundTicket.spareparts?.reduce((s, p) => s + Number(p.price) * (p.quantity || 1), 0) || 0) +
      Number(foundTicket.serviceFee || 0)
    : 0;

  // Jika ada DP, sisa yang harus dibayar saat pickup
  const dpPaid = foundTicket?.dpAmount || 0;
  const remainingAmount = Math.max(0, totalCost - dpPaid);

  const handleSearch = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/services/pickup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Tiket tidak ditemukan");
        return;
      }
      setFoundTicket(data.ticket);
      setStep("confirm");
    } catch {
      setError("Gagal menghubungi server");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!foundTicket) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/services/pickup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: foundTicket.pickupCode,
          pickedUpBy: pickedUpBy || "Pelanggan",
          paymentMethod,
          amountPaid,
          confirm: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Gagal mengkonfirmasi pengambilan");
        return;
      }
      onConfirm(data.ticket, pickedUpBy || "Pelanggan", paymentMethod, amountPaid);
      setStep("done");
    } catch {
      setError("Gagal menghubungi server");
    } finally {
      setLoading(false);
    }
  };

  const isPaymentValid =
    paymentMethod === "Cash"
      ? amountPaid >= remainingAmount
      : amountPaid > 0;

  const kembalian = paymentMethod === "Cash" && amountPaid >= remainingAmount
    ? amountPaid - remainingAmount
    : 0;

  const paymentMethods: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { id: "Cash", label: "Cash", icon: <Banknote className="h-4 w-4" /> },
    { id: "QRIS", label: "QRIS", icon: <QrCode className="h-4 w-4" /> },
    { id: "Transfer", label: "Transfer", icon: <ArrowLeftRight className="h-4 w-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden" aria-describedby="pickup-desc">
        <DialogHeader className="p-5 border-b bg-muted/20">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ScanLine className="h-5 w-5 text-primary" />
            Pengambilan Unit
          </DialogTitle>
          <DialogDescription id="pickup-desc" className="text-xs">
            Scan barcode atau masukkan kode pengambilan secara manual.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* ── Step: search ─────────────────────────────────────────── */}
          {step === "search" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Kode Pengambilan / ID Tiket</Label>
                <div className="flex gap-2">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Contoh: A3F9C2"
                    className="font-mono tracking-widest text-center text-base h-11"
                    autoFocus
                  />
                  <Button onClick={handleSearch} disabled={loading || !code.trim()} className="h-11 px-4">
                    {loading ? "..." : <KeyRound className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <p className="text-[11px] text-muted-foreground text-center">
                Kode pengambilan tertera di struk servis pelanggan.
              </p>
            </>
          )}

          {/* ── Step: confirm ────────────────────────────────────────── */}
          {step === "confirm" && foundTicket && (
            <>
              <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold">{foundTicket.deviceModel}</p>
                    <p className="text-xs text-muted-foreground">{foundTicket.customerName}</p>
                  </div>
                  <span className="font-mono text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">
                    {foundTicket.pickupCode}
                  </span>
                </div>
                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Total Tagihan</span>
                    <span className="text-base font-black text-primary">{formatCurrency(totalCost)}</span>
                  </div>
                  {dpPaid > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">DP Sudah Dibayar</span>
                        <span className="text-sm font-bold text-blue-600">- {formatCurrency(dpPaid)}</span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-1">
                        <span className="text-xs font-bold text-foreground">Sisa yang Harus Dibayar</span>
                        <span className="text-base font-black text-emerald-600">{formatCurrency(remainingAmount)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Nama Penerima (opsional)</Label>
                <Input
                  value={pickedUpBy}
                  onChange={(e) => setPickedUpBy(e.target.value)}
                  placeholder="Nama yang mengambil unit..."
                  className="h-9 text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-9 text-xs" onClick={() => setStep("search")}>
                  Kembali
                </Button>
                <Button
                  className="flex-1 h-9 text-xs gap-1.5"
                  onClick={() => setStep("payment")}
                >
                  Lanjut ke Pembayaran
                </Button>
              </div>
            </>
          )}

          {/* ── Step: payment ────────────────────────────────────────── */}
          {step === "payment" && foundTicket && (
            <>
              {/* Ticket summary */}
              <div className="rounded-xl border bg-muted/20 p-3 space-y-1">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold">{foundTicket.deviceModel}</p>
                    <p className="text-[10px] text-muted-foreground">{foundTicket.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest">{dpPaid > 0 ? 'Sisa Tagihan' : 'Total'}</p>
                    <p className="text-sm font-black text-primary">{formatCurrency(remainingAmount)}</p>
                    {dpPaid > 0 && <p className="text-[9px] text-blue-600">DP {formatCurrency(dpPaid)} sudah dibayar</p>}
                  </div>
                </div>
              </div>

              {/* Payment method selector */}
              <div className="space-y-1.5">
                <Label className="text-xs">Metode Pembayaran</Label>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all",
                        paymentMethod === m.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {m.icon}
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount paid input */}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {paymentMethod === "Cash" ? "Nominal Uang Diterima" : "Nominal Pembayaran"}
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={amountPaidStr}
                  onChange={(e) => {
                    setAmountPaidStr(e.target.value);
                    setAmountPaid(Number(e.target.value) || 0);
                  }}
                  placeholder={`Contoh: ${remainingAmount}`}
                  className="h-10 text-sm font-mono"
                />
                {paymentMethod === "Cash" && amountPaid > 0 && amountPaid < remainingAmount && (
                  <p className="text-[11px] text-red-500">
                    Kurang {formatCurrency(remainingAmount - amountPaid)}
                  </p>
                )}
              </div>

              {/* Change display for Cash */}
              {paymentMethod === "Cash" && amountPaid >= totalCost && (
                <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                  <span className="text-xs font-semibold text-emerald-700">Kembalian</span>
                  <span className="text-base font-black text-emerald-700">{formatCurrency(kembalian)}</span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-9 text-xs" onClick={() => setStep("confirm")}>
                  Kembali
                </Button>
                <Button
                  className="flex-1 h-9 text-xs gap-1.5"
                  onClick={handleConfirm}
                  disabled={loading || !isPaymentValid}
                >
                  {loading ? "..." : (
                    <>
                      <Check className="h-4 w-4" />
                      Konfirmasi Pembayaran
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* ── Step: done ───────────────────────────────────────────── */}
          {step === "done" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="h-7 w-7 text-emerald-600" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-bold">Pengambilan Berhasil!</p>
                <p className="text-xs text-muted-foreground">
                  Unit telah diserahkan dan transaksi tercatat.
                </p>
              </div>
              <Button
                className="w-full h-9 text-xs"
                onClick={() => { onOpenChange(false); reset(); }}
              >
                Selesai
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
