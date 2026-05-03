"use client";
import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { usePosStore } from "@/lib/store";
import { formatCurrency, cn } from "@/lib/utils";
import { 
 Package, 
  ArrowUpRight, Activity, Calendar as MapPin
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from "date-fns";

export default function LaporanDashboard() {
  const { transactions, inventory, currentBranch, branches, setBranch, currentUser } = usePosStore();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const filteredTransactions = useMemo(() => {
    let result = transactions;
    
    // Filter by branch
    if (currentBranch) {
      result = result.filter(tx => tx.branchId === currentBranch.id);
    }

    if (!dateRange) return result;
    return result.filter(tx => {
      const txDate = new Date(tx.date).toLocaleDateString('en-CA');
      const from = dateRange.from.toLocaleDateString('en-CA');
      const to = dateRange.to.toLocaleDateString('en-CA');
      return txDate >= from && txDate <= to;
    });
  }, [transactions, dateRange, currentBranch]);

  const stats = useMemo(() => {
    const revenue = filteredTransactions.reduce((sum, tx) => sum + Number(tx.total), 0);
    let totalCost = 0;
    filteredTransactions.forEach(tx => {
      if (tx.status !== 'SUCCESS') return;
      tx.items.forEach(item => {
        const invItem = inventory.find(i => i.id === (item.itemId || item.id));
        totalCost += Number(invItem?.costPrice || 0) * item.quantity;
      });
    });
    const profit = revenue - totalCost;
    const roi = totalCost > 0 ? (profit / totalCost) : 0;
    const efficiency = revenue > 0 ? (profit / revenue) * 100 : 0;
    
    return { 
      revenue, 
      profit, 
      roi,
      efficiency,
      totalOrders: filteredTransactions.filter(t => t.status === 'SUCCESS').length 
    };
  }, [filteredTransactions, inventory]);

  // Chart Data: Revenue Trend based on filtered transactions
  const chartData = useMemo(() => {
    const days: Record<string, number> = {};
    
    // If no range, default to last 7 days
    const start = dateRange?.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = dateRange?.to || new Date();
    
    // Fill gaps
    let curr = new Date(start);
    while (curr <= end) {
      days[curr.toISOString().split('T')[0]] = 0;
      curr.setDate(curr.getDate() + 1);
    }
    
    filteredTransactions.forEach(tx => {
      if (tx.status !== 'SUCCESS') return;
      const day = new Date(tx.date).toISOString().split('T')[0];
      if (days[day] !== undefined) {
        days[day] += Number(tx.total);
      }
    });

    return Object.entries(days).map(([name, total]) => ({
      name: new Date(name).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
      total
    })).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
  }, [filteredTransactions, dateRange]);

  // Chart Data: Categories
  const categoryChartData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredTransactions.forEach(tx => {
      if (tx.status !== 'SUCCESS') return;
      tx.items.forEach(item => {
        const cat = item.category?.trim();
        if (!cat) return; // skip item tanpa kategori
        data[cat] = (data[cat] || 0) + (Number(item.price) * item.quantity);
      });
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const COLORS = [
    '#06b6d4', // cyan/teal
    '#6366f1', // indigo
    '#f59e0b', // amber
    '#10b981', // emerald
    '#ef4444', // red
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#f97316', // orange
  ];

  return (
    <Layout title="Laporan & Keuangan" requiredModule="Finance" requiredLevel="Read">
      <div className="animate-in fade-in duration-700 pb-24 space-y-6">
        
        {/* Filter Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/30 p-4 rounded-2xl border border-border/10">
          <div className="flex items-center gap-3">
             { (currentUser?.role?.name === 'Owner') && (
                <Select 
                  value={currentBranch?.id || 'global'} 
                  onValueChange={(value) => setBranch(value === 'global' ? null : value)}
                >
                  <SelectTrigger className="h-10 w-[180px] rounded-xl bg-card border border-border/40 ui-label uppercase tracking-widest focus:ring-0">
                    <MapPin className="h-4 w-4 mr-2 text-primary" />
                    <SelectValue placeholder="Cabang" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40 shadow-2xl">
                    <SelectItem value="global" className="ui-label uppercase py-3">Global</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id} className="ui-label uppercase py-3">
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             )}
             <DateRangePicker onRangeChange={setDateRange} />
          </div>
        </div>
        {/* Main Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card className="border border-border/40 bg-card p-6 flex flex-col justify-between h-40 group hover:border-foreground/20 transition-all">
             <div>
                <div className="mb-2">
                   <span className="ui-label text-muted-foreground font-bold uppercase tracking-widest">Total Pendapatan</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">{formatCurrency(stats.revenue)}</h2>
             </div>
             <div className="flex items-center gap-2">
                <ArrowUpRight className="h-3 w-3" />
                <span className="text-[10px] font-bold">+12.5% vs periode lalu</span>
             </div>
          </Card>

          <Card className="border border-border/40 bg-card p-6 flex flex-col justify-between h-40 group hover:border-foreground/20 transition-all">
             <div>
                <div className="mb-2">
                   <span className="ui-label text-muted-foreground font-bold uppercase tracking-widest">Laba Kotor</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight ">{formatCurrency(stats.profit)}</h2>
             </div>
             <div className="flex items-center gap-2">
                <Activity className="h-3 w-3" />
                <span className="text-[10px] font-bold">Margin: {((stats.profit / (stats.revenue || 1)) * 100).toFixed(1)}%</span>
             </div>
          </Card>

          <Card className="border border-border/40 bg-card p-6 flex flex-col justify-between h-40 group hover:border-foreground/20 transition-all">
             <div>
                <div className="mb-2">
                   <span className="ui-label text-muted-foreground font-bold uppercase tracking-widest">Total Transaksi</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">{stats.totalOrders} <span className="text-xs font-bold opacity-30 uppercase ml-1">Transaksi</span></h2>
             </div>
             <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="h-3 w-3" />
                <span className="text-[10px] font-bold">Rerata: {formatCurrency(stats.revenue / (stats.totalOrders || 1))}</span>
             </div>
          </Card>
        </div>

        {/* Chart Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Area Chart */}
          <Card className="lg:col-span-2 border border-border/40 bg-card overflow-hidden">
             <div className="p-6 pb-0">
                <h3 className="ui-label text-foreground font-bold mb-1 uppercase tracking-widest">Tren Pendapatan</h3>
                <p className="ui-meta text-[10px]">Performa periode terpilih</p>
             </div>
             <div className="h-[300px] w-full p-4 relative">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                         <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#18181b" stopOpacity={0.05}/>
                            <stop offset="95%" stopColor="#18181b" stopOpacity={0}/>
                         </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 9, fontWeight: 700, fill: '#a1a1aa'}} 
                        dy={10}
                      />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                        formatter={(value: any) => [formatCurrency(value), 'Pendapatan']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#18181b" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorTotal)" 
                        animationDuration={1500}
                      />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </Card>

          {/* Category Pie Chart */}
          <Card className="border border-border/40 bg-card overflow-hidden">
             <div className="p-6 pb-0">
                <h3 className="ui-label text-foreground font-bold mb-1 uppercase tracking-widest">Distribusi Kategori</h3>
                <p className="ui-meta text-[10px]">Pendapatan per Kategori</p>
             </div>
             <div className="h-[240px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        animationDuration={1500}
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => [formatCurrency(value), 'Pendapatan']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', fontSize: '11px' }}
                      />
                   </PieChart>
                </ResponsiveContainer>
             </div>
             <div className="px-6 pb-6 space-y-2">
                {categoryChartData.slice(0, 4).map((cat, idx) => (
                  <div key={cat.name} className="flex items-center justify-between border-b border-border/5 pb-1 last:border-0">
                     <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <span className="text-xs font-medium text-muted-foreground">{cat.name}</span>
                     </div>
                     <span className="text-xs font-bold text-foreground">{((cat.value / (stats.revenue || 1)) * 100).toFixed(1)}%</span>
                  </div>
                ))}
             </div>
          </Card>
        </div>

        {/* Bottom Details Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Card className="border border-border/40 bg-card p-6">
              <h3 className="ui-label text-foreground font-bold mb-5 uppercase tracking-widest">Produk Terlaris</h3>
              <div className="space-y-4">
                 {filteredTransactions.flatMap(tx => tx.items)
                   .reduce((acc, item) => {
                     const existing = acc.find(i => i.id === item.id);
                     if (existing) existing.qty += item.quantity;
                     else acc.push({ id: item.id, name: item.name, qty: item.quantity });
                     return acc;
                   }, [] as {id: string, name: string, qty: number}[])
                   .sort((a,b) => b.qty - a.qty)
                   .slice(0, 6)
                   .map((item, idx) => (
                     <div key={idx} className="flex items-center justify-between group border-b border-border/5 pb-2 last:border-0">
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] font-bold text-muted-foreground/30 w-4">0{idx+1}</span>
                           <span className="text-[12px] font-medium text-foreground">{item.name}</span>
                        </div>
                        <span className="text-[11px] font-bold text-foreground">{item.qty} unit</span>
                     </div>
                   ))}
              </div>
           </Card>


        </div>

      </div>
    </Layout>
  );
}
