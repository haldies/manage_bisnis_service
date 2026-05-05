"use client";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface ChecklistData {
  items: ChecklistItem[];
}

export const DEFAULT_PRE_CHECK: ChecklistItem[] = [
  { id: "fisik", label: "Kondisi fisik luar (casing, layar, tombol)", checked: false },
  { id: "layar", label: "Layar menyala & touch responsif", checked: false },
  { id: "kamera", label: "Kamera depan & belakang berfungsi", checked: false },
  { id: "audio", label: "Speaker & mikrofon berfungsi", checked: false },
  { id: "charging", label: "Charging port berfungsi", checked: false },
  { id: "biometric", label: "Face ID / Touch ID berfungsi", checked: false },
  { id: "koneksi", label: "Koneksi WiFi & Bluetooth berfungsi", checked: false },
  { id: "baterai", label: "Kondisi baterai (persentase & health)", checked: false },
];

export const DEFAULT_POST_CHECK: ChecklistItem[] = [
  { id: "post-fisik", label: "Fisik rapi & tidak ada baut kurang", checked: false },
  { id: "post-fungsi", label: "Fungsi utama normal", checked: false },
  { id: "post-kebersihan", label: "Perangkat dibersihkan", checked: false },
];

interface ServiceChecklistProps {
  title: string;
  data?: ChecklistData;
  onChange: (data: ChecklistData) => void;
  defaultItems: ChecklistItem[];
  readOnly?: boolean;
  accentColor?: "blue" | "emerald" | "amber";
}

export default function ServiceChecklist({
  title,
  data,
  onChange,
  defaultItems,
  readOnly = false,
  accentColor = "blue",
}: ServiceChecklistProps) {
  const items = data?.items?.length ? data.items : defaultItems;
  const checkedCount = items.filter((i) => i.checked).length;

  const toggleItem = (id: string) => {
    if (readOnly) return;
    const newItems = items.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    onChange({ items: newItems });
  };

  const colors = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
  };

  const checkColors = {
    blue: "bg-blue-600",
    emerald: "bg-emerald-600",
    amber: "bg-amber-600",
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
          {title}
        </h4>
        <div className={cn("px-2 py-0.5 rounded-full text-[9px] font-black border", colors[accentColor])}>
          {checkedCount}/{items.length}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={readOnly}
            onClick={() => toggleItem(item.id)}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg border text-left transition-all",
              item.checked
                ? "bg-muted/50 border-primary/20"
                : "bg-background border-border/50",
              readOnly && "cursor-default"
            )}
          >
            <div
              className={cn(
                "w-4 h-4 rounded flex items-center justify-center border transition-colors",
                item.checked
                  ? cn("border-transparent text-white", checkColors[accentColor])
                  : "border-muted-foreground/30 bg-background"
              )}
            >
              {item.checked ? <Check className="w-3 h-3" /> : <X className="w-2 h-2 text-muted-foreground/20" />}
            </div>
            <span className={cn(
              "text-[10px] font-medium leading-tight",
              item.checked ? "text-foreground" : "text-muted-foreground"
            )}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
