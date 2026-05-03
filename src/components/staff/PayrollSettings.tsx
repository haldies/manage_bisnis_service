import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PayrollSettingsProps {
  storeProfile: any;
  updateStoreProfile: (updates: any) => void;
}

export function PayrollSettings({ storeProfile, updateStoreProfile }: PayrollSettingsProps) {
  const [localProfile, setLocalProfile] = useState<any>({ ...storeProfile });
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    setLocalProfile({ ...storeProfile });
  }, [storeProfile]);

  const set = (key: string, value: any) =>
    setLocalProfile((p: any) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    setStatus('saving');
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localProfile),
      });
      if (!res.ok) throw new Error("Gagal menyimpan pengaturan");
      const saved = await res.json();
      updateStoreProfile(saved);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (e) {
      console.error(e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="bg-card border border-border/40 rounded-xl divide-y divide-border/10 overflow-hidden">
      <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">

        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Upah Lembur / Jam</Label>
          <Input
            type="number"
            className="h-10 bg-muted/20 border-none font-bold"
            value={localProfile.overtimeRate ?? ""}
            onChange={(e) => set("overtimeRate", e.target.value === "" ? 0 : parseFloat(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Hari Kerja / Bulan</Label>
          <Input
            type="number"
            className="h-10 bg-muted/20 border-none font-bold"
            value={localProfile.totalWorkDays ?? 26}
            onChange={(e) => set("totalWorkDays", e.target.value === "" ? 26 : parseInt(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tanggal Gajian</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full h-10 bg-muted/20 border-none font-bold justify-start text-left",
                  !localProfile.payDay && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                {localProfile.payDay ? `Tanggal ${localProfile.payDay}` : <span>Pilih Tanggal</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={new Date(new Date().getFullYear(), new Date().getMonth(), localProfile.payDay || 1)}
                onSelect={(date) => date && set("payDay", date.getDate())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="p-6 pt-2 border-t border-border/10">
        <h4 className="text-[11px] font-black uppercase tracking-widest text-foreground mb-4">Pengaturan THR (Tunjangan Hari Raya)</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bulan THR Aktif</Label>
            <Select value={localProfile.thrMonth?.toString() || "none"} onValueChange={(val) => set("thrMonth", val === "none" ? null : parseInt(val))}>
              <SelectTrigger className="h-10 bg-muted/20 border-none font-bold"><SelectValue placeholder="Pilih Bulan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nonaktif</SelectItem>
                <SelectItem value="1">Januari</SelectItem>
                <SelectItem value="2">Februari</SelectItem>
                <SelectItem value="3">Maret</SelectItem>
                <SelectItem value="4">April</SelectItem>
                <SelectItem value="5">Mei</SelectItem>
                <SelectItem value="6">Juni</SelectItem>
                <SelectItem value="7">Juli</SelectItem>
                <SelectItem value="8">Agustus</SelectItem>
                <SelectItem value="9">September</SelectItem>
                <SelectItem value="10">Oktober</SelectItem>
                <SelectItem value="11">November</SelectItem>
                <SelectItem value="12">Desember</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Syarat Masa Kerja (Bulan)</Label>
            <Input
              type="number"
              className="h-10 bg-muted/20 border-none font-bold"
              placeholder="Contoh: 12"
              value={localProfile.thrMinWorkMonths ?? 12}
              onChange={(e) => set("thrMinWorkMonths", e.target.value === "" ? 0 : parseInt(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Besaran THR (Kali Gaji)</Label>
            <Input
              type="number"
              step="0.1"
              className="h-10 bg-muted/20 border-none font-bold text-emerald-600"
              placeholder="Contoh: 1.0"
              value={localProfile.thrMultiplier ?? 1.0}
              onChange={(e) => set("thrMultiplier", e.target.value === "" ? 1 : parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="p-6">
        <h4 className="text-[11px] font-black uppercase tracking-widest text-foreground mb-4">Jadwal Shift Kerja Global</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">JAM MASUK</Label>
            <Input
              type="time"
              className="h-10 bg-muted/20 border-none font-bold"
              value={localProfile.startTime || "09:00"}
              onChange={(e) => set("startTime", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">JAM PULANG</Label>
            <Input
              type="time"
              className="h-10 bg-muted/20 border-none font-bold"
              value={localProfile.endTime || "18:00"}
              onChange={(e) => set("endTime", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="p-4 flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={status === 'saving'}
          className={cn(
            "rounded-xl min-w-[120px] transition-all",
            status === 'success' ? "bg-emerald-600 hover:bg-emerald-700" : 
            status === 'error' ? "bg-red-600 hover:bg-red-700" : ""
          )}
        >
          {status === 'saving' ? "Menyimpan..." : 
           status === 'success' ? <><CheckCircle2 className="mr-2 h-4 w-4" /> Tersimpan</> :
           status === 'error' ? <><AlertCircle className="mr-2 h-4 w-4" /> Gagal</> :
           "Simpan Perubahan"}
        </Button>
      </div>
    </div>
  );
}
