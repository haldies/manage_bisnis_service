import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface PayrollSettingsProps {
  storeProfile: any;
  updateStoreProfile: (updates: any) => void;
}

export function PayrollSettings({ storeProfile, updateStoreProfile }: PayrollSettingsProps) {
  const [localProfile, setLocalProfile] = useState<any>({ ...storeProfile });

  useEffect(() => {
    setLocalProfile({ ...storeProfile });
  }, [storeProfile]);

  const set = (key: string, value: any) =>
    setLocalProfile((p: any) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    try {
      const res = await fetch("/api/payroll-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localProfile),
      });
      if (!res.ok) throw new Error("Gagal menyimpan pengaturan");
      const saved = await res.json();
      updateStoreProfile(saved);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-card border border-border/40 rounded-xl divide-y divide-border/10 overflow-hidden">
      <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Uang Absensi (Rp)</Label>
          <Input
            type="number"
            className="h-10 bg-muted/20 border-none font-bold"
            value={localProfile.attendanceRate ?? ""}
            onChange={(e) => set("attendanceRate", e.target.value === "" ? 0 : parseFloat(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Potongan Telat (Rp)</Label>
          <Input
            type="number"
            className="h-10 bg-muted/20 border-none font-bold"
            value={localProfile.latePenalty ?? ""}
            onChange={(e) => set("latePenalty", e.target.value === "" ? 0 : parseFloat(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Potongan Absen (Rp)</Label>
          <Input
            type="number"
            className="h-10 bg-muted/20 border-none font-bold"
            value={localProfile.absentPenalty ?? ""}
            onChange={(e) => set("absentPenalty", e.target.value === "" ? 0 : parseFloat(e.target.value))}
          />
        </div>
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
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Incentive Teknisi (%)</Label>
          <Input
            type="number"
            className="h-10 bg-muted/20 border-none font-bold"
            value={localProfile.serviceIncentive ?? ""}
            onChange={(e) => set("serviceIncentive", e.target.value === "" ? 0 : parseFloat(e.target.value))}
          />
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
        <Button onClick={handleSave} className="rounded-xl">
          Simpan 
        </Button>
      </div>
    </div>
  );
}
