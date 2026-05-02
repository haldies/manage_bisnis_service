"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Package, DollarSign, Tag, Layers, Box } from "lucide-react";
import { usePosStore } from "@/lib/store";

export function AddProductDialog() {
  const { addInventoryItem, addStock, currentBranch, branches } = usePosStore();
  const [isOpen, setIsOpen] = useState(false);

  // Form State
  const [newItem, setNewItem] = useState({
    name: "",
    sku: "",
    categoryId: "",
    rack: "",
    costPrice: "",
    basePrice: "",
    initialStock: "0"
  });

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.sku) return;

    try {
      const itemId = await addInventoryItem({
        name: newItem.name,
        sku: newItem.sku,
        categoryId: newItem.categoryId,
        rack: newItem.rack,
        costPrice: Number(newItem.costPrice),
        basePrice: Number(newItem.basePrice),
        unit: "pcs",
        dateAdded: Date.now()
      });

      if (Number(newItem.initialStock) > 0) {
        const targetBranchId = currentBranch?.id || branches[0]?.id || "b1";
        addStock({
          itemId,
          branchId: targetBranchId,
          quantity: Number(newItem.initialStock),
          reservedQty: 0,
          minStock: 5
        });
      }

      setNewItem({ 
        name: "", 
        sku: "", 
        categoryId: "", 
        rack: "", 
        costPrice: "", 
        basePrice: "", 
        initialStock: "0" 
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to add product:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Tambah Barang
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl bg-card border-none rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="bg-primary p-8 text-primary-foreground">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/60 mb-1">Inventory Management</p>
              <DialogTitle className="text-2xl font-black  uppercase tracking-tighter">Registrasi Unit Baru</DialogTitle>
              <DialogDescription className="sr-only">Formulir untuk mendaftarkan unit produk baru ke dalam sistem inventaris.</DialogDescription>
            </div>
            <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Plus className="h-6 w-6 text-white" />
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-5">
          <div className="space-y-2">
            <Label className="text-[9px] font-black uppercase tracking-widest ml-1 flex items-center gap-2">
              <Package className="h-3 w-3" /> Nama Produk
            </Label>
            <Input 
              value={newItem.name} 
              onChange={(e) => setNewItem({...newItem, name: e.target.value})} 
              className="h-12 bg-muted/30 border-none rounded-xl font-bold" 
              placeholder="Contoh: iPhone 15 Pro Max Natural Titanium"
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest ml-1 flex items-center gap-2">
                <Tag className="h-3 w-3" /> SKU / Serial
              </Label>
              <Input 
                value={newItem.sku} 
                onChange={(e) => setNewItem({...newItem, sku: e.target.value})} 
                className="h-12 bg-muted/30 border-none rounded-xl" 
                placeholder="SKU-XXXX"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest ml-1 flex items-center gap-2">
                <Layers className="h-3 w-3" /> Kategori
              </Label>
              <Select value={newItem.categoryId} onValueChange={(val) => setNewItem({...newItem, categoryId: val})}>
                <SelectTrigger className="h-12 bg-muted/30 border-none rounded-xl font-bold uppercase text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="iPhone">iPhone</SelectItem>
                  <SelectItem value="MacBook">MacBook</SelectItem>
                  <SelectItem value="iPad">iPad</SelectItem>
                  <SelectItem value="Sparepart">Sparepart</SelectItem>
                  <SelectItem value="Service">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest ml-1 flex items-center gap-2 text-primary">
                <DollarSign className="h-3 w-3" /> Harga Modal
              </Label>
              <Input 
                type="number" 
                value={newItem.costPrice} 
                onChange={(e) => setNewItem({...newItem, costPrice: e.target.value})} 
                className="h-12 bg-primary/5 border-none rounded-xl font-black text-primary" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest ml-1 flex items-center gap-2 text-emerald-600">
                <DollarSign className="h-3 w-3" /> Harga Jual
              </Label>
              <Input 
                type="number" 
                value={newItem.basePrice} 
                onChange={(e) => setNewItem({...newItem, basePrice: e.target.value})} 
                className="h-12 bg-emerald-500/5 border-none rounded-xl font-black text-emerald-600" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest ml-1 flex items-center gap-2">
                <Box className="h-3 w-3" /> Stok Awal
              </Label>
              <Input 
                type="number" 
                value={newItem.initialStock} 
                onChange={(e) => setNewItem({...newItem, initialStock: e.target.value})} 
                className="h-12 bg-muted/30 border-none rounded-xl font-black text-lg" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest ml-1">Lokasi Rak</Label>
              <Input 
                value={newItem.rack} 
                onChange={(e) => setNewItem({...newItem, rack: e.target.value})} 
                className="h-12 bg-muted/30 border-none rounded-xl uppercase font-black tracking-widest text-[10px]" 
                placeholder="R-XX"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 gap-3 sm:gap-0">
             <Button variant="ghost" className="h-12 flex-1 rounded-2xl font-black uppercase tracking-widest text-[10px]" onClick={() => setIsOpen(false)}>
               Batal
             </Button>
             <Button className="h-12 flex-1 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20" onClick={handleAddItem}>
               Simpan Produk
             </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
