"use client";
import { useState, useEffect } from "react";
import {
  Search, Plus, X, ArrowRight, Save, Check, ChevronsUpDown,
  CreditCard, Wallet, Banknote, Printer, Share2, Edit
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePosStore } from "@/lib/store";
import { formatCurrency, cn } from "@/lib/utils";
import { ServiceStatus, ServiceTicket } from "@/lib/types";


interface ServiceDetailDialogProps {
  ticket: ServiceTicket | null;
  onClose: () => void;
  onUpdate: (updatedTicket: ServiceTicket) => void;
}

export default function ServiceDetailDialog({ ticket, onClose, onUpdate }: ServiceDetailDialogProps) {
  const {
    inventory, stocks, serviceTypes, updateServiceTicket, services, users,
    currentUser, currentBranch, transactions
  } = usePosStore();

  const [localTicket, setLocalTicket] = useState<ServiceTicket | null>(null);

  const [openSparepart, setOpenSparepart] = useState(false);
  const [openServiceType, setOpenServiceType] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'Cash' | 'QRIS' | 'Transfer'>('Cash');
  const [amountPaid, setAmountPaid] = useState<number>(0);


  useEffect(() => {
    if (ticket) {
      setLocalTicket({ ...ticket });
    } else {
      setLocalTicket(null);
    }
  }, [ticket]);

  if (!localTicket) return null;

  const handleAddSparepart = (item: any) => {
    const updatedParts = [...(localTicket.spareparts || []), {
      ...item,
      price: item.basePrice || 0,
      quantity: 1,
      itemId: item.id
    }];
    setLocalTicket({ ...localTicket, spareparts: updatedParts });
  };



  const handleRemoveSparepart = (index: number) => {
    const updatedParts = [...(localTicket.spareparts || [])];
    updatedParts.splice(index, 1);
    setLocalTicket({ ...localTicket, spareparts: updatedParts });
  };

  const handleApplyServiceType = (type: any) => {
    setLocalTicket({ ...localTicket, serviceFee: type.price });
  };

  const availableInventory = inventory.map(item => {
    const stock = stocks.find(s => s.itemId === item.id && s.branchId === localTicket.branchId);
    return { ...item, stock: stock?.quantity || 0 };
  }).filter(item => {
    const catName = item.category?.name?.toLowerCase() || "";
    // Only show items categorized as spareparts
    return catName.includes("sparepart") ||
      catName.includes("suku cadang") ||
      catName.includes("part") ||
      catName.includes("lcd") ||
      catName.includes("baterai") ||
      catName.includes("battery");
  });


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


  const statusOptions = [
    { id: 'Pending', label: 'Antrian', color: 'bg-amber-500' },
    { id: 'InProgress', label: 'Mengerjakan', color: 'bg-blue-500' },
    { id: 'ReadyToPay', label: 'Menunggu Pembayaran', color: 'bg-emerald-400' },
    { id: 'Paid', label: 'Siap Diambil', color: 'bg-emerald-600' },
    { id: 'Completed', label: 'Sudah Diambil', color: 'bg-slate-400' },
    { id: 'Cancelled', label: 'Batal', color: 'bg-red-500' }
  ];

  const currentStatusIndex = statusOptions.findIndex(s => s.id === localTicket.status);

  const handleNextAction = async () => {
    if (localTicket.status === 'Pending') {
      const nextStatus = 'InProgress' as ServiceStatus;
      setLocalTicket(prev => prev ? { ...prev, status: nextStatus } : null);
      await performSave({ ...localTicket, status: nextStatus });
    } else if (localTicket.status === 'InProgress') {
      if (!localTicket.diagnosis || localTicket.diagnosis.length < 5) {
        alert("Wajib mengisi Hasil Pengecekan (Diagnosa) minimal 5 karakter.");
        return;
      }
      if (localTicket.serviceFee === 0) {
        alert("Wajib memilih Biaya Jasa sebelum menyelesaikan servis.");
        return;
      }
      const nextStatus = 'ReadyToPay' as ServiceStatus;
      setLocalTicket(prev => prev ? { ...prev, status: nextStatus } : null);
      await performSave({ ...localTicket, status: nextStatus });
    } else if (localTicket.status === 'ReadyToPay') {
      setAmountPaid(totalCost);
      setIsPaymentOpen(true);
    } else if (localTicket.status === 'Paid') {
      const nextStatus = 'Completed' as ServiceStatus;
      setLocalTicket(prev => prev ? { ...prev, status: nextStatus } : null);
      await performSave({ ...localTicket, status: nextStatus });
    }
  };

  const handleConfirmPayment = async () => {
    const nextStatus = 'Paid' as ServiceStatus;
    setLocalTicket(prev => prev ? { ...prev, status: nextStatus } : null);
    await performSave({ ...localTicket, status: nextStatus }, selectedPaymentMethod, amountPaid);
    setIsPaymentOpen(false);
  };

  const performSave = async (ticketToSave: ServiceTicket, paymentMethod: string = 'Cash', paid: number = 0) => {
    await updateServiceTicket(ticketToSave.id, {
      status: ticketToSave.status,
      diagnosis: ticketToSave.diagnosis,
      serviceFee: ticketToSave.serviceFee,
      spareparts: ticketToSave.spareparts
    });

    // Auto-create transaction when service is Paid
    const wasAlreadyPaid = ticket?.status === 'Paid' || ticket?.status === 'Completed';
    if (ticketToSave.status === 'Paid' && !wasAlreadyPaid) {
      const existingTx = transactions.find(t => t.notes === `service:${ticketToSave.id}`);
      if (!existingTx) {
        const sparepartItems = (ticketToSave.spareparts || []).map((p: any) => {
          const invItem = inventory.find(i => i.id === (p.itemId || p.id));
          return {
            id: p.itemId || p.id,
            name: p.name || invItem?.name || 'Sparepart',
            price: Number(p.price) || 0,
            quantity: p.quantity || 1,
            category: 'Sparepart',
            categoryName: 'Sparepart',
            costPrice: 0,
            discount: 0,
          };
        });
        const serviceFeeItem = {
          id: `svc-${ticketToSave.id}`,
          name: `Jasa Servis - ${ticketToSave.deviceModel}`,
          price: ticketToSave.serviceFee,
          quantity: 1,
          category: 'Servis',
          categoryName: 'Servis',
          costPrice: 0,
          discount: 0,
          technicianId: ticketToSave.technicianId,
        };
        const allItems = [...sparepartItems, serviceFeeItem];
        const total = allItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const changeValue = Math.max(0, paid - total);

        try {
          const res = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              branchId: ticketToSave.branchId,
              cashierId: currentUser?.id,
              source: 'Service',
              items: allItems,
              total,
              paymentMethod,
              amountPaid: paymentMethod === 'Cash' ? paid : total,
              customerName: ticketToSave.customerName,
              customerPhone: ticketToSave.customerPhone,
              customerAddress: ticketToSave.customerAddress || null,
              change: paymentMethod === 'Cash' ? changeValue : 0,
              tax: 0,
              discount: 0,
              status: 'Paid',
              notes: `service:${ticketToSave.id}`,
            }),
          });
          if (res.ok) {
            const newTx = await res.json();
            usePosStore.setState((state) => ({
              transactions: [newTx, ...state.transactions]
            }));
          }
        } catch (err) {
          console.error('Failed to create service transaction:', err);
        }
      }
    }

    onUpdate(ticketToSave);
    onClose();
  };

  const handleSaveOnly = async () => {
    await performSave(localTicket);
  };


  return (
    <>
      <Dialog open={!!ticket} onOpenChange={(v) => !v && onClose()}>
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
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.print()}>
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
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-0.5">
                  {localTicket.customerName} • {localTicket.customerPhone}
                </p>
              </div>
              <div className="flex flex-col items-start sm:items-end">
                <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Total Estimasi</p>
                <p className="text-lg sm:text-xl font-black text-primary">{formatCurrency(totalCost)}</p>
              </div>
            </div>
          </DialogHeader>


          <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar space-y-4">
            {/* Step Progress UX */}
            <div className="relative flex justify-between items-start mb-6 px-2 sm:px-6">

              <div className="absolute left-0 right-0 top-4 h-px bg-muted z-0" />

              {statusOptions
                .filter(s => s.id !== 'Cancelled' && s.id !== 'Completed')
                .map((st, idx) => {
                  const currentIndex = statusOptions.findIndex(s => s.id === localTicket.status);
                  const stepIndex = statusOptions.findIndex(s => s.id === st.id);

                  const isPast = currentIndex > stepIndex;
                  const isCurrent = currentIndex === stepIndex;

                  return (
                    <div
                      key={st.id}
                      className="relative z-10 flex flex-col items-center gap-2 min-w-[60px] sm:min-w-[80px]"
                    >
                      {/* CIRCLE */}
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2",

                          isCurrent && (st.id === 'ReadyToPay' || st.id === 'Paid')
                            ? "bg-emerald-500 border-emerald-500 text-white scale-110 shadow-md"
                            : isCurrent
                              ? "bg-primary border-primary text-primary-foreground scale-110 shadow-md"
                              : isPast
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "bg-background border-muted text-muted-foreground"
                        )}
                      >
                        {isPast || (isCurrent && st.id === 'Paid') ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          idx + 1
                        )}
                      </div>

                      {/* LABEL */}
                      <span
                        className={cn(
                          "text-[8px] font-bold uppercase tracking-wider text-center whitespace-nowrap",
                          isCurrent
                            ? "text-primary"
                            : isPast
                              ? "text-emerald-600"
                              : "text-muted-foreground"
                        )}
                      >
                        {st.label}
                      </span>
                    </div>
                  );
                })}
            </div>

            <div className="flex flex-col gap-4 pt-2 border-t">
              {/* Queue & Technician Info - Visible during work */}
              {(localTicket.status === 'Pending' || localTicket.status === 'InProgress') && (
                <div className="px-3 sm:px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                      <span className="text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Antrian Hari Ini</span>
                      <span className="text-lg sm:text-xl font-black text-foreground leading-none">#{queueNumber || '-'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Teknisi Penanggung Jawab</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground truncate max-w-[150px]">{technician?.name || "Belum ditunjuk"}</span>
                        {technician && (
                          <span className="text-[9px] text-muted-foreground font-medium">
                            {techWorkload > 0 ? (
                              <>Menangani <span className="text-primary font-bold">{techWorkload}</span> servis aktif lainnya</>
                            ) : (
                              <span className="text-emerald-600 font-bold tracking-tight">Siap fokus pengerjaan</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(localTicket.status === 'InProgress' || localTicket.status === 'Completed') && (
                <div className="space-y-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest mb-1">Keluhan Awal Pelanggan:</p>
                    <p className="text-xs font-medium text-foreground bg-muted/30 p-2 rounded-lg border border-border/20">{localTicket.issue}</p>
                  </div>

                  <div>
                    <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest mb-1">Hasil Pengecekan & Diagnosa</p>
                    <textarea
                      className="w-full min-h-[80px] p-3 text-xs bg-muted/20 border-none rounded-xl focus:ring-1 focus:ring-primary/20 transition-all no-scrollbar"
                      placeholder="Tulis hasil pengecekan teknisi di sini..."
                      value={localTicket.diagnosis || ""}
                      onChange={(e) => setLocalTicket({ ...localTicket, diagnosis: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {localTicket.status !== 'Pending' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Rincian Biaya (Opsional)</p>
                      <span className="text-[8px] bg-muted px-2 py-0.5 rounded font-bold uppercase text-muted-foreground">Sparepart & Jasa</span>
                    </div>

                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                      {(localTicket.spareparts || []).map((part, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-muted/10 border border-border/10 group">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-foreground">{part.name}</span>
                            <span className="text-[9px] text-muted-foreground">{part.quantity}x</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-foreground">{formatCurrency(part.price * part.quantity)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {localTicket.status === 'InProgress' && (
                      <Popover open={openSparepart} onOpenChange={setOpenSparepart}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full h-8 border-dashed text-[10px] gap-2">
                            <Plus className="h-3 w-3" /> Tambah Sparepart
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-[300px]" align="start">
                          <Command>
                            <CommandInput placeholder="Cari sparepart..." className="h-8 text-xs" />
                            <CommandList>
                              <CommandEmpty className="text-[10px] p-4">Item tidak ditemukan.</CommandEmpty>
                              <CommandGroup>
                                {availableInventory.map((item) => (
                                  <CommandItem
                                    key={item.id}
                                    onSelect={() => {
                                      handleAddSparepart(item);
                                      setOpenSparepart(false);
                                    }}
                                    className="text-[10px] py-1.5"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-bold">{item.name}</span>
                                      <span className="text-muted-foreground">{formatCurrency(item.basePrice || 0)} • Stok: {item.stock}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}

                    <div className="p-3 flex items-center justify-between group">
                      <div className="flex-1">
                        <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest mb-0.5">Biaya Jasa Terpilih:</p>
                        <p className="text-xs font-bold text-foreground">
                          {localTicket.serviceFee > 0
                            ? serviceTypes.find(t => t.price === localTicket.serviceFee)?.name || "Jasa Custom"
                            : "Pilih Jenis Jasa..."}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-primary">{formatCurrency(localTicket.serviceFee)}</span>
                        {localTicket.status === 'InProgress' && (
                          <Popover open={openServiceType} onOpenChange={setOpenServiceType}>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full hover:bg-primary/5">
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 w-[240px]" align="end">
                              <Command>
                                <CommandInput placeholder="Pilih jasa..." className="h-8 text-xs" />
                                <CommandList>
                                  <CommandGroup>
                                    {serviceTypes.map((type) => (
                                      <CommandItem
                                        key={type.id}
                                        onSelect={() => {
                                          handleApplyServiceType(type);
                                          setOpenServiceType(false);
                                        }}
                                        className="text-[10px] py-1.5"
                                      >
                                        <div className="flex justify-between w-full">
                                          <span>{type.name}</span>
                                          <span className="font-bold">{formatCurrency(type.price)}</span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 pb-4 border-t border-border/50 bg-background shrink-0 px-4 sm:px-6">

                {/* LEFT SIDE */}
                <div className="flex gap-2 w-full sm:w-auto order-2 sm:order-1">
                  {(localTicket.status === 'Pending' || localTicket.status === 'InProgress') && (
                    <>
                      {/* BATAL */}
                      <Button
                        variant="ghost"
                        className="w-1/2 sm:w-auto border border-red-200 h-9 px-4 text-xs font-semibold uppercase text-red-600 hover:bg-red-50 rounded-lg"
                        onClick={async () => {
                          if (confirm("Batalkan servis ini?")) {
                            const updated = { ...localTicket, status: 'Cancelled' as ServiceStatus };
                            await performSave(updated);
                          }
                        }}
                      >
                        Batal
                      </Button>

                      {/* DRAFT */}
                      <Button
                        variant="outline"
                        className="w-1/2 sm:w-auto h-9 px-4 text-xs font-semibold uppercase rounded-lg"
                        onClick={handleSaveOnly}
                      >
                        Simpan Draft
                      </Button>
                    </>
                  )}
                </div>

                {/* RIGHT SIDE */}
                <div className="w-full sm:w-auto order-1 sm:order-2">

                  {localTicket.status === 'Pending' && (
                    <Button
                      className="w-full sm:w-auto h-9 px-6 text-xs font-semibold uppercase flex items-center justify-center gap-2 rounded-lg"
                      onClick={handleNextAction}
                    >
                      Mulai Pengerjaan
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}

                  {localTicket.status === 'InProgress' && (
                    <Button
                      className="w-full sm:w-auto h-9 px-6 text-xs font-semibold uppercase flex items-center justify-center gap-2 rounded-lg"
                      onClick={handleNextAction}
                    >
                      Selesaikan Pengerjaan
                    </Button>
                  )}

                  {localTicket.status === 'ReadyToPay' && (
                    <Button
                      className="w-full sm:w-auto h-9 px-6 text-xs font-semibold uppercase flex items-center justify-center gap-2 rounded-lg"
                      onClick={handleNextAction}
                    >
                      Proses Pembayaran
                      <Check className="h-4 w-4" />
                    </Button>
                  )}

                  {localTicket.status === 'Paid' && (
                    <Button
                      className="w-full sm:w-auto h-9 px-6 text-xs font-semibold uppercase flex items-center justify-center gap-2 rounded-lg"
                      onClick={handleNextAction}
                    >
                      Serahkan Unit
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}

                  {localTicket.status === 'Completed' && (
                    <div className="flex items-center justify-center gap-2 bg-muted text-muted-foreground px-4 py-2 rounded-lg border w-full">
                      <Check className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase">
                        Unit Sudah Diambil
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl shadow-2xl border-none">
          <DialogHeader className="p-6 bg-primary text-primary-foreground">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Banknote className="h-6 w-6" /> Pembayaran Servis
            </DialogTitle>
            <p className="text-primary-foreground/70 text-xs mt-1">Pilih metode pembayaran untuk menyelesaikan pesanan.</p>
          </DialogHeader>

          <div className="p-8 space-y-8">
            <div className="text-center space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Tagihan</p>
              <p className="text-4xl font-black text-primary">{formatCurrency(totalCost)}</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setSelectedPaymentMethod('Cash')}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border-2 transition-all group",
                  selectedPaymentMethod === 'Cash' ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-muted hover:border-primary/30"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("p-2.5 rounded-lg transition-colors", selectedPaymentMethod === 'Cash' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary")}>
                    <Banknote className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">Tunai (Cash)</p>
                    <p className="text-[10px] text-muted-foreground">Pembayaran dengan uang fisik</p>
                  </div>
                </div>
                {selectedPaymentMethod === 'Cash' && <Check className="h-5 w-5 text-primary" />}
              </button>

              <button
                onClick={() => setSelectedPaymentMethod('QRIS')}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border-2 transition-all group",
                  selectedPaymentMethod === 'QRIS' ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-muted hover:border-blue-600/30"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("p-2.5 rounded-lg transition-colors", selectedPaymentMethod === 'QRIS' ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground group-hover:bg-blue-600/10 group-hover:text-blue-600")}>
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">QRIS / E-Wallet</p>
                    <p className="text-[10px] text-muted-foreground">OVO, GoPay, Dana, ShopeePay</p>
                  </div>
                </div>
                {selectedPaymentMethod === 'QRIS' && <Check className="h-5 w-5 text-blue-600" />}
              </button>

              <button
                onClick={() => setSelectedPaymentMethod('Transfer')}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border-2 transition-all group",
                  selectedPaymentMethod === 'Transfer' ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600" : "border-muted hover:border-emerald-600/30"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("p-2.5 rounded-lg transition-colors", selectedPaymentMethod === 'Transfer' ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground group-hover:bg-emerald-600/10 group-hover:text-emerald-600")}>
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">Transfer Bank</p>
                    <p className="text-[10px] text-muted-foreground">BCA, Mandiri, BNI, BRI</p>
                  </div>
                </div>
                {selectedPaymentMethod === 'Transfer' && <Check className="h-5 w-5 text-emerald-600" />}
              </button>
            </div>

            {selectedPaymentMethod === 'Cash' && (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold uppercase text-primary/60">Uang Diterima</Label>
                    <span className="text-[10px] font-bold text-primary/40">Enter number only</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-primary/30">Rp</span>
                    <Input
                      type="number"
                      className="pl-12 h-14 text-2xl font-black text-primary border-none bg-transparent focus-visible:ring-0"
                      value={amountPaid || ''}
                      onChange={(e) => setAmountPaid(Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center px-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Kembalian</p>
                  <p className={cn(
                    "text-xl font-black",
                    amountPaid - totalCost >= 0 ? "text-emerald-600" : "text-red-500"
                  )}>
                    {amountPaid - totalCost >= 0
                      ? formatCurrency(amountPaid - totalCost)
                      : `Kurang ${formatCurrency(Math.abs(amountPaid - totalCost))}`
                    }
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 bg-muted/30 border-t gap-3 flex flex-row">
            <Button variant="ghost" className="flex-1 h-12 font-bold uppercase text-xs" onClick={() => setIsPaymentOpen(false)}>Batal</Button>
            <Button
              className="flex-1 h-12 font-black uppercase text-xs shadow-lg bg-primary hover:bg-primary/90"
              onClick={handleConfirmPayment}
              disabled={selectedPaymentMethod === 'Cash' && amountPaid < totalCost}
            >
              {selectedPaymentMethod === 'Cash' && amountPaid < totalCost ? "Uang Kurang" : "Konfirmasi & Selesai"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
