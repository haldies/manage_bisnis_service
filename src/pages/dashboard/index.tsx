"use client";
import { useMemo, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/card";
import { usePosStore } from "@/lib/store";
import { formatCurrency, cn } from "@/lib/utils";
import { TrendingUp, Users, ShoppingBag, Banknote, UserCheck, UserMinus } from "lucide-react";
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip,
  AreaChart, Area, CartesianGrid
} from 'recharts';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from "date-fns";

export default function AdminMonitoringDashboard() {
  const { transactions, inventory, users, branches, attendances, currentBranch, setBranch } = usePosStore();

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const filteredTransactions = useMemo(() => {
    let list = currentBranch
      ? transactions.filter(tx => tx.branchId === currentBranch.id)
      : transactions;

    return list.filter(tx =>
      isWithinInterval(new Date(tx.date), {
        start: startOfDay(dateRange.from),
        end: endOfDay(dateRange.to),
      })
    );
  }, [transactions, currentBranch, dateRange]);

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
      checkOut: todayAttendances.filter(a => !!a.checkOutTime).length,
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
    return {
      revenue,
      profit: revenue - totalCost,
      totalOrders: filteredTransactions.length,
      staffCount: filteredUsers.length,
    };
  }, [filteredTransactions, inventory, filteredUsers]);

  const topCategories = useMemo(() => {
    const catData: Record<string, number> = {};
    filteredTransactions.forEach(tx => {
      tx.items.forEach(item => {
        const catName = item.category?.trim();
        if (!catName) return;
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
    // Build day-by-day map for the selected range
    const history: Record<string, number> = {};
    const from = startOfDay(dateRange.from);
    const to = endOfDay(dateRange.to);
    const diffDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    // Cap at 31 days for readability
    const days = Math.min(diffDays + 1, 31);
    for (let i = 0; i < days; i++) {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      history[d.toISOString().split('T')[0]] = 0;
    }
    filteredTransactions.forEach(tx => {
      const date = new Date(tx.date).toISOString().split('T')[0];
      if (history[date] !== undefined) history[date] += tx.total;
    });
    return Object.entries(history).map(([date, revenue]) => ({
      date: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      revenue,
    }));
  }, [filteredTransactions, dateRange]);

  const maxRevenue = Math.max(...revenueHistory.map(d => d.revenue), 1);

  const formatYAxis = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}jt`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`;
    return `${value}`;
  };

  return (
    <Layout title="Monitoring" requiredModule="Finance" requiredLevel="Read">
      <div className="space-y-5 animate-in fade-in duration-500 pb-20">

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={currentBranch?.id || "all"} onValueChange={(v) => setBranch(v === "all" ? null : v)}>
            <SelectTrigger className="w-full sm:w-48 h-10">
              <SelectValue placeholder="Semua Cabang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Cabang</SelectItem>
              {branches.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DateRangePicker
            className="w-full sm:w-auto"
            onRangeChange={(range) => range && setDateRange(range)}
          />
        </div>

        {/* KPI Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Omset"
            value={formatCurrency(stats.revenue)}
            icon={Banknote}
            sub="Total pendapatan"
          />
          <StatCard
            label="Laba Bersih"
            value={formatCurrency(stats.profit)}
            icon={TrendingUp}
            sub="Estimasi laba"
          />
          <StatCard
            label="Transaksi"
            value={stats.totalOrders.toString()}
            icon={ShoppingBag}
            sub="Total transaksi"
          />
          <StatCard
            label="Staf"
            value={stats.staffCount.toString()}
            icon={Users}
            sub="Staf aktif"
          />
        </div>

        {/* Attendance */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <UserCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Masuk Hari Ini</p>
              <p className="text-2xl font-black leading-tight">{attendanceStats.checkIn}
                <span className="text-sm font-medium text-muted-foreground ml-1">staf</span>
              </p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <UserMinus className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Pulang Hari Ini</p>
              <p className="text-2xl font-black leading-tight">{attendanceStats.checkOut}
                <span className="text-sm font-medium text-muted-foreground ml-1">staf</span>
              </p>
            </div>
          </Card>
        </div>

        {/* Revenue Chart */}
        <Card className="p-5">
          <div className="flex justify-between items-start mb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tren Pendapatan</p>
              <p className="text-xl font-black mt-0.5">{formatCurrency(stats.revenue)}</p>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
              {revenueHistory.length} hari
            </span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueHistory} margin={{ top: 5, right: 5, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.08} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={formatYAxis}
                  width={40}
                />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="bg-foreground text-background px-3 py-2 rounded-lg text-xs font-bold shadow-xl">
                        {formatCurrency(payload[0].value as number)}
                      </div>
                    ) : null
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Kategori & Produk — full width stacked */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

          {/* Kategori */}
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Kategori Terlaris</p>
            <div className="space-y-3">
              {topCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada data</p>
              ) : topCategories.map((cat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">{cat.name}</span>
                    <span className="text-sm font-bold">{formatCurrency(cat.value)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${(cat.value / (stats.revenue || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Produk */}
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Produk Terlaris</p>
            <div className="space-y-1">
              {topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada data</p>
              ) : topProducts.map((prod, idx) => (
                <div key={idx} className="flex items-center gap-3 py-2 border-b border-border/10 last:border-0">
                  <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{idx + 1}</span>
                  <span className="text-sm font-medium flex-1 min-w-0 truncate">{prod.name}</span>
                  <span className="text-sm font-bold shrink-0">{formatCurrency(prod.revenue)}</span>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </div>
    </Layout>
  );
}

function StatCard({ label, value, icon: Icon, sub }: {
  label: string;
  value: string;
  icon: any;
  sub: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <p className="text-xl font-black leading-tight truncate">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </Card>
  );
}
