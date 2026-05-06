"use client";
import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { usePosStore } from "@/lib/store";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { 
  Search, ReceiptText, Calendar, Eye, User, MapPin, Phone, ShoppingCart, Wrench,
  Pencil, Trash2, X, ArrowRight, Download, Printer, Shield
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Transaction } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useRef } from "react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from "date-fns";

export default function TransactionsPage() {
  const { transactions, users, updateTransaction, deleteTransaction } = usePosStore();
  const { user: currentUser, branch: currentBranch, isSuperAdmin: isAdmin, canAccess } = useAuth();
  const hasFullAccess = canAccess('Transactions', 'Full');
  const [search, setSearch] = useState("");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    customerName: "", customerPhone: "", customerAddress: "",
    status: "Paid" as Transaction['status'],
    notes: "",
  });


  const filtered = useMemo(() => {
    let list = transactions;
    // Non-admin only sees own branch
    if (!isAdmin && currentBranch) {
      list = list.filter(tx => tx.branchId === currentBranch.id);
    }
    const q = search.toLowerCase();
    return list.filter((tx) => {
      const matchesSearch = !q || tx.id?.toLowerCase().includes(q) || tx.customerName?.toLowerCase().includes(q);
      const txDate = new Date(tx.date);
      const matchesDate = !dateRange || isWithinInterval(txDate, { 
        start: startOfDay(dateRange.from), 
        end: endOfDay(dateRange.to) 
      });
      return matchesSearch && matchesDate;
    });
  }, [transactions, search, isAdmin, currentBranch, dateRange]);

  const getTechnicianName = (id?: string) => {
    if (!id) return null;
    return users.find(u => u.id === id)?.name || id;
  };

  const getCashierName = (id: string) => users.find(u => u.id === id)?.name || id;

  const openEdit = (tx: Transaction) => {
    setEditForm({
      customerName: tx.customerName || "",
      customerPhone: tx.customerPhone || "",
      customerAddress: tx.customerAddress || "",
      status: tx.status,
      notes: tx.notes || "",
    });
    setEditTx(tx);
  };

  const handleEdit = async () => {
    if (!editTx) return;
    try {
      await updateTransaction(editTx.id, {
        customerName: editForm.customerName || undefined,
        customerPhone: editForm.customerPhone || undefined,
        customerAddress: editForm.customerAddress || undefined,
        status: editForm.status,
        notes: editForm.notes || undefined,
      });
      setEditTx(null);
    } catch (e) {
      console.error(e);
      alert("Failed to update transaction");
    }
  };

  const handleDelete = async () => {
    if (!deleteTx) return;
    try {
      await deleteTransaction(deleteTx.id);
      setDeleteTx(null);
    } catch (e) {
      console.error(e);
      alert("Failed to delete transaction");
    }
  };

  const totalRevenue = filtered.reduce((sum, tx) => tx.status === 'Paid' ? sum + tx.total : sum, 0);
  const paidCount = filtered.filter(tx => tx.status === 'Paid').length;
  const canceledCount = filtered.filter(tx => tx.status === 'Cancelled').length;

  const receiptRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadReceipt = async (tx: Transaction) => {
    if (!receiptRef.current) return;
    try {
      setIsGeneratingPDF(true);
      const canvas = await html2canvas(receiptRef.current, {
        scale: 3,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`STRUK-${tx.id.toUpperCase()}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Gagal mengunduh struk");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <Layout title="Riwayat Transaksi" requiredModule="Transactions" requiredLevel="Read">
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <p className="ui-label mb-1">Total Transaksi</p>
              <h2 className="ui-stat">{filtered.length}</h2>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border border-border/40">
            <CardContent className="p-5">
              <p className="ui-label mb-1">Pendapatan</p>
              <h2 className="ui-stat">{formatCurrency(totalRevenue)}</h2>
            </CardContent>
          </Card>
          <Card className="overflow-hidden bg-card border border-border/40">
            <CardContent className="p-5">
              <p className="ui-label mb-1">Lunas</p>
              <h2 className="ui-stat">{paidCount}</h2>
            </CardContent>
          </Card>
          <Card className="overflow-hidden bg-card border border-border/40">
            <CardContent className="p-5">
              <p className="ui-label opacity-60 mb-1">Dibatalkan</p>
              <h2 className="ui-stat opacity-40">{canceledCount}</h2>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <Input
              placeholder="Cari ID Transaksi atau Nama Pelanggan..."
              className="pl-12 h-12"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <DateRangePicker onRangeChange={setDateRange} />
        </div>

        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-b border-border/40">
                  <TableHead className="table-header-cell pl-8">ID Transaksi</TableHead>
                  <TableHead className="table-header-cell">Pelanggan</TableHead>
                  <TableHead className="table-header-cell">Petugas/Teknisi</TableHead>
                  <TableHead className="table-header-cell">Kasir</TableHead>
                  <TableHead className="table-header-cell">Waktu</TableHead>
                  <TableHead className="table-header-cell text-center">Status</TableHead>
                  <TableHead className="table-header-cell text-right">Total</TableHead>
                  <TableHead className="table-header-cell text-right pr-8">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-40 text-center">
                      <p className="ui-label text-muted-foreground/40 font-medium ">Belum ada transaksi</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((tx) => (
                    <TableRow key={tx.id} className="table-row-item">
                      <TableCell className="ui-meta font-mono font-bold pl-8">
                        #{tx.id.slice(-8).toUpperCase()}
                      </TableCell>
                      <TableCell className="py-4">
                         <div className="flex flex-col gap-0.5">
                           <span className="ui-item-name">{tx.customerName || 'Anonymous'}</span>
                           <span className="ui-caption">{tx.customerPhone || '—'}</span>
                         </div>
                      </TableCell>
                      <TableCell className="py-4">
                          {tx.items.some(i => i.technicianId) ? (
                            <div className="flex flex-col gap-1">
                               {Array.from(new Set(tx.items.filter(i => i.technicianId).map(i => i.technicianId))).map(tid => (
                                 <div key={tid} className="flex items-center gap-2">
                                    <Badge variant="outline" className="ui-meta px-1.5 py-0 border-border">TEKNISI</Badge>
                                    <span className="ui-caption font-semibold text-foreground">{getTechnicianName(tid || undefined)}</span>
                                 </div>
                               ))}
                            </div>
                          ) : (
                            <span className="ui-meta ">— Retail —</span>
                          )}
                      </TableCell>
                      <TableCell className="py-4">
                         <div className="flex items-center gap-2">
                            <Badge variant="outline" className="ui-meta px-1.5 py-0 border-muted-foreground/20">KASIR</Badge>
                            <span className="ui-caption font-semibold text-foreground">{getCashierName(tx.cashierId)}</span>
                         </div>
                      </TableCell>
                      <TableCell className="py-4 text-nowrap">
                         <span className="ui-caption">{formatDate(tx.date)}</span>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <div className={cn(
                          "status-badge inline-flex",
                          tx.status === 'Paid' ? "border-border bg-muted text-foreground" :
                          tx.status === 'Unpaid' ? "border-border bg-muted/50 text-muted-foreground" :
                          "border-border bg-muted/20 text-muted-foreground/40"
                        )}>
                          <div className={cn(
                            "status-dot",
                            tx.status === 'Paid' ? "bg-foreground" :
                            tx.status === 'Unpaid' ? "bg-muted-foreground/40" :
                            "bg-muted-foreground/20"
                          )} />
                          {tx.status === 'Paid' ? 'Lunas' : tx.status === 'Cancelled' ? 'Batal' : 'Pending'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-4 ui-price">
                        {formatCurrency(tx.total)}
                      </TableCell>
                      <TableCell className="text-right pr-8 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-muted" onClick={() => setSelectedTx(tx)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {hasFullAccess && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-muted" onClick={() => openEdit(tx)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {isAdmin && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-muted" onClick={() => setDeleteTx(tx)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* ── View Detail Dialog ── */}
      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent className="max-w-lg w-[95vw] bg-card border-none rounded-2xl p-0 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
          {selectedTx && (
            <div className="flex flex-col min-h-0">
              <div className="p-8 bg-primary text-primary-foreground shrink-0">
                <div className="flex justify-between items-start mb-8">
                   <div>
                     <p className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/70 mb-1">ID Transaksi</p>
                     <DialogTitle className="text-xl font-black uppercase tracking-tight text-white">{selectedTx?.id}</DialogTitle>
                   </div>
                   <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center shadow-sm">
                      <ReceiptText className="h-6 w-6 text-white" />
                   </div>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/70 mb-1">Total Amount</p>
                    <p className="text-lg font-black text-white">{formatCurrency(selectedTx?.total || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/70 mb-1">Method</p>
                    <p className="text-sm font-bold uppercase text-white">{selectedTx?.paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/70 mb-1">Status</p>
                    <p className="text-sm font-bold uppercase text-white">{selectedTx?.status}</p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto flex-1 min-h-0 no-scrollbar">
                <div className="space-y-4">
                  <p className="ui-label font-bold text-primary">Informasi Pelanggan</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center"><User className="h-4 w-4 text-primary" /></div>
                      <p className="text-[13px] font-semibold tracking-tight">{selectedTx?.customerName || 'Anonymous Customer'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center"><Phone className="h-4 w-4 text-primary" /></div>
                      <p className="text-[12px] font-medium text-muted-foreground">{selectedTx?.customerPhone || '—'}</p>
                    </div>
                    {selectedTx?.customerAddress && (
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center"><MapPin className="h-4 w-4 text-primary" /></div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{selectedTx?.customerAddress}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="ui-label font-bold text-primary">Item Pembelian</p>
                  <div className="space-y-2">
                    {selectedTx?.items.map((item, idx) => {
                      const techName = getTechnicianName(item.technicianId);
                      return (
                        <div key={idx} className="flex justify-between items-center p-4 rounded-lg bg-muted/20 border border-border/40">
                          <div className="flex items-center gap-3">
                             <div className="h-8 w-8 rounded bg-background border border-border/40 flex items-center justify-center">
                                <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground/40" />
                             </div>
                             <div>
                               <p className="text-[13px] font-semibold tracking-tight">{item.name}</p>
                               <div className="flex items-center gap-2 mt-0.5">
                                 <span className="text-[10px] font-medium text-muted-foreground/60">{item.quantity} x {formatCurrency(item.price)}</span>
                                 {techName && (
                                   <div className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md border border-border">
                                      <Wrench className="h-2.5 w-2.5 text-foreground" />
                                      <span className="ui-meta font-bold text-foreground">{techName}</span>
                                   </div>
                                 )}
                               </div>
                             </div>
                          </div>
                          <span className="text-[13px] font-bold text-foreground">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedTx?.notes && (
                  <div className="bg-muted/30 p-4 rounded-lg border border-border/40">
                    <p className="ui-label mb-2">Internal Note</p>
                    <p className="text-[12px] text-foreground font-medium  leading-relaxed">"{selectedTx?.notes}"</p>
                  </div>
                )}

                <div className="pt-6 border-t border-dashed border-border/60 flex justify-between items-center">
                   <div className="flex flex-col gap-1">
                      <p className="ui-meta uppercase text-muted-foreground">Kasir Bertugas</p>
                      <p className="text-[11px] font-bold text-foreground">{getCashierName(selectedTx?.cashierId || '')}</p>
                   </div>
                   <div className="flex flex-col items-end gap-1">
                      <p className="ui-meta uppercase text-muted-foreground">Waktu Transaksi</p>
                      <p className="text-[11px] font-bold text-foreground">{formatDate(selectedTx?.date || new Date().toISOString())}</p>
                   </div>
                </div>

                <div className="pt-8 flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setSelectedTx(null)}>Tutup</Button>
                  <Button 
                    className="gap-2 bg-foreground text-background hover:bg-foreground/90" 
                    onClick={() => selectedTx && handleDownloadReceipt(selectedTx)}
                    disabled={isGeneratingPDF}
                  >
                    <Download className="h-4 w-4" />
                    {isGeneratingPDF ? "Memproses..." : "Download PDF & Garansi"}
                  </Button>
                </div>
              </div>
            </div>
          )}
          </DialogContent>
      </Dialog>

      {/* ── HIDDEN RECEIPT TEMPLATE FOR PDF ── */}
      <div className="fixed -left-[2000px] top-0">
         <div ref={receiptRef} className="w-[210mm] bg-white p-12 text-black" style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* Force standard colors to avoid html2canvas oklab error */}
            <style dangerouslySetInnerHTML={{ __html: `
              .receipt-container * { color-scheme: light !important; }
              .text-primary { color: #262626 !important; }
              .bg-primary { background-color: #262626 !important; }
              .border-primary { border-color: #262626 !important; }
              .text-muted-foreground { color: #737373 !important; }
              .bg-muted { background-color: #f5f5f5 !important; }
              .border-border { border-color: #e5e5e5 !important; }
              .bg-background { background-color: #ffffff !important; }
            `}} />
            {selectedTx && (
              <div className="space-y-10 receipt-container">
                <div className="flex justify-between items-start border-b-2 border-black pb-8">
                  <div>
                    <h1 className="text-2xl font-black uppercase">{usePosStore.getState().storeProfile.name}</h1>
                    <p className="text-sm mt-1 font-medium">{usePosStore.getState().storeProfile.address}</p>
                    <p className="text-sm font-medium">Telp: {usePosStore.getState().storeProfile.phone}</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500">INVOICE & GARANSI</h2>
                    <p className="font-mono text-lg font-bold">#{selectedTx?.id.toUpperCase()}</p>
                    <p className="text-sm font-medium">{formatDate(selectedTx?.date || new Date().toISOString())}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-12">
                   <div className="space-y-4">
                      <p className="text-xs font-bold text-neutral-800 border-b border-neutral-200 pb-1 uppercase tracking-wider">Pelanggan</p>
                      <div>
                        <p className="text-lg font-bold">{selectedTx?.customerName || 'Anonymous'}</p>
                        <p className="text-sm font-medium">{selectedTx?.customerPhone || '—'}</p>
                        <p className="text-sm font-medium text-neutral-500">{selectedTx?.customerAddress || '—'}</p>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <p className="text-xs font-bold text-neutral-800 border-b border-neutral-200 pb-1 uppercase tracking-wider">Detail Transaksi</p>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Kasir</p>
                            <p className="text-sm font-bold">{getCashierName(selectedTx?.cashierId || '')}</p>
                         </div>
                         <div>
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Metode Bayar</p>
                            <p className="text-sm font-bold">{selectedTx?.paymentMethod}</p>
                         </div>
                      </div>
                   </div>
                </div>

                <table className="w-full">
                  <thead>
                    <tr className="border-y-2 border-black/5">
                      <th className="py-4 text-left text-[10px] font-bold uppercase tracking-widest text-neutral-500">Item / Layanan</th>
                      <th className="py-4 text-left text-[10px] font-bold uppercase tracking-widest text-neutral-500">Teknisi</th>
                      <th className="py-4 text-center text-[10px] font-bold uppercase tracking-widest text-neutral-500">Qty</th>
                      <th className="py-4 text-right text-[10px] font-bold uppercase tracking-widest text-neutral-500">Harga</th>
                      <th className="py-4 text-right text-[10px] font-bold uppercase tracking-widest text-neutral-500">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {selectedTx?.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-4">
                           <p className="font-bold text-sm uppercase">{item.name}</p>
                           <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tight">{item.category}</p>
                        </td>
                        <td className="py-4">
                           <p className="text-sm font-medium">{getTechnicianName(item.technicianId || undefined) || '—'}</p>
                        </td>
                        <td className="py-4 text-center font-bold text-sm">{item.quantity}</td>
                        <td className="py-4 text-right font-bold text-sm">{formatCurrency(item.price)}</td>
                        <td className="py-4 text-right font-bold text-sm">{formatCurrency(item.price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end pt-6 border-t-2 border-black/5">
                  <div className="w-64 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-neutral-500">Total Belanja</span>
                      <span className="font-bold">{formatCurrency(selectedTx?.total || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-neutral-500">Tunai/Bayar</span>
                      <span className="font-bold">{formatCurrency(selectedTx?.amountPaid || 0)}</span>
                    </div>
                    <div className="flex justify-between text-lg border-t pt-3 border-neutral-200">
                      <span className="font-bold text-neutral-900">Kembali</span>
                      <span className="font-bold text-neutral-900">{formatCurrency(selectedTx?.change || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* ── WARRANTY SECTION ── */}
                <div className="mt-16 p-8 bg-neutral-50 rounded-3xl border-2 border-dashed border-neutral-200">
                   <h3 className="text-xl font-black mb-4 flex items-center gap-3 uppercase tracking-tight">
                      <Shield className="h-6 w-6 text-neutral-800" />
                      Kartu Garansi
                   </h3>
                   <div className="grid grid-cols-2 gap-10">
                      <div className="space-y-4">
                         <p className="text-[10px] font-bold text-neutral-900 uppercase tracking-widest">SYARAT KLAIM GARANSI:</p>
                         <ul className="text-[11px] space-y-2 text-neutral-500 list-disc pl-4 font-medium leading-relaxed">
                            <li>Struk fisik atau PDF ini wajib dibawa saat melakukan klaim.</li>
                            <li>Segel garansi pada unit tidak boleh rusak atau terbuka.</li>
                            <li>Garansi tidak berlaku untuk kerusakan akibat cairan (water damage), jatuh, atau kelalaian pengguna.</li>
                            <li>Garansi hanya berlaku untuk komponen yang diganti/diservice sesuai struk ini.</li>
                         </ul>
                      </div>
                      <div className="space-y-4">
                         <p className="text-[10px] font-bold text-neutral-900 uppercase tracking-widest">MASA BERLAKU:</p>
                         <div className="p-4 bg-white border border-neutral-200 rounded-xl shadow-sm">
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Status Garansi</p>
                            <p className="text-sm font-black uppercase text-neutral-900">AKTIF HINGGA:</p>
                            <p className="text-xl font-black text-neutral-800">
                               {new Date(new Date(selectedTx?.date || Date.now()).getTime() + (30 * 24 * 60 * 60 * 1000)).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <p className="text-[10px] font-bold text-neutral-400 mt-1">* 30 Hari sejak tanggal pengerjaan</p>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="mt-12 text-center pt-8 border-t border-black/5">
                   <p className="text-sm font-bold text-neutral-800">Terima kasih atas kepercayaan Anda kepada {usePosStore.getState().storeProfile.name}</p>
                   <p className="text-[10px] font-bold text-neutral-400 mt-1 uppercase tracking-widest text-center">Dokumen ini sah secara digital dan dapat digunakan sebagai bukti klaim garansi.</p>
                </div>
              </div>
            )}
         </div>
      </div>

      {/* ── Edit Transaction Dialog ── */}
      <Dialog open={!!editTx} onOpenChange={(v) => { if (!v) setEditTx(null); }}>
        <DialogContent className="max-w-md bg-card border-none rounded-lg p-0 overflow-hidden shadow-2xl">
          <div className="bg-foreground p-8 text-background">
            <div className="flex justify-between items-center">
              <div>
                <p className="ui-label text-background/60 mb-1">Edit Transaksi</p>
                <DialogTitle className="ui-heading">Transaksi #{editTx?.id.slice(-8).toUpperCase()}</DialogTitle>
              </div>
              <div className="h-12 w-12 bg-white/10 rounded-lg flex items-center justify-center">
                <Pencil className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          <div className="p-8 space-y-5">
            <div className="space-y-2">
              <Label className="ui-label ml-1 text-primary">Nama Pelanggan</Label>
              <Input value={editForm.customerName} onChange={(e) => setEditForm({...editForm, customerName: e.target.value})} className="h-12" />
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="ui-label ml-1 text-primary">No. Telepon</Label>
                <Input value={editForm.customerPhone} onChange={(e) => setEditForm({...editForm, customerPhone: e.target.value})} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label className="ui-label ml-1 text-primary">Status Bayar</Label>
                <Select value={editForm.status} onValueChange={(val) => setEditForm({...editForm, status: val as any})}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-md">
                    <SelectItem value="Paid">Lunas</SelectItem>
                    <SelectItem value="Unpaid">Pending</SelectItem>
                    <SelectItem value="Cancelled">Batal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="ui-label ml-1 text-primary">Alamat Pengiriman</Label>
              <Input value={editForm.customerAddress} onChange={(e) => setEditForm({...editForm, customerAddress: e.target.value})} className="h-12" />
            </div>
            <div className="space-y-2">
              <Label className="ui-label ml-1 text-primary">Catatan Internal</Label>
              <Input value={editForm.notes} onChange={(e) => setEditForm({...editForm, notes: e.target.value})} className="h-12" placeholder="Tambahkan catatan khusus..." />
            </div>
            <DialogFooter className="pt-6 gap-3 sm:gap-0">
              <Button variant="ghost" className="h-12 flex-1" onClick={() => setEditTx(null)}>Batal</Button>
              <Button className="h-12 flex-1 shadow-sm bg-foreground text-background hover:bg-foreground/90" onClick={handleEdit}>Simpan Perubahan</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <Dialog open={!!deleteTx} onOpenChange={(v) => { if (!v) setDeleteTx(null); }}>
        <DialogContent className="max-w-sm bg-card border-none rounded-lg overflow-hidden shadow-2xl">
          <DialogHeader className="text-center pt-8 pb-4">
            <div className="mx-auto h-16 w-16 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <Trash2 className="h-8 w-8 text-red-600" />
            </div>
            <DialogTitle className="ui-heading text-red-600">Hapus Transaksi?</DialogTitle>
            <DialogDescription className="ui-meta">
              Transaksi <span className="font-bold text-foreground">#{deleteTx?.id?.slice(-8).toUpperCase()}</span> sebesar <span className="font-bold text-primary">{deleteTx && formatCurrency(deleteTx.total)}</span> akan dihapus permanen.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 px-8 pb-8">
            <Button variant="ghost" className="flex-1 h-12" onClick={() => setDeleteTx(null)}>Batal</Button>
            <Button variant="destructive" className="flex-1 h-12" onClick={handleDelete}>Hapus Transaksi</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
