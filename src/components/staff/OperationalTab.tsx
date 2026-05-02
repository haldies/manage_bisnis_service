import { useState } from "react";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatsCard } from "@/components/ui/stats-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, PlusCircle, Wallet, CalendarDays, Inbox, Timer } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface OperationalTabProps {
  users: any[];
  cashAdvances: any[];
  leaveRequests: any[];
  overtimes: any[];
  addCashAdvance: (advance: any) => void;
  updateCashAdvance: (id: string, updates: any) => void;
  addLeaveRequest: (request: any) => void;
  updateLeaveRequest: (id: string, updates: any) => void;
  addOvertime: (overtime: any) => void;
  updateOvertime: (id: string, updates: any) => void;
}

export function OperationalTab({
  users, cashAdvances, leaveRequests, overtimes = [],
  addCashAdvance, updateCashAdvance,
  addLeaveRequest, updateLeaveRequest,
  addOvertime, updateOvertime
}: OperationalTabProps) {
  // Dialog States
  const [isAdvanceOpen, setIsAdvanceOpen] = useState(false);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [isOvertimeOpen, setIsOvertimeOpen] = useState(false);

  // Form States
  const [advanceForm, setAdvanceForm] = useState({
    amount: "",
    reason: "",
    employeeId: ""
  });

  const [leaveForm, setLeaveForm] = useState({
    type: "Izin",
    reason: "",
    employeeId: "",
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const [overtimeForm, setOvertimeForm] = useState({
    hours: "",
    reason: "",
    employeeId: "",
    date: new Date().toISOString().split('T')[0]
  });

  const pendingAdvances = cashAdvances.filter(c => c.status === 'Pending');
  const pendingLeaves = leaveRequests.filter(l => l.status === 'Pending');
  const pendingOvertimes = overtimes.filter(o => o.status === 'Pending');

  const handleAddAdvance = () => {
    if (!advanceForm.amount || !advanceForm.employeeId) return;
    addCashAdvance({
      amount: parseInt(advanceForm.amount),
      reason: advanceForm.reason || "Kasbon",
      employeeId: advanceForm.employeeId,
      date: new Date(),
      status: 'Pending'
    });
    setIsAdvanceOpen(false);
    setAdvanceForm({ amount: "", reason: "", employeeId: "" });
  };

  const handleAddLeave = () => {
    if (!leaveForm.employeeId || !leaveForm.reason) return;
    addLeaveRequest({
      type: leaveForm.type,
      reason: leaveForm.reason,
      employeeId: leaveForm.employeeId,
      startDate: new Date(leaveForm.startDate),
      endDate: new Date(leaveForm.endDate),
      status: 'Pending'
    });
    setIsLeaveOpen(false);
    setLeaveForm({
      type: "Izin",
      reason: "",
      employeeId: "",
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleAddOvertime = () => {
    if (!overtimeForm.employeeId || !overtimeForm.hours) return;
    addOvertime({
      hours: parseFloat(overtimeForm.hours),
      reason: overtimeForm.reason || "Lembur",
      employeeId: overtimeForm.employeeId,
      date: new Date(overtimeForm.date),
      status: 'Pending'
    });
    setIsOvertimeOpen(false);
    setOvertimeForm({
      hours: "",
      reason: "",
      employeeId: "",
      date: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          label="Pending Kasbon"
          value={pendingAdvances.length}
          description={`${formatCurrency(pendingAdvances.reduce((s, c) => s + c.amount, 0))} Total`}
        />
        <StatsCard
          label="Pending Izin/Cuti"
          value={pendingLeaves.length}
          description="Menunggu persetujuan"
        />
        <StatsCard
          label="Pending Lembur"
          value={pendingOvertimes.length}
          description={`${pendingOvertimes.reduce((s, o) => s + o.hours, 0)} Jam Total`}
        />
      </div>

      <Tabs defaultValue="kasbon" className="w-full">
        <div className="overflow-x-auto no-scrollbar mb-6 touch-pan-x py-1">
          <TabsList className="bg-muted/30 p-1 rounded-xl w-max flex-nowrap">
            <TabsTrigger value="kasbon" className="rounded-lg px-6 font-bold text-[10px] uppercase tracking-widest shrink-0 whitespace-nowrap">Kasbon</TabsTrigger>
            <TabsTrigger value="cuti" className="rounded-lg px-6 font-bold text-[10px] uppercase tracking-widest shrink-0 whitespace-nowrap">Izin / Cuti</TabsTrigger>
            <TabsTrigger value="lembur" className="rounded-lg px-6 font-bold text-[10px] uppercase tracking-widest shrink-0 whitespace-nowrap">Lembur</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="kasbon" className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <div className="flex flex-col">
              <h4 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/60">Log Pengajuan Kasbon</h4>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-[9px] font-black uppercase tracking-widest px-4 border-border/40 hover:bg-muted rounded-lg" onClick={() => setIsAdvanceOpen(true)}>
              Tambah
            </Button>
          </div>
          <div className="bg-card border border-border/40 rounded-xl overflow-hidden">
            <Table>
              <TableBody>
                {cashAdvances.length === 0 ? (
                  <TableRow><TableCell className="h-32 text-center opacity-20"><span className="text-[10px] font-bold uppercase tracking-widest">Belum ada data</span></TableCell></TableRow>
                ) : (
                  cashAdvances.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/5 border-b border-border/10 last:border-0">
                      <TableCell className="py-3 pl-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-[11px]">{users.find(u => u.id === c.employeeId)?.name || 'User'}</span>
                          <span className="text-[9px] text-muted-foreground opacity-60 uppercase font-bold tracking-tight">{c.reason}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="font-black text-[11px] text-primary">{formatCurrency(c.amount)}</span>
                          <Badge className={cn("text-[8px] font-black uppercase px-2 py-0 border-none shadow-none", c.status === 'Pending' ? "bg-amber-100 text-amber-700" : c.status === 'Approved' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>{c.status}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-right pr-6">
                        {c.status === 'Pending' && (
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" className="h-6 px-2 text-[9px] font-black uppercase text-emerald-600 hover:bg-emerald-50 rounded-md" onClick={() => updateCashAdvance(c.id, { status: 'Approved' })}>Setujui</Button>
                            <Button variant="ghost" className="h-6 px-2 text-[9px] font-black uppercase text-red-600 hover:bg-red-50 rounded-md" onClick={() => updateCashAdvance(c.id, { status: 'Rejected' })}>Tolak</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="cuti" className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <div className="flex flex-col">
              <h4 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/60">Log Izin / Cuti</h4>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-[9px] font-black uppercase tracking-widest px-4 border-border/40 hover:bg-muted rounded-lg" onClick={() => setIsLeaveOpen(true)}>
              Tambah
            </Button>
          </div>
          <div className="bg-card border border-border/40 rounded-xl overflow-hidden">
            <Table>
              <TableBody>
                {leaveRequests.length === 0 ? (
                  <TableRow><TableCell className="h-32 text-center opacity-20"><span className="text-[10px] font-bold uppercase tracking-widest">Belum ada data</span></TableCell></TableRow>
                ) : (
                  leaveRequests.map((l) => (
                    <TableRow key={l.id} className="hover:bg-muted/5 border-b border-border/10 last:border-0">
                      <TableCell className="py-3 pl-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-[11px]">{users.find(u => u.id === l.employeeId)?.name || 'User'}</span>
                          <span className="text-[9px] text-muted-foreground opacity-60 uppercase font-bold tracking-tight">{l.type}: {l.reason}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[9px] font-black uppercase text-muted-foreground opacity-50">{new Date(l.startDate).toLocaleDateString()}</span>
                          <Badge className={cn("text-[8px] font-black uppercase px-2 py-0 border-none shadow-none", l.status === 'Pending' ? "bg-amber-100 text-amber-700" : l.status === 'Approved' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>{l.status}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-right pr-6">
                        {l.status === 'Pending' && (
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" className="h-6 px-2 text-[9px] font-black uppercase text-emerald-600 hover:bg-emerald-50 rounded-md" onClick={() => updateLeaveRequest(l.id, { status: 'Approved' })}>Setujui</Button>
                            <Button variant="ghost" className="h-6 px-2 text-[9px] font-black uppercase text-red-600 hover:bg-red-50 rounded-md" onClick={() => updateLeaveRequest(l.id, { status: 'Rejected' })}>Tolak</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="lembur" className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <div className="flex flex-col">
              <h4 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/60">Log Lembur</h4>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-[9px] font-black uppercase tracking-widest px-4 border-border/40 hover:bg-muted rounded-lg" onClick={() => setIsOvertimeOpen(true)}>
              Tambah
            </Button>
          </div>
          <div className="bg-card border border-border/40 rounded-xl overflow-hidden">
            <Table>
              <TableBody>
                {overtimes.length === 0 ? (
                  <TableRow><TableCell className="h-32 text-center opacity-20"><span className="text-[10px] font-bold uppercase tracking-widest">Belum ada data</span></TableCell></TableRow>
                ) : (
                  overtimes.map((o) => (
                    <TableRow key={o.id} className="hover:bg-muted/5 border-b border-border/10 last:border-0">
                      <TableCell className="py-3 pl-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-[11px]">{users.find(u => u.id === o.employeeId)?.name || 'User'}</span>
                          <span className="text-[9px] text-muted-foreground opacity-60 uppercase font-bold tracking-tight">{o.reason}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="font-black text-[11px] text-emerald-600">{o.hours} Jam</span>
                          <Badge className={cn("text-[8px] font-black uppercase px-2 py-0 border-none shadow-none", o.status === 'Pending' ? "bg-amber-100 text-amber-700" : o.status === 'Approved' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>{o.status}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-right pr-6">
                        {o.status === 'Pending' && (
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" className="h-6 px-2 text-[9px] font-black uppercase text-emerald-600 hover:bg-emerald-50 rounded-md" onClick={() => updateOvertime(o.id, { status: 'Approved' })}>Setujui</Button>
                            <Button variant="ghost" className="h-6 px-2 text-[9px] font-black uppercase text-red-600 hover:bg-red-50 rounded-md" onClick={() => updateOvertime(o.id, { status: 'Rejected' })}>Tolak</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Cash Advance Dialog */}
      <Dialog open={isAdvanceOpen} onOpenChange={setIsAdvanceOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-foreground text-background">
            <DialogTitle className="text-xl font-bold uppercase tracking-widest">Ajukan Kasbon</DialogTitle>
            <DialogDescription className="sr-only">Formulir untuk mengajukan pinjaman tunai atau kasbon bagi karyawan.</DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Pilih Pegawai</Label>
              <Select onValueChange={(val) => setAdvanceForm({ ...advanceForm, employeeId: val })}>
                <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none px-6 font-bold"><SelectValue placeholder="Pilih Pegawai" /></SelectTrigger>
                <SelectContent className="rounded-2xl">{users.map(u => (<SelectItem key={u.id} value={u.id} className="py-3">{u.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Jumlah Kasbon (Rp)</Label>
              <Input type="number" className="h-12 rounded-2xl bg-muted/20 border-none px-6 font-black text-lg text-primary" placeholder="0" value={advanceForm.amount} onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Alasan / Keperluan</Label>
              <Input className="h-12 rounded-2xl bg-muted/20 border-none px-6 font-medium" placeholder="Contoh: Kebutuhan mendesak" value={advanceForm.reason} onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="p-8 pt-2 flex flex-col gap-3">
            <Button onClick={handleAddAdvance} className="h-12 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 w-full">Kirim Pengajuan</Button>
            <Button variant="ghost" onClick={() => setIsAdvanceOpen(false)} className="h-12 rounded-2xl font-bold opacity-40">Batal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Request Dialog */}
      <Dialog open={isLeaveOpen} onOpenChange={setIsLeaveOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-foreground text-background">
            <DialogTitle className="text-xl font-bold uppercase tracking-widest">Input Izin / Cuti</DialogTitle>
            <DialogDescription className="sr-only">Formulir untuk mencatat ketidakhadiran resmi seperti izin, sakit, atau cuti.</DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Pilih Pegawai</Label>
              <Select onValueChange={(val) => setLeaveForm({ ...leaveForm, employeeId: val })}>
                <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none px-6 font-bold"><SelectValue placeholder="Pilih Pegawai" /></SelectTrigger>
                <SelectContent className="rounded-2xl">{users.map(u => (<SelectItem key={u.id} value={u.id} className="py-3">{u.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tipe</Label>
                <Select value={leaveForm.type} onValueChange={(val) => setLeaveForm({ ...leaveForm, type: val })}>
                  <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none px-6 font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl"><SelectItem value="Izin" className="py-3">Izin</SelectItem><SelectItem value="Sakit" className="py-3">Sakit</SelectItem><SelectItem value="Cuti" className="py-3">Cuti</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tanggal</Label>
                <Input type="date" className="h-12 rounded-2xl bg-muted/20 border-none px-6 font-bold" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value, endDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Alasan</Label>
              <Input className="h-12 rounded-2xl bg-muted/20 border-none px-6 font-medium" placeholder="Alasan cuti..." value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="p-8 pt-2 flex flex-col gap-3">
            <Button onClick={handleAddLeave} className="h-12 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 w-full">Simpan Izin</Button>
            <Button variant="ghost" onClick={() => setIsLeaveOpen(false)} className="h-12 rounded-2xl font-bold opacity-40">Batal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overtime Dialog */}
      <Dialog open={isOvertimeOpen} onOpenChange={setIsOvertimeOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-foreground text-background">
            <DialogTitle className="text-xl font-bold uppercase tracking-widest">Input Lembur</DialogTitle>
            <DialogDescription className="sr-only">Formulir untuk mencatat jam kerja tambahan atau lembur karyawan.</DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Pilih Pegawai</Label>
              <Select onValueChange={(val) => setOvertimeForm({ ...overtimeForm, employeeId: val })}>
                <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none px-6 font-bold"><SelectValue placeholder="Pilih Pegawai" /></SelectTrigger>
                <SelectContent className="rounded-2xl">{users.map(u => (<SelectItem key={u.id} value={u.id} className="py-3">{u.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Jumlah Jam</Label>
                <Input type="number" step="0.5" className="h-12 rounded-2xl bg-muted/20 border-none px-6 font-black text-lg" placeholder="0" value={overtimeForm.hours} onChange={(e) => setOvertimeForm({ ...overtimeForm, hours: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tanggal</Label>
                <Input type="date" className="h-12 rounded-2xl bg-muted/20 border-none px-6 font-bold" value={overtimeForm.date} onChange={(e) => setOvertimeForm({ ...overtimeForm, date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Keterangan / Jobdesk</Label>
              <Input className="h-12 rounded-2xl bg-muted/20 border-none px-6 font-medium" placeholder="Mengerjakan apa..." value={overtimeForm.reason} onChange={(e) => setOvertimeForm({ ...overtimeForm, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="p-8 pt-2 flex flex-col gap-3">
            <Button onClick={handleAddOvertime} className="h-12 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 w-full">Simpan Lembur</Button>
            <Button variant="ghost" onClick={() => setIsOvertimeOpen(false)} className="h-12 rounded-2xl font-bold opacity-40">Batal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
