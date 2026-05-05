import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Plus, Pencil, PowerOff, Power, Clock, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { usePosStore } from "@/lib/store";

import SupplierFormDialog from "@/components/suppliers/SupplierFormDialog";
import PurchaseOrderDialog from "@/components/suppliers/PurchaseOrderDialog";
import PODetailDialog from "@/components/suppliers/PODetailDialog";
import GoodsReceiptDialog from "@/components/suppliers/GoodsReceiptDialog";
import StockOutDialog from "@/components/suppliers/StockOutDialog";
import SupplierReturnDialog from "@/components/suppliers/SupplierReturnDialog";
import StockAuditDialog from "@/components/suppliers/StockAuditDialog";
import StockAuditApplyDialog from "@/components/suppliers/StockAuditApplyDialog";

import { Supplier, PurchaseOrder, StockAudit } from "@/lib/types";

const SUPPLIER_TABS = [
  { value: "supplier",       label: "Supplier" },
  { value: "purchase-order", label: "Purchase Order" },
  { value: "penerimaan",     label: "Penerimaan" },
  { value: "pengeluaran",    label: "Pengeluaran" },
  { value: "return-supplier",label: "Return Supplier" },
  { value: "audit-stok",     label: "Audit Stok" },
] as const;

type SupplierTab = typeof SUPPLIER_TABS[number]["value"];

