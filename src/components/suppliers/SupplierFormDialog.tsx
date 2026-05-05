"use client";
import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Supplier } from "@/lib/types";
import { usePosStore } from "@/lib/store";

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier;
}

const emptyForm = {
  name: "",
  code: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

export default function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
}: SupplierFormDialogProps) {
  const { addSupplier, updateSupplier } = usePosStore();
  const isEdit = !!supplier;

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<{ name?: string; code?: string }>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  // Pre-fill form when editing
  useEffect(() => {
    if (open) {
      if (supplier) {
        setForm({
          name: supplier.name,
          code: supplier.code,
          phone: supplier.phone ?? "",
          email: supplier.email ?? "",
          address: supplier.address ?? "",
          notes: supplier.notes ?? "",
        });
      } else {
        setForm(emptyForm);
      }
      setErrors({});
      setServerError("");
    }
  }, [open, supplier]);

  const validate = () => {
    const newErrors: { name?: string; code?: string } = {};
    if (!form.name.trim()) newErrors.name = "Nama supplier wajib diisi";
    if (!form.code.trim()) newErrors.code = "Kode supplier wajib diisi";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setServerError("");

    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
        isActive: supplier?.isActive ?? true,
      };

      if (isEdit && supplier) {
        await updateSupplier(supplier.id, payload);
      } else {
        await addSupplier(payload);
      }

      onOpenChange(false);
    } catch (err: any) {
      setServerError(
        err?.message || "Terjadi kesalahan. Silakan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md rounded-2xl p-0 overflow-hidden"
        aria-describedby="supplier-form-desc"
      >
        <DialogHeader className="p-5 border-b">
          <DialogTitle className="text-base font-bold">
            {isEdit ? "Edit Supplier" : "Tambah Supplier"}
          </DialogTitle>
          <DialogDescription id="supplier-form-desc" className="text-xs text-muted-foreground">
            {isEdit
              ? "Perbarui informasi supplier."
              : "Isi data supplier baru. Nama dan kode wajib diisi."}
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Nama */}
          <div className="space-y-1.5">
            <Label htmlFor="supplier-name" className="text-xs font-semibold">
              Nama Supplier <span className="text-red-500">*</span>
            </Label>
            <Input
              id="supplier-name"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Contoh: PT Maju Jaya"
              className={errors.name ? "border-red-400 focus-visible:ring-red-400" : ""}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Kode */}
          <div className="space-y-1.5">
            <Label htmlFor="supplier-code" className="text-xs font-semibold">
              Kode Supplier <span className="text-red-500">*</span>
            </Label>
            <Input
              id="supplier-code"
              value={form.code}
              onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
              placeholder="Contoh: SUP-001"
              className={errors.code ? "border-red-400 focus-visible:ring-red-400" : ""}
            />
            {errors.code && (
              <p className="text-xs text-red-500">{errors.code}</p>
            )}
          </div>

          {/* Telepon & Email — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="supplier-phone" className="text-xs font-semibold">
                Telepon
              </Label>
              <Input
                id="supplier-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="08xxxxxxxxxx"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supplier-email" className="text-xs font-semibold">
                Email
              </Label>
              <Input
                id="supplier-email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="email@supplier.com"
              />
            </div>
          </div>

          {/* Alamat */}
          <div className="space-y-1.5">
            <Label htmlFor="supplier-address" className="text-xs font-semibold">
              Alamat
            </Label>
            <Textarea
              id="supplier-address"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="Jl. Contoh No. 1, Kota..."
              className="min-h-[72px] resize-none text-sm"
            />
          </div>

          {/* Catatan */}
          <div className="space-y-1.5">
            <Label htmlFor="supplier-notes" className="text-xs font-semibold">
              Catatan
            </Label>
            <Textarea
              id="supplier-notes"
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Catatan tambahan tentang supplier..."
              className="min-h-[60px] resize-none text-sm"
            />
          </div>

          {/* Server error */}
          {serverError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {serverError}
            </p>
          )}
        </div>

        <DialogFooter className="p-5 pt-0 gap-2">
          <Button
            variant="outline"
            className="flex-1 h-9 text-xs"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            className="flex-1 h-9 text-xs gap-1.5"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              "Menyimpan..."
            ) : (
              <>
                <Check className="h-4 w-4" />
                {isEdit ? "Simpan Perubahan" : "Tambah Supplier"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
