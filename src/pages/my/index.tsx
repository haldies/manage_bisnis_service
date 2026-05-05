"use client";
import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { usePosStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { ChevronRight, Banknote, CalendarOff, Clock } from "lucide-react";

type Sheet = "kasbon" | "cuti" | "lembur" | null;

const LEAVE_TYPES = ["Sakit", "Cuti Tahunan", "Izin", "Libur Nasional"] as const;

function StatusPill({ status }: { status: string }) {
  if (status === "Approved") return <span className="text-[10px] font-semibold text-emerald-600">Disetujui</span>;
  if (status === "Rejected") return <span className="text-[10px] font-semibold text-red-500">Ditolak</span>;
  return <span className="text-[10px] font-semibold text-muted-foreground">Menunggu</span>;
}

export default function MyPortalPage() {
  const {
    currentUser,
    cashAdvances, addCashAdvance,
    leaveRequests, addLeaveRequest,
    overtimes, addOvertime,
  } = usePosStore();

  const [sheet, setSheet] = useState<Sheet>(null);
  const [loading, setLoading] = useState(false);

  const [kasbonForm, setKasbonForm] = useState({ amount: "", reason: "" });
  const [cutiForm, setCutiForm] = useState({
    type: "Cuti Tahunan" as typeof LEAVE_TYPES[number],
    startDate: "", endDate: "", reason: "",
  });
  const [lemburForm, setLemburForm] = useState({ date: "", hours: "", reason: "" });

  if (!currentUser) return null;

  const myKasbon = cashAdvances
    .filter(c => c.employeeId === currentUser.id)
    .sort((a, b) => b.date - a.date)
    .slice(0, 5);

  const myCuti = leaveRequests
    .filter(l => l.employeeId === currentUser.id)
    .sort((a, b) => b.startDate - a.startDate)
    .slice(0, 5);

  const myLembur = (overtimes || [])
    .filter((o: any) => o.employeeId === currentUser.id)
    .sort((a: any, b: any) => b.date - a.date)
    .slice(0, 5);

  const today = new Date().toISOString().split("T")[0];

  const handleSubmitKasbon = async () => {
    if (!kasbonForm.amount || !kasbonForm.reason) return;
    setLoading(true);
    try {
      await addCashAdvance({
        employeeId: currentUser.id,
        amount: parseInt(kasbonForm.amount),
        reason: kasbonForm.reason,
        date: Date.now(),
        status: "Pending",
      });
      setKasbonForm({ amount: "", reason: "" });
      setSheet(null);
    } finally { setLoading(false); }
  };

  const handleSubmitCuti = async () => {
    if (!cutiForm.startDate || !cutiForm.reason) return;
    setLoading(true);
    try {
      await addLeaveRequest({
        employeeId: currentUser.id,
        type: cutiForm.type,
        startDate: new Date(cutiForm.startDate).getTime(),
        endDate: new Date(cutiForm.endDate || cutiForm.startDate).getTime(),
        reason: cutiForm.reason,
        status: "Pending",
      });
      setCutiForm({ type: "Cuti Tahunan", startDate: "", endDate: "", reason: "" });
      setSheet(null);
    } finally { setLoading(false); }
  };

  const handleSubmitLembur = async () => {
    if (!lemburForm.date || !lemburForm.hours) return;
    setLoading(true);
    try {
      await addOvertime({
        employeeId: currentUser.id,
        date: new Date(lemburForm.date).getTime(),
        hours: parseFloat(lemburForm.hours),
        reason: lemburForm.reason || "Lembur",
        status: "Pending",
      });
      setLemburForm({ date: "", hours: "", reason: "" });
      setSheet(null);
    } finally { setLoading(false); }
  };

  return (
    <Layout title="Portal Saya" requiredModule="Staff" requiredLevel="Read">
      <div className="max-w-md mx-auto pb-24 animate-in fade-in duration-300">

        {/* Profile header */}
        <div className="py-6 px-1 border-b border-border/40">
          <p className="text-base font-bold">{currentUser.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{currentUser.role?.name}</p>
        </div>

        {/* Menu list */}
        <div className="divide-y divide-border/40">
          {[
            { id: "kasbon" as Sheet, label: "Kasbon", icon: Banknote, desc: "Ajukan pinjaman" },
            { id: "cuti" as Sheet, label: "Izin / Cuti", icon: CalendarOff, desc: "Ajukan izin atau cuti" },
            { id: "lembur" as Sheet, label: "Lembur", icon: Clock, desc: "Catat jam lembur" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSheet(item.id)}
              className="w-full flex items-center gap-4 py-4 px-1 hover:bg-muted/30 transition-colors text-left"
            >
              <div className="h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                <item.icon className="h-4 w-4 text-foreground/70" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            </button>
          ))}
        </div>

        {/* Riwayat */}
        {(myKasbon.length > 0 || myCuti.length > 0 || myLembur.length > 0) && (
          <div className="mt-8 space-y-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Riwayat Terbaru</p>

            {myKasbon.length > 0 && (
              <div className="space-y-0 divide-y divide-border/30 rounded-xl border border-border/40 overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/20">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Kasbon</p>
                </div>
                {myKasbon.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">{formatCurrency(c.amount)}</p>
                      <p className="text-xs text-muted-foreground">{c.reason}</p>
                    </div>
                    <StatusPill status={c.status} />
                  </div>
                ))}
              </div>
            )}

            {myCuti.length > 0 && (
              <div className="space-y-0 divide-y divide-border/30 rounded-xl border border-border/40 overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/20">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Izin / Cuti</p>
                </div>
                {myCuti.map((l) => (
                  <div key={l.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">{l.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(l.startDate).toLocaleDateString("id-ID")}
                        {l.endDate && l.endDate !== l.startDate
                          ? ` — ${new Date(l.endDate).toLocaleDateString("id-ID")}`
                          : ""}
                      </p>
                    </div>
                    <StatusPill status={l.status} />
                  </div>
                ))}
              </div>
            )}

            {myLembur.length > 0 && (
              <div className="space-y-0 divide-y divide-border/30 rounded-xl border border-border/40 overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/20">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lembur</p>
                </div>
                {myLembur.map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">{o.hours} jam</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.date).toLocaleDateString("id-ID")} · {o.reason}
                      </p>
                    </div>
                    <StatusPill status={o.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Sheet: Kasbon ── */}
      <Dialog open={sheet === "kasbon"} onOpenChange={(v) => !v && setSheet(null)}>
        <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden" aria-describedby="kasbon-desc">
          <DialogHeader className="p-5 border-b">
            <DialogTitle className="text-base font-bold">Ajukan Kasbon</DialogTitle>
            <DialogDescription id="kasbon-desc" className="text-xs text-muted-foreground">
              Pengajuan akan diproses oleh manajemen.
            </DialogDescription>
          </DialogHeader>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Jumlah (Rp)</label>
              <Input
                type="number"
                placeholder="500000"
                value={kasbonForm.amount}
                onChange={(e) => setKasbonForm(f => ({ ...f, amount: e.target.value }))}
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Alasan</label>
              <Textarea
                placeholder="Keperluan kasbon..."
                value={kasbonForm.reason}
                onChange={(e) => setKasbonForm(f => ({ ...f, reason: e.target.value }))}
                className="resize-none text-sm min-h-[80px]"
              />
            </div>
          </div>
          <div className="p-5 pt-0 flex gap-2">
            <Button variant="outline" className="flex-1 h-10 text-xs" onClick={() => setSheet(null)}>Batal</Button>
            <Button
              className="flex-1 h-10 text-xs"
              onClick={handleSubmitKasbon}
              disabled={loading || !kasbonForm.amount || !kasbonForm.reason}
            >
              {loading ? "Menyimpan..." : "Ajukan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Sheet: Izin/Cuti ── */}
      <Dialog open={sheet === "cuti"} onOpenChange={(v) => !v && setSheet(null)}>
        <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden" aria-describedby="cuti-desc">
          <DialogHeader className="p-5 border-b">
            <DialogTitle className="text-base font-bold">Ajukan Izin / Cuti</DialogTitle>
            <DialogDescription id="cuti-desc" className="text-xs text-muted-foreground">
              Pengajuan akan diproses oleh manajemen.
            </DialogDescription>
          </DialogHeader>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Jenis</label>
              <Select value={cutiForm.type} onValueChange={(v) => setCutiForm(f => ({ ...f, type: v as any }))}>
                <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Mulai</label>
                <Input type="date" value={cutiForm.startDate} min={today}
                  onChange={(e) => setCutiForm(f => ({ ...f, startDate: e.target.value }))}
                  className="h-10 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Selesai</label>
                <Input type="date" value={cutiForm.endDate} min={cutiForm.startDate || today}
                  onChange={(e) => setCutiForm(f => ({ ...f, endDate: e.target.value }))}
                  className="h-10 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Keterangan</label>
              <Textarea
                placeholder="Alasan izin/cuti..."
                value={cutiForm.reason}
                onChange={(e) => setCutiForm(f => ({ ...f, reason: e.target.value }))}
                className="resize-none text-sm min-h-[80px]"
              />
            </div>
          </div>
          <div className="p-5 pt-0 flex gap-2">
            <Button variant="outline" className="flex-1 h-10 text-xs" onClick={() => setSheet(null)}>Batal</Button>
            <Button
              className="flex-1 h-10 text-xs"
              onClick={handleSubmitCuti}
              disabled={loading || !cutiForm.startDate || !cutiForm.reason}
            >
              {loading ? "Menyimpan..." : "Ajukan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Sheet: Lembur ── */}
      <Dialog open={sheet === "lembur"} onOpenChange={(v) => !v && setSheet(null)}>
        <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden" aria-describedby="lembur-desc">
          <DialogHeader className="p-5 border-b">
            <DialogTitle className="text-base font-bold">Ajukan Lembur</DialogTitle>
            <DialogDescription id="lembur-desc" className="text-xs text-muted-foreground">
              Pengajuan akan diproses oleh manajemen.
            </DialogDescription>
          </DialogHeader>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Tanggal</label>
              <Input type="date" value={lemburForm.date} max={today}
                onChange={(e) => setLemburForm(f => ({ ...f, date: e.target.value }))}
                className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Jumlah Jam</label>
              <Input
                type="number" min="0.5" step="0.5" placeholder="2"
                value={lemburForm.hours}
                onChange={(e) => setLemburForm(f => ({ ...f, hours: e.target.value }))}
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Keterangan</label>
              <Textarea
                placeholder="Pekerjaan yang dilakukan..."
                value={lemburForm.reason}
                onChange={(e) => setLemburForm(f => ({ ...f, reason: e.target.value }))}
                className="resize-none text-sm min-h-[80px]"
              />
            </div>
          </div>
          <div className="p-5 pt-0 flex gap-2">
            <Button variant="outline" className="flex-1 h-10 text-xs" onClick={() => setSheet(null)}>Batal</Button>
            <Button
              className="flex-1 h-10 text-xs"
              onClick={handleSubmitLembur}
              disabled={loading || !lemburForm.date || !lemburForm.hours}
            >
              {loading ? "Menyimpan..." : "Ajukan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