export default function SuppliersPage() {
  const {
    suppliers,
    purchaseOrders,
    goodsReceipts,
    stockOuts,
    supplierReturns,
    stockAudits,
    branches,
    fetchSuppliers,
    fetchPurchaseOrders,
    fetchGoodsReceipts,
    fetchStockOuts,
    fetchSupplierReturns,
    fetchStockAudits,
    updateSupplier,
  } = usePosStore();

  const [activeTab, setActiveTab] = useState<SupplierTab>("supplier");

  // Dialog states
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [isPODialogOpen, setIsPODialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isPODetailOpen, setIsPODetailOpen] = useState(false);

  const [isGRDialogOpen, setIsGRDialogOpen] = useState(false);
  const [selectedGRPO, setSelectedGRPO] = useState<PurchaseOrder | null>(null);

  const [isStockOutDialogOpen, setIsStockOutDialogOpen] = useState(false);

  const [isSupplierReturnOpen, setIsSupplierReturnOpen] = useState(false);

  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);
  const [auditDialogAudit, setAuditDialogAudit] = useState<StockAudit | null>(null);
  const [selectedAudit, setSelectedAudit] = useState<StockAudit | null>(null);
  const [isAuditApplyOpen, setIsAuditApplyOpen] = useState(false);

  // PO filter state
  const [poStatusFilter, setPoStatusFilter] = useState<string>("all");
  const [poSupplierFilter, setPoSupplierFilter] = useState<string>("all");

  // Stock Out filter state
  const [stockOutTypeFilter, setStockOutTypeFilter] = useState<string>("all");
  const [stockOutBranchFilter, setStockOutBranchFilter] = useState<string>("all");
  const [stockOutDateFrom, setStockOutDateFrom] = useState<string>("");
  const [stockOutDateTo, setStockOutDateTo] = useState<string>("");

  useEffect(() => {
    fetchSuppliers();
    fetchPurchaseOrders();
    fetchGoodsReceipts();
    fetchStockOuts();
    fetchSupplierReturns();
    fetchStockAudits();
  }, [
    fetchSuppliers,
    fetchPurchaseOrders,
    fetchGoodsReceipts,
    fetchStockOuts,
    fetchSupplierReturns,
    fetchStockAudits,
  ]);

  return (
    <Layout title="Supplier & Purchase Order" requiredModule="Inventory" requiredLevel="Read">
      <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-1">

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SupplierTab)} className="space-y-5">

            {/* ── Tab bar ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border">
              <div className="overflow-x-auto no-scrollbar flex-1 min-w-0">
                <TabsList className="bg-transparent p-0 h-auto gap-0 flex w-max min-w-full rounded-none border-none">
                  {SUPPLIER_TABS.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="
                        relative bg-transparent rounded-none px-4 py-2.5 text-xs font-semibold text-muted-foreground
                        border-b-2 border-transparent
                        data-[state=active]:border-primary
                        data-[state=active]:text-foreground
                        data-[state=active]:bg-transparent
                        data-[state=active]:shadow-none
                        flex items-center gap-1.5 shrink-0 whitespace-nowrap
                      "
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </div>

            {/* ── Action buttons per tab ── */}
            <div className="flex justify-end">
              {activeTab === "supplier" && (
                <Button
                  onClick={() => { setEditingSupplier(null); setIsSupplierFormOpen(true); }}
                  className="h-9 text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Supplier
                </Button>
              )}
              {activeTab === "purchase-order" && (
                <Button
                  onClick={() => setIsPODialogOpen(true)}
                  className="h-9 text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Buat PO
                </Button>
              )}
              {activeTab === "penerimaan" && (
                <div className="flex items-center gap-2">
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-xs"
                    value={selectedGRPO?.id ?? ""}
                    onChange={(e) => {
                      const po = purchaseOrders.find((p) => p.id === e.target.value) ?? null;
                      setSelectedGRPO(po);
                    }}
                  >
                    <option value="">Pilih PO...</option>
                    {purchaseOrders
                      .filter((po) => po.status === "Sent" || po.status === "Partial")
                      .map((po) => (
                        <option key={po.id} value={po.id}>
                          {po.poNumber} — {po.supplier?.name ?? po.supplierId}
                        </option>
                      ))}
                  </select>
                  <Button
                    onClick={() => {
                      if (selectedGRPO) setIsGRDialogOpen(true);
                    }}
                    disabled={!selectedGRPO}
                    className="h-9 text-xs gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Terima Barang
                  </Button>
                </div>
              )}
              {activeTab === "pengeluaran" && (
                <Button
                  onClick={() => setIsStockOutDialogOpen(true)}
                  className="h-9 text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Catat Pengeluaran
                </Button>
              )}
              {activeTab === "return-supplier" && (
                <Button
                  onClick={() => setIsSupplierReturnOpen(true)}
                  className="h-9 text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Buat SR Baru
                </Button>
              )}
              {activeTab === "audit-stok" && (
                <Button
                  onClick={() => { setAuditDialogAudit(null); setIsAuditDialogOpen(true); }}
                  className="h-9 text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Buat Audit Baru
                </Button>
              )}
            </div>

            {/* ── Tab contents ── */}

            {/* Supplier */}
            <TabsContent value="supplier" className="m-0">
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                {suppliers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                    <p className="text-sm">Belum ada supplier.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setEditingSupplier(null); setIsSupplierFormOpen(true); }}
                      className="gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Tambah Supplier
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs font-semibold px-4">Kode</TableHead>
                        <TableHead className="text-xs font-semibold px-4">Nama</TableHead>
                        <TableHead className="text-xs font-semibold px-4">Telepon</TableHead>
                        <TableHead className="text-xs font-semibold px-4">Email</TableHead>
                        <TableHead className="text-xs font-semibold px-4">Alamat</TableHead>
                        <TableHead className="text-xs font-semibold px-4">Status</TableHead>
                        <TableHead className="text-xs font-semibold px-4 text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="px-4 text-xs font-mono text-muted-foreground">
                            {s.code}
                          </TableCell>
                          <TableCell className="px-4 text-xs font-medium">
                            {s.name}
                          </TableCell>
                          <TableCell className="px-4 text-xs text-muted-foreground">
                            {s.phone ?? <span className="text-muted-foreground/40">—</span>}
                          </TableCell>
                          <TableCell className="px-4 text-xs text-muted-foreground">
                            {s.email ?? <span className="text-muted-foreground/40">—</span>}
                          </TableCell>
                          <TableCell className="px-4 text-xs text-muted-foreground max-w-[200px] truncate">
                            {s.address ?? <span className="text-muted-foreground/40">—</span>}
                          </TableCell>
                          <TableCell className="px-4">
                            {s.isActive ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                                Aktif
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                Nonaktif
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs gap-1"
                                onClick={() => { setEditingSupplier(s); setIsSupplierFormOpen(true); }}
                              >
                                <Pencil className="h-3 w-3" />
                                Edit
                              </Button>
                              {s.isActive ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  onClick={() => {
                                    updateSupplier(s.id, { isActive: false });
                                  }}
                                >
                                  <PowerOff className="h-3 w-3" />
                                  Nonaktifkan
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => {
                                    updateSupplier(s.id, { isActive: true });
                                  }}
                                >
                                  <Power className="h-3 w-3" />
                                  Aktifkan
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            {/* Purchase Order */}
            <TabsContent value="purchase-order" className="m-0">
              {/* Filter bar */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Status:</label>
                  <select
                    className="h-8 rounded-md border border-input bg-background px-3 text-xs min-w-[130px]"
                    value={poStatusFilter}
                    onChange={(e) => setPoStatusFilter(e.target.value)}
                  >
                    <option value="all">Semua Status</option>
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="Partial">Partial</option>
                    <option value="Received">Received</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Supplier:</label>
                  <select
                    className="h-8 rounded-md border border-input bg-background px-3 text-xs min-w-[160px]"
                    value={poSupplierFilter}
                    onChange={(e) => setPoSupplierFilter(e.target.value)}
                  >
                    <option value="all">Semua Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                {(() => {
                  const filtered = purchaseOrders.filter((po) => {
                    const matchStatus = poStatusFilter === "all" || po.status === poStatusFilter;
                    const matchSupplier = poSupplierFilter === "all" || po.supplierId === poSupplierFilter;
                    return matchStatus && matchSupplier;
                  });

                  if (purchaseOrders.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                        <p className="text-sm">Belum ada Purchase Order.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsPODialogOpen(true)}
                          className="gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Buat PO
                        </Button>
                      </div>
                    );
                  }

                  if (filtered.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                        <p className="text-sm">Tidak ada PO yang sesuai filter.</p>
                      </div>
                    );
                  }

                  return (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="text-xs font-semibold px-4">Nomor PO</TableHead>
                          <TableHead className="text-xs font-semibold px-4">Supplier</TableHead>
                          <TableHead className="text-xs font-semibold px-4">Tanggal</TableHead>
                          <TableHead className="text-xs font-semibold px-4">Estimasi Tiba</TableHead>
                          <TableHead className="text-xs font-semibold px-4 text-right">Total Nilai</TableHead>
                          <TableHead className="text-xs font-semibold px-4">Status</TableHead>
                          <TableHead className="text-xs font-semibold px-4 text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((po) => {
                          const isOverdue =
                            !!po.expectedDate &&
                            po.status !== "Received" &&
                            po.status !== "Cancelled" &&
                            new Date(po.expectedDate) < new Date();

                          return (
                            <TableRow
                              key={po.id}
                              className="cursor-pointer hover:bg-muted/30"
                              onClick={() => { setSelectedPO(po); setIsPODetailOpen(true); }}
                            >
                              <TableCell className="px-4 text-xs font-mono font-medium">
                                {po.poNumber}
                              </TableCell>
                              <TableCell className="px-4 text-xs">
                                {po.supplier?.name ?? po.supplierId}
                              </TableCell>
                              <TableCell className="px-4 text-xs text-muted-foreground">
                                {new Date(po.orderDate).toLocaleDateString("id-ID")}
                              </TableCell>
                              <TableCell className="px-4 text-xs">
                                {po.expectedDate ? (
                                  <span className={`flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                                    {isOverdue && <Clock className="h-3 w-3 shrink-0" />}
                                    {new Date(po.expectedDate).toLocaleDateString("id-ID")}
                                    {isOverdue && (
                                      <span className="ml-1 text-[10px] font-semibold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                                        Overdue
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/40">—</span>
                                )}
                              </TableCell>
                              <TableCell className="px-4 text-xs font-medium text-right">
                                Rp {po.totalAmount.toLocaleString("id-ID")}
                              </TableCell>
                              <TableCell className="px-4">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  po.status === "Draft"     ? "bg-gray-100 text-gray-700" :
                                  po.status === "Sent"      ? "bg-blue-100 text-blue-700" :
                                  po.status === "Partial"   ? "bg-amber-100 text-amber-700" :
                                  po.status === "Received"  ? "bg-green-100 text-green-700" :
                                  "bg-red-100 text-red-700"
                                }`}>
                                  {po.status}
                                </span>
                              </TableCell>
                              <TableCell className="px-4 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPO(po);
                                    setIsPODetailOpen(true);
                                  }}
                                >
                                  <ChevronRight className="h-3 w-3" />
                                  Detail
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  );
                })()}
              </div>
            </TabsContent>

            {/* Penerimaan (GR) */}
            <TabsContent value="penerimaan" className="m-0">
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                {goodsReceipts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                    <p className="text-sm">Belum ada penerimaan barang.</p>
                    <p className="text-xs text-muted-foreground/60">Pilih PO berstatus Sent atau Partial untuk menerima barang.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs font-semibold px-4">Nomor GR</TableHead>
                        <TableHead className="text-xs font-semibold px-4">Tanggal</TableHead>
                        <TableHead className="text-xs font-semibold px-4">Nomor PO</TableHead>
                        <TableHead className="text-xs font-semibold px-4">Supplier</TableHead>
                        <TableHead className="text-xs font-semibold px-4">Cabang</TableHead>
                        <TableHead className="text-xs font-semibold px-4 text-right">Total Item</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {goodsReceipts.map((gr) => {
                        const branch = branches.find((b) => b.id === gr.branchId);
                        return (
                          <TableRow key={gr.id}>
                            <TableCell className="px-4 text-xs font-mono font-medium">
                              {gr.grNumber}
                            </TableCell>
                            <TableCell className="px-4 text-xs text-muted-foreground">
                              {new Date(gr.receiptDate).toLocaleDateString("id-ID")}
                            </TableCell>
                            <TableCell className="px-4 text-xs font-mono text-muted-foreground">
                              {gr.po?.poNumber ?? gr.poId}
                            </TableCell>
                            <TableCell className="px-4 text-xs">
                              {gr.po?.supplier?.name ?? <span className="text-muted-foreground/40">—</span>}
                            </TableCell>
                            <TableCell className="px-4 text-xs text-muted-foreground">
                              {branch?.name ?? gr.branchId}
                            </TableCell>
                            <TableCell className="px-4 text-xs text-right">
                              {gr.items.length} item
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            {/* Pengeluaran (Stock Out) */}
            <TabsContent value="pengeluaran" className="m-0">
              {/* Filter bar */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Jenis:</label>
                  <select
                    className="h-8 rounded-md border border-input bg-background px-3 text-xs min-w-[160px]"
                    value={stockOutTypeFilter}
                    onChange={(e) => setStockOutTypeFilter(e.target.value)}
                  >
                    <option value="all">Semua Jenis</option>
                    <option value="InternalUse">Pemakaian Internal</option>
                    <option value="Damaged">Rusak / Cacat</option>
                    <option value="Lost">Hilang</option>
                    <option value="Adjustment">Koreksi Manual</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Cabang:</label>
                  <select
                    className="h-8 rounded-md border border-input bg-background px-3 text-xs min-w-[150px]"
                    value={stockOutBranchFilter}
                    onChange={(e) => setStockOutBranchFilter(e.target.value)}
                  >
                    <option value="all">Semua Cabang</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Dari:</label>
                  <input
                    type="date"
                    className="h-8 rounded-md border border-input bg-background px-3 text-xs"
                    value={stockOutDateFrom}
                    onChange={(e) => setStockOutDateFrom(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Sampai:</label>
                  <input
                    type="date"
                    className="h-8 rounded-md border border-input bg-background px-3 text-xs"
                    value={stockOutDateTo}
                    onChange={(e) => setStockOutDateTo(e.target.value)}
                  />
                </div>
                {(stockOutTypeFilter !== "all" || stockOutBranchFilter !== "all" || stockOutDateFrom || stockOutDateTo) && (
                  <button
                    className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground border border-input rounded-md bg-background"
                    onClick={() => {
                      setStockOutTypeFilter("all");
                      setStockOutBranchFilter("all");
                      setStockOutDateFrom("");
                      setStockOutDateTo("");
                    }}
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                {(() => {
                  const filtered = stockOuts.filter((so) => {
                    const matchType = stockOutTypeFilter === "all" || so.type === stockOutTypeFilter;
                    const matchBranch = stockOutBranchFilter === "all" || so.branchId === stockOutBranchFilter;
                    const soDate = so.date ? so.date.slice(0, 10) : "";
                    const matchFrom = !stockOutDateFrom || soDate >= stockOutDateFrom;
                    const matchTo = !stockOutDateTo || soDate <= stockOutDateTo;
                    return matchType && matchBranch && matchFrom && matchTo;
                  });

                  const stockOutTypeLabel: Record<string, { label: string; className: string }> = {
                    InternalUse: { label: "Pemakaian Internal", className: "bg-blue-100 text-blue-700" },
                    Damaged:     { label: "Rusak / Cacat",      className: "bg-red-100 text-red-700" },
                    Lost:        { label: "Hilang",             className: "bg-orange-100 text-orange-700" },
                    Adjustment:  { label: "Koreksi Manual",     className: "bg-purple-100 text-purple-700" },
                  };

                  if (stockOuts.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                        <p className="text-sm">Belum ada pengeluaran stok.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsStockOutDialogOpen(true)}
                          className="gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Catat Pengeluaran
                        </Button>
                      </div>
                    );
                  }

                  if (filtered.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                        <p className="text-sm">Tidak ada pengeluaran yang sesuai filter.</p>
                      </div>
                    );
                  }

                  return (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="text-xs font-semibold px-4">No. SO</TableHead>
                          <TableHead className="text-xs font-semibold px-4">Tanggal</TableHead>
                          <TableHead className="text-xs font-semibold px-4">Cabang</TableHead>
                          <TableHead className="text-xs font-semibold px-4">Jenis</TableHead>
                          <TableHead className="text-xs font-semibold px-4">Alasan</TableHead>
                          <TableHead className="text-xs font-semibold px-4 text-right">Total Item</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((so) => {
                          const branch = branches.find((b) => b.id === so.branchId);
                          const typeInfo = stockOutTypeLabel[so.type] ?? { label: so.type, className: "bg-muted text-muted-foreground" };
                          return (
                            <TableRow key={so.id}>
                              <TableCell className="px-4 text-xs font-mono font-medium">
                                {so.soNumber}
                              </TableCell>
                              <TableCell className="px-4 text-xs text-muted-foreground">
                                {new Date(so.date).toLocaleDateString("id-ID")}
                              </TableCell>
                              <TableCell className="px-4 text-xs text-muted-foreground">
                                {branch?.name ?? so.branchId}
                              </TableCell>
                              <TableCell className="px-4">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeInfo.className}`}>
                                  {typeInfo.label}
                                </span>
                              </TableCell>
                              <TableCell className="px-4 text-xs text-muted-foreground max-w-[200px] truncate">
                                {so.reason}
                              </TableCell>
                              <TableCell className="px-4 text-xs text-right">
                                {so.items.length} item
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  );
                })()}
              </div>
            </TabsContent>

            {/* Return Supplier */}
            <TabsContent value="return-supplier" className="m-0">
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                {supplierReturns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                    <p className="text-sm">Belum ada return ke supplier.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSupplierReturnOpen(true)}
                      className="gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Buat SR Baru
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs font-semibold px-4">Nomor SR</TableHead>
                        <TableHead className="text-xs font-semibold px-4">Tanggal</TableHead>
                        <TableHead className="text-xs font-semibold px-4">Supplier</TableHead>
                        <TableHead className="text-xs font-semibold px-4">Cabang</TableHead>
                        <TableHead className="text-xs font-semibold px-4 text-right">Total Item</TableHead>
                        <TableHead className="text-xs font-semibold px-4">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplierReturns.map((sr) => {
                        const branch = branches.find((b) => b.id === sr.branchId);
                        return (
                          <TableRow key={sr.id}>
                            <TableCell className="px-4 text-xs font-mono font-medium">
                              {sr.srNumber}
                            </TableCell>
                            <TableCell className="px-4 text-xs text-muted-foreground">
                              {new Date(sr.returnDate).toLocaleDateString("id-ID")}
                            </TableCell>
                            <TableCell className="px-4 text-xs">
                              {sr.supplier?.name ?? <span className="text-muted-foreground/40">—</span>}
                            </TableCell>
                            <TableCell className="px-4 text-xs text-muted-foreground">
                              {branch?.name ?? sr.branchId}
                            </TableCell>
                            <TableCell className="px-4 text-xs text-right">
                              {sr.items.length} item
                            </TableCell>
                            <TableCell className="px-4">
                              {sr.status === "Draft" && (
                                <Badge variant="secondary" className="text-[10px]">
                                  Draft
                                </Badge>
                              )}
                              {sr.status === "Sent" && (
                                <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">
                                  Sent
                                </Badge>
                              )}
                              {sr.status === "Completed" && (
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                                  Completed
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            {/* Audit Stok */}
            <TabsContent value="audit-stok" className="m-0">
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                {stockAudits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                    <p className="text-sm">Belum ada sesi audit stok.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setAuditDialogAudit(null); setIsAuditDialogOpen(true); }}
                      className="gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Buat Audit Baru
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs font-semibold px-4">No. Audit</TableHead>
                        <TableHead className="text-xs font-semibold px-4">Tanggal</TableHead>
                        <TableHead className="text-xs font-semibold px-4">Cabang</TableHead>
                        <TableHead className="text-xs font-semibold px-4">Status</TableHead>
                        <TableHead className="text-xs font-semibold px-4 text-right">Jumlah Item</TableHead>
                        <TableHead className="text-xs font-semibold px-4 text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockAudits.map((audit) => {
                        const branch = branches.find((b) => b.id === audit.branchId);
                        const canContinue = audit.status === "Open" || audit.status === "InProgress";
                        const auditItems = audit.items ?? [];
                        const allFilled = auditItems.length > 0 && auditItems.every(
                          (it) => it.physicalQty !== undefined && it.physicalQty !== null
                        );
                        const canApply = audit.status === "InProgress" && allFilled;

                        return (
                          <TableRow key={audit.id}>
                            <TableCell className="px-4 text-xs font-mono font-medium">
                              {audit.auditNumber}
                            </TableCell>
                            <TableCell className="px-4 text-xs text-muted-foreground">
                              {new Date(audit.auditDate).toLocaleDateString("id-ID")}
                            </TableCell>
                            <TableCell className="px-4 text-xs text-muted-foreground">
                              {branch?.name ?? audit.branch?.name ?? audit.branchId}
                            </TableCell>
                            <TableCell className="px-4">
                              {audit.status === "Open" && (
                                <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">
                                  Open
                                </Badge>
                              )}
                              {audit.status === "InProgress" && (
                                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
                                  In Progress
                                </Badge>
                              )}
                              {audit.status === "Completed" && (
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                                  Completed
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="px-4 text-xs text-right text-muted-foreground">
                              {auditItems.length} item
                            </TableCell>
                            <TableCell className="px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {canContinue && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs gap-1"
                                    onClick={() => {
                                      setAuditDialogAudit(audit);
                                      setIsAuditDialogOpen(true);
                                    }}
                                  >
                                    Lanjutkan
                                  </Button>
                                )}
                                {canApply && (
                                  <Button
                                    size="sm"
                                    className="h-7 px-2 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={() => {
                                      setSelectedAudit(audit);
                                      setIsAuditApplyOpen(true);
                                    }}
                                  >
                                    Terapkan
                                  </Button>
                                )}
                                {audit.status === "Completed" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs gap-1"
                                    onClick={() => {
                                      setAuditDialogAudit(audit);
                                      setIsAuditDialogOpen(true);
                                    }}
                                  >
                                    Lihat Detail
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </div>

      {/* ── Dialogs ── */}
      <SupplierFormDialog
        open={isSupplierFormOpen}
        onOpenChange={(open) => {
          setIsSupplierFormOpen(open);
          if (!open) setEditingSupplier(null);
        }}
        supplier={editingSupplier ?? undefined}
      />

      <PurchaseOrderDialog
        open={isPODialogOpen}
        onOpenChange={setIsPODialogOpen}
      />

      <PODetailDialog
        open={isPODetailOpen}
        onOpenChange={(open) => {
          setIsPODetailOpen(open);
          if (!open) setSelectedPO(null);
        }}
        po={selectedPO}
      />

      <GoodsReceiptDialog
        open={isGRDialogOpen}
        onOpenChange={(open) => {
          setIsGRDialogOpen(open);
          if (!open) setSelectedGRPO(null);
        }}
        po={selectedGRPO}
      />

      <StockOutDialog
        open={isStockOutDialogOpen}
        onOpenChange={setIsStockOutDialogOpen}
      />

      <SupplierReturnDialog
        open={isSupplierReturnOpen}
        onOpenChange={setIsSupplierReturnOpen}
      />

      <StockAuditDialog
        open={isAuditDialogOpen}
        onOpenChange={(open) => {
          setIsAuditDialogOpen(open);
          if (!open) setAuditDialogAudit(null);
        }}
        audit={auditDialogAudit}
      />

      <StockAuditApplyDialog
        open={isAuditApplyOpen}
        onOpenChange={(open) => {
          setIsAuditApplyOpen(open);
          if (!open) setSelectedAudit(null);
        }}
        audit={selectedAudit}
      />
    </Layout>
  );
}
