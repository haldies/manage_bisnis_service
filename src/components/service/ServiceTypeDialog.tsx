"use client";
import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePosStore } from "@/lib/store";

interface ServiceTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingType: any | null;
}

export default function ServiceTypeDialog({ open, onOpenChange, editingType }: ServiceTypeDialogProps) {
  const { addServiceType, updateServiceType, deviceModels } = usePosStore();

  const [form, setForm] = useState({
    name: "",
    price: 0,
    category: "",
    feeType: "Flat" as "Flat" | "Percentage",
    feeValue: 0,
    incentiveType: "Percentage" as "Percentage" | "Flat",
    incentiveValue: 0,
  });

  const [selectedDeviceModelIds, setSelectedDeviceModelIds] = useState<string[]>([]);
  const [openDevicePicker, setOpenDevicePicker] = useState(false);

  useEffect(() => {
    if (editingType) {
      setForm({
        name: editingType.name ?? "",
        price: editingType.price ?? 0,
        category: editingType.category ?? "",
        feeType: editingType.feeType ?? "Flat",
        feeValue: editingType.feeValue ?? 0,
        incentiveType: editingType.incentiveType ?? "Percentage",
        incentiveValue: editingType.incentiveValue ?? 0,
      });
      // deviceModels relation: [{deviceModelId, deviceModel}]
      const ids = (editingType.deviceModels ?? []).map((dm: any) => dm.deviceModelId ?? dm.id);
      setSelectedDeviceModelIds(ids);
    } else {
      setForm({
        name: "",
        price: 0,
        category: "",
        feeType: "Flat",
        feeValue: 0,
        incentiveType: "Percentage",
        incentiveValue: 0,
      });
      setSelectedDeviceModelIds([]);
    }
  }, [editingType, open]);

  const toggleDevice = (id: string) => {
    setSelectedDeviceModelIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const removeDevice = (id: string) => {
    setSelectedDeviceModelIds((prev) => prev.filter((d) => d !== id));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload = { ...form, deviceModelIds: selectedDeviceModelIds };
    if (editingType) {
      await updateServiceType(editingType.id, payload);
    } else {
      await addServiceType(payload);
    }
    onOpenChange(false);
  };

  const selectedDevices = (deviceModels ?? []).filter((dm) =>
    selectedDeviceModelIds.includes(dm.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{editingType ? "Edit Data Jasa" : "Tambah Data Jasa"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nama Jasa */}
          <div className="space-y-1.5">
            <Label className="text-xs">Nama Jasa</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Contoh: Ganti LCD iPhone 11"
            />
          </div>

          {/* Kategori */}
          <div className="space-y-1.5">
            <Label className="text-xs">Kategori</Label>
            <Input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Contoh: iPhone"
            />
          </div>

          {/* Harga Standar */}
          <div className="space-y-1.5">
            <Label className="text-xs">Harga Standar (Rp)</Label>
            <Input
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
            />
          </div>

          {/* Fee Tambahan */}
          <div className="space-y-1.5">
            <Label className="text-xs">Fee Tambahan</Label>
            <div className="flex gap-2">
              <Select
                value={form.feeType}
                onValueChange={(v) => setForm({ ...form, feeType: v as "Flat" | "Percentage" })}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Flat">Nominal (Rp)</SelectItem>
                  <SelectItem value="Percentage">Persentase (%)</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                <Input
                  type="number"
                  value={form.feeValue}
                  onChange={(e) => setForm({ ...form, feeValue: parseFloat(e.target.value) || 0 })}
                  placeholder={form.feeType === "Percentage" ? "Contoh: 10" : "Contoh: 50000"}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                  {form.feeType === "Percentage" ? "%" : "Rp"}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {form.feeType === "Percentage"
                ? "Fee dihitung sebagai persentase dari harga jasa."
                : "Fee ditambahkan sebagai nominal tetap ke harga jasa."}
            </p>
          </div>

          {/* Insentif Teknisi */}
          <div className="space-y-1.5">
            <Label className="text-xs">Insentif Teknisi</Label>
            <div className="flex gap-2">
              <Select
                value={form.incentiveType}
                onValueChange={(v) => setForm({ ...form, incentiveType: v as "Percentage" | "Flat" })}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Flat">Nominal (Rp)</SelectItem>
                  <SelectItem value="Percentage">Persentase (%)</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                <Input
                  type="number"
                  value={form.incentiveValue}
                  onChange={(e) => setForm({ ...form, incentiveValue: parseFloat(e.target.value) || 0 })}
                  placeholder={form.incentiveType === "Percentage" ? "Contoh: 10" : "Contoh: 25000"}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                  {form.incentiveType === "Percentage" ? "%" : "Rp"}
                </span>
              </div>
            </div>
          </div>

          {/* Device Models */}
          <div className="space-y-1.5">
            <Label className="text-xs">Berlaku untuk Device (opsional)</Label>
            <Popover open={openDevicePicker} onOpenChange={setOpenDevicePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal text-sm h-10"
                >
                  {selectedDeviceModelIds.length > 0
                    ? `${selectedDeviceModelIds.length} device dipilih`
                    : "Pilih device model..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Cari device..." />
                  <CommandList>
                    <CommandEmpty>Tidak ada device ditemukan.</CommandEmpty>
                    <CommandGroup>
                      {(deviceModels ?? []).map((dm) => (
                        <CommandItem
                          key={dm.id}
                          value={dm.name}
                          onSelect={() => toggleDevice(dm.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedDeviceModelIds.includes(dm.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="flex-1">{dm.name}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">{dm.brand}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Selected device badges */}
            {selectedDevices.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedDevices.map((dm) => (
                  <Badge
                    key={dm.id}
                    variant="secondary"
                    className="text-xs gap-1 pr-1"
                  >
                    {dm.name}
                    <button
                      type="button"
                      onClick={() => removeDevice(dm.id)}
                      className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Kosongkan jika berlaku untuk semua device.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={!form.name.trim()}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
