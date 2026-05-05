"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Plus, X, ArrowRight, Check,
  Printer, Share2, RotateCcw, AlertTriangle, ShoppingCart, CreditCard
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
import { formatCurrency, cn, maxWarrantyDaysFromSpareparts } from "@/lib/utils";
import { ServiceStatus, ServiceTicket, ServicePaymentStatus } from "@/lib/types";
import PurchaseOrderDialog from "@/components/suppliers/PurchaseOrderDialog";
import ServiceChecklist, { DEFAULT_PRE_CHECK, DEFAULT_POST_CHECK } from "@/components/service/ServiceChecklist";
import ReturnDialog from "@/components/service/ReturnDialog";


interface ServiceDetailDialogProps {
  ticket: ServiceTicket | null;
  onClose: () => void;
  onUpdate: (updatedTicket: ServiceTicket) => void;
}

export default function ServiceDetailDialog({ ticket, onClose, onUpdate }: ServiceDetailDialogProps) {
  const {
    serviceTypes, updateServiceTicket, services, users,
    currentUser,
  } = usePosStore();

  const [localTicket, setLocalTicket] = useState<ServiceTicket | null>(null);
  const [spareparts, setSpareparts] = useState<any[]>([]);

  const [openSparepart, setOpenSparepart] = useState(false);
  const [openServiceType, setOpenServiceType] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [showDpInput, setShowDpInput] = useState(false);
  const [isPODialogOpen, setIsPODialogOpen] = useState(false);

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
  }, [ticket, fetchSpareparts]);

  if (!localTicket) return null;

  const isTechnician = currentUser?.role?.name === 'Technician';

  const handleAddSparepart = (item: any) => {
    const updatedParts = [...(localTicket.spareparts || []), {
      ...item,
      price: item.basePrice || 0,
      quantity: 1,
      itemId: item.id,
      warranty: item.warranty || '',
    }];
    const newWarrantyDays = maxWarrantyDaysFromSpareparts(updatedParts);
    setLocalTicket({
      ...localTicket,
      spareparts: updatedParts,
      warrantyDays: newWarrantyDays,
    });
  };

  const handleRemoveSparepart = (index: number) => {
    const updatedParts = [...(localTicket.spareparts || [])];
    updatedParts.splice(index, 1);
    const newWarrantyDays = maxWarrantyDaysFromSpareparts(updatedParts);
    setLocalTicket({
      ...localTicket,
      spareparts: updatedParts,
      warrantyDays: newWarrantyDays,
    });
  };

  const handleApplyServiceType = (type: any) => {
    setLocalTicket({ ...localTicket, serviceFee: type.price });
  };

  const dayOfTicket = new Date(localTicket.dateOpened).setHours(0, 0, 0, 0);
  const queueNumber = services
    .filter(s => s.branchId === localTicket.branchId && new Date(s.dateOpened).setHours(0, 0, 0, 0) === dayOfTicket)
    .sort((a, b) => a.dateOpened - b.dateOpened)
    .findIndex(s => s.id === localTicket.id) + 1;

  const technician = users.find(u => u.id === localTicket.technicianId);
  const techWorkload = services.filter(s =>
    s.technicianId === localTicket.technicianId &&
    s.status === 'InProgress' &&
    s.id !== localTicket.id
  ).length;

  const totalCost = (localTicket.spareparts?.reduce((sum, p) => sum + ((Number(p.price) || 0) * (p.quantity || 1)), 0) || 0) + (localTicket.serviceFee || 0);

  // 4.2: Only 5 steps in progress bar — no Cancelled/Returned
  const progressSteps = [
    { id: 'Pending',        label: 'Masuk',       color: 'bg-amber-500' },
    { id: 'InProgress',     label: 'Proses',      color: 'bg-blue-500' },
    { id: 'OnHold',         label: 'Tertunda',    color: 'bg-orange-500' },
    { id: 'ReadyForPickup', label: 'Siap Ambil',  color: 'bg-emerald-500' },
    { id: 'Completed',      label: 'Selesai',     color: 'bg-violet-500' },
  ];

  // For index calculations we still need all statuses
  const allStatusOrder = ['Pending', 'InProgress', 'OnHold', 'ReadyForPickup', 'Completed', 'Returned', 'Cancelled'];
  const currentStatusIndex = allStatusOrder.indexOf(localTicket.status);

  // Post-check all-done check — tidak dipakai lagi, post-check dihapus
  // ── Read-only rules ──────────────────────────────────────────────────
  // Pre-check: teknisi bisa edit saat Pending/InProgress/OnHold
  const isPreCheckReadOnly = !isTechnician ||
    !['Pending', 'InProgress', 'OnHold'].includes(localTicket.status);

  // Diagnosa: teknisi bisa edit saat InProgress/OnHold
  const isDiagnosisReadOnly = localTicket.status === 'Completed' ||
    localTicket.status === 'ReadyForPickup' ||
    (!isTechnician && localTicket.status !== 'InProgress' && localTicket.status !== 'OnHold');

  // 4.7: Return button visibility
  const showReturnButton = localTicket.status === 'Completed' && !!localTicket.warrantyExpiry;
  const isWarrantyExpired = localTicket.warrantyExpiry ? localTicket.warrantyExpiry <= Date.now() : false;

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
      alert(`Sparepart berikut stoknya habis dan perlu dipesan dulu:\n${names}\n\nTiket akan masuk Tertunda (OnHold).`);
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

    // Process in background
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
    }).catch(console.error);
  };

  const handleSaveOnly = () => {
    performSave(localTicket);
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
                    {/* Cetak Nota Selesai — hanya saat ReadyForPickup atau Completed */}
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
                        Nota
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-0.5">
                  {localTicket.customerName} • {localTicket.customerPhone}
                </p>
              </div>
              {/* Total estimasi — semua user lihat */}
              <div className="flex flex-col items-start sm:items-end">
                <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Total Estimasi</p>
                <p className="text-lg sm:text-xl font-black text-primary">{formatCurrency(totalCost)}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar space-y-4">
            <div className="pt-2">
              <Tabs defaultValue={localTicket.status === 'InProgress' ? "work" : "summary"} className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-9 bg-muted/50 p-1">
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
                                {users.filter(u => u.role?.name === 'Technician' || u.roleId === 'tech-role-id').map(tech => (
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
                    <p className="text-xs font-medium text-foreground bg-muted/30 p-3 rounded-xl border border-border/20 italic">"{localTicket.issue}"</p>
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
                        className="w-full border-solid border-2 min-h-[120px] p-4 text-xs bg-muted/20 border-none rounded-2xl focus:ring-1 focus:ring-primary/20 transition-all no-scrollbar"
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
                        <div className="px-2 py-0.5 rounded-full text-[9px] font-black bg-muted text-muted-foreground border">
                          {localTicket.spareparts?.length || 0} Item
                        </div>
                      </div>

                      {/* Banner info untuk teknisi — dihapus, teknisi input harga sendiri */}

                      <div className="space-y-2 bg-muted/20 p-4 rounded-2xl border border-border/10">
                        {/* Jasa Servis Utama */}
                        <div className="flex justify-between items-center group">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground">Jasa Perbaikan / Servis</span>
                            <span className="text-[9px] text-muted-foreground">Biaya tenaga teknisi</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {/* Semua user bisa edit harga saat tiket masih aktif */}
                            {['Pending', 'InProgress', 'OnHold', 'ReadyForPickup'].includes(localTicket.status) ? (
                              <Input
                                type="number"
                                className="w-24 h-8 text-right text-xs font-bold bg-background rounded-lg"
                                value={localTicket.serviceFee || 0}
                                onChange={(e) => setLocalTicket({ ...localTicket, serviceFee: Number(e.target.value) })}
                              />
                            ) : (
                              <span className="text-xs font-bold text-foreground">{formatCurrency(localTicket.serviceFee || 0)}</span>
                            )}
                          </div>
                        </div>

                        {/* Rincian Sparepart */}
                        {localTicket.spareparts?.map((p, idx) => {
                          const item = spareparts.find(i => i.id === (p.itemId || (p as any).id));
                          const canEdit = ['Pending', 'InProgress', 'OnHold', 'ReadyForPickup'].includes(localTicket.status);
                          const canRemove = canEdit;
                          return (
                            <div key={idx} className="flex justify-between items-center pt-2 border-t border-border/5 group">
                              <div className="flex flex-col">
                                <span className="text-xs font-medium text-foreground">{item?.name || p.name || "Item Tidak Dikenal"}</span>
                                <span className="text-[9px] text-muted-foreground">Qty: {p.quantity || 1}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {canEdit ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      className="w-20 h-8 text-right text-xs bg-background rounded-lg"
                                      value={p.price || 0}
                                      onChange={(e) => {
                                        const newParts = [...(localTicket.spareparts || [])];
                                        newParts[idx] = { ...newParts[idx], price: Number(e.target.value) };
                                        setLocalTicket({ ...localTicket, spareparts: newParts });
                                      }}
                                    />
                                    {canRemove && (
                                      <button
                                        onClick={() => setLocalTicket({ ...localTicket, spareparts: localTicket.spareparts?.filter((_, i) => i !== idx) })}
                                        className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs font-bold text-foreground">{formatCurrency((p.price || 0) * (p.quantity || 1))}</span>
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
                            {!isTechnician && (
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

                      {/* Tombol Tambah Item — semua user bisa tambah saat tiket masih aktif */}
                      {['Pending', 'InProgress', 'OnHold', 'ReadyForPickup'].includes(localTicket.status) && (
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <Popover open={openSparepart} onOpenChange={setOpenSparepart}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="h-9 border-dashed text-[10px] gap-2 rounded-lg">
                                <Plus className="h-3 w-3" /> Sparepart
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

                          <Popover open={openServiceType} onOpenChange={setOpenServiceType}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="h-9 border-dashed text-[10px] gap-2 rounded-lg">
                                <Plus className="h-3 w-3" /> Tambah Jasa
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 w-[250px]" align="start">
                              <Command>
                                <CommandInput placeholder="Cari jasa..." className="h-8 text-xs" />
                                <CommandList>
                                  <CommandEmpty className="text-[10px] p-4">Jasa tidak ditemukan.</CommandEmpty>
                                  <CommandGroup>
                                    {serviceTypes.map(type => (
                                      <CommandItem
                                        key={type.id}
                                        value={type.name}
                                        onSelect={() => {
                                          setLocalTicket({
                                            ...localTicket,
                                            serviceFee: (localTicket.serviceFee || 0) + (Number(type.price) || 0)
                                          });
                                          setOpenServiceType(false);
                                        }}
                                        className="text-xs flex justify-between items-center py-2"
                                      >
                                        <span>{type.name}</span>
                                        <span className="text-[10px] font-bold text-primary">{formatCurrency(Number(type.price))}</span>
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

                          {/* Payment status — hanya tampil saat ReadyForPickup */}
                          {localTicket.status === 'ReadyForPickup' && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground">Status Pembayaran</span>
                                <div className="flex gap-1.5">
                                  {(['Unpaid', 'DP', 'Paid'] as ServicePaymentStatus[]).map(ps => (
                                    <button
                                      key={ps}
                                      onClick={() => setLocalTicket({ ...localTicket, paymentStatus: ps, dpAmount: ps !== 'DP' ? 0 : localTicket.dpAmount })}
                                      className={`text-[9px] font-bold px-2 py-1 rounded-full border transition-all ${
                                        (localTicket.paymentStatus ?? 'Unpaid') === ps
                                          ? ps === 'Paid' ? 'bg-emerald-500 text-white border-emerald-500'
                                            : ps === 'DP' ? 'bg-blue-500 text-white border-blue-500'
                                            : 'bg-red-500 text-white border-red-500'
                                          : 'bg-background text-muted-foreground border-border hover:border-primary/40'
                                      }`}
                                    >
                                      {ps === 'Unpaid' ? 'Belum Bayar' : ps === 'DP' ? 'DP / Cicil' : 'Lunas'}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* DP amount input */}
                              {localTicket.paymentStatus === 'DP' && (
                                <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-xl border border-blue-200">
                                  <CreditCard className="h-4 w-4 text-blue-600 shrink-0" />
                                  <div className="flex-1 space-y-1">
                                    <p className="text-[9px] font-bold text-blue-700 uppercase">Jumlah DP Diterima</p>
                                    <Input
                                      type="number"
                                      className="h-8 text-sm font-bold bg-white border-blue-200"
                                      value={localTicket.dpAmount || ''}
                                      onChange={(e) => setLocalTicket({ ...localTicket, dpAmount: Number(e.target.value) })}
                                      placeholder="0"
                                    />
                                    {(localTicket.dpAmount || 0) > 0 && (
                                      <p className="text-[9px] text-blue-600 font-semibold">
                                        Sisa: {formatCurrency(totalCost - (localTicket.dpAmount || 0))}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Action Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 pb-4 border-t border-border/50 bg-background shrink-0 px-4 sm:px-6">

                {/* LEFT — Tombol Batal (hanya saat tiket masih aktif) */}
                <div className="flex gap-2 w-full sm:w-auto order-2 sm:order-1">
                  {['Pending', 'InProgress', 'OnHold'].includes(localTicket.status) && !isTechnician && (
                    <Button
                      variant="ghost"
                      className="w-1/2 sm:w-auto border border-red-200 h-9 px-4 text-xs font-semibold uppercase text-red-600 hover:bg-red-50 rounded-lg"
                      onClick={async () => {
                        if (confirm("Batalkan servis ini?")) {
                          await performSave({ ...localTicket, status: 'Cancelled' as ServiceStatus });
                        }
                      }}
                    >
                      Batal
                    </Button>
                  )}
                </div>

                {/* RIGHT — Aksi utama sesuai status & role */}
                <div className="w-full sm:w-auto order-1 sm:order-2 flex flex-col gap-2">

                  {/* ── PENDING: Kasir mulai pengerjaan ── */}
                  {localTicket.status === 'Pending' && !isTechnician && (
                    <Button
                      className="w-full sm:w-auto h-9 px-6 text-xs font-semibold uppercase flex items-center gap-2 rounded-lg"
                      onClick={handleNextAction}
                    >
                      Mulai Pengerjaan <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}

                  {/* ── IN PROGRESS: Aksi teknisi ── */}
                  {localTicket.status === 'InProgress' && isTechnician && (
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto h-9 px-4 text-xs font-semibold uppercase rounded-lg border-orange-300 text-orange-600 hover:bg-orange-50"
                        onClick={async () => performSave({ ...localTicket, status: 'OnHold' as ServiceStatus })}
                      >
                        Tunggu Sparepart
                      </Button>
                      <Button
                        className={`w-full sm:w-auto h-9 px-6 text-xs font-semibold uppercase flex items-center gap-2 rounded-lg ${
                          localTicket.spareparts?.some(p => (p as any).needsOrder)
                            ? 'bg-orange-500 hover:bg-orange-600'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                        onClick={handleTechDone}
                      >
                        {localTicket.spareparts?.some(p => (p as any).needsOrder)
                          ? <><AlertTriangle className="h-4 w-4" /> Selesai (Ada Sparepart Perlu PO)</>
                          : <>Selesai Pengerjaan <Check className="h-4 w-4" /></>
                        }
                      </Button>
                    </div>
                  )}

                  {/* ── IN PROGRESS: Kasir bisa set OnHold atau ReadyForPickup ── */}
                  {localTicket.status === 'InProgress' && !isTechnician && (
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto h-9 px-4 text-xs font-semibold uppercase rounded-lg border-orange-300 text-orange-600 hover:bg-orange-50"
                        onClick={async () => performSave({ ...localTicket, status: 'OnHold' as ServiceStatus })}
                      >
                        Tunda (OnHold)
                      </Button>
                      <Button
                        className="w-full sm:w-auto h-9 px-6 text-xs font-semibold uppercase flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700"
                        onClick={handleCashierConfirm}
                      >
                        Konfirmasi Harga & Siap Ambil <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* ── ON HOLD: Lanjut pengerjaan (teknisi atau kasir) ── */}
                  {localTicket.status === 'OnHold' && (
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto h-9 px-6 text-xs font-semibold uppercase flex items-center gap-2 rounded-lg border-blue-400 text-blue-600 hover:bg-blue-50"
                      onClick={handleNextAction}
                    >
                      Lanjut Pengerjaan <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}

                  {/* ── READY FOR PICKUP: Kasir bisa edit harga, info status ── */}
                  {localTicket.status === 'ReadyForPickup' && !isTechnician && (
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 flex-1">
                        <Check className="h-4 w-4 shrink-0" />
                        <span className="text-xs font-semibold uppercase">Siap Diambil — Edit harga di tab Biaya</span>
                      </div>
                    </div>
                  )}

                  {/* ── READY FOR PICKUP: Teknisi view ── */}
                  {localTicket.status === 'ReadyForPickup' && isTechnician && (
                    <div className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 w-full">
                      <Check className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase">Pengerjaan Selesai — Menunggu Pengambilan</span>
                    </div>
                  )}

                  {/* ── COMPLETED ── */}
                  {localTicket.status === 'Completed' && !showReturnButton && (
                    <div className="flex items-center justify-center gap-2 bg-muted text-muted-foreground px-4 py-2 rounded-lg border w-full">
                      <Check className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase">Servis Selesai</span>
                    </div>
                  )}

                  {/* ── RETURN / GARANSI ── */}
                  {showReturnButton && (
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full sm:w-auto h-9 px-4 text-xs font-semibold uppercase flex items-center gap-2 rounded-lg",
                        isWarrantyExpired
                          ? "border-amber-400 text-amber-700 hover:bg-amber-50"
                          : "border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                      )}
                      onClick={() => setIsReturnOpen(true)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {isWarrantyExpired ? "Return (Garansi Habis)" : "Return / Klaim Garansi"}
                      {isWarrantyExpired && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                    </Button>
                  )}
              </div>
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
