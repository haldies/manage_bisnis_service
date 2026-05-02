"use client";
import React, { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { usePosStore } from "@/lib/store";
import { Transaction, StoreProfile, ReceiptSettings } from "@/lib/types";
import { PrinterService } from "@/lib/printerService";
import { Bluetooth, Printer, CheckCircle2, Info, RefreshCcw } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export default function ManagePrintersPage() {
  const { 
    selectedPrinter, 
    updatePrinterConfig, 
    receiptSettings, 
    updateReceiptSettings,
    storeProfile 
  } = usePosStore();

  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const connectToPrinter = async () => {
    setIsConnecting(true);
    setError(null);
    setSuccess(null);
    try {
      const printer = await PrinterService.scanAndConnect();
      updatePrinterConfig({
        id: printer.address,
        nama: printer.name,
        address: printer.address,
        tipe: 'Bluetooth (Web)',
        terhubung: true
      });
      setSuccess(`Berhasil terhubung ke ${printer.name}`);
    } catch (e: any) {
      setError(e.message || "Gagal menghubungkan ke printer.");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectPrinter = () => {
    PrinterService.disconnect();
    updatePrinterConfig(null);
    setSuccess("Koneksi printer telah diputuskan.");
  };

  const mockTransaction: Transaction = {
    id: 'TRX-12345678',
    queueNumber: '88',
    date: new Date().getTime(),
    branchId: 'b1',
    cashierId: 'u1',
    source: 'Retail',
    customerName: 'Pelanggan Setia',
    cashierName: 'Budi Santoso',
    status: 'Paid',
    items: [
      { id: 'p1', name: 'Americano Ice', category: 'Minuman', quantity: 2, price: 55000, costPrice: 20000, discount: 10000 },
      { id: 'p2', name: 'Red Velvet Latte', category: 'Minuman', quantity: 1, price: 35000, costPrice: 15000, discount: 0 },
    ],
    total: 135000,
    paymentMethod: 'Cash',
    amountPaid: 150000,
    change: 15000,
    tax: 0,
    discount: 20000
  };

  const subtotal = mockTransaction.items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);
  const itemDiscounts = mockTransaction.items.reduce((sum: number, i: any) => sum + (i.discount || 0) * i.quantity, 0);
  const afterDiscount = subtotal - itemDiscounts;
  const tax = (storeProfile.enableTax && receiptSettings.showTax) ? Math.round(afterDiscount * (storeProfile.taxPercentage / 100)) : 0;
  const total = afterDiscount + tax;

  const previewTransaction: Transaction = {
    ...mockTransaction,
    tax: tax,
    discount: itemDiscounts,
    total: total,
    change: mockTransaction.amountPaid! - total
  };

  const rawReceipt = PrinterService.formatReceiptPlain(previewTransaction, storeProfile, receiptSettings);

  const handleTestPrint = async () => {
    if (!selectedPrinter) {
      setError("Silakan hubungkan printer terlebih dahulu.");
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await PrinterService.printReceipt(previewTransaction, storeProfile, receiptSettings);
      setSuccess("Cetak uji coba berhasil dikirim ke printer.");
    } catch (e: any) {
      setError(e.message || "Gagal mencetak. Pastikan printer menyala.");
    }
  };

  return (
    <Layout title="Pengaturan Printer" requiredModule="Printers" requiredLevel="Full">
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase ">Pengaturan Printer</h1>
            <p className="text-muted-foreground font-bold tracking-widest text-[10px] uppercase mt-1">Konfigurasi Struk Thermal</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl font-bold text-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-sm">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Connection & Settings */}
          <div className="space-y-6">
            <Card className="rounded-3xl border-border/40 shadow-sm">
              <CardContent className="p-6">
                <div className="mb-6">
                  {selectedPrinter ? (
                    <div className="bg-card border border-primary/20 p-4 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                          <Printer className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-black tracking-tight">{selectedPrinter.nama}</h3>
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Terhubung (Bluetooth Web)</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={disconnectPrinter} className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 font-bold uppercase text-[10px]">
                        Putus
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={connectToPrinter} 
                      disabled={isConnecting}
                      className="w-full h-16 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-sm flex items-center gap-3"
                    >
                      {isConnecting ? (
                        <><RefreshCcw className="h-5 w-5 animate-spin" /> Menghubungkan...</>
                      ) : (
                        <><Bluetooth className="h-5 w-5" /> Cari Printer Bluetooth</>
                      )}
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground mt-3 flex items-start gap-1.5 leading-relaxed">
                    <Info className="h-4 w-4 shrink-0 text-primary/60" />
                    Harap gunakan Google Chrome atau Microsoft Edge untuk mengakses fitur Bluetooth Web. Browser Safari tidak mendukung fitur ini.
                  </p>
                </div>

                <div className="space-y-6 pt-6 border-t border-border/40">
                  <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Ukuran Kertas</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: '58mm', label: '58MM' },
                      { id: '80mm', label: '80MM' },
                      { id: '58mm-on-80mm', label: '58/80MM' }
                    ].map(size => (
                      <Button
                        key={size.id}
                        variant={receiptSettings.paperWidth === size.id ? 'default' : 'outline'}
                        className={cn(
                          "h-12 rounded-xl font-bold",
                          receiptSettings.paperWidth === size.id ? "bg-primary" : "border-border/40 text-muted-foreground"
                        )}
                        onClick={() => updateReceiptSettings({ paperWidth: size.id as any })}
                      >
                        {size.label}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border/40">
                    <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">Tampilkan Informasi</h3>
                    {[
                      { label: 'Nomor Antrian', key: 'showQueueNumber' },
                      { label: 'Alamat Toko', key: 'showStoreAddress' },
                      { label: 'Nomor Telepon', key: 'showStorePhone' },
                      { label: 'Nama Pelanggan', key: 'showCustomerName' },
                      { label: 'Nama Kasir', key: 'showCashierName' },
                      { label: 'Pajak Transaksi', key: 'showTax' },
                      { label: 'Diskon per Item', key: 'showDiscount' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground/80">{item.label}</span>
                        <Switch 
                          checked={(receiptSettings as any)[item.key]} 
                          onCheckedChange={(checked) => updateReceiptSettings({ [item.key]: checked })} 
                        />
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-border/40">
                    <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-3">Pesan Bawah (Footer)</h3>
                    <Textarea 
                      value={receiptSettings.receiptFooter}
                      onChange={(e) => updateReceiptSettings({ receiptFooter: e.target.value })}
                      className="resize-none rounded-xl bg-card border-border/40 focus-visible:ring-1 focus-visible:ring-primary/20 text-sm"
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleTestPrint}
              disabled={!selectedPrinter}
              variant="outline"
              className="w-full h-16 rounded-lg border-primary/20 text-primary font-black uppercase tracking-widest shadow-sm hover:bg-primary/5"
            >
              <Printer className="mr-2 h-5 w-5" /> Test Cetak Struk
            </Button>
          </div>

          {/* Right Column: Preview */}
          <div className="space-y-4">
             <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pratinjau Struk Virtual ({receiptSettings.paperWidth})</h3>
             <div className="bg-white rounded-xl shadow-sm border border-border/40 p-6 flex justify-center items-start min-h-[500px]">
                {/* Paper visualizer */}
                <div 
                  className="bg-white shadow-md border border-gray-200 p-4 font-mono whitespace-pre text-[10px]"
                  style={{ 
                    width: receiptSettings.paperWidth === '58mm' ? 250 : 340,
                    color: '#000',
                    lineHeight: 1.4
                  }}
                >
                  {rawReceipt}
                </div>
             </div>
             <p className="text-xs text-muted-foreground/60 text-center flex items-center justify-center gap-1.5 mt-2">
                <Info className="h-3.5 w-3.5" />
                Pratinjau mensimulasikan ukuran kertas fisik secara visual
             </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
