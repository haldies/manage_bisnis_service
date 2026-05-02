"use client";
import { useState, useEffect } from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePosStore } from "@/lib/store";

interface ServiceTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingType: any | null;
}

export default function ServiceTypeDialog({ open, onOpenChange, editingType }: ServiceTypeDialogProps) {
  const { addServiceType, updateServiceType } = usePosStore();
  const [form, setForm] = useState({ name: "", price: 0, category: "" });

  useEffect(() => {
    if (editingType) {
      setForm({
        name: editingType.name,
        price: editingType.price,
        category: editingType.category || ""
      });
    } else {
      setForm({ name: "", price: 0, category: "" });
    }
  }, [editingType, open]);

  const handleSave = async () => {
    if (editingType) {
      await updateServiceType(editingType.id, form);
    } else {
      await addServiceType(form);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{editingType ? 'Edit Data Jasa' : 'Tambah Data Jasa'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nama Jasa</Label>
            <Input 
              value={form.name} 
              onChange={(e) => setForm({ ...form, name: e.target.value })} 
              placeholder="Contoh: Ganti LCD iPhone 11" 
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Harga(Rp)</Label>
            <Input 
              type="number" 
              value={form.price} 
              onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} 
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Kategori</Label>
            <Input 
              value={form.category} 
              onChange={(e) => setForm({ ...form, category: e.target.value })} 
              placeholder="Contoh: iPhone" 
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSave}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
