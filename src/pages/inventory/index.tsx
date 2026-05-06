import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { usePosStore } from "@/lib/store";
import {
  Search, Pencil, Trash2, MapPin, Package, Plus

} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import StockTransferTab from "../../components/inventory/StockTransferTab";
import { formatCurrency, cn } from "@/lib/utils";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";


export default function LogisticsDashboard() {
  const {
    inventory, stocks, categories, suppliers,
    addInventoryItem, updateInventoryItem, deleteInventoryItem, updateStock,
    addCategory, deleteCategory,
    inventoryUnits, addInventoryUnit, deleteInventoryUnit
  } = usePosStore();

  const { user: currentUser, branch: currentBranch, branches, isSuperAdmin: isOwner, setBranch: setCurrentBranch, canAccess } = useAuth();

  const router = useRouter();
  const [activeTab, setActiveTab] = useState("items");

  useEffect(() => {
    const tab = router.query.tab;
    if (tab === 'mutasi') {
      setActiveTab('mutasi');
    }
  }, [router.query]);

  const hasFullAccess = canAccess('Inventory', 'Full');

  const [searchQuery, setSearchQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<any>(null);

  const [stockQty, setStockQty] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [editStockRow, setEditStockRow] = useState<any>(null);
  const [sortByStock, setSortByStock] = useState<string>("none");

  const emptyForm = { name: "", sku: "", categoryId: "", rack: "", costPrice: "", basePrice: "", supplierId: "", warranty: "", image: "", showInPos: true };

  const [form, setForm] = useState(emptyForm);

  const displayRows = useMemo(() => {
    let rows = inventory
      .filter(item => {
        const cat = categories.find(c => c.id === item.categoryId);
        const name = cat?.name?.toLowerCase() || "";
        return !name.includes("service") && !name.includes("jasa");
      })
      .map(item => {
        const itemStocks = stocks.filter(s => s.itemId === item.id);

        let totalStock = 0;
        if (!currentBranch) {
          totalStock = itemStocks.reduce((sum, s) => sum + s.quantity, 0);
        } else {
          totalStock = itemStocks.find(s => s.branchId === currentBranch.id)?.quantity || 0;
        }

        const stockMap = branches.reduce((acc, branch) => {
          acc[branch.id] = itemStocks.find(st => st.branchId === branch.id)?.quantity || 0;
          return acc;
        }, {} as Record<string, number>);

        return { ...item, totalStock, stockMap };
      });

    rows = rows.filter(row =>
      row.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortByStock === "most") rows.sort((a, b) => b.totalStock - a.totalStock);
    else if (sortByStock === "least") rows.sort((a, b) => a.totalStock - b.totalStock);

    return rows;
  }, [inventory, stocks, branches, searchQuery, sortByStock, currentBranch, categories]);

  const handleSave = async () => {
    if (!form.name || !form.sku) return;
    try {
      const payload = {
        ...form,
        costPrice: Number(form.costPrice),
        basePrice: Number(form.basePrice),
        unit: "pcs",
        showInPos: !!form.showInPos
      };

      if (editItem) await updateInventoryItem(editItem.id, payload);
      else await addInventoryItem(payload as any);
      setAddOpen(false); setEditItem(null); setForm(emptyForm);
    } catch (e) { alert("Gagal menyimpan data"); }
  };

  const submitStockUpdate = async () => {
    if (!editStockRow || !stockQty) return;
    try {
      await updateStock(editStockRow.id, editStockRow.branchId, Number(stockQty));
      setEditStockRow(null); setStockQty("");
    } catch (e) { alert("Gagal update stok"); }
  };

  return (
    <Layout title="Inventori & Stok" requiredModule="Inventory" requiredLevel="Read">
      <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-1">
          <div className="space-y-8">

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex flex-col gap-6 mb-8">
                {/* Header Row: Tabs */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border">
                  <div className="overflow-x-auto no-scrollbar flex-1 min-w-0">
                    <TabsList className="bg-transparent p-0 h-auto gap-0 flex w-max min-w-full rounded-none border-none">
                      {[
                        { value: "items", label: "Produk" },
                        { value: "mutasi", label: "Mutasi" },
                      ].map((tab) => (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className="
                            relative bg-transparent rounded-none px-4 py-2.5 text-xs font-semibold text-muted-foreground
                            border-b-2 border-transparent
                            data-[state=active]:border-primary
                            data-[state=active]:text-foreground
                            data-[state=active]:bg-transparent
                            data-[state=active]:shadow-none
                            flex items-center gap-1.5 shrink-0 whitespace-nowrap
                          "
                        >
                          {tab.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                </div>

                {/* Filter Row: Search + Selects */}
                {activeTab === 'items' && (
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                    <div className="relative flex-1 md:max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                      <Input
                        placeholder="Cari produk..."
                        className="pl-9 h-9 rounded-lg border-border/40 bg-card text-xs"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    {hasFullAccess && (
                      <Button
                        className="h-9 px-4 text-xs gap-1.5"
                        onClick={() => setAddOpen(true)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Tambah Unit
                      </Button>
                    )}
                    <div className="flex items-center gap-2">
                      {isOwner && (
                        <Select
                          value={currentBranch?.id || 'all'}
                          onValueChange={(val) => setCurrentBranch(val === 'all' ? null : val)}
                        >
                          <SelectTrigger className="h-9 min-w-[160px] rounded-lg bg-card border border-border/40 text-xs">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              <SelectValue placeholder="Semua Cabang" />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Semua Cabang</SelectItem>
                            {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                      <Select value={sortByStock} onValueChange={setSortByStock}>
                        <SelectTrigger className="h-9 w-36 rounded-lg bg-card border border-border/40 text-xs">
                          <SelectValue placeholder="Urutkan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Default</SelectItem>
                          <SelectItem value="most">Stok Terbanyak</SelectItem>
                          <SelectItem value="least">Stok Terendah</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <TabsContent value="items" className="m-0">
                <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/10">
                      <TableRow className="hover:bg-transparent border-none">

                        <TableHead className="ui-label py-4 pl-6">Unit & SKU</TableHead>
                        <TableHead className="ui-label py-4">Masuk</TableHead>
                        <TableHead className="ui-label py-4">Supplier</TableHead>

                        <TableHead className="ui-label py-4">Rak</TableHead>
                        <TableHead className="ui-label py-4 text-center">Status</TableHead>
                        <TableHead className="ui-label py-4 text-center">Kasir</TableHead>
                        <TableHead className="ui-label py-4 text-center">Stok</TableHead>

                        <TableHead className="ui-label py-4 text-right">Harga</TableHead>
                        <TableHead className="ui-label py-4 text-right pr-6">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayRows.length > 0 ? (
                        displayRows.map((row) => (
                          <TableRow key={row.id} className="hover:bg-muted/5 border-none">

                            <TableCell className="py-6 pl-6">
                              <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/20">
                                  {row.image ? <img src={row.image} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center opacity-10"><MapPin className="h-5 w-5" /></div>}
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <span className="ui-item-name">{row.name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="ui-meta uppercase tracking-widest">{row.sku}</span>
                                    {row.warranty && <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold uppercase">Garansi {row.warranty}</span>}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-6">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setHistoryItem(row); setHistoryOpen(true); }}
                                className="h-auto p-0 flex flex-col items-start hover:bg-transparent group"
                              >
                                <span className="ui-meta group-hover:text-primary transition-colors">
                                  {row.dateAdded ? format(new Date(row.dateAdded), "dd MMM yyyy", { locale: localeId }) : "—"}
                                </span>

                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest group-hover:text-primary/70 transition-colors">
                                  {inventoryUnits.filter(u => u.itemId === row.id).length} Unit Terlacak
                                </span>
                              </Button>
                            </TableCell>
                            <TableCell className="py-6">
                              <span className="ui-label">{suppliers.find(s => s.id === row.supplierId)?.name || "—"}</span>
                            </TableCell>

                            <TableCell className="py-6">
                              <span className="ui-label text-foreground font-bold">{row.rack || "—"}</span>
                            </TableCell>
                            <TableCell className="py-6 text-center">
                              <span className={cn("ui-label", row.totalStock <= 0 ? "opacity-30" : row.totalStock < 5 ? "text-amber-600" : "text-emerald-600")}>
                                {row.totalStock <= 0 ? "Habis" : row.totalStock < 5 ? "Menipis" : "Tersedia"}
                              </span>
                            </TableCell>

                            <TableCell className="py-6 text-center">
                              {row.showInPos ? (
                                <span className="text-primary text-[10px] font-black uppercase tracking-tighter">Aktif</span>
                              ) : (
                                <span className="text-muted-foreground/30 text-[10px] font-black uppercase tracking-tighter">Non-aktif</span>
                              )}
                            </TableCell>

                            <TableCell className="py-6 text-center">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="flex flex-col items-center justify-center h-auto py-2 px-4 rounded-xl hover:bg-muted/10 transition-all group"
                                  >
                                    <span className="text-[14px] font-black group-hover:text-primary transition-colors">{row.totalStock}</span>
                                    <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{currentBranch ? "Cabang" : "Total"}</span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-4 rounded-2xl border-none shadow-2xl bg-card">
                                  <div className="space-y-4">
                                    <div className="flex justify-between items-center border-b border-border/5 pb-2">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-primary">Rincian Stok Cabang</span>
                                      {hasFullAccess && (
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-6 px-2 text-[8px] font-bold uppercase"
                                          onClick={() => {
                                            const branchId = currentBranch?.id || branches[0]?.id;
                                            if (!branchId) return;
                                            setEditStockRow({ ...row, branchId, branchName: branches.find(b => b.id === branchId)?.name });
                                            setStockQty(String(row.stockMap[branchId] || 0));
                                          }}
                                        >
                                          Edit
                                        </Button>
                                      )}
                                    </div>
                                    <div className="space-y-2">
                                      {branches.map(b => (
                                        <div key={b.id} className="flex justify-between items-center">
                                          <span className="text-[10px] font-bold text-muted-foreground uppercase">{b.name}</span>
                                          <span className="text-xs font-black text-foreground">{row.stockMap[b.id] || 0} PCS</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>



                            <TableCell className="text-right py-6">
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="ui-item-name">{formatCurrency(row.basePrice)}</span>
                                <span className="ui-meta">{formatCurrency(row.costPrice)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-6 py-6">
                              {hasFullAccess && (
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md hover:bg-muted" onClick={() => {
                                    setEditItem(row);
                                    setForm({
                                      name: row.name,
                                      sku: row.sku,
                                      categoryId: row.categoryId,
                                      rack: row.rack || "",
                                      costPrice: String(row.costPrice),
                                      basePrice: String(row.basePrice),
                                      supplierId: row.supplierId || "",
                                      warranty: row.warranty || "",
                                      image: row.image || "",
                                      showInPos: row.showInPos !== false
                                    });

                                  }}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md hover:bg-muted" onClick={() => setDeleteTarget(row)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow><TableCell colSpan={7} className="h-48 text-center"><span className="ui-meta opacity-20">Data Inventori Kosong</span></TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="mutasi" className="m-0">
                <StockTransferTab />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <Dialog open={addOpen || !!editItem} onOpenChange={(v) => { if (!v) { setAddOpen(false); setEditItem(null); } }}>
        <DialogContent className="max-w-md bg-white border border-slate-200 rounded-xl p-0 overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-50">
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editItem ? "Update Master Stok" : "Tambah Unit Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-1">Kelola informasi produk dan harga jual secara detail.</DialogDescription>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500">Nama Unit / Produk</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-10 border-slate-200 rounded-md shadow-none"
                placeholder="Contoh: LCD iPhone 13 Original"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500">SKU / Kode Produk</Label>
              <Input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="h-10 border-slate-200 rounded-md shadow-none"
                placeholder="IPH-13-LCD"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500">Kategori</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger className="h-10 border-slate-200 rounded-md shadow-none">
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-500">HPP</Label>
                <Input
                  type="number"
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                  className="h-10 border-slate-200 rounded-md shadow-none"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-500">Harga Jual</Label>
                <Input
                  type="number"
                  value={form.basePrice}
                  onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                  className="h-10 border-slate-200 rounded-md shadow-none font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500">Garansi Produk</Label>
              <Input
                value={form.warranty}
                onChange={(e) => setForm({ ...form, warranty: e.target.value })}
                className="h-10 border-slate-200 rounded-md shadow-none"
                placeholder="Contoh: 30 Hari"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500">Foto & Dokumentasi</Label>
              <div className="flex gap-4 items-center p-3 rounded-lg border border-slate-100">
                <div className="h-10 w-10 rounded bg-slate-50 overflow-hidden flex items-center justify-center shrink-0 border border-slate-100">
                  {form.image ? (
                    <img src={form.image} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-4 w-4 bg-slate-200 rounded-sm" />
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    id="inventory-image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setForm({ ...form, image: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <Label
                    htmlFor="inventory-image-upload"
                    className="text-xs font-bold text-slate-900 cursor-pointer hover:underline"
                  >
                    {form.image ? 'Ganti Foto' : 'Unggah Foto'}
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/10">
              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold uppercase tracking-tight">Tampilkan di Kasir</Label>
                <p className="text-[10px] text-muted-foreground">Aktifkan agar produk muncul di menu POS.</p>
              </div>
              <Switch
                checked={form.showInPos}
                onCheckedChange={(v) => setForm({ ...form, showInPos: v })}
              />
            </div>
          </div>


          <div className="p-6 pt-0 flex gap-2">
            <Button variant="outline" className="flex-1 h-10 rounded-md text-slate-500" onClick={() => { setAddOpen(false); setEditItem(null); }}>Batal</Button>
            <Button className="flex-[2] h-10 bg-slate-900 text-white hover:bg-slate-800 rounded-md" onClick={handleSave}>
              {editItem ? 'Simpan Stok' : 'Simpan Unit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editStockRow} onOpenChange={(v) => { if (!v) setEditStockRow(null); }}>
        <DialogContent className="max-w-sm bg-card border-none rounded-2xl p-0 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-border/5">
            <DialogTitle className="ui-title">Update Stok</DialogTitle>
            <DialogDescription className="ui-meta text-xs">Sesuaikan jumlah stok barang untuk setiap cabang.</DialogDescription>
            <DialogDescription className="ui-label mt-1">{editStockRow?.name} @ {editStockRow?.branchName}</DialogDescription>

          </div>
          <div className="p-8">
            <Input type="number" value={stockQty} onChange={(e) => setStockQty(e.target.value)} className="h-12 text-center text-lg font-bold" autoFocus />
          </div>
          <DialogFooter className="p-8 pt-0 flex gap-2">
            <Button variant="ghost" className="flex-1 h-12" onClick={() => setEditStockRow(null)}>Batal</Button>
            <Button className="flex-1 h-12 bg-foreground text-background" onClick={submitStockUpdate}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm bg-card border-none rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-8 text-center space-y-4">
            <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto"><Trash2 className="h-8 w-8 text-red-500" /></div>
            <DialogTitle className="ui-title">Hapus Data?</DialogTitle>
            <DialogDescription className="ui-meta">Tindakan ini tidak dapat dibatalkan. Data produk akan dihapus permanen.</DialogDescription>
            <div className="flex gap-3 pt-4">
              <Button variant="ghost" className="flex-1 h-12" onClick={() => setDeleteTarget(null)}>Batal</Button>
              <Button variant="destructive" className="flex-1 h-12" onClick={async () => { await deleteInventoryItem(deleteTarget.id); setDeleteTarget(null); }}>Hapus</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-xl bg-card border-none rounded-2xl p-0 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-border/5 bg-muted/5">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="ui-title">{historyItem?.name}</DialogTitle>
                <DialogDescription className="ui-meta mt-1">Riwayat kedatangan unit secara spesifik (FIFO).</DialogDescription>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Total Stok</span>
                <span className="text-2xl font-black text-foreground">{historyItem?.totalStock}</span>
              </div>
            </div>
          </div>

          <div className="p-0 max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-muted/10 sticky top-0 z-10">
                <TableRow className="border-none">
                  <TableHead className="ui-label py-3 pl-8">Tgl Masuk</TableHead>
                  <TableHead className="ui-label py-3">SN / IMEI</TableHead>
                  <TableHead className="ui-label py-3">Cabang</TableHead>
                  <TableHead className="ui-label py-3">Status</TableHead>
                  <TableHead className="ui-label py-3 text-right pr-8">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryUnits.filter(u => u.itemId === historyItem?.id).length > 0 ? (
                  inventoryUnits.filter(u => u.itemId === historyItem?.id).map((unit) => (
                    <TableRow key={unit.id} className="border-none hover:bg-muted/5 transition-colors">
                      <TableCell className="py-4 pl-8">
                        <span className="ui-meta font-bold text-foreground">
                          {format(new Date(unit.entryDate), "dd/MM/yyyy HH:mm")}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-black uppercase tracking-tighter">
                          {unit.serialNumber || "Tanpa SN"}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="ui-meta text-[10px] font-bold uppercase">
                          {branches.find(b => b.id === unit.branchId)?.name || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-tighter",
                          unit.status === 'Available' ? "text-emerald-600" : "text-amber-600"
                        )}>
                          {unit.status === 'Available' ? "Tersedia" : unit.status}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-right pr-8">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => deleteInventoryUnit(unit.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center opacity-20">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-8 w-8" />
                        <span className="ui-meta">Belum ada unit yang dilacak secara individual</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="p-8 bg-muted/5 border-t border-border/10">
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Tambah Unit Baru</p>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-[3]">
                  <Input
                    id="new-sn"
                    placeholder="Masukkan IMEI / Serial Number"
                    className="h-12 rounded-xl bg-background border-border font-bold text-sm px-4 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="flex-[2] flex gap-2">
                  <Select defaultValue={currentBranch?.id || branches[0]?.id} onValueChange={(val) => {
                    const input = document.getElementById('new-branch-input') as HTMLInputElement;
                    if (input) input.value = val;
                  }}>
                    <SelectTrigger className="flex-1 h-12 rounded-xl bg-background border-border font-bold text-xs">
                      <SelectValue placeholder="Cabang" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" id="new-branch-input" defaultValue={currentBranch?.id || branches[0]?.id} />

                  <Button
                    className="bg-foreground text-background h-12 px-6 rounded-xl font-black text-xs uppercase hover:scale-[1.02] active:scale-[0.98] transition-all"
                    onClick={async () => {
                      const sn = (document.getElementById('new-sn') as HTMLInputElement).value;
                      const bId = (document.getElementById('new-branch-input') as HTMLInputElement).value || currentBranch?.id || branches[0]?.id;
                      if (!sn) return;
                      await addInventoryUnit({
                        itemId: historyItem.id,
                        branchId: bId,
                        serialNumber: sn,
                        status: 'Available'
                      });
                      (document.getElementById('new-sn') as HTMLInputElement).value = "";
                    }}
                  >
                    Tambah
                  </Button>
                </div>
              </div>
            </div>
          </div>

        </DialogContent>
      </Dialog>
    </Layout>

  );
}
