import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Building2, Navigation } from "lucide-react";

interface BranchDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (branch: any) => Promise<void>;
  editingBranch: any | null;
}

export function BranchDialog({ isOpen, onOpenChange, onSave, editingBranch }: BranchDialogProps) {
  const [form, setForm] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    radiusMeters: "50"
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingBranch) {
      setForm({
        name: editingBranch.name || "",
        address: editingBranch.address || "",
        latitude: editingBranch.latitude?.toString() || "",
        longitude: editingBranch.longitude?.toString() || "",
        radiusMeters: editingBranch.radiusMeters?.toString() || "50"
      });
    } else {
      setForm({
        name: "",
        address: "",
        latitude: "",
        longitude: "",
        radiusMeters: "50"
      });
    }
  }, [editingBranch, isOpen]);

  const handleSubmit = async () => {
    if (!form.name || !form.address) return;
    setLoading(true);
    try {
      await onSave({
        ...form,
        latitude: parseFloat(form.latitude) || 0,
        longitude: parseFloat(form.longitude) || 0,
        radiusMeters: parseInt(form.radiusMeters) || 50
      });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-foreground text-background">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-5 w-5 text-primary" />
            <DialogTitle className="text-xl font-bold uppercase tracking-widest">
              {editingBranch ? "Edit Cabang" : "Tambah Cabang"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-background/60 text-[11px] font-medium uppercase tracking-wider">
            Konfigurasi lokasi operasional toko anda
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 space-y-6 bg-card">
          <div className="space-y-2">
            <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nama Cabang</Label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
              <Input 
                className="h-12 rounded-2xl bg-muted/30 border-none pl-12 font-bold" 
                placeholder="Contoh: Cabang Utama"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Alamat Lengkap</Label>
            <div className="relative">
              <MapPin className="absolute left-4 top-4 h-4 w-4 text-muted-foreground/30" />
              <textarea 
                className="w-full min-h-[100px] rounded-2xl bg-muted/30 border-none p-4 pl-12 font-medium text-[13px] focus:ring-0 resize-none" 
                placeholder="Masukkan alamat lengkap cabang..."
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Latitude</Label>
              <Input 
                type="number"
                className="h-12 rounded-2xl bg-muted/30 border-none px-6 font-mono text-[12px]" 
                placeholder="0.0000"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Longitude</Label>
              <Input 
                type="number"
                className="h-12 rounded-2xl bg-muted/30 border-none px-6 font-mono text-[12px]" 
                placeholder="0.0000"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Radius Absensi (Meter)</Label>
              <span className="text-[11px] font-bold text-primary">{form.radiusMeters}m</span>
            </div>
            <Input 
              type="range"
              min="10"
              max="1000"
              step="10"
              className="h-2 rounded-lg accent-primary cursor-pointer" 
              value={form.radiusMeters}
              onChange={(e) => setForm({ ...form, radiusMeters: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="p-8 pt-0 flex flex-col gap-3 bg-card">
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="h-12 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 w-full uppercase tracking-widest text-[11px]"
          >
            {loading ? "Menyimpan..." : "Simpan Data Cabang"}
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)} 
            className="h-12 rounded-2xl font-bold opacity-40 uppercase tracking-widest text-[10px]"
          >
            Batal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
