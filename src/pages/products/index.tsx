"use client";
import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { 
  Plus, Search, Package, Pencil, Trash2, 
  ArrowUpDown, Filter, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { usePosStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

export default function ProductsPage() {
  const { inventory, categories, stocks, currentBranch, addInventoryItem, updateInventoryItem, deleteInventoryItem } = usePosStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  
  // Modal State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  // Form State
  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    sku: "",
    costPrice: "",
    basePrice: "",
    image: "",
    unit: "pcs",
    warranty: ""
  });

  const filteredItems = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategoryId === "all" || item.categoryId === selectedCategoryId;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchQuery, selectedCategoryId]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm({
      name: "", categoryId: categories[0]?.id || "", sku: "", 
      costPrice: "", basePrice: "", image: "", unit: "pcs", warranty: ""
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      categoryId: item.categoryId,
      sku: item.sku,
      costPrice: item.costPrice.toString(),
      basePrice: item.basePrice.toString(),
      image: item.image || "",
      unit: item.unit || "pcs",
      warranty: item.warranty || ""
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      ...form,
      costPrice: parseFloat(form.costPrice) || 0,
      basePrice: parseFloat(form.basePrice) || 0,
    };

    try {
      if (editingItem) {
        await updateInventoryItem(editingItem.id, payload);
      } else {
        await addInventoryItem(payload);
      }
      setIsDialogOpen(false);
    } catch (e) {
      alert("Gagal menyimpan produk");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteInventoryItem(deleteTarget.id);
      setDeleteTarget(null);
    } catch (e) {
      alert("Gagal menghapus produk");
    }
  };

  return (
    <Layout title="Produk">
      <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-1">
          <div className="space-y-8">
            
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/30" />
                  <Input 
                    placeholder="Cari produk atau SKU..." 
                    className="pl-9 h-9" 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                  />
                </div>
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger className="h-9 w-36">
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">Semua Kategori</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleOpenAdd}
                className="h-9 px-6 rounded-lg bg-foreground text-background hover:bg-foreground/90"
              >
                Tambah Produk
              </Button>
            </div>


            <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow className="hover:bg-transparent border-b border-border/40">
                    <TableHead className="ui-label py-4 pl-6">Produk</TableHead>
                    <TableHead className="ui-label py-4">Kategori</TableHead>
                    <TableHead className="ui-label py-4">Harga Beli</TableHead>
                    <TableHead className="ui-label py-4">Harga Jual</TableHead>
                    <TableHead className="ui-label py-4 text-center">Margin</TableHead>
                    <TableHead className="ui-label py-4 text-right pr-6">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center">
                        <span className="ui-meta opacity-20">Belum ada data produk</span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((row) => {
                      const cat = categories.find(c => c.id === row.categoryId);
                      const margin = row.basePrice - row.costPrice;
                      return (
                        <TableRow key={row.id} className="hover:bg-muted/5 border-b border-border/10 last:border-0">
                          <TableCell className="py-4 pl-6">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded bg-muted/10 flex items-center justify-center overflow-hidden border border-border/5">
                                {row.image && (
                                  <img src={row.image} alt={row.name} className="h-full w-full object-contain" />
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-[13px] text-foreground">{row.name}</span>
                                <span className="ui-meta">{row.sku || "TANPA SKU"}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <span className="ui-label">{cat?.name || "Tanpa Kategori"}</span>
                          </TableCell>
                          <TableCell className="py-4">
                            <span className="ui-meta">{formatCurrency(row.costPrice)}</span>
                          </TableCell>
                          <TableCell className="py-4">
                            <span className="ui-item-name">{formatCurrency(row.basePrice)}</span>
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            <span className="ui-meta font-bold text-foreground">+{formatCurrency(margin)}</span>
                          </TableCell>
                          <TableCell className="py-4 text-right pr-6">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md hover:bg-muted" onClick={() => handleOpenEdit(row)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md hover:bg-muted" onClick={() => setDeleteTarget(row)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* ── Add / Edit Product Dialog ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 rounded-xl p-0 overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-50">
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingItem ? 'Update Produk' : 'Registrasi Produk Baru'}
            </DialogTitle>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500">Nama Produk</Label>
              <Input 
                value={form.name} 
                onChange={(e) => setForm({...form, name: e.target.value})} 
                className="h-10 border-slate-200 rounded-md focus:ring-1 focus:ring-slate-900 shadow-none" 
                placeholder="Contoh: LCD iPhone 13 Original" 
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500">Kategori</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({...form, categoryId: v})}>
                <SelectTrigger className="h-10 border-slate-200 rounded-md shadow-none">
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500">SKU / Kode Produk</Label>
              <Input 
                value={form.sku} 
                onChange={(e) => setForm({...form, sku: e.target.value})} 
                className="h-10 border-slate-200 rounded-md shadow-none" 
                placeholder="IPH-13-LCD" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-500">Harga Beli (HPP)</Label>
                <Input 
                  type="number" 
                  value={form.costPrice} 
                  onChange={(e) => setForm({...form, costPrice: e.target.value})} 
                  className="h-10 border-slate-200 rounded-md shadow-none" 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-500">Harga Jual</Label>
                <Input 
                  type="number" 
                  value={form.basePrice} 
                  onChange={(e) => setForm({...form, basePrice: e.target.value})} 
                  className="h-10 border-slate-200 rounded-md shadow-none font-bold" 
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500">Masa Garansi</Label>
              <Input 
                value={form.warranty} 
                onChange={(e) => setForm({...form, warranty: e.target.value})} 
                className="h-10 border-slate-200 rounded-md shadow-none" 
                placeholder="Contoh: 30 Hari" 
              />
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500">Foto Produk</Label>
              <div className="flex gap-4 items-center p-3 rounded-lg border border-slate-100">
                 <div className="h-12 w-12 rounded bg-slate-50 overflow-hidden flex items-center justify-center shrink-0 border border-slate-100">
                    {form.image ? (
                       <img src={form.image} className="h-full w-full object-cover" />
                    ) : (
                       <div className="h-4 w-4 bg-slate-200 rounded-sm" />
                    )}
                 </div>
                 <div className="flex-1">
                    <Input 
                        id="image-upload"
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                           const file = e.target.files?.[0];
                           if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                 setForm({...form, image: reader.result as string});
                              };
                              reader.readAsDataURL(file);
                           }
                        }}
                    />
                    <Label 
                      htmlFor="image-upload"
                      className="text-xs font-bold text-slate-900 cursor-pointer hover:underline"
                    >
                      {form.image ? 'Ganti Foto' : 'Unggah Foto'}
                    </Label>
                 </div>
              </div>
            </div>
          </div>

          <div className="p-6 pt-0 flex gap-2">
            <Button variant="outline" className="flex-1 h-10 rounded-md text-slate-500" onClick={() => setIsDialogOpen(false)}>Batal</Button>
            <Button className="flex-[2] h-10 bg-slate-900 text-white hover:bg-slate-800 rounded-md" onClick={handleSave}>
              {editingItem ? 'Simpan Perubahan' : 'Tambah Produk'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm bg-card border-none rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-8 text-center space-y-4">
             <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
                <Trash2 className="h-8 w-8 text-red-500" />
             </div>
             <div>
                <h3 className="ui-title">Hapus Produk?</h3>
                <p className="ui-label mt-2 px-4">Data produk <span className="font-bold text-foreground">{deleteTarget?.name}</span> akan dihapus permanen.</p>
             </div>
             <div className="flex gap-3 pt-4">
                <Button variant="ghost" className="flex-1" onClick={() => setDeleteTarget(null)}>Batal</Button>
                <Button variant="destructive" className="flex-1" onClick={handleDelete}>Hapus Sekarang</Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
