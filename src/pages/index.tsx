import { useState, useMemo, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { ChartAreaInteractive } from "@/components/dashboard/ChartAreaInteractive";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  CheckCircle2, 
  CreditCard, 
  Wallet,
  Smartphone,
  Laptop,
  Tablet,
  Wrench,
  SearchX,
  Clock,
  ArrowRight,
  PieChart,
  X,
  Check,
  Printer,
  Share2,
  Send,
} from "lucide-react";
import { usePosStore } from "@/lib/store";
import { PrinterService } from "@/lib/printerService";
import { useRouter, useSearchParams } from "next/navigation";
import { cn, formatCurrency } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";

export default function UnifiedAppleCashierPage() {
  const { 
    inventory, 
    stocks,
    users,
    currentUser,
    services,
    currentBranch,
    cart, 
    addToCart, 
    removeFromCart, 
    updateCartQuantity, 
    setCartItemTechnician,
    checkout,
    addServiceTicket,
    updateServiceTicket,
    selectedPrinter,
    storeProfile,
    receiptSettings,
    transactions,
    categories,
    rolePermissions,
  } = usePosStore();
  const router = useRouter();

  const searchParams = useSearchParams();
  const view = searchParams.get('view');
  
  // Managers and Admins can see the report
  const canSeeReport = currentUser?.role === 'Admin' || (currentUser && rolePermissions[currentUser.role]?.Finance !== 'None');
  const [showReport, setShowReport] = useState(canSeeReport && view !== 'cashier');

  useEffect(() => {
    if (view === 'cashier') {
      setShowReport(false);
    } else if (canSeeReport && !view) {
      setShowReport(true);
    }
  }, [view, currentUser, canSeeReport]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);
  const [isCheckoutSuccess, setIsCheckoutSuccess] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [amountPaid, setAmountPaid] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    address: ""
  });

  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'QRIS' | 'Card'>('QRIS');


  // Form State for New Service
  const [newService, setNewService] = useState({
    customerName: "",
    customerPhone: "",
    deviceModel: "",
    deviceSerial: "",
    issue: ""
  });



  const technicians = useMemo(() => {
    return users.filter(u => u.role === 'Technician' || u.role === 'Admin');
  }, [users]);

  const activeProducts = useMemo(() => {
    return inventory.map(item => {
      const relevantStocks = currentBranch 
        ? stocks.filter(s => s.itemId === item.id && s.branchId === currentBranch.id)
        : stocks.filter(s => s.itemId === item.id);
      
      const totalStock = relevantStocks.reduce((sum, s) => sum + s.quantity, 0);

      return {
        id: item.id,
        name: item.name,
        categoryId: item.categoryId,
        categoryName: item.category?.name || "Uncategorized",
        price: item.basePrice,
        costPrice: item.costPrice,
        stock: totalStock,
        sku: item.sku,
        image: item.image,
        warranty: item.warranty,
        showInPos: item.showInPos !== false
      };

    });
  }, [inventory, stocks, currentBranch]);

  const filteredProducts = useMemo(() => {
    return activeProducts.filter(p => 
      p.showInPos &&
      (p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       p.categoryName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       p.sku?.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (p.categoryId === selectedCategoryId)
    );

  }, [activeProducts, searchQuery, selectedCategoryId]);

  const readyToPickUp = useMemo(() => {
    return services.filter(s => s.status === 'Completed' || s.status === 'Approved');
  }, [services]);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async (method: 'Cash' | 'QRIS' | 'Card') => {
    if (cart.length === 0) return;
    const paid = method === 'Cash' ? (parseInt(amountPaid) || cartTotal) : cartTotal;
    
    try {
      const transaction = await checkout(method as any, paid, customerInfo);
      setLastTransaction(transaction);
      setIsCheckoutSuccess(true);
      setAmountPaid("");
      setCustomerInfo({ name: "", phone: "", address: "" });
      setIsCartOpen(false);
      
      if (selectedPrinter) {
        PrinterService.printReceipt(transaction, storeProfile, receiptSettings).catch(e => {
          console.error("Auto-print failed:", e);
        });
      }
    } catch (e) {
      console.error("Checkout failed:", e);
      alert("Checkout failed. Please try again.");
    }
  };

  const handleAddServiceToCart = async (ticket: any) => {
    addToCart({
      id: `svc-fee-${ticket.id}`,
      name: `Servis: ${ticket.deviceModel}`,
      category: 'Service',
      price: ticket.serviceFee || 0,
      costPrice: 0,
      quantity: 1,
      technicianId: ticket.technicianId,
      serviceTicketId: ticket.id
    } as any);

    ticket.spareparts?.forEach((p: any) => {
      addToCart({ ...p, serviceTicketId: ticket.id });
    });

    try {
      await updateServiceTicket(ticket.id, { status: 'Delivered', dateClosed: Date.now() });
    } catch (e) {
      console.error("Failed to update service ticket status:", e);
    }
    
    // Auto fill customer data from service
    setCustomerInfo({
      name: ticket.customerName,
      phone: ticket.customerPhone,
      address: ""
    });
  };

  const handleCreateService = async () => {
    if (!newService.customerName || !newService.deviceModel) return;
    try {
      await addServiceTicket({
        ...newService,
        dateOpened: Date.now(),
        status: 'Pending',
        estimatedCost: 0,
        serviceFee: 0,
        spareparts: [],
        branchId: currentBranch?.id || 'b1'
      });
      setNewService({ customerName: "", customerPhone: "", deviceModel: "", deviceSerial: "", issue: "" });
      setIsServiceModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Failed to create service ticket");
    }
  };

  const stats = useMemo(() => {
    const branchTransactions = currentBranch 
      ? transactions.filter(tx => tx.branchId === currentBranch.id)
      : transactions;

    const revenue = branchTransactions.reduce((sum, tx) => sum + tx.total, 0);
    let totalCost = 0;
    branchTransactions.forEach(tx => {
      tx.items.forEach(item => {
        const invItem = inventory.find(i => i.id === (item.itemId || item.id));
        totalCost += (invItem?.costPrice || 0) * item.quantity;
      });
    });
    const profit = revenue - totalCost;
    return { revenue, profit, totalOrders: branchTransactions.length };
  }, [transactions, inventory, currentBranch]);

  const categoryStats = useMemo(() => {
    const catData: Record<string, number> = {};
    transactions.forEach(tx => {
      tx.items.forEach(item => {
        const catName = item.category || 'Uncategorized';
        catData[catName] = (catData[catName] || 0) + (item.price * item.quantity);
      });
    });
    return Object.entries(catData).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  if (canSeeReport && showReport) {
    return (
      <Layout title="Laporan & Analisis" requiredModule="Finance" requiredLevel="Read">
        <div className="space-y-6 animate-in fade-in duration-700 pb-20">
          <div className="flex justify-between items-center">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              <Card className="overflow-hidden border border-border/40">
                <CardContent>
                  <p className="ui-label mb-1">Total Pendapatan</p>
                  <h2 className="ui-stat-lg">{formatCurrency(stats.revenue)}</h2>
                </CardContent>
              </Card>
              <Card className="overflow-hidden bg-foreground text-background border-none">
                <CardContent>
                  <p className="ui-label text-background/60 mb-1">Estimasi Laba</p>
                  <h2 className="ui-stat-lg">{formatCurrency(stats.profit)}</h2>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border border-border/40">
                <CardContent>
                  <p className="ui-label mb-1">Total Transaksi</p>
                  <h2 className="ui-stat-lg">{stats.totalOrders} <span className="ui-caption not-">Transaksi</span></h2>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Interactive Area Chart */}
          <div className="w-full">
            <ChartAreaInteractive />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <Card className="overflow-hidden">
               <CardHeader className="flex flex-row items-center justify-between">
                 <CardTitle className="text-base font-black uppercase  flex items-center gap-3">
                   <PieChart className="h-5 w-5 text-foreground" /> Penjualan Per Kategori
                 </CardTitle>
               </CardHeader>
               <CardContent className="px-8 pb-8 pt-4">
                  <div className="space-y-6">
                    {categoryStats.map(([cat, revenue]) => {
                      const percentage = (revenue / stats.revenue) * 100;
                      return (
                        <div key={cat} className="space-y-2">
                          <div className="flex justify-between items-end">
                             <p className="ui-body-bold">{cat}</p>
                             <p className="ui-label">{formatCurrency(revenue)}</p>
                          </div>
                          <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                             <div className="h-full bg-foreground rounded-full" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
               </CardContent>
             </Card>

             <Card className="overflow-hidden">
                <CardContent className="flex flex-col items-center justify-center text-center space-y-6 h-full py-12">
                   <div className="h-16 w-16 rounded-2xl bg-muted/20 flex items-center justify-center">
                      <ShoppingCart className="h-8 w-8 text-foreground/20" />
                   </div>
                   <div>
                      <h3 className="ui-title">Mode Kasir (POS)</h3>
                      <p className="ui-caption mt-1 max-w-xs">Anda sedang melihat laporan. Gunakan tombol di bawah untuk beralih ke mode transaksi.</p>
                   </div>
                   <Button onClick={() => setShowReport(false)} className="rounded-xl px-8 font-medium text-sm h-11">
                      Buka Kasir <ArrowRight className="ml-2 h-4 w-4" />
                   </Button>
                </CardContent>
             </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Kasir Terpadu" requiredModule="Cashier" requiredLevel="Read">
      <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500">
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 gap-6">
          
          {/* Top Info & Search */}
          <div className="flex flex-col items-start px-2 gap-4">
            <div>
              <h2 className="text-xl font-black tracking-tight text-foreground/90 uppercase">Daftar Menu</h2>
              <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-0.5">Pilih produk atau jasa</p>
            </div>
            <div className="relative w-full md:w-80">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground/40" />
              </div>
              <input 
                placeholder="Cari produk, kategori, atau SKU..." 
                className="w-full pl-11 pr-10 h-12 bg-muted/20 border border-border/10 rounded-2xl text-sm focus:bg-card focus:ring-2 focus:ring-foreground/5 outline-none transition-all duration-300 shadow-sm font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery !== "" && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors duration-200"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs - Minimalist Style */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-border/5 px-2 py-1">
            {categories.map((cat: any) => {
              const isActive = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={cn(
                    "px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-200 whitespace-nowrap",
                    isActive 
                      ? "bg-foreground text-background shadow-lg shadow-foreground/10" 
                      : "bg-muted/30 text-muted-foreground/60 hover:bg-muted/50 hover:text-foreground/80"
                  )}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-2">
            <div className="pb-24">
          {(categories as any[]).find((c: any) => c.id === selectedCategoryId)?.name?.toLowerCase().includes('service') && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
               {/* Ready to Pick Up List */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 ml-2 flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3" /> Antrian Selesai
                  </h3>
                  {readyToPickUp.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-border/40 rounded-xl bg-muted/5">
                       <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground/10" />
                       <p className="text-[10px] font-medium text-muted-foreground/30">Belum ada servis siap ambil</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       {readyToPickUp.map(ticket => (
                         <Card key={ticket.id} className="border border-border/40 bg-card rounded-2xl shadow-sm transition-all overflow-hidden">
                            <CardContent className="p-0 flex flex-col">
                               <div className="bg-muted/30 p-3 border-b border-border/10 flex justify-between items-center">
                                  <span className="text-[9px] font-black text-primary uppercase tracking-wider">{ticket.id}</span>
                                  <Badge variant="outline" className="text-[8px] h-4 px-1.5 font-bold uppercase tracking-tighter bg-success/10 text-success border-none">Ready</Badge>
                               </div>
                               <div className="p-4 flex justify-between items-center">
                                 <div className="flex-1 pr-2">
                                    <h4 className="font-bold text-[12px] text-foreground/90">{ticket.deviceModel}</h4>
                                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{ticket.customerName}</p>
                                 </div>
                                 <Button size="sm" className="h-9 rounded-xl font-black text-[10px] px-5 uppercase tracking-widest bg-foreground text-background shadow-lg active:scale-95" onClick={() => handleAddServiceToCart(ticket)}>
                                    Ambil
                                  </Button>
                               </div>
                            </CardContent>
                         </Card>
                       ))}
                    </div>
                  )}
               </div>
            </div>
          )}

          {!(categories as any[]).find((c: any) => c.id === selectedCategoryId)?.name?.toLowerCase().includes('service') && (
            filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 pb-10">
                {filteredProducts.map((product) => (
                  <Card 
                    key={product.id} 
                    className="group relative overflow-hidden border border-border/20 bg-card rounded-xl shadow-sm active:scale-[0.98] cursor-pointer transition-all duration-300 hover:border-primary/20 hover:bg-muted/5"
                    onClick={() => addToCart(product as any)}
                  >
                    <div className="aspect-square bg-[#fbfbfb] flex items-center justify-center relative overflow-hidden group">
                       {product.image ? (
                         <img 
                           src={product.image} 
                           alt={product.name} 
                           className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                         />
                       ) : (
                         <div className="opacity-10 scale-100">
                           {product.categoryName === 'iPhone' && <Smartphone className="h-10 w-10" />}
                           {product.categoryName === 'MacBook' && <Laptop className="h-10 w-10" />}
                           {product.categoryName === 'iPad' && <Tablet className="h-10 w-10" />}
                           {product.categoryName === 'Sparepart' && <Wrench className="h-10 w-10" />}
                           {!['iPhone', 'MacBook', 'iPad', 'Sparepart'].includes(product.categoryName) && <Plus className="h-10 w-10" />}
                         </div>
                       )}
                       
                       {/* Stock Badge */}
                       <div className={cn(
                         "absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest backdrop-blur-md z-10",
                         product.stock > 5 ? "bg-background/90 text-muted-foreground border border-border/10" : 
                         product.stock > 0 ? "bg-warning text-warning-foreground" : 
                         "bg-destructive text-destructive-foreground"
                       )}>
                         {product.stock > 0 ? `Stock: ${product.stock}` : "Habis"}
                       </div>

                        {cart.some((i: any) => i.id === product.id) && (
                         <div className="absolute top-2 right-2 bg-foreground text-background p-1 rounded-full shadow-lg animate-in zoom-in spin-in z-10">
                           <Check className="h-2.5 w-2.5" />
                         </div>
                       )}
                    </div>
                    <CardContent className="p-3 space-y-2">
                      <div className="min-h-[2.8rem]">
                        <p className="text-[8px] font-bold text-primary/60 uppercase tracking-widest mb-0.5">{product.categoryName}</p>
                        <h4 className="font-bold text-[11px] line-clamp-2 leading-snug text-foreground/80">{product.name}</h4>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-foreground text-[11px] font-black tracking-tight">{formatCurrency(product.price)}</p>
                        <div className="h-7 w-7 rounded-lg bg-foreground text-background flex items-center justify-center shadow-sm active:scale-90 transition-all duration-300 group-hover:bg-primary">
                          <Plus className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center opacity-30">
                  <SearchX className="h-10 w-10 mb-4" />
                  <p className="ui-label ">Produk Kosong</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>

        {/* Floating Cart Section */}
        <div className="hidden lg:flex w-[320px] flex-col bg-card rounded-xl border border-border/40 overflow-hidden sticky top-0 h-full">
           <CartContentSection 
             cart={cart} 
             removeFromCart={removeFromCart} 
             updateCartQuantity={updateCartQuantity} 
             setCartItemTechnician={setCartItemTechnician}
             technicians={technicians}
             cartTotal={cartTotal}
             amountPaid={amountPaid}
             setAmountPaid={setAmountPaid}
             handleCheckout={handleCheckout}
             isCheckoutSuccess={isCheckoutSuccess}
             customerInfo={customerInfo}
             setCustomerInfo={setCustomerInfo}
             paymentMethod={paymentMethod}
             setPaymentMethod={setPaymentMethod}
           />

        </div>

        {/* Mobile Floating Cart Button */}
        <div className="lg:hidden fixed bottom-6 left-6 right-6 z-50">
           <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger asChild>
                <Button className="w-full h-14 rounded-lg shadow-sm ui-badge flex justify-between px-8">
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="h-5 w-5" />
                    <span>{cart.length} Pesanan</span>
                  </div>
                  <div className="bg-primary-foreground/20 px-3 py-1 rounded-md text-xs">
                    {formatCurrency(cartTotal)}
                  </div>
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[95vh] rounded-t-2xl p-0 border-none bg-card">
                 <SheetHeader className="sr-only">
                    <SheetTitle>Keranjang Belanja</SheetTitle>
                    <SheetDescription>Daftar produk yang akan dibeli.</SheetDescription>
                 </SheetHeader>
                 <div className="h-full flex flex-col">
                    <div className="flex justify-center pt-2 pb-1">
                      <div className="w-12 h-1.5 bg-muted rounded-full"></div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                       <CartContentSection 
                         cart={cart} 
                         removeFromCart={removeFromCart} 
                         updateCartQuantity={updateCartQuantity} 
                         setCartItemTechnician={setCartItemTechnician}
                         technicians={technicians}
                         cartTotal={cartTotal}
                         amountPaid={amountPaid}
                         setAmountPaid={setAmountPaid}
                         handleCheckout={handleCheckout}
                         isCheckoutSuccess={isCheckoutSuccess}
                         customerInfo={customerInfo}
                         setCustomerInfo={setCustomerInfo}
                         paymentMethod={paymentMethod}
                         setPaymentMethod={setPaymentMethod}
                       />

                    </div>
                 </div>
              </SheetContent>
           </Sheet>
        </div>
        {/* Mobile Navbar Spacing */}
        <div className="h-20 lg:hidden" />
      </div>

      <CheckoutSuccessDialog 
        isOpen={isCheckoutSuccess} 
        onOpenChange={setIsCheckoutSuccess}
        transaction={lastTransaction}
        storeProfile={storeProfile}
        receiptSettings={receiptSettings}
        onClose={() => {
          setIsCheckoutSuccess(false);
          setLastTransaction(null);
        }}
      />
    </Layout>
  );
}

function CartContentSection({ 
  cart, removeFromCart, updateCartQuantity, setCartItemTechnician, technicians, cartTotal, 
  amountPaid, setAmountPaid, handleCheckout, isCheckoutSuccess,
  customerInfo, setCustomerInfo, paymentMethod, setPaymentMethod
}: any) {

  return (
    <div className="h-full flex flex-col">
      <div className="p-5 border-b border-border/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="ui-title">Pesanan Baru</h2>
        </div>
        <Badge variant="outline" className="rounded-full border-border text-foreground ui-label px-3 py-0.5">
          {cart.reduce((s: any, i: any) => s + i.quantity, 0)} Produk
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
        {/* Customer Info Section - Professional Style */}
        <div className="space-y-3">
           <div className="space-y-1">
              <label className="ui-label ml-1">Pelanggan</label>
              <Input 
                placeholder="Nama Pelanggan..." 
                className="h-9"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
              />
           </div>
           <div className="space-y-1">
              <label className="ui-label ml-1">WhatsApp</label>
              <Input 
                placeholder="62812..." 
                className="h-9"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
              />
           </div>
           <div className="space-y-1">
              <label className="ui-label ml-1">Alamat</label>
              <Input 
                placeholder="Alamat Lengkap..." 
                className="h-9"
                value={customerInfo.address}
                onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
              />
           </div>
        </div>

        {/* Cart Items */}
        <div className="space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-10">
              <Smartphone className="h-8 w-8 mb-4" />
              <p className="ui-label">Keranjang Kosong</p>
            </div>
          ) : (
             cart.map((item: any) => (
               <div key={item.id} className="flex gap-3 animate-in slide-in-from-right-2">
                 <div className="h-16 w-16 rounded-[18px] bg-muted/40 border border-border/10 overflow-hidden shrink-0 flex items-center justify-center p-2">
                    {item.image ? (
                      <img src={item.image} className="max-w-full max-h-full object-contain drop-shadow-md" />
                    ) : (
                      <Smartphone className="h-full w-full p-2 opacity-20" />
                    )}
                 </div>
                 <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                       <h5 className="text-[11px] font-bold leading-tight truncate pr-2">{item.name}</h5>
                       <button onClick={() => removeFromCart(item.id)}>
                         <X className="h-3 w-3 text-muted-foreground/30 hover:text-destructive transition-colors" />
                       </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-0.5">
                          <button className="h-5 w-5 flex items-center justify-center hover:bg-white rounded-md transition-all shadow-sm" onClick={() => updateCartQuantity(item.id, item.quantity - 1)}>
                            <Minus className="h-2 w-2" />
                          </button>
                          <span className="text-[10px] font-bold min-w-[12px] text-center">{item.quantity}</span>
                          <button className="h-5 w-5 flex items-center justify-center hover:bg-white rounded-md transition-all shadow-sm text-primary" onClick={() => updateCartQuantity(item.id, item.quantity + 1)}>
                            <Plus className="h-2 w-2" />
                          </button>
                       </div>
                       <p className="text-[11px] font-bold text-foreground/80">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                 </div>
               </div>
             ))
          )}
        </div>
      </div>

      <div className="p-5 border-t border-border/10 bg-muted/5 space-y-4">
        <div className="space-y-2">
           <div className="flex justify-between items-center opacity-60">
             <p className="ui-label">Sub Total</p>
             <p className="ui-caption font-bold">{formatCurrency(cartTotal)}</p>
           </div>
           <div className="flex justify-between items-center">
             <p className="ui-label">Total Tagihan</p>
             <p className="ui-stat" style={{fontSize: 'var(--text-lg)'}}>{formatCurrency(cartTotal)}</p>
           </div>
        </div>
 
        {cart.length > 0 && (
           <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <PaymentButton 
                  icon={Wallet} 
                  label="CASH" 
                  onClick={() => setPaymentMethod('Cash')} 
                  active={paymentMethod === 'Cash'} 
                />
                <PaymentButton 
                  icon={CreditCard} 
                  label="CARD" 
                  onClick={() => setPaymentMethod('Card')} 
                  active={paymentMethod === 'Card'} 
                />
                <PaymentButton 
                  icon={CheckCircle2} 
                  label="QRIS" 
                  onClick={() => setPaymentMethod('QRIS')} 
                  active={paymentMethod === 'QRIS'} 
                />
              </div>

              {paymentMethod === 'Cash' && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <Label className="ui-meta mb-1.5 block ml-1">Nominal Bayar (Tunai)</Label>
                  <Input 
                    type="number" 
                    placeholder="Masukkan nominal..." 
                    className="h-10 bg-white border-border/20 text-right text-sm font-bold rounded-xl shadow-sm"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                  />
                  <div className="flex gap-1 mt-2 overflow-x-auto no-scrollbar pb-1">
                    {[cartTotal, 50000, 100000].map(val => (
                      <Button key={val} variant="outline" className="h-7 text-[10px] rounded-lg px-2" onClick={() => setAmountPaid(val.toString())}>
                        {val === cartTotal ? 'Uang Pas' : formatCurrency(val)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
           </div>
        )}
 
        <Button 
          className={cn(
            "w-full h-12 ui-badge rounded-2xl transition-all shadow-lg active:scale-[0.98]",
            isCheckoutSuccess ? "bg-muted text-foreground hover:bg-muted/90" : "bg-foreground text-background hover:bg-foreground/90"
          )}
          onClick={() => handleCheckout(paymentMethod)}
          disabled={cart.length === 0 || isCheckoutSuccess}
        >
          {isCheckoutSuccess ? "TRANSAKSI BERHASIL" : `BAYAR ${paymentMethod.toUpperCase()}`}
        </Button>

      </div>
    </div>
  );
}

function PaymentButton({ icon: Icon, label, onClick, disabled, active = false }: any) {
  return (
    <Button 
      variant={active ? "default" : "outline"} 
      className={cn(
        "flex-col h-14 rounded-2xl gap-1 ui-label border-border/20 transition-all shadow-sm",
        active ? "bg-foreground text-background shadow-md border-none" : "bg-card hover:border-foreground/20"
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className={cn("h-4 w-4 mb-0.5", active ? "opacity-100" : "opacity-60")} />
      {label}
    </Button>
  );
}


function CheckoutSuccessDialog({ 
  isOpen, 
  onOpenChange, 
  transaction, 
  onClose,
  storeProfile,
  receiptSettings
}: { 
  isOpen: boolean; 
  onOpenChange: (v: boolean) => void; 
  transaction: any; 
  onClose: () => void;
  storeProfile: any;
  receiptSettings: any;
}) {
  if (!transaction) return null;

  const handleShareWA = () => {
    const itemsText = transaction.items.map((i: any) => 
      `- ${i.name} (${i.quantity}x)${i.warranty ? ' [Garansi: ' + i.warranty + ']' : ''}`
    ).join('%0A');
    const text = `*STRUK PEMBELIAN ${storeProfile.name?.toUpperCase()}*%0A%0A` +
      `Halo *${transaction.customerName || 'Pelanggan'}*, terima kasih telah berbelanja.%0A%0A` +
      `*Detail Pesanan:*%0A${itemsText}%0A%0A` +
      `*Total: ${formatCurrency(transaction.total)}*%0A%0A` +
      `Simpan struk ini sebagai bukti garansi. Terimakasih!`;
    
    window.open(`https://wa.me/${transaction.customerPhone}?text=${text}`, '_blank');
  };

  const handlePrint = async () => {
    try {
      if (PrinterService.isConnected()) {
        await PrinterService.printReceipt(transaction, storeProfile, receiptSettings);
      } else {
        // Fallback: Browser Print
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          const receiptText = PrinterService.formatReceiptPlain(transaction, storeProfile, receiptSettings);
          printWindow.document.write(`<pre style="font-family: monospace; font-size: 12px; white-space: pre-wrap;">${receiptText}</pre>`);
          printWindow.document.close();
          printWindow.print();
        }
      }
    } catch (e: any) {
      alert(e.message || "Gagal mencetak struk");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
        <div className="bg-foreground p-10 text-background text-center space-y-4">
           <div className="h-20 w-20 bg-background/10 rounded-full flex items-center justify-center mx-auto mb-2 animate-in zoom-in duration-500">
              <CheckCircle2 className="h-10 w-10 text-background" />
           </div>
           <div>
              <h2 className="ui-heading text-background text-2xl">Transaksi Berhasil!</h2>
              <p className="ui-caption text-background/60 mt-1 uppercase tracking-widest">Transaksi #{transaction.id?.slice(-8).toUpperCase()}</p>
           </div>
           <div className="py-4 border-y border-background/10">
              <p className="ui-label text-background/40 mb-1">Total Pembayaran</p>
              <p className="text-3xl font-black">{formatCurrency(transaction.total)}</p>
           </div>
        </div>
        
        <div className="p-8 space-y-4">
           <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-14 rounded-2xl flex-col gap-1 ui-label border-border/40 hover:bg-muted"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4 opacity-40" />
                <span>Cetak Struk</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-14 rounded-2xl flex-col gap-1 ui-label border-border/40 hover:bg-muted"
                onClick={handleShareWA}
                disabled={!transaction.customerPhone}
              >
                <Share2 className="h-4 w-4 opacity-40 text-emerald-600" />
                <span>Kirim WA</span>
              </Button>
           </div>
           
           <Button 
             className="w-full h-14 rounded-2xl bg-foreground text-background ui-badge shadow-xl active:scale-[0.98]"
             onClick={onClose}
           >
              SELESAI & BARU
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
