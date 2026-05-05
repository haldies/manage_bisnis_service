"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { usePosStore } from "@/lib/store";
import { PrinterService } from "@/lib/printerService";
import { ReceiptFormatter } from "@/lib/ReceiptFormatter";
import { Transaction, ServiceTicket } from "@/lib/types";
import { RolePermissionTable } from "@/components/staff/RolePermissionTable";
import ServiceTypeTable from "@/components/service/ServiceTypeTable";
import ServiceTypeDialog from "@/components/service/ServiceTypeDialog";
import {
  Bluetooth, Printer, Info, RefreshCcw, Trash2,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// ── Mock data para preview ────────────────────────────────────────────────────
const MOCK_TRX: Transaction = {
  id: "TRX-12345678", queueNumber: "88", date: Date.now(),
  branchId: "b1", cashierId: "u1", source: "Retail",
  customerName: "Pelanggan Setia", cashierName: "Budi Santoso", status: "Paid",
  items: [
    { id: "p1", name: "Americano Ice", category: "Minuman", quantity: 2, price: 55000, costPrice: 20000, discount: 10000 },
    { id: "p2", name: "Red Velvet Latte", category: "Minuman", quantity: 1, price: 35000, costPrice: 15000, discount: 0 },
  ],
  total: 135000, paymentMethod: "Cash", amountPaid: 150000, change: 15000, tax: 0, discount: 20000,
};

const MOCK_TICKET: ServiceTicket = {
  id: "svc-preview-001", dateOpened: Date.now() - 7200000, dateClosed: Date.now(),
  customerName: "Budi Santoso", customerPhone: "08123456789", customerAddress: "Jl. Merdeka No. 10",
  deviceModel: "iPhone 13 Pro", deviceSerial: "IMEI: 123456789012345",
  issue: "Layar retak, baterai cepat habis", diagnosis: "LCD pecah, baterai drop 60%",
  estimatedCost: 350000, serviceFee: 50000, status: "ReadyForPickup",
  spareparts: [
    { id: "p1", name: "LCD iPhone 13 Pro", category: "Sparepart", price: 250000, costPrice: 180000, quantity: 1, itemId: "item-1" },
    { id: "p2", name: "Baterai iPhone 13", category: "Sparepart", price: 120000, costPrice: 80000, quantity: 1, itemId: "item-2" },
  ],
  branchId: "b1", warrantyDays: 30, warrantyExpiry: Date.now() + 2592000000,
  pickupCode: "SVC-8X2K", paymentStatus: "Unpaid",
};

const SETTINGS_TABS = [
  { value: "toko",    label: "Toko" },
  { value: "inventori", label: "Inventori" },
  { value: "servis",  label: "Servis" },
  { value: "akses",   label: "Pengguna & Akses" },
  { value: "printer", label: "Printer" },
] as const;

type SettingsTab = typeof SETTINGS_TABS[number]["value"];

export default function SettingsPage() {
  const router = useRouter();
  const {
    storeProfile, updateStoreProfile,
    categories, addCategory, deleteCategory,
    rolePermissions, updateRolePermission,
    selectedPrinter, updatePrinterConfig,
    receiptSettings, updateReceiptSettings,
    serviceReceiptSettings, updateServiceReceiptSettings,
  } = usePosStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>("toko");
  const [newCatName, setNewCatName] = useState("");
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [printerMsg, setPrinterMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [printerSubTab, setPrinterSubTab] = useState<"kasir" | "servis-intake" | "servis-nota">("kasir");

  // Sync tab from URL query
  useEffect(() => {
    const tab = router.query.tab as SettingsTab;
    if (tab && SETTINGS_TABS.some(t => t.value === tab)) setActiveTab(tab);
  }, [router.query.tab]);

  // ── Printer helpers ──────────────────────────────────────────────────────
  const connectPrinter = async () => {
    setIsConnecting(true); setPrinterMsg(null);
    try {
      const p = await PrinterService.scanAndConnect();
      updatePrinterConfig({ id: p.address, nama: p.name, address: p.address, tipe: "Bluetooth (Web)", terhubung: true });
      setPrinterMsg({ type: "success", text: `Berhasil terhubung ke ${p.name}` });
    } catch (e: any) {
      setPrinterMsg({ type: "error", text: e.message || "Gagal menghubungkan ke printer." });
    } finally { setIsConnecting(false); }
  };

  const disconnectPrinter = () => {
    PrinterService.disconnect(); updatePrinterConfig(null);
    setPrinterMsg({ type: "success", text: "Koneksi printer diputuskan." });
  };

  // Kasir receipt preview
  const subtotal = MOCK_TRX.items.reduce((s, i: any) => s + i.price * i.quantity, 0);
  const itemDisc = MOCK_TRX.items.reduce((s, i: any) => s + (i.discount || 0) * i.quantity, 0);
  const afterDisc = subtotal - itemDisc;
  const tax = storeProfile.enableTax && receiptSettings.showTax ? Math.round(afterDisc * storeProfile.taxPercentage / 100) : 0;
  const previewTrx: Transaction = { ...MOCK_TRX, tax, discount: itemDisc, total: afterDisc + tax, change: MOCK_TRX.amountPaid! - (afterDisc + tax) };
  const kasirPlain = PrinterService.formatReceiptPlain(previewTrx, storeProfile, receiptSettings);
  const intakePlain = ReceiptFormatter.formatServiceIntakePlain(MOCK_TICKET, storeProfile, serviceReceiptSettings, "Andi Teknisi");
  const invoicePlain = ReceiptFormatter.formatServiceInvoicePlain(MOCK_TICKET, storeProfile, serviceReceiptSettings, "Andi Teknisi");

  const previewWidth = (pw: string) => pw === "58mm" ? 250 : 340;

  return (
    <Layout title="Pengaturan" requiredModule="Staff" requiredLevel="Read">
      <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-1">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SettingsTab)} className="space-y-5">

            {/* Tab bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border">
              <div className="overflow-x-auto no-scrollbar flex-1 min-w-0">
                <TabsList className="bg-transparent p-0 h-auto gap-0 flex w-max min-w-full rounded-none border-none">
                  {SETTINGS_TABS.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="relative bg-transparent rounded-none px-4 py-2.5 text-xs font-semibold text-muted-foreground border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </div>

            {/* ── Tab: Toko ── */}
            <TabsContent value="toko" className="m-0">
              <div className="max-w-lg space-y-4">
                <Card className="rounded-2xl border-border/40 shadow-sm">
                  <CardContent className="p-5 space-y-4">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Informasi Toko</p>
                    {[
                      { label: "Nama Toko", key: "name", type: "text" },
                      { label: "Alamat", key: "address", type: "text" },
                      { label: "Nomor Telepon", key: "phone", type: "text" },
                    ].map((f) => (
                      <div key={f.key} className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">{f.label}</label>
                        <Input
                          value={(storeProfile as any)[f.key] || ""}
                          onChange={(e) => updateStoreProfile({ [f.key]: e.target.value })}
                          className="h-9 text-sm"
                        />
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <div>
                        <p className="text-sm font-semibold">Aktifkan Pajak</p>
                        <p className="text-xs text-muted-foreground">Tambahkan PPN ke setiap transaksi</p>
                      </div>
                      <Switch
                        checked={storeProfile.enableTax}
                        onCheckedChange={(v) => updateStoreProfile({ enableTax: v })}
                      />
                    </div>
                    {storeProfile.enableTax && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Persentase Pajak (%)</label>
                        <Input
                          type="number"
                          value={storeProfile.taxPercentage}
                          onChange={(e) => updateStoreProfile({ taxPercentage: Number(e.target.value) })}
                          className="h-9 text-sm w-32"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── Tab: Inventori ── */}
            <TabsContent value="inventori" className="m-0">
              <div className="max-w-md space-y-4">
                <Card className="rounded-2xl border-border/40 shadow-sm">
                  <CardContent className="p-5 space-y-4">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Kelola Kategori Produk</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nama kategori baru..."
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && newCatName) { addCategory(newCatName); setNewCatName(""); } }}
                        className="h-9 text-sm"
                      />
                      <Button
                        className="h-9 px-4 text-xs"
                        onClick={() => { if (!newCatName) return; addCategory(newCatName); setNewCatName(""); }}
                      >
                        Tambah
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {categories.map((cat) => (
                        <div key={cat.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/10 border border-border/10 group">
                          <span className="text-sm font-semibold">{cat.name}</span>
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                            onClick={() => deleteCategory(cat.id)}
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── Tab: Servis ── */}
            <TabsContent value="servis" className="m-0">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    className="h-9 text-xs gap-1.5"
                    onClick={() => { setEditingType(null); setIsTypeDialogOpen(true); }}
                  >
                    Tambah Jenis Jasa
                  </Button>
                </div>
                <ServiceTypeTable onEdit={(type) => { setEditingType(type); setIsTypeDialogOpen(true); }} />
              </div>
            </TabsContent>

            {/* ── Tab: Pengguna & Akses ── */}
            <TabsContent value="akses" className="m-0">
              <RolePermissionTable
                rolePermissions={rolePermissions}
                updateRolePermission={(role: any, module, level) =>
                  updateRolePermission(typeof role === "string" ? role : role.name, module, level)
                }
              />
            </TabsContent>

            {/* ── Tab: Printer ── */}
            <TabsContent value="printer" className="m-0 space-y-5">
              {/* Koneksi printer */}
              <Card className="rounded-2xl border-border/40 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Koneksi Printer Bluetooth</p>
                  {printerMsg && (
                    <div className={cn("p-3 rounded-xl text-sm font-semibold", printerMsg.type === "error" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600")}>
                      {printerMsg.text}
                    </div>
                  )}
                  {selectedPrinter ? (
                    <div className="flex items-center justify-between p-4 bg-card border border-primary/20 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                          <Printer className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{selectedPrinter.nama}</p>
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Terhubung</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={disconnectPrinter} className="text-red-500 border-red-200 hover:bg-red-50 text-xs">
                        Putus
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={connectPrinter} disabled={isConnecting} className="w-full h-12 gap-2 text-sm font-bold">
                      {isConnecting ? <><RefreshCcw className="h-4 w-4 animate-spin" /> Menghubungkan...</> : <><Bluetooth className="h-4 w-4" /> Cari Printer Bluetooth</>}
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    Gunakan Chrome atau Edge. Safari tidak mendukung Bluetooth Web.
                  </p>
                </CardContent>
              </Card>

              {/* Sub-tab template struk */}
              <div className="border-b border-border flex gap-0">
                {([
                  { id: "kasir", label: "Struk Kasir" },
                  { id: "servis-intake", label: "Tanda Terima Servis" },
                  { id: "servis-nota", label: "Nota Selesai Servis" },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setPrinterSubTab(t.id)}
                    className={cn(
                      "px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap",
                      printerSubTab === t.id
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ── Struk Kasir ── */}
              {printerSubTab === "kasir" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="rounded-2xl border-border/40 shadow-sm">
                    <CardContent className="p-5 space-y-5">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Ukuran Kertas</p>
                      <div className="flex gap-2">
                        {(["58mm", "80mm", "58mm-on-80mm"] as const).map((s) => (
                          <Button key={s} variant={receiptSettings.paperWidth === s ? "default" : "outline"} className="h-9 px-4 text-xs font-bold rounded-xl" onClick={() => updateReceiptSettings({ paperWidth: s })}>
                            {s === "58mm-on-80mm" ? "58/80MM" : s.toUpperCase()}
                          </Button>
                        ))}
                      </div>
                      <div className="space-y-3 pt-2 border-t border-border/40">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Tampilkan</p>
                        {[
                          { label: "Nomor Antrian", key: "showQueueNumber" },
                          { label: "Alamat Toko", key: "showStoreAddress" },
                          { label: "Nomor Telepon Toko", key: "showStorePhone" },
                          { label: "Nama Pelanggan", key: "showCustomerName" },
                          { label: "Nama Kasir", key: "showCashierName" },
                          { label: "Pajak", key: "showTax" },
                          { label: "Diskon per Item", key: "showDiscount" },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between">
                            <span className="text-sm font-medium">{item.label}</span>
                            <Switch checked={(receiptSettings as any)[item.key]} onCheckedChange={(v) => updateReceiptSettings({ [item.key]: v })} />
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-border/40 space-y-2">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Footer</p>
                        <Textarea value={receiptSettings.receiptFooter} onChange={(e) => updateReceiptSettings({ receiptFooter: e.target.value })} className="resize-none rounded-xl text-sm min-h-[70px]" />
                      </div>
                      <Button variant="outline" className="w-full h-9 gap-2 text-xs" disabled={!selectedPrinter}
                        onClick={async () => { try { await PrinterService.printReceipt(previewTrx, storeProfile, receiptSettings); setPrinterMsg({ type: "success", text: "Test cetak berhasil." }); } catch (e: any) { setPrinterMsg({ type: "error", text: e.message }); } }}>
                        <Printer className="h-3.5 w-3.5" /> Test Cetak
                      </Button>
                    </CardContent>
                  </Card>
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pratinjau ({receiptSettings.paperWidth})</p>
                    <div className="bg-white rounded-xl border border-border/40 p-6 flex justify-center min-h-[400px]">
                      <div className="bg-white shadow-md border border-gray-200 p-4 font-mono whitespace-pre text-[10px]" style={{ width: previewWidth(receiptSettings.paperWidth), color: "#000", lineHeight: 1.4 }}>{kasirPlain}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Tanda Terima Servis ── */}
              {printerSubTab === "servis-intake" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="rounded-2xl border-border/40 shadow-sm">
                    <CardContent className="p-5 space-y-5">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Ukuran Kertas</p>
                      <div className="flex gap-2">
                        {(["58mm", "80mm", "58mm-on-80mm"] as const).map((s) => (
                          <Button key={s} variant={serviceReceiptSettings.paperWidth === s ? "default" : "outline"} className="h-9 px-4 text-xs font-bold rounded-xl" onClick={() => updateServiceReceiptSettings({ paperWidth: s })}>
                            {s === "58mm-on-80mm" ? "58/80MM" : s.toUpperCase()}
                          </Button>
                        ))}
                      </div>
                      <div className="space-y-3 pt-2 border-t border-border/40">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Tampilkan</p>
                        {[
                          { label: "Nomor Telepon Pelanggan", key: "showIntakeCustomerPhone" },
                          { label: "Serial Number / IMEI", key: "showIntakeDeviceSerial" },
                          { label: "Estimasi Biaya", key: "showIntakeEstimatedCost" },
                          { label: "Kode Ambil (besar)", key: "showIntakePickupCode" },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between">
                            <span className="text-sm font-medium">{item.label}</span>
                            <Switch checked={(serviceReceiptSettings as any)[item.key]} onCheckedChange={(v) => updateServiceReceiptSettings({ [item.key]: v } as any)} />
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-border/40 space-y-2">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Footer</p>
                        <Textarea value={serviceReceiptSettings.intakeFooter} onChange={(e) => updateServiceReceiptSettings({ intakeFooter: e.target.value })} className="resize-none rounded-xl text-sm min-h-[70px]" />
                      </div>
                      <Button variant="outline" className="w-full h-9 gap-2 text-xs" disabled={!selectedPrinter}
                        onClick={async () => { try { await PrinterService.printServiceIntakeReceipt(MOCK_TICKET, storeProfile, serviceReceiptSettings, "Andi Teknisi"); setPrinterMsg({ type: "success", text: "Test cetak berhasil." }); } catch (e: any) { setPrinterMsg({ type: "error", text: e.message }); } }}>
                        <Printer className="h-3.5 w-3.5" /> Test Cetak
                      </Button>
                    </CardContent>
                  </Card>
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pratinjau ({serviceReceiptSettings.paperWidth})</p>
                    <div className="bg-white rounded-xl border border-border/40 p-6 flex justify-center min-h-[400px]">
                      <div className="bg-white shadow-md border border-gray-200 p-4 font-mono whitespace-pre text-[10px]" style={{ width: previewWidth(serviceReceiptSettings.paperWidth), color: "#000", lineHeight: 1.4 }}>{intakePlain}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Nota Selesai Servis ── */}
              {printerSubTab === "servis-nota" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="rounded-2xl border-border/40 shadow-sm">
                    <CardContent className="p-5 space-y-5">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Tampilkan</p>
                      {[
                        { label: "Rincian Sparepart", key: "showInvoiceSpareparts" },
                        { label: "Biaya Jasa Servis", key: "showInvoiceServiceFee" },
                        { label: "Info Garansi", key: "showInvoiceWarranty" },
                        { label: "Nama Teknisi", key: "showInvoiceTechnician" },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.label}</span>
                          <Switch checked={(serviceReceiptSettings as any)[item.key]} onCheckedChange={(v) => updateServiceReceiptSettings({ [item.key]: v } as any)} />
                        </div>
                      ))}
                      <div className="pt-2 border-t border-border/40 space-y-2">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Footer</p>
                        <Textarea value={serviceReceiptSettings.invoiceFooter} onChange={(e) => updateServiceReceiptSettings({ invoiceFooter: e.target.value })} className="resize-none rounded-xl text-sm min-h-[70px]" />
                      </div>
                      <Button variant="outline" className="w-full h-9 gap-2 text-xs" disabled={!selectedPrinter}
                        onClick={async () => { try { await PrinterService.printServiceInvoice(MOCK_TICKET, storeProfile, serviceReceiptSettings, "Andi Teknisi"); setPrinterMsg({ type: "success", text: "Test cetak berhasil." }); } catch (e: any) { setPrinterMsg({ type: "error", text: e.message }); } }}>
                        <Printer className="h-3.5 w-3.5" /> Test Cetak
                      </Button>
                    </CardContent>
                  </Card>
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pratinjau ({serviceReceiptSettings.paperWidth})</p>
                    <div className="bg-white rounded-xl border border-border/40 p-6 flex justify-center min-h-[400px]">
                      <div className="bg-white shadow-md border border-gray-200 p-4 font-mono whitespace-pre text-[10px]" style={{ width: previewWidth(serviceReceiptSettings.paperWidth), color: "#000", lineHeight: 1.4 }}>{invoicePlain}</div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

          </Tabs>
        </div>
      </div>

      <ServiceTypeDialog
        open={isTypeDialogOpen}
        onOpenChange={setIsTypeDialogOpen}
        editingType={editingType}
      />
    </Layout>
  );
}
