"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, Check, ShoppingCart } from "lucide-react";
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
import { formatCurrency } from "@/lib/utils";

interface POItem {
  itemId: string;
  quantity: number;
  unitPrice: number;
}

interface PurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill items (e.g. from a service ticket with out-of-stock spareparts) */
  initialItems?: POItem[];
  /** Pre-select branch */
  initialBranchId?: string;
}

const emptyForm = {
  supplierId: "",
  branchId: "",
  expectedDate: "",
  notes: "",
};

export default function PurchaseOrderDialog({
  open,
  onOpenChange,
  initialItems,
  initialBranchId,
}: PurchaseOrderDialogProps) {
  const { suppliers, branches, inventory, createPurchaseOrder } = usePosStore();

  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState<POItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  // New item row state
  const [newItemId, setNewItemId] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newUnitPrice, setNewUnitPrice] = useState("");

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setForm({ ...emptyForm, branchId: initialBranchId ?? "" });
      setItems(initialItems ?? []);
      setErrors({});
      setServerError("");
      setNewItemId("");
      setNewQty("");
      setNewUnitPrice("");
    }
  }, [open, initialItems, initialBranchId]);

  const activeSuppliers = suppliers.filter((s) => s.isActive);

  const handleFormChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
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
    const price = parseFloat(newUnitPrice);
    if (!price || price < 0) {
      setErrors((prev) => ({ ...prev, newItem: "Harga beli tidak valid" }));
      return;
    }

    // Check if item already added
    if (items.some((it) => it.itemId === newItemId)) {
      setErrors((prev) => ({ ...prev, newItem: "Produk sudah ada di daftar" }));
      return;
    }

    setItems((prev) => [
      ...prev,
      { itemId: newItemId, quantity: qty, unitPrice: price },
    ]);
    setNewItemId("");
    setNewQty("");
    setNewUnitPrice("");
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

  const handleItemPriceChange = (itemId: string, value: string) => {
    const price = parseFloat(value);
    if (isNaN(price) || price < 0) return;
    setItems((prev) =>
      prev.map((it) => (it.itemId === itemId ? { ...it, unitPrice: price } : it))
    );
  };

  const totalAmount = items.reduce(
    (sum, it) => sum + it.quantity * it.unitPrice,
    0
  );

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
      await createPurchaseOrder({
        supplierId: form.supplierId,
        branchId: form.branchId,
        expectedDate: form.expectedDate || undefined,
        notes: form.notes.trim() || undefined,
        items: items.map((it) => ({
          itemId: it.itemId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
      });
      onOpenChange(false);
    } catch (err: any) {
      setServerError(err?.message || "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const getItemName = (itemId: string) =>
    inventory.find((i) => i.id === itemId)?.name ?? itemId;

  // Pre-fill unit price from item's costPrice when selecting a new item
  const handleNewItemSelect = (itemId: string) => {
    setNewItemId(itemId);
    const item = inventory.find((i) => i.id === itemId);
    if (item?.costPrice) {
      setNewUnitPrice(String(item.costPrice));
    } else {
      setNewUnitPrice("");
    }
    setErrors((prev) => ({ ...prev, newItem: "" }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl rounded-2xl p-0 overflow-hidden"
        aria-describedby="po-form-desc"
      >
        <DialogHeader className="p-5 border-b">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Buat Purchase Order
          </DialogTitle>
          <DialogDescription id="po-form-desc" className="text-xs text-muted-foreground">
            Isi detail PO dan tambahkan item yang akan dipesan.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Supplier & Branch */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="po-supplier" className="text-xs font-semibold">
                Supplier <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.supplierId}
                onValueChange={(v) => handleFormChange("supplierId", v)}
              >
                <SelectTrigger
                  id="po-supplier"
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
              <Label htmlFor="po-branch" className="text-xs font-semibold">
                Cabang Tujuan <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.branchId}
                onValueChange={(v) => handleFormChange("branchId", v)}
              >
                <SelectTrigger
                  id="po-branch"
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

          {/* Estimated Arrival Date */}
          <div className="space-y-1.5">
            <Label htmlFor="po-expected-date" className="text-xs font-semibold">
              Estimasi Tiba
            </Label>
            <Input
              id="po-expected-date"
              type="date"
              value={form.expectedDate}
              onChange={(e) => handleFormChange("expectedDate", e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="po-notes" className="text-xs font-semibold">
              Catatan
            </Label>
            <Textarea
              id="po-notes"
              value={form.notes}
              onChange={(e) => handleFormChange("notes", e.target.value)}
              placeholder="Catatan tambahan untuk PO ini..."
              className="min-h-[60px] resize-none text-sm"
            />
          </div>

          {/* Items Table */}
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
                <Select value={newItemId} onValueChange={handleNewItemSelect}>
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
              <div className="w-32 space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Harga Beli
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={newUnitPrice}
                  onChange={(e) => setNewUnitPrice(e.target.value)}
                  placeholder="0"
                  className="h-8 text-xs"
                />
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
                      <TableHead className="text-xs font-semibold py-2 text-right w-36">Harga Beli</TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-right w-36">Subtotal</TableHead>
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
                            className="h-7 w-16 text-xs text-center mx-auto"
                          />
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <Input
                            type="number"
                            min="0"
                            value={it.unitPrice}
                            onChange={(e) =>
                              handleItemPriceChange(it.itemId, e.target.value)
                            }
                            className="h-7 w-28 text-xs text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell className="py-2 text-right text-sm font-semibold pr-3">
                          {formatCurrency(it.quantity * it.unitPrice)}
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
                <ShoppingCart className="h-5 w-5 text-muted-foreground/30 mb-1" />
                <p className="text-xs text-muted-foreground/50">
                  Belum ada item. Tambahkan produk di atas.
                </p>
              </div>
            )}

            {errors.items && (
              <p className="text-xs text-red-500">{errors.items}</p>
            )}
          </div>

          {/* Running Total */}
          {items.length > 0 && (
            <div className="flex justify-between items-center px-4 py-3 bg-muted/20 rounded-xl border border-border/40">
              <span className="text-sm font-semibold text-muted-foreground">
                Total PO
              </span>
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          )}

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
                Buat Purchase Order
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
