"use client";
import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePosStore } from "@/lib/store";
import { PrinterService } from "@/lib/printerService";
import { ReceiptFormatter } from "@/lib/ReceiptFormatter";
import { ServiceTicket } from "@/lib/types";
import { Printer, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Mock ticket untuk preview ────────────────────────────────────────────────
const MOCK_TICKET: ServiceTicket = {
  id: "svc-preview-001",
  dateOpened: Date.now() - 1000 * 60 * 60 * 2,
  dateClosed: Date.now(),
  customerName: "Budi Santoso",
  customerPhone: "08123456789",
  customerAddress: "Jl. Merdeka No. 10",
  deviceModel: "iPhone 13 Pro",
  deviceSerial: "IMEI: 123456789012345",
  issue: "Layar retak, baterai cepat habis",
  diagnosis: "LCD pecah, baterai drop 60%",
  estimatedCost: 350000,
  serviceFee: 50000,
  status: "ReadyForPickup",
  spareparts: [
    { id: "p1", name: "LCD iPhone 13 Pro", category: "Sparepart", price: 250000, costPrice: 180000, quantity: 1, itemId: "item-1" },
    { id: "p2", name: "Baterai iPhone 13", category: "Sparepart", price: 120000, costPrice: 80000, quantity: 1, itemId: "item-2" },
  ],
  branchId: "b1",
  warrantyDays: 30,
  warrantyExpiry: Date.now() + 1000 * 60 * 60 * 24 * 30,
  pickupCode: "SVC-8X2K",
  paymentStatus: "Unpaid",
};

export default function ServiceReceiptTemplatePage() {
  const {
    serviceReceiptSettings,
    updateServiceReceiptSettings,
    storeProfile,
    selectedPrinter,
  } = usePosStore();

  const [printError, setPrintError] = useState<string | null>(null);
  const [printSuccess, setPrintSuccess] = useState<string | null>(null);

  const s = serviceReceiptSettings;

  const intakePlain = ReceiptFormatter.formatServiceIntakePlain(
    MOCK_TICKET, storeProfile, s, "Andi Teknisi"
  );
  const invoicePlain = ReceiptFormatter.formatServiceInvoicePlain(
    MOCK_TICKET, storeProfile, s, "Andi Teknisi"
  );

  const handleTestPrint = async (type: "intake" | "invoice") => {
    if (!selectedPrinter) {
      setPrintError("Hubungkan printer terlebih dahulu di halaman Pengaturan Printer.");
      return;
    }
    setPrintError(null);
    setPrintSuccess(null);
    try {
      if (type === "intake") {
        await PrinterService.printServiceIntakeReceipt(MOCK_TICKET, storeProfile, s, "Andi Teknisi");
      } else {
        await PrinterService.printServiceInvoice(MOCK_TICKET, storeProfile, s, "Andi Teknisi");
      }
      setPrintSuccess("Cetak uji coba berhasil dikirim ke printer.");
    } catch (e: any) {
      setPrintError(e.message || "Gagal mencetak.");
    }
  };

  return (
    <Layout title="Template Struk Servis" requiredModule="Service" requiredLevel="Full">
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        <div>
          <h1 className="text-2xl font-black tracking-tight uppercase">Template Struk Servis</h1>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">
            Atur tampilan tanda terima masuk & nota selesai servis
          </p>
        </div>

        {printError && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-semibold">{printError}</div>
        )}
        {printSuccess && (
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-semibold">{printSuccess}</div>
        )}

        {/* Ukuran kertas — shared */}
        <Card className="rounded-2xl border-border/40 shadow-sm">
          <CardContent className="p-5 space-y-3">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Ukuran Kertas</p>
            <div className="flex gap-2">
              {(["58mm", "80mm", "58mm-on-80mm"] as const).map((size) => (
                <Button
                  key={size}
                  variant={s.paperWidth === size ? "default" : "outline"}
                  className={cn("h-10 px-5 font-bold text-xs rounded-xl", s.paperWidth !== size && "border-border/40 text-muted-foreground")}
                  onClick={() => updateServiceReceiptSettings({ paperWidth: size })}
                >
                  {size === "58mm-on-80mm" ? "58/80MM" : size.toUpperCase()}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="intake" className="w-full">
          <TabsList className="bg-transparent p-0 h-auto gap-0 flex rounded-none border-b border-border mb-6">
            {[
              { value: "intake", label: "Tanda Terima Masuk" },
              { value: "invoice", label: "Nota Selesai / Invoice" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="relative bg-transparent rounded-none px-4 py-2.5 text-xs font-semibold text-muted-foreground border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none shrink-0"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Tanda Terima Masuk ── */}
          <TabsContent value="intake" className="m-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Settings */}
              <Card className="rounded-2xl border-border/40 shadow-sm">
                <CardContent className="p-5 space-y-5">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Informasi yang Ditampilkan</p>
                  {[
                    { label: "Nomor Telepon Pelanggan", key: "showIntakeCustomerPhone" },
                    { label: "Serial Number / IMEI", key: "showIntakeDeviceSerial" },
                    { label: "Estimasi Biaya", key: "showIntakeEstimatedCost" },
                    { label: "Kode Ambil (besar)", key: "showIntakePickupCode" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.label}</span>
                      <Switch
                        checked={(s as any)[item.key]}
                        onCheckedChange={(v) => updateServiceReceiptSettings({ [item.key]: v } as any)}
                      />
                    </div>
                  ))}

                  <div className="pt-2 border-t border-border/40 space-y-2">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Footer</p>
                    <Textarea
                      value={s.intakeFooter}
                      onChange={(e) => updateServiceReceiptSettings({ intakeFooter: e.target.value })}
                      className="resize-none rounded-xl text-sm min-h-[80px]"
                      placeholder="Pesan di bagian bawah struk..."
                    />
                  </div>

                  <Button
                    variant="outline"
                    className="w-full h-10 gap-2 text-xs font-bold"
                    onClick={() => handleTestPrint("intake")}
                    disabled={!selectedPrinter}
                  >
                    <Printer className="h-4 w-4" />
                    Test Cetak Tanda Terima
                  </Button>
                  {!selectedPrinter && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" /> Hubungkan printer di halaman Pengaturan Printer
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Preview */}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  Pratinjau ({s.paperWidth})
                </p>
                <div className="bg-white rounded-xl shadow-sm border border-border/40 p-6 flex justify-center min-h-[400px]">
                  <div
                    className="bg-white shadow-md border border-gray-200 p-4 font-mono whitespace-pre text-[10px]"
                    style={{
                      width: s.paperWidth === "58mm" ? 250 : 340,
                      color: "#000",
                      lineHeight: 1.4,
                    }}
                  >
                    {intakePlain}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Nota Selesai ── */}
          <TabsContent value="invoice" className="m-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Settings */}
              <Card className="rounded-2xl border-border/40 shadow-sm">
                <CardContent className="p-5 space-y-5">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Informasi yang Ditampilkan</p>
                  {[
                    { label: "Rincian Sparepart", key: "showInvoiceSpareparts" },
                    { label: "Biaya Jasa Servis", key: "showInvoiceServiceFee" },
                    { label: "Info Garansi", key: "showInvoiceWarranty" },
                    { label: "Nama Teknisi", key: "showInvoiceTechnician" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.label}</span>
                      <Switch
                        checked={(s as any)[item.key]}
                        onCheckedChange={(v) => updateServiceReceiptSettings({ [item.key]: v } as any)}
                      />
                    </div>
                  ))}

                  <div className="pt-2 border-t border-border/40 space-y-2">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Footer</p>
                    <Textarea
                      value={s.invoiceFooter}
                      onChange={(e) => updateServiceReceiptSettings({ invoiceFooter: e.target.value })}
                      className="resize-none rounded-xl text-sm min-h-[80px]"
                      placeholder="Pesan di bagian bawah nota..."
                    />
                  </div>

                  <Button
                    variant="outline"
                    className="w-full h-10 gap-2 text-xs font-bold"
                    onClick={() => handleTestPrint("invoice")}
                    disabled={!selectedPrinter}
                  >
                    <Printer className="h-4 w-4" />
                    Test Cetak Nota Selesai
                  </Button>
                  {!selectedPrinter && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" /> Hubungkan printer di halaman Pengaturan Printer
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Preview */}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  Pratinjau ({s.paperWidth})
                </p>
                <div className="bg-white rounded-xl shadow-sm border border-border/40 p-6 flex justify-center min-h-[400px]">
                  <div
                    className="bg-white shadow-md border border-gray-200 p-4 font-mono whitespace-pre text-[10px]"
                    style={{
                      width: s.paperWidth === "58mm" ? 250 : 340,
                      color: "#000",
                      lineHeight: 1.4,
                    }}
                  >
                    {invoicePlain}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
