"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Plus, X, ArrowRight, Check,
  Printer, Share2, RotateCcw, AlertTriangle, ShoppingCart
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { usePosStore } from "@/lib/store";
import { formatCurrency, cn } from "@/lib/utils";
import { ServiceStatus, ServiceTicket } from "@/lib/types";
import PurchaseOrderDialog from "@/components/suppliers/PurchaseOrderDialog";
import ServiceChecklist, { DEFAULT_PRE_CHECK } from "@/components/service/ServiceChecklist";
import ReturnDialog from "@/components/service/ReturnDialog";
import { useAuth } from "@/hooks/useAuth";


interface ServiceDetailDialogProps {
  ticket: ServiceTicket | null;
  onClose: () => void;
  onUpdate: (updatedTicket: ServiceTicket) => void;
}

export default function ServiceDetailDialog({ ticket, onClose, onUpdate }: ServiceDetailDialogProps) {
  const {
    updateServiceTicket, users,
    currentUser, fetchServices, serviceTypes,
  } = usePosStore();

  // Fine-grained permission checks for Service module
  const { can, isTechnician: userIsTechnician } = useAuth();
  const canCreate  = can('Service', 'create');   // registrasi tiket baru
  const canUpdate  = can('Service', 'update');   // edit status, diagnosa, sparepart
  const canDelete  = can('Service', 'delete');   // hapus tiket / batalkan
  const canViewBilling = !userIsTechnician;      // teknisi tidak lihat tagihan

  const [localTicket, setLocalTicket] = useState<ServiceTicket | null>(null);
  const [spareparts, setSpareparts] = useState<any[]>([]);

  const [openSparepart, setOpenSparepart] = useState(false);
  const [openServiceType, setOpenServiceType] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [isPODialogOpen, setIsPODialogOpen] = useState(false);

  // Inline pickup payment state
  const [pickupPayMethod, setPickupPayMethod] = useState<'Cash' | 'QRIS' | 'Transfer' | null>(null);
  const [pickupCashInput, setPickupCashInput] = useState('');
  const [pickupLoading, setPickupLoading] = useState(false);
  const [pickupError, setPickupError] = useState('');

  // Fetch spareparts from dedicated API endpoint
  const fetchSpareparts = useCallback(async (branchId: string) => {
    try {
      const res = await fetch(`/api/inventory/spareparts?branchId=${branchId}`);
      if (res.ok) {
        const data = await res.json();
        setSpareparts(data.map((item: any) => ({
          ...item,
          stock: item.stocks?.[0]?.quantity || 0,
        })));
      }
    } catch (err) {
      console.error('[Spareparts] Failed to fetch:', err);
    }
  }, []);

  useEffect(() => {
    if (ticket) {
      setLocalTicket({ ...ticket });
      fetchSpareparts(ticket.branchId);
    } else {
      setLocalTicket(null);
      setSpareparts([]);
    }
    // Reset pickup state when ticket changes
    setPickupPayMethod(null);
    setPickupCashInput('');
    setPickupError('');
  }, [ticket, fetchSpareparts]);

  if (!localTicket) return null;

  // Use hook-based flag (replaces hardcoded role name check)
  const isTechnician = userIsTechnician;

  // Filter teknisi: prioritas role Technician, fallback semua user aktif
  const technicianUsers = users.filter(u =>
    (u.role as any)?.permissions?.some((p: any) => p.module === 'Service' && (p.canCreate || p.canUpdate))
  );
  const techList = technicianUsers.length > 0 ? technicianUsers : users;

  const totalCost = (localTicket.spareparts?.reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 1), 0) ?? 0) + (Number(localTicket.serviceFee) || 0);

  // ── Read-only rules ──────────────────────────────────────────────────
  // Pre-check: teknisi (atau siapapun yang punya canUpdate) bisa edit saat PENDING/IN_PROGRESS/ON_HOLD
  const isPreCheckReadOnly = !canUpdate ||
    !['Pending', 'InProgress', 'OnHold'].includes(localTicket.status);

  // Diagnosa: bisa edit jika punya canUpdate dan status masih aktif
  const isDiagnosisReadOnly = !canUpdate ||
    localTicket.status === 'Completed' ||
    localTicket.status === 'ReadyForPickup';

  // Return button: muncul saat Completed, hanya untuk yang punya canUpdate
  const showReturnButton = localTicket.status === 'Completed' && canUpdate;
  const isWarrantyExpired = localTicket.warrantyExpiry ? localTicket.warrantyExpiry <= Date.now() : true;

  const handleNextAction = async () => {
    if (localTicket.status === 'Pending') {
      // Kasir/Admin: mulai pengerjaan
      performSave({ ...localTicket, status: 'InProgress' as ServiceStatus });
    } else if (localTicket.status === 'OnHold') {
      // Lanjut pengerjaan dari tunggu sparepart
      performSave({ ...localTicket, status: 'InProgress' as ServiceStatus });
    }
  };

  // Teknisi: tandai selesai → cek dulu apakah ada sparepart yang perlu dipesan
  const handleTechDone = async () => {
    if (!localTicket.diagnosis || localTicket.diagnosis.length < 5) {
      alert("Wajib mengisi Hasil Pengecekan & Diagnosa minimal 5 karakter.");
      return;
    }
    // Jika ada sparepart stok habis → otomatis OnHold, bukan ReadyForPickup
    const hasNeedsOrder = localTicket.spareparts?.some(p => (p as any).needsOrder);
    if (hasNeedsOrder) {
      const names = localTicket.spareparts
        .filter(p => (p as any).needsOrder)
        .map(p => p.name || 'Item')
        .join(', ');
      alert(`Sparepart berikut stoknya habis dan perlu dipesan dulu:\n${names}\n\nTiket akan masuk Tertunda (ON_HOLD).`);
      performSave({ ...localTicket, status: 'OnHold' as ServiceStatus });
      return;
    }
    performSave({ ...localTicket, status: 'ReadyForPickup' as ServiceStatus });
  };

  // Kasir: konfirmasi harga → set siap diambil
  const handleCashierConfirm = async () => {
    if (localTicket.serviceFee === 0 && (!localTicket.spareparts || localTicket.spareparts.length === 0)) {
      alert("Wajib mengisi minimal satu biaya jasa atau sparepart sebelum konfirmasi.");
      return;
    }
    performSave({ ...localTicket, status: 'ReadyForPickup' as ServiceStatus });
  };

  const performSave = async (ticketToSave: ServiceTicket) => {
    // Close dialog immediately — optimistic update
    onUpdate(ticketToSave);
    onClose();

    // Process in background, then refresh store from server
    updateServiceTicket(ticketToSave.id, {
      status: ticketToSave.status,
      diagnosis: ticketToSave.diagnosis,
      serviceFee: ticketToSave.serviceFee,
      spareparts: ticketToSave.spareparts,
      technicianId: ticketToSave.technicianId,
      preCheckData: ticketToSave.preCheckData,
      postCheckData: ticketToSave.postCheckData,
      warrantyDays: ticketToSave.warrantyDays,
      paymentStatus: ticketToSave.paymentStatus,
      dpAmount: ticketToSave.dpAmount,
    }).then(() => {
      // Refresh agar field server-side (readyAt, pickupCode, dll) ikut terupdate
      fetchServices().catch(console.error);
    }).catch(console.error);
  };

  const handleSaveOnly = () => {
    performSave(localTicket);
  };

  // ── Inline pickup: konfirmasi pembayaran langsung dari dialog ──────────────
  const handleInlinePickup = async (method: 'Cash' | 'QRIS' | 'Transfer') => {
    if (!localTicket) return;
    const amountPaid = method === 'Cash' ? (Number(pickupCashInput) || 0) : totalCost;
    if (method === 'Cash' && amountPaid < totalCost) {
      setPickupError(`Uang kurang ${formatCurrency(totalCost - amountPaid)}`);
      return;
    }
    setPickupLoading(true);
    setPickupError('');
    try {
      const res = await fetch('/api/services/pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: localTicket.pickupCode,
          confirm: true,
          pickedUpBy: 'Pelanggan',
          paymentMethod: method,
          amountPaid,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPickupError(data.message || 'Gagal konfirmasi');
        return;
      }
      onUpdate(data.ticket);
      onClose();
    } catch {
      setPickupError('Gagal menghubungi server');
    } finally {
      setPickupLoading(false);
    }
  };

  return (
    <>
      <Dialog open={!!ticket} onOpenChange={(v) => {
        if (!v) handleSaveOnly();
      }}>
        <DialogContent className="sm:max-w-xl w-[95vw] p-0 overflow-hidden rounded-2xl max-h-[95vh] flex flex-col" aria-describedby={undefined}>

          <DialogHeader className="p-4 sm:p-5 shrink-0 border-b">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pr-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 sm:gap-3">
                  <DialogTitle className="text-base sm:text-lg font-bold">{localTicket.deviceModel}</DialogTitle>
                  <span className="font-mono text-[8px] sm:text-[9px] text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                    #{localTicket.id.slice(-6).toUpperCase()}
                  </span>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Cetak Tanda Terima"
                      onClick={async () => {
                        try {
                          const { PrinterService } = await import('@/lib/printerService');
                          const store = usePosStore.getState();
                          const tech = store.users.find(u => u.id === localTicket.technicianId);
                          await PrinterService.printServiceIntakeReceipt(
                            localTicket, store.storeProfile, store.serviceReceiptSettings, tech?.name
                          );
                        } catch (e: any) {
                          alert(e.message || 'Gagal mencetak. Pastikan printer terhubung.');
                        }
                      }}
                    >
                      <Printer className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: `Servis ${localTicket.deviceModel}`,
                          text: `Detail servis untuk ${localTicket.customerName} (${localTicket.deviceModel}) - Status: ${localTicket.status}`,
                          url: window.location.href
                        }).catch(console.error);
                      }
                    }}>
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                    {/* Cetak Nota Selesai — hanya saat READY_FOR_PICKUP atau COMPLETED */}
                    {(localTicket.status === 'ReadyForPickup' || localTicket.status === 'Completed') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] gap-1 text-primary hover:bg-primary/10"
                        title="Cetak Nota Selesai"
                        onClick={async () => {
                          try {
                            const { PrinterService } = await import('@/lib/printerService');
                            const store = usePosStore.getState();
                            const tech = store.users.find(u => u.id === localTicket.technicianId);
                            await PrinterService.printServiceInvoice(
                              localTicket, store.storeProfile, store.serviceReceiptSettings, tech?.name
                            );
                          } catch (e: any) {
                            alert(e.message || 'Gagal mencetak. Pastikan printer terhubung.');
                          }
                        }}
                      >
                        <Printer className="h-3 w-3" />
                        <span>Nota</span>
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-0.5">
                  {localTicket.customerName} • {localTicket.customerPhone}
                </p>
              </div>
              {/* Total tagihan di header */}
              <div className="flex flex-col items-start sm:items-end">
                <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Total Tagihan</p>
                <p className="text-lg sm:text-xl font-black text-primary">{formatCurrency(totalCost)}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar space-y-4">
            <div className="pt-2">
              <Tabs defaultValue={localTicket.status === 'InProgress' ? "work" : localTicket.status === 'ReadyForPickup' ? "billing" : "summary"} className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-9 p-1">
                <TabsTrigger value="summary" className="text-[10px] uppercase font-bold">Ringkasan</TabsTrigger>
                <TabsTrigger value="work" className="text-[10px] uppercase font-bold">Pengerjaan</TabsTrigger>
                <TabsTrigger value="billing" className="text-[10px] uppercase font-bold">Biaya</TabsTrigger>
              </TabsList>

              <div className="mt-4">
                {/* ── TAB 1: SUMMARY ── */}
                <TabsContent value="summary" className="m-0 space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                  {/* Queue & Technician Info */}
                  {(localTicket.status === 'Pending' || localTicket.status === 'InProgress' || localTicket.status === 'OnHold') && (
                    <div className="px-3 sm:px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/10 rounded-xl border border-border/10">
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col min-w-[150px]">
                          <span className="text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Teknisi</span>
                          {localTicket.status === 'Pending' && !isTechnician ? (
                            <Select
                              value={localTicket.technicianId || "unassigned"}
                              onValueChange={(val) => setLocalTicket({ ...localTicket, technicianId: val === "unassigned" ? undefined : val })}
                            >
                              <SelectTrigger className="h-8 border-none bg-transparent p-0 shadow-none focus:ring-0">
                                <SelectValue placeholder="Pilih Teknisi" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Belum ditunjuk</SelectItem>
                                {techList.map(tech => (
                                  <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="text-xs font-bold text-primary mt-1">
                              {users.find(u => u.id === localTicket.technicianId)?.name || "Belum ditunjuk"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[8px] font-bold uppercase text-muted-foreground tracking-widest">Waktu Masuk</span>
                      <p className="text-xs font-medium">{new Date(localTicket.dateOpened).toLocaleString('id-ID')}</p>
                    </div>
                    {localTicket.dateClosed && (
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold uppercase text-muted-foreground tracking-widest">Waktu Selesai</span>
                        <p className="text-xs font-medium">{new Date(localTicket.dateClosed).toLocaleString('id-ID')}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest mb-1">Keluhan Pelanggan:</p>
                    <p className="text-xs font-medium text-foreground  p-3  rounded-md border ">"{localTicket.issue}"</p>
                  </div>
                </TabsContent>

                {/* ── TAB 2: TECHNICIAN WORK ── */}
                <TabsContent value="work" className="m-0 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                  {/* Pre-Check */}
                  <ServiceChecklist
                    title="Pre-Check (Kondisi Awal)"
                    data={localTicket.preCheckData}
                    onChange={(data) => setLocalTicket({ ...localTicket, preCheckData: data })}
                    defaultItems={DEFAULT_PRE_CHECK}
                    readOnly={isPreCheckReadOnly}
                    accentColor="blue"
                  />

                  {/* Diagnosa Section */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest mb-2">Hasil Pengecekan & Diagnosa</p>
                      <textarea
                        className="w-full min-h-[120px] p-4 text-xs bg-muted/20 rounded-2xl focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all no-scrollbar resize-none"
                        placeholder="Tulis hasil pengecekan teknisi di sini..."
                        value={localTicket.diagnosis || ""}
                        onChange={(e) => setLocalTicket({ ...localTicket, diagnosis: e.target.value })}
                        readOnly={isDiagnosisReadOnly}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* ── TAB 3: BILLING ── */}
                <TabsContent value="billing" className="m-0 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Daftar Sparepart & Jasa</span>
                        <div className="px-2 py-0.5 rounded-full text-[9px] font-black  text-muted-foreground">
                          {localTicket.spareparts?.length || 0} Item
                        </div>
                      </div>

                      {/* Banner info untuk teknisi — dihapus, teknisi input harga sendiri */}

                      <div className="space-y-1 py-1">
                        {/* Jasa Servis Utama */}
                        {(localTicket.serviceFee || 0) > 0 && (
                          <div className="flex justify-between items-center py-2">
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-foreground">Jasa Perbaikan / Servis</span>
                              <span className="text-[9px] text-muted-foreground">Biaya tenaga teknisi</span>
                            </div>
                            <span className="text-xs font-semibold text-foreground">{formatCurrency(localTicket.serviceFee || 0)}</span>
                          </div>
                        )}

                        {/* Rincian Sparepart */}
                        {localTicket.spareparts?.map((p, idx) => {
                          const item = spareparts.find(i => i.id === (p.itemId || (p as any).id));
                          const canRemove = canUpdate && ['Pending', 'InProgress', 'OnHold'].includes(localTicket.status);
                          return (
                            <div key={idx} className="flex justify-between items-center py-2 border-t border-border/10">
                              <div className="flex flex-col">
                                <span className="text-xs font-medium text-foreground">{item?.name || p.name || "Item Tidak Dikenal"}</span>
                                <span className="text-[9px] text-muted-foreground">Qty: {p.quantity || 1}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-foreground">{formatCurrency((Number(p.price) || 0) * (p.quantity || 1))}</span>
                                {canRemove && (
                                  <button
                                    onClick={() => setLocalTicket({ ...localTicket, spareparts: localTicket.spareparts?.filter((_, i) => i !== idx) })}
                                    className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Banner sparepart perlu dipesan */}
                      {localTicket.spareparts?.some(p => (p as any).needsOrder) && (
                        <div className="flex items-start gap-2 bg-purple-50 border border-purple-200 rounded-xl p-3">
                          <ShoppingCart className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-purple-700 uppercase">Ada Sparepart Perlu Dipesan</p>
                            <p className="text-[9px] text-purple-600 mt-0.5">
                              {localTicket.spareparts.filter(p => (p as any).needsOrder).map(p => p.name || 'Item').join(', ')} — stok habis
                            </p>
                            {!isTechnician && canCreate && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-1.5 h-6 px-2 text-[9px] font-bold text-purple-700 hover:text-purple-800 hover:bg-purple-100 gap-1 -ml-2"
                                onClick={() => setIsPODialogOpen(true)}
                              >
                                <ShoppingCart className="h-3 w-3" />
                                Buat Purchase Order
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tombol Tambah Jasa & Sparepart — hanya jika canUpdate dan status masih aktif */}
                      {['Pending', 'InProgress', 'OnHold'].includes(localTicket.status) && canUpdate && (
                        <div className="pt-2 flex gap-2">
                          {/* ── Tambah Jasa ── */}
                          <Popover open={openServiceType} onOpenChange={setOpenServiceType}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="flex-1 h-9 border-dashed text-[10px] gap-2 rounded-lg">
                                <Plus className="h-3 w-3" /><span>Tambah Jasa</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 w-[280px]" align="start">
                              <Command>
                                <CommandInput placeholder="Cari jenis jasa..." className="h-8 text-xs" />
                                <CommandList>
                                  <CommandEmpty className="text-[10px] p-4">Jasa tidak ditemukan.</CommandEmpty>
                                  <CommandGroup>
                                    {serviceTypes.map(st => {
                                      const price = Number(st.price) || 0;
                                      return (
                                        <CommandItem
                                          key={st.id}
                                          value={st.name}
                                          onSelect={() => {
                                            // Simpan jasa sebagai item sparepart dengan category 'Service'
                                            setLocalTicket({
                                              ...localTicket,
                                              serviceFee: (Number(localTicket.serviceFee) || 0) + price,
                                              spareparts: [
                                                ...(localTicket.spareparts || []),
                                                {
                                                  id: `svc-${st.id}-${Date.now()}`,
                                                  itemId: undefined,
                                                  name: st.name,
                                                  category: 'Service',
                                                  quantity: 1,
                                                  price,
                                                  costPrice: 0,
                                                } as any,
                                              ],
                                            });
                                            setOpenServiceType(false);
                                          }}
                                          className="text-xs flex justify-between items-center py-2"
                                        >
                                          <span>{st.name}</span>
                                          <span className="text-[10px] font-bold text-primary">{formatCurrency(price)}</span>
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>

                          {/* ── Tambah Sparepart ── */}
                          <Popover open={openSparepart} onOpenChange={setOpenSparepart}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="flex-1 h-9 border-dashed text-[10px] gap-2 rounded-lg">
                                <Plus className="h-3 w-3" /><span>Tambah Sparepart</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 w-[300px]" align="start">
                              <Command>
                                <CommandInput placeholder="Cari sparepart..." className="h-8 text-xs" />
                                <CommandList>
                                  <CommandEmpty className="text-[10px] p-4">Item tidak ditemukan.</CommandEmpty>
                                  <CommandGroup>
                                    {spareparts.map(item => (
                                      <CommandItem
                                        key={item.id}
                                        value={item.name}
                                        onSelect={() => {
                                          const existing = localTicket.spareparts?.find(p => (p.itemId || (p as any).id) === item.id);
                                          const outOfStock = (item.stock || 0) === 0;
                                          if (existing) {
                                            const newParts = localTicket.spareparts?.map(p =>
                                              (p.itemId || (p as any).id) === item.id ? { ...p, quantity: (p.quantity || 1) + 1 } : p
                                            );
                                            setLocalTicket({ ...localTicket, spareparts: newParts });
                                          } else {
                                            setLocalTicket({
                                              ...localTicket,
                                              spareparts: [
                                                ...(localTicket.spareparts || []),
                                                { itemId: item.id, quantity: 1, price: Number(item.basePrice) || 0, needsOrder: outOfStock, name: item.name } as any
                                              ]
                                            });
                                          }
                                          setOpenSparepart(false);
                                        }}
                                        className="text-xs flex justify-between items-center py-2"
                                      >
                                        <div className="flex flex-col">
                                          <span>{item.name}</span>
                                          <span className={`text-[9px] font-semibold ${(item.stock || 0) === 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                            {(item.stock || 0) === 0 ? '⚠ Stok habis — perlu PO' : `Stok: ${item.stock}`}
                                          </span>
                                        </div>
                                        <span className="text-[10px] font-bold text-primary">{formatCurrency(Number(item.basePrice))}</span>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}

                      {/* Total tagihan — semua user lihat */}
                      <div className="pt-4 mt-2 border-t space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Tagihan</span>
                          <span className="text-lg font-black text-primary">{formatCurrency(totalCost)}</span>
                        </div>

                        {/* ── Payment section — hanya saat READY_FOR_PICKUP, punya canUpdate, dan bukan teknisi ── */}
                        {localTicket.status === 'ReadyForPickup' && !isTechnician && canUpdate && (
                          <div className="space-y-3 pt-1">
                            <div className="border-t pt-3">
                              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Metode Pembayaran</p>
                              <div className="grid grid-cols-3 gap-2">
                                {(['Cash', 'QRIS', 'Transfer'] as const).map((m) => (
                                  <button
                                    key={m}
                                    type="button"
                                    onClick={() => {
                                      setPickupPayMethod(m);
                                      setPickupCashInput('');
                                      setPickupError('');
                                    }}
                                    className={cn(
                                      "flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all",
                                      pickupPayMethod === m
                                        ? "border-primary bg-primary/5 text-primary"
                                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                    )}
                                  >
                                    <span className="text-base leading-none">
                                      {m === 'Cash' ? '💵' : m === 'QRIS' ? '📱' : '🏦'}
                                    </span>
                                    {m}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Input nominal — hanya Cash */}
                            {pickupPayMethod === 'Cash' && (
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold uppercase text-muted-foreground">Uang Diterima</p>
                                <Input
                                  type="number"
                                  autoFocus
                                  placeholder={String(totalCost)}
                                  className="h-9 text-sm font-mono"
                                  value={pickupCashInput}
                                  onChange={(e) => { setPickupCashInput(e.target.value); setPickupError(''); }}
                                  onKeyDown={(e) => e.key === 'Enter' && handleInlinePickup('Cash')}
                                />
                                {Number(pickupCashInput) >= totalCost && (
                                  <p className="text-[10px] text-muted-foreground font-medium">
                                    Kembalian: <span className="font-bold text-foreground">{formatCurrency(Number(pickupCashInput) - totalCost)}</span>
                                  </p>
                                )}
                              </div>
                            )}

                            {pickupError && (
                              <p className="text-[10px] text-destructive font-semibold">{pickupError}</p>
                            )}

                            <Button
                              className="w-full h-10 text-xs font-semibold gap-2"
                              disabled={
                                !pickupPayMethod ||
                                pickupLoading ||
                                (pickupPayMethod === 'Cash' && (!pickupCashInput || Number(pickupCashInput) < totalCost))
                              }
                              onClick={() => pickupPayMethod && handleInlinePickup(pickupPayMethod)}
                            >
                              {pickupLoading
                                ? 'Memproses...'
                                : <><Check className="h-4 w-4" /><span>Selesaikan Pembayaran</span></>
                              }
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 pb-3 border-t border-border/50 bg-background shrink-0 px-4 sm:px-5">

            {/* LEFT — Tombol Batal (hanya yang punya canDelete) */}
            <div className="flex gap-2 w-full sm:w-auto order-2 sm:order-1">
              {['Pending', 'InProgress', 'OnHold'].includes(localTicket.status) && canDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
                  onClick={async () => {
                    if (confirm("Batalkan servis ini?")) {
                      await performSave({ ...localTicket, status: 'Cancelled' as ServiceStatus });
                    }
                  }}
                >
                  Batalkan Servis
                </Button>
              )}
            </div>

            {/* RIGHT — Aksi utama sesuai status & role */}
            <div className="w-full sm:w-auto order-1 sm:order-2 flex gap-2">

              {/* ── PENDING: siapapun yang punya canUpdate bisa mulai pengerjaan ── */}
              {localTicket.status === 'Pending' && !isTechnician && canUpdate && (
                <Button size="sm" className="w-full sm:w-auto gap-1.5" onClick={handleNextAction}>
                  <span>Mulai Pengerjaan</span><ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}

              {/* ── IN PROGRESS: Aksi teknisi ── */}
              {localTicket.status === 'InProgress' && isTechnician && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => performSave({ ...localTicket, status: 'OnHold' as ServiceStatus })}
                  >
                    Tunggu Sparepart
                  </Button>
                  <Button
                    size="sm"
                    className="w-full sm:w-auto gap-1.5"
                    onClick={handleTechDone}
                  >
                    {localTicket.spareparts?.some(p => (p as any).needsOrder)
                      ? <><AlertTriangle className="h-3.5 w-3.5" /><span>Selesai (Ada PO)</span></>
                      : <><span>Selesai Pengerjaan</span><Check className="h-3.5 w-3.5" /></>
                    }
                  </Button>
                </>
              )}

              {/* ── IN PROGRESS: Kasir ── */}
              {localTicket.status === 'InProgress' && !isTechnician && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => performSave({ ...localTicket, status: 'OnHold' as ServiceStatus })}
                  >
                    Tunda
                  </Button>
                  <Button
                    size="sm"
                    className="w-full sm:w-auto gap-1.5"
                    onClick={handleCashierConfirm}
                  >
                    <span>Siap Diambil</span><Check className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}

              {/* ── ON HOLD: Lanjut pengerjaan ── */}
              {localTicket.status === 'OnHold' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto gap-1.5"
                  onClick={handleNextAction}
                >
                  <span>Lanjut Pengerjaan</span><ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}

              {/* ── READY_FOR_PICKUP: info ── */}
              {localTicket.status === 'ReadyForPickup' && !isTechnician && (
                <p className="text-xs text-muted-foreground">
                  Pilih metode pembayaran di tab <strong className="text-foreground">Biaya</strong>
                </p>
              )}
              {localTicket.status === 'ReadyForPickup' && isTechnician && (
                <p className="text-xs text-muted-foreground font-medium">Menunggu pengambilan pelanggan</p>
              )}

              {/* ── COMPLETED ── */}
              {localTicket.status === 'Completed' && !showReturnButton && (
                <p className="text-xs text-muted-foreground font-medium">Servis selesai</p>
              )}

              {/* ── RETURN / GARANSI ── */}
              {showReturnButton && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto gap-1.5"
                  onClick={() => setIsReturnOpen(true)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{isWarrantyExpired ? "Return (Garansi Habis)" : "Klaim Garansi"}</span>
                  {isWarrantyExpired && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 4.7: ReturnDialog */}
      <ReturnDialog
        ticket={localTicket}
        open={isReturnOpen}
        onOpenChange={setIsReturnOpen}
        onSuccess={(updated) => {
          onUpdate(updated);
          onClose();
        }}
      />

      {/* PO Dialog — pre-filled dengan sparepart yang stok habis */}
      <PurchaseOrderDialog
        open={isPODialogOpen}
        onOpenChange={setIsPODialogOpen}
        initialBranchId={localTicket.branchId}
        initialItems={
          localTicket.spareparts
            ?.filter(p => (p as any).needsOrder && p.itemId)
            .map(p => ({
              itemId: p.itemId!,
              quantity: p.quantity || 1,
              unitPrice: Number(p.price) || 0,
            })) ?? []
        }
      />
    </>
  );
}
