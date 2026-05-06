import { useState, useEffect } from "react";
import { StockTransferStatus } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";

import { usePosStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Plus, Package, MapPin, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StockTransferTab() {
  const { 
    stockTransfers, inventory, stocks, createStockTransfer, updateStockTransferStatus, 
    fetchTransfers
  } = usePosStore();
  const { user: currentUser, branch: currentBranch, branches, isAdmin: isUserAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [targetBranchId, setTargetBranchId] = useState("");
  const [requestingBranchId, setRequestingBranchId] = useState(currentBranch?.id || "");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleUpdateStatus = async (id: string, status: StockTransferStatus) => {
    try {
      setProcessingId(id);
      await updateStockTransferStatus(id, status);
    } catch (error: any) {
      alert(error.message || "Gagal memperbarui status");
    } finally {
      setProcessingId(null);
    }
  };

  const isAdmin = isUserAdmin || currentUser?.roleId === 'owner-role-id';

  const handleCreate = async () => {
    const finalToBranchId = isAdmin ? requestingBranchId : currentBranch?.id;

    const sourceStock = stocks.find(s => s.itemId === selectedItemId && s.branchId === targetBranchId)?.quantity || 0;

    console.log("Creating transfer...", { finalToBranchId, targetBranchId, selectedItemId, qty, sourceStock });
    
    if (!finalToBranchId) {
      alert("Silakan pilih cabang peminta terlebih dahulu.");
      return;
    }
    if (!targetBranchId || !selectedItemId || !qty) {
      alert("Mohon lengkapi semua data (Item, Cabang Sumber, dan Jumlah).");
      return;
    }

    if (Number(qty) > sourceStock) {
      alert(`Jumlah permintaan (${qty}) melebihi stok yang tersedia di cabang sumber (${sourceStock} PCS).`);
      return;
    }
    
    try {
      setLoading(true);
      await createStockTransfer({
        fromBranchId: targetBranchId,
        toBranchId: finalToBranchId,
        notes,
        items: [{ itemId: selectedItemId, quantity: Number(qty) }] as any
      });
      
      setOpen(false);
      setTargetBranchId("");
      setRequestingBranchId(currentBranch?.id || "");
      setSelectedItemId("");
      setQty("");
      setNotes("");
    } catch (err) {
      console.error("Error in handleCreate:", err);
      alert("Gagal mengirim permintaan stok.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="ui-title">Mutasi Stok Antar Cabang</h3>
          <p className="ui-meta">Minta atau kirim stok ke cabang lain dalam satu sistem.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-foreground text-background gap-2 rounded-xl h-11 px-6">
          <Plus className="h-4 w-4" />
          Minta Stok
        </Button>
      </div>

      <div className="rounded-xl bg-card overflow-hidden">
        <Table className="border-0">
          <TableHeader className="bg-muted/5 border-0">
            <TableRow className="hover:bg-transparent border-0">
              <TableHead className="ui-label py-4 pl-6 text-center w-20 border-0">#</TableHead>
              <TableHead className="ui-label py-4 border-0">Status</TableHead>
              <TableHead className="ui-label py-4 border-0">Alur Transfer</TableHead>
              <TableHead className="ui-label py-4 border-0">Item & Qty</TableHead>
              <TableHead className="ui-label py-4 border-0">Catatan</TableHead>
              <TableHead className="ui-label py-4 text-right pr-6 border-0">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockTransfers.length > 0 ? (
              stockTransfers.map((t, i) => (
                <TableRow key={t.id} className="hover:bg-muted/5 border-0 border-b border-border/5 last:border-0">
                  <TableCell className="py-6 pl-6 text-center border-0">
                    <span className="ui-meta">{i + 1}</span>
                  </TableCell>
                  <TableCell className="py-6 border-0">
                    {t.status === 'Pending' && <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200/50 gap-0 py-1 px-3 rounded-full uppercase text-[10px] font-bold">Menunggu</Badge>}
                    {t.status === 'Approved' && <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200/50 gap-0 py-1 px-3 rounded-full uppercase text-[10px] font-bold">Dikirim</Badge>}
                    {t.status === 'Completed' && <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200/50 gap-0 py-1 px-3 rounded-full uppercase text-[10px] font-bold">Selesai</Badge>}
                    {t.status === 'Rejected' && <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200/50 gap-0 py-1 px-3 rounded-full uppercase text-[10px] font-bold">Ditolak</Badge>}
                    {t.status === 'Cancelled' && <Badge variant="outline" className="text-slate-600 bg-slate-50 border-slate-200/50 gap-0 py-1 px-3 rounded-full uppercase text-[10px] font-bold">Dibatalkan</Badge>}
                  </TableCell>
                  <TableCell className="py-6 border-0">
                    <div className="flex items-center gap-3">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1">Dari</span>
                          <span className="ui-label text-foreground font-black">{t.fromBranchName || branches.find(b => b.id === t.fromBranchId)?.name}</span>
                       </div>
                       <ArrowRight className="h-4 w-4 text-muted-foreground/30" />
                       <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1">Ke</span>
                          <span className="ui-label text-foreground font-black">{t.toBranchName || branches.find(b => b.id === t.toBranchId)?.name}</span>
                       </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-6 border-0">
                    <div className="flex flex-col gap-1">
                      {t.items.map((it: any) => (
                        <div key={it.id} className="flex items-center gap-2">
                          <span className="ui-label font-bold text-foreground">{it.itemName || it.item?.name || "Item"}</span>
                          <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-black uppercase">x{it.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="py-6 max-w-[200px] border-0">
                    <p className="ui-meta line-clamp-1">{t.notes || "—"}</p>
                  </TableCell>
                  <TableCell className="py-6 text-right pr-6 border-0">
                    <div className="flex justify-end gap-2">
                       {/* Action if I am the Source Branch (From) */}
                       {t.status === 'Pending' && currentBranch?.id === t.fromBranchId && (
                         <Button 
                           size="sm" 
                           disabled={processingId === t.id}
                           className="bg-primary text-primary-foreground h-8 px-4 text-[10px] font-black uppercase rounded-lg shadow-sm"
                           onClick={() => handleUpdateStatus(t.id, 'Approved')}
                         >
                           Kirim Barang
                         </Button>
                       )}
                       
                       {/* Action if I am the Destination Branch (To) */}
                       {t.status === 'Approved' && currentBranch?.id === t.toBranchId && (
                         <Button 
                           size="sm" 
                           disabled={processingId === t.id}
                           className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-4 text-[10px] font-black uppercase rounded-lg shadow-sm"
                           onClick={() => handleUpdateStatus(t.id, 'Completed')}
                         >
                           Terima Barang
                         </Button>
                       )}

                       {/* Contextual Cancellation/Rejection */}
                       {t.status === 'Pending' && (
                         <>
                           {currentBranch?.id === t.fromBranchId || isUserAdmin ? (
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               disabled={processingId === t.id}
                               className="text-red-500 h-8 px-3 gap-1 hover:bg-red-50"
                               onClick={() => handleUpdateStatus(t.id, 'Rejected')}
                             >
                               <XCircle className="h-3 w-3" />
                               <span className="text-[10px] font-black uppercase tracking-tight">Tolak</span>
                             </Button>
                           ) : currentBranch?.id === t.toBranchId ? (
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               disabled={processingId === t.id}
                               className="text-slate-400 h-8 px-3 gap-1 hover:bg-slate-50"
                               onClick={() => handleUpdateStatus(t.id, 'Cancelled')}
                             >
                               <XCircle className="h-3 w-3" />
                               <span className="text-[10px] font-black uppercase tracking-tight">Batal</span>
                             </Button>
                           ) : null}
                         </>
                       )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                   <div className="flex flex-col items-center gap-2 opacity-20">
                      <Package className="h-12 w-12" />
                      <span className="ui-meta">Belum ada riwayat mutasi stok</span>
                   </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-card border-none rounded-2xl p-0 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-border/5">
            <DialogTitle className="ui-title">Minta Stok Baru</DialogTitle>
            <DialogDescription className="ui-meta mt-1">Pilih cabang sumber dan item yang Anda butuhkan.</DialogDescription>
          </div>
          <div className="p-8 space-y-6">
              <div className="bg-muted/10 p-4 rounded-2xl border border-border/5 space-y-4">
                {isAdmin ? (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Cabang Peminta (Tujuan)</Label>
                    <Select value={requestingBranchId} onValueChange={setRequestingBranchId}>
                        <SelectTrigger className="h-12 rounded-xl bg-background border-border/40 font-bold">
                          <SelectValue placeholder="Cabang yang membutuhkan stok" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {branches.map(b => (
                            <SelectItem key={b.id} value={b.id} className="py-3 font-bold">{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Cabang Peminta (Tujuan)</span>
                    <span className="text-sm font-black text-foreground">{currentBranch?.name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="ui-label uppercase tracking-widest opacity-50">1. Pilih Item Produk</Label>
                <Select value={selectedItemId} onValueChange={(val) => {
                   setSelectedItemId(val);
                   setTargetBranchId(""); // Reset source when item changes
                }}>
                   <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-border/40 font-bold">
                      <SelectValue placeholder="Apa yang ingin Anda minta?" />
                   </SelectTrigger>
                   <SelectContent className="rounded-xl max-h-[300px]">
                      {inventory.map(item => (
                        <SelectItem key={item.id} value={item.id} className="py-3 font-bold">{item.name}</SelectItem>
                      ))}
                   </SelectContent>
                </Select>
             </div>

             {selectedItemId ? (
               <div className="space-y-3">
                  <Label className="ui-label uppercase tracking-widest opacity-50">2. Pilih Cabang Sumber (Klik Cabang)</Label>
                  <div className="grid grid-cols-2 gap-3">
                      {branches.filter(b => b.id !== (isAdmin ? requestingBranchId : currentBranch?.id)).map(b => {
                         const s = stocks.find(st => st.itemId === selectedItemId && st.branchId === b.id);
                         const quantity = s?.quantity || 0;
                         const isSelected = targetBranchId === b.id;

                         return (
                           <div 
                             key={b.id} 
                             onClick={() => quantity > 0 && setTargetBranchId(b.id)}
                             className={cn(
                               "flex flex-col p-4 rounded-2xl border transition-all relative group",
                               isSelected 
                                 ? "bg-primary border-primary shadow-lg scale-[1.02]" 
                                 : "bg-background border-border/40 hover:border-foreground/40",
                               quantity <= 0 && "opacity-40 cursor-not-allowed border-dashed grayscale"
                             )}
                           >
                             <span className={cn(
                               "text-[10px] font-black uppercase tracking-widest mb-1",
                               isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                             )}>{b.name}</span>
                             <div className="flex items-baseline gap-1">
                                <span className={cn(
                                  "text-lg font-black",
                                  isSelected ? "text-primary-foreground" : "text-foreground"
                                )}>{quantity}</span>
                                <span className={cn(
                                  "text-[10px] font-bold",
                                  isSelected ? "text-primary-foreground/60" : "text-muted-foreground"
                                )}>PCS</span>
                             </div>
                             {isSelected && (
                               <div className="absolute top-2 right-2">
                                  <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                               </div>
                             )}
                           </div>
                         );
                      })}
                  </div>
               </div>
             ) : (
               <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-border/20 rounded-2xl bg-muted/5">
                  <Package className="h-6 w-6 text-muted-foreground/20 mb-2" />
                  <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Pilih item untuk melihat stok cabang lain</p>
               </div>
             )}


             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                       <Label className="ui-label uppercase tracking-widest opacity-50">3. Jumlah</Label>
                       {targetBranchId && (
                          <span className="text-[10px] font-black text-primary/60">MAX: {stocks.find(s => s.itemId === selectedItemId && s.branchId === targetBranchId)?.quantity || 0}</span>
                       )}
                    </div>
                    <Input 
                       type="number" 
                       placeholder="0" 
                       value={qty} 
                       max={stocks.find(s => s.itemId === selectedItemId && s.branchId === targetBranchId)?.quantity || 0}
                       onChange={(e) => setQty(e.target.value)}
                       className="h-12 rounded-xl bg-muted/20 border-border/40 font-bold text-lg" 
                    />
                </div>
                <div className="space-y-2">
                    <Label className="ui-label uppercase tracking-widest opacity-50">4. Catatan</Label>
                    <Input 
                       placeholder="Urgent/Lainnya" 
                       value={notes} 
                       onChange={(e) => setNotes(e.target.value)}
                       className="h-12 rounded-xl bg-muted/20 border-border/40 font-bold" 
                    />
                </div>
             </div>
          </div>

          <DialogFooter className="p-8 pt-0">
             <div className="flex w-full gap-3">
                <Button variant="ghost" className="flex-1 h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest" onClick={() => setOpen(false)}>Batal</Button>
                <Button 
                  disabled={loading || !targetBranchId || !selectedItemId || !qty || Number(qty) <= 0 || Number(qty) > (stocks.find(s => s.itemId === selectedItemId && s.branchId === targetBranchId)?.quantity || 0)}
                  className={cn(
                    "flex-[2] h-12 rounded-xl font-black uppercase tracking-[0.2em] text-[11px] transition-all",
                    (loading || !targetBranchId || !selectedItemId || !qty || Number(qty) <= 0 || Number(qty) > (stocks.find(s => s.itemId === selectedItemId && s.branchId === targetBranchId)?.quantity || 0)) 
                      ? "bg-muted text-muted-foreground opacity-50" 
                      : "bg-foreground text-background shadow-xl hover:shadow-primary/20"
                  )}
                  onClick={handleCreate}
                >
                   {loading ? "Mengirim..." : "Kirim Permintaan"}
                </Button>
             </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
