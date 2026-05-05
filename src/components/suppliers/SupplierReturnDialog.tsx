"use client";
import { useState, useEffect } from "react";
import { Undo2, Plus, Trash2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePosStore } from "@/lib/store";
import { SupplierReturnReason } from "@/lib/types";

interface SupplierReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SRItem {
  itemId: string;
  quantity: number;
  reason: SupplierReturnReason;
}

const RETURN_REASONS: { value: SupplierReturnReason; label: string }[] = [
  { value: "Defective", label: "Cacat/Rusak" },
  { value: "WrongItem", label: "Salah Kirim" },
  { value: "Overstock", label: "Kelebihan Stok" },
  { value: "Other", label: "Lainnya" },
];

const emptyForm = {
  supplierId: "",
  branchId: "",
  grId: "",
  returnDate: "",
  notes: "",
};

export default function SupplierReturnDialog({
  open,
  onOpenChange,
}: SupplierReturnDialogProps) {
  const { suppliers, branches, inventory, goodsReceipts, createSupplierReturn } =
    usePosStore();

  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState<SRItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  // New item row state
  const [newItemId, setNewItemId] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newReason, setNewReason] = useState<SupplierReturnReason>("Defective");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().split("T")[0];
      setForm({ ...emptyForm, returnDate: today });
      setItems([]);
      setErrors({});
      setServerError("");
      setNewItemId("");
      setNewQty("");
      setNewReason("Defective");
    }
  }, [open]);

  const handleFormChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // When GR is selected, pre-populate items and auto-set supplier/branch
  const handleGrChange = (grId: string) => {
    handleFormChange("grId", grId);

    if (!grId) return;

    const gr = goodsReceipts.find((g) => g.id === grId);
    if (!gr) return;

    // Auto-set branch from GR
    setForm((prev) => ({
      ...prev,
      grId,
      branchId: gr.branchId || prev.branchId,
      supplierId:
        gr.po?.supplier?.id || gr.po?.supplierId || prev.supplierId,
    }));

    // Pre-populate items from GR
    const grItems: SRItem[] = gr.items.map((item) => ({
      itemId: item.itemId,
      quantity: item.quantity,
      reason: "Defective" as SupplierReturnReason,
    }));
    setItems(grItems);
    setErrors((prev) => ({ ...prev, items: "" }));
  };

  const handleAddItem = () => {
    if (!newItemId) {
      setErrors((prev) => ({ ...prev, newItem: "Pilih produk terlebih dahulu" }));
      return;
    }
    const qty = parseInt(newQty, 10);
    if (!qty || qty <= 0) {
      setErrors((prev) => ({ ...prev, newItem: "Qty harus lebih dari 0" }));
      return;
    }
    if (items.some((it) => it.itemId === newItemId)) {
      setErrors((prev) => ({ ...prev, newItem: "Produk sudah ada di daftar" }));
      return;
    }

    setItems((prev) => [
      ...prev,
      { itemId: newItemId, quantity: qty, reason: newReason },
    ]);
    setNewItemId("");
    setNewQty("");
    setNewReason("Defective");
    setErrors((prev) => ({ ...prev, newItem: "" }));
  };

  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((it) => it.itemId !== itemId));
  };

  const handleItemQtyChange = (itemId: string, value: string) => {
    const qty = parseInt(value, 10);
    if (isNaN(qty) || qty <= 0) return;
    setItems((prev) =>
      prev.map((it) => (it.itemId === itemId ? { ...it, quantity: qty } : it))
    );
  };

  const handleItemReasonChange = (itemId: string, reason: SupplierReturnReason) => {
    setItems((prev) =>
      prev.map((it) => (it.itemId === itemId ? { ...it, reason } : it))
    );
  };

  const getItemName = (itemId: string) =>
    inventory.find((i) => i.id === itemId)?.name ?? itemId;

  // Filter GRs by selected supplier if one is chosen
  const filteredGRs = form.supplierId
    ? goodsReceipts.filter(
        (gr) =>
          gr.po?.supplier?.id === form.supplierId ||
          gr.po?.supplierId === form.supplierId
      )
    : goodsReceipts;

  const activeSuppliers = suppliers.filter((s) => s.isActive);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.supplierId) newErrors.supplierId = "Pilih supplier";
    if (!form.branchId) newErrors.branchId = "Pilih cabang";
    if (items.length === 0) newErrors.items = "Tambahkan minimal 1 item";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setServerError("");

    try {
      await createSupplierReturn({
        supplierId: form.supplierId,
        branchId: form.branchId,
        grId: form.grId || undefined,
        returnDate: form.returnDate || undefined,
        notes: form.notes.trim() || undefined,
        items: items.map((it) => ({
          itemId: it.itemId,
          quantity: it.quantity,
          reason: it.reason,
        })),
      });
      onOpenChange(false);
    } catch (err: any) {
      setServerError(err?.message || "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl rounded-2xl p-0 overflow-hidden"
        aria-describedby="sr-form-desc"
      >
        <DialogHeader className="p-5 border-b">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Undo2 className="h-4 w-4" />
            Return ke Supplier
          </DialogTitle>
          <DialogDescription id="sr-form-desc" className="text-xs text-muted-foreground">
            Catat pengembalian barang ke supplier beserta alasan per item.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Supplier & Cabang */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sr-supplier" className="text-xs font-semibold">
                Supplier <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.supplierId}
                onValueChange={(v) => handleFormChange("supplierId", v)}
              >
                <SelectTrigger
                  id="sr-supplier"
                  className={errors.supplierId ? "border-red-400" : ""}
                >
                  <SelectValue placeholder="Pilih supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {activeSuppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.supplierId && (
                <p className="text-xs text-red-500">{errors.supplierId}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sr-branch" className="text-xs font-semibold">
                Cabang <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.branchId}
                onValueChange={(v) => handleFormChange("branchId", v)}
              >
                <SelectTrigger
                  id="sr-branch"
                  className={errors.branchId ? "border-red-400" : ""}
                >
                  <SelectValue placeholder="Pilih cabang..." />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.branchId && (
                <p className="text-xs text-red-500">{errors.branchId}</p>
              )}
            </div>
          </div>

          {/* Referensi GR & Tanggal Return */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sr-gr" className="text-xs font-semibold">
                Referensi GR <span className="text-muted-foreground font-normal">(opsional)</span>
              </Label>
              <Select
                value={form.grId}
                onValueChange={handleGrChange}
              >
                <SelectTrigger id="sr-gr">
                  <SelectValue placeholder="Pilih GR..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Tanpa Referensi GR —</SelectItem>
                  {filteredGRs.map((gr) => (
                    <SelectItem key={gr.id} value={gr.id}>
                      {gr.grNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sr-date" className="text-xs font-semibold">
                Tanggal Return
              </Label>
              <Input
                id="sr-date"
                type="date"
                value={form.returnDate}
                onChange={(e) => handleFormChange("returnDate", e.target.value)}
              />
            </div>
          </div>

          {/* Catatan */}
          <div className="space-y-1.5">
            <Label htmlFor="sr-notes" className="text-xs font-semibold">
              Catatan
            </Label>
            <Textarea
              id="sr-notes"
              value={form.notes}
              onChange={(e) => handleFormChange("notes", e.target.value)}
              placeholder="Catatan tambahan (opsional)..."
              className="min-h-[60px] resize-none text-sm"
            />
          </div>

          {/* Daftar Item */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">
              Daftar Item <span className="text-red-500">*</span>
            </Label>

            {/* Add Item Row */}
            <div className="flex gap-2 items-end p-3 bg-muted/30 rounded-xl border border-border/40">
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Produk
                </Label>
                <Select
                  value={newItemId}
                  onValueChange={(v) => {
                    setNewItemId(v);
                    setErrors((prev) => ({ ...prev, newItem: "" }));
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Pilih produk..." />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.map((item) => (
                      <SelectItem key={item.id} value={item.id} className="text-xs">
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-20 space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Qty
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  placeholder="0"
                  className="h-8 text-xs"
                />
              </div>
              <div className="w-36 space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Alasan
                </Label>
                <Select
                  value={newReason}
                  onValueChange={(v) => setNewReason(v as SupplierReturnReason)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RETURN_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value} className="text-xs">
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                onClick={handleAddItem}
                className="h-8 px-3 gap-1 text-xs"
              >
                <Plus className="h-3 w-3" />
                Tambah
              </Button>
            </div>

            {errors.newItem && (
              <p className="text-xs text-red-500">{errors.newItem}</p>
            )}

            {/* Items List */}
            {items.length > 0 ? (
              <div className="rounded-xl border border-border/40 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableHead className="text-xs font-semibold py-2 pl-4">Produk</TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-center w-24">Qty</TableHead>
                      <TableHead className="text-xs font-semibold py-2 w-40">Alasan</TableHead>
                      <TableHead className="py-2 w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((it) => (
                      <TableRow key={it.itemId} className="hover:bg-muted/10">
                        <TableCell className="py-2 pl-4 text-sm font-medium">
                          {getItemName(it.itemId)}
                        </TableCell>
                        <TableCell className="py-2 text-center">
                          <Input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) =>
                              handleItemQtyChange(it.itemId, e.target.value)
                            }
                            className="h-7 w-20 text-xs text-center mx-auto"
                          />
                        </TableCell>
                        <TableCell className="py-2">
                          <Select
                            value={it.reason}
                            onValueChange={(v) =>
                              handleItemReasonChange(it.itemId, v as SupplierReturnReason)
                            }
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {RETURN_REASONS.map((r) => (
                                <SelectItem key={r.value} value={r.value} className="text-xs">
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-2 pr-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleRemoveItem(it.itemId)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="h-24 flex flex-col items-center justify-center border-2 border-dashed border-border/30 rounded-xl bg-muted/5">
                <Undo2 className="h-5 w-5 text-muted-foreground/30 mb-1" />
                <p className="text-xs text-muted-foreground/50">
                  Belum ada item. Tambahkan produk di atas.
                </p>
              </div>
            )}

            {errors.items && (
              <p className="text-xs text-red-500">{errors.items}</p>
            )}
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
                Simpan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
