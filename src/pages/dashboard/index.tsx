"use client";
import { useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/card";
import { usePosStore } from "@/lib/store";
import { formatCurrency, cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import { 
  ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, Cell, AreaChart, Area, CartesianGrid
} from 'recharts';
import { Badge } from "@/components/ui/badge";

export default function AdminMonitoringDashboard() {
  const { transactions, inventory, users, branches, attendances, currentBranch, setBranch } = usePosStore();

  const filteredTransactions = useMemo(() => {
    if (!currentBranch) return transactions;
    return transactions.filter(tx => tx.branchId === currentBranch.id);
  }, [transactions, currentBranch]);

  const filteredAttendances = useMemo(() => {
    if (!currentBranch) return attendances;
    return attendances.filter(a => a.branchId === currentBranch.id);
  }, [attendances, currentBranch]);

  const filteredUsers = useMemo(() => {
    if (!currentBranch) return users;
    return users.filter(u => u.branchId === currentBranch.id);
  }, [users, currentBranch]);

  const attendanceStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayAttendances = filteredAttendances.filter(a => a.date === today);
    return {
      checkIn: todayAttendances.filter(a => a.checkInTime).length,
      checkOut: todayAttendances.filter(a => !!a.checkOutTime).length
    };
  }, [filteredAttendances]);

  const stats = useMemo(() => {
    const revenue = filteredTransactions.reduce((sum, tx) => sum + tx.total, 0);
    let totalCost = 0;
    filteredTransactions.forEach(tx => {
      tx.items.forEach(item => {
        const invItem = inventory.find(i => i.id === (item.itemId || item.id));
        totalCost += (invItem?.costPrice || 0) * item.quantity;
      });
    });
    const profit = revenue - totalCost;
    return { 
      revenue, 
      profit, 
      totalOrders: filteredTransactions.length,
      staffCount: filteredUsers.length
    };
  }, [filteredTransactions, inventory, filteredUsers]);

  const topBranchData = useMemo(() => {
    const branchRev: Record<string, number> = {};
    filteredTransactions.forEach(tx => {
      branchRev[tx.branchId] = (branchRev[tx.branchId] || 0) + tx.total;
    });
    return Object.entries(branchRev)
      .map(([id, rev]) => ({ 
        name: branches.find(b => b.id === id)?.name || id, 
        revenue: rev 
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredTransactions, branches]);

  const topCategories = useMemo(() => {
    const catData: Record<string, number> = {};
    filteredTransactions.forEach(tx => {
      tx.items.forEach(item => {
        const catName = item.category || 'Uncategorized';
        catData[catName] = (catData[catName] || 0) + (item.price * item.quantity);
      });
    });
    return Object.entries(catData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredTransactions]);

  const topProducts = useMemo(() => {
    const prodData: Record<string, number> = {};
    filteredTransactions.forEach(tx => {
      tx.items.forEach(item => {
        prodData[item.name] = (prodData[item.name] || 0) + (item.price * item.quantity);
      });
    });
    return Object.entries(prodData)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredTransactions]);

  const revenueHistory = useMemo(() => {
    const history: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      history[d.toISOString().split('T')[0]] = 0;
    }

    filteredTransactions.forEach(tx => {
      const date = new Date(tx.date).toISOString().split('T')[0];
      if (history[date] !== undefined) {
        history[date] += tx.total;
      }
    });

    return Object.entries(history).map(([date, revenue]) => ({
      date: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      revenue
    }));
  }, [filteredTransactions]);

  return (
    <Layout title="Monitoring" requiredModule="Finance" requiredLevel="Read">
      <div className="flex justify-between items-center mb-4 gap-2">
         <select 
           value={currentBranch?.id || ""} 
           onChange={(e) => setBranch(e.target.value || null)}
           className="bg-card border border-border/40 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-tight focus:outline-none focus:ring-2 focus:ring-primary/20"
         >
           <option value="">Semua Cabang</option>
           {branches.map(b => (
             <option key={b.id} value={b.id}>{b.name}</option>
           ))}
         </select>
      </div>
      <div className="space-y-2 md:space-y-4 animate-in fade-in duration-500 pb-20">
        
        {/* Compact Hero Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
          <StatCard label="Omset" value={formatCurrency(stats.revenue)} trend="+12%" color="primary" />
          <StatCard label="Laba" value={formatCurrency(stats.profit)} trend="+8%" color="primary" />
          <StatCard label="Transaksi" value={stats.totalOrders} trend="+24" color="primary" />
          <StatCard label="Staf" value={stats.staffCount} trend="Aktif" color="primary" />
        </div>

        {/* Compact Attendance */}
        <div className="grid grid-cols-2 gap-2 md:gap-3">
           <Card className="p-3 md:p-4 rounded-xl border border-border/40">
              <p className="text-[8px] uppercase font-bold  mb-1">Masuk</p>
              <h2 className="text-base md:text-xl font-black">{attendanceStats.checkIn} <span className="text-[9px] opacity-40">Staf</span></h2>
           </Card>
           <Card className="p-3 md:p-4 rounded-xl border border-border/40 ">
              <p className="text-[8px] uppercase font-bold  mb-1">Pulang</p>
              <h2 className="text-base md:text-xl font-black">{attendanceStats.checkOut} <span className="text-[9px] opacity-40">Staf</span></h2>
           </Card>
        </div>

        {/* Revenue Trend Chart */}
        <Card className="p-3 md:p-4 rounded-xl border border-border/40 bg-card overflow-hidden">
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-[9px] font-black uppercase tracking-widest">Tren Pendapatan (7 Hari)</h3>
              <Badge variant="secondary" className="text-[8px] font-black">{formatCurrency(stats.revenue)}</Badge>
           </div>
           <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={revenueHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                       <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                    <Tooltip 
                       content={({ active, payload }) => active && payload?.length ? (
                          <div className="bg-foreground text-background p-2 rounded-lg text-[9px] font-black shadow-xl">
                             {formatCurrency(payload[0].value as number)}
                          </div>
                       ) : null}
                    />
                    <Area 
                       type="monotone" 
                       dataKey="revenue" 
                       stroke="hsl(var(--primary))" 
                       strokeWidth={3}
                       fillOpacity={1} 
                       fill="url(#colorRev)" 
                    />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </Card>

        <div className={cn("grid gap-2 md:gap-3", currentBranch ? "grid-cols-2" : "grid-cols-3")}>
           {!currentBranch && (
              <Card className="p-3 md:p-4 rounded-xl border border-border/40 bg-card">
                 <h3 className="text-[9px] font-black uppercase tracking-widest mb-3">Cabang Teratas</h3>
                 <div className="h-[120px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={topBranchData} layout="vertical" margin={{ left: -25, right: 10 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 7, fontWeight: 700 }} width={60} />
                          <Tooltip cursor={{ fill: 'transparent' }} content={({ active, payload }) => (
                            active && payload?.length ? (
                              <div className="bg-foreground text-background p-1.5 rounded-md text-[8px] font-black">{formatCurrency(payload[0].value as number)}</div>
                            ) : null
                          )} />
                          <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={14}>
                             {topBranchData.map((_, i) => <Cell key={i} fill={i === 0 ? 'hsl(var(--primary))' : 'hsl(var(--primary)/0.2)'} />)}
                          </Bar>
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </Card>
           )}

           {/* Kategori Terlaris */}
           <Card className="p-3 md:p-4 rounded-xl border border-border/40 bg-card">
              <h3 className="text-[9px] font-black uppercase tracking-widest mb-3">Kategori</h3>
              <div className="space-y-2.5">
                 {topCategories.map((cat, idx) => (
                    <div key={idx} className="space-y-1">
                       <div className="flex justify-between text-[9px] font-bold">
                          <span className="truncate pr-2">{cat.name}</span>
                          <span className="opacity-40">{formatCurrency(cat.value)}</span>
                       </div>
                       <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${(cat.value / (stats.revenue || 1)) * 100}%` }} />
                       </div>
                    </div>
                 ))}
              </div>
           </Card>

           {/* Produk Terlaris */}
           <Card className="p-3 md:p-4 rounded-xl border border-border/40 bg-card">
              <h3 className="text-[9px] font-black uppercase tracking-widest mb-3">Produk Terlaris</h3>
              <div className="space-y-2">
                 {topProducts.map((prod, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1 border-b border-border/5 last:border-0">
                       <span className="text-[9px] font-bold truncate pr-2">{idx + 1}. {prod.name}</span>
                       <span className="text-[9px] font-black text-primary shrink-0">{formatCurrency(prod.revenue)}</span>
                    </div>
                 ))}
              </div>
           </Card>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ label, value, trend, color }: any) {
  const colors: any = {
    primary: "text-primary",
    indigo: "text-indigo-500",
    amber: "text-amber-500",
  };

  return (
    <Card className="p-3 md:p-4 rounded-xl border border-border/40 bg-card">
      <div className="flex justify-between items-center mb-1">
        <p className="text-[8px] uppercase font-bold text-muted-foreground/60 tracking-tighter">{label}</p>
        <div className={cn("flex items-center gap-0.5 text-[8px] font-black", colors[color])}>
           {trend.includes('+') && <ArrowUpRight className="h-2 w-2" />}
           {trend}
        </div>
      </div>
      <h2 className="text-[10px] md:text-xs font-black truncate">{value}</h2>
    </Card>
  );
}
