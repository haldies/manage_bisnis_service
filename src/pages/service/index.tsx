"use client";
import { useState, useMemo, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  Plus, Search, Settings2, Wrench, Clock, CheckCircle2,
  Package, ArrowRight,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePosStore } from "@/lib/store";
import { ServiceTicket } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";

import RegisterServiceDialog from "../../components/service/RegisterServiceDialog";
import ServiceDetailDialog from "../../components/service/ServiceDetailDialog";
import ServiceTable from "../../components/service/ServiceTable";
import PickupDialog from "../../components/service/PickupDialog";

// ─── Tab definitions ─────────────────────────────────────────────────────────

/** Tabs untuk kasir / admin / manager — full pipeline */
const CASHIER_TABS = [
  { value: 'masuk',      label: 'Masuk',       statuses: ['Pending'],                 color: 'bg-amber-500' },
  { value: 'proses',     label: 'Proses',       statuses: ['InProgress'],              color: 'bg-blue-500' },
  { value: 'tertunda',   label: 'Tertunda',     statuses: ['OnHold'],                  color: 'bg-orange-500' },
  { value: 'siap-ambil', label: 'Siap Diambil', statuses: ['ReadyForPickup'],          color: 'bg-emerald-500' },
  { value: 'selesai',    label: 'Selesai',      statuses: ['Completed'],               color: 'bg-violet-500' },
  { value: 'riwayat',    label: 'Return/Batal', statuses: ['Returned', 'Cancelled'],   color: 'bg-muted-foreground/30' },
] as const;

/** Tabs untuk teknisi — hanya status yang relevan untuk pengerjaan */
const TECHNICIAN_TABS = [
  { value: 'antrian',    label: 'Antrian Saya', statuses: ['Pending', 'InProgress', 'OnHold'], color: 'bg-blue-500' },
  { value: 'selesai',    label: 'Selesai',      statuses: ['ReadyForPickup', 'Completed'],      color: 'bg-emerald-500' },
] as const;

const TABLE_COLUMNS = [
  { id: 'no',         label: 'No' },
  { id: 'date',       label: 'Tanggal' },
  { id: 'customer',   label: 'Pelanggan' },
  { id: 'device',     label: 'Device' },
  { id: 'issue',      label: 'Keluhan' },
  { id: 'technician', label: 'Teknisi' },
  { id: 'status',     label: 'Status' },
  { id: 'billing',    label: 'Tagihan' },
];

// ─── Technician summary card ──────────────────────────────────────────────────

function TechnicianSummary({
  myTickets,
  onSelect,
}: {
  myTickets: ServiceTicket[];
  onSelect: (t: ServiceTicket) => void;
}) {
  const inProgress = myTickets.filter(t => t.status === 'InProgress');
  const onHold     = myTickets.filter(t => t.status === 'OnHold');
  const pending    = myTickets.filter(t => t.status === 'Pending');
  const done       = myTickets.filter(t => ['ReadyForPickup', 'Completed'].includes(t.status));

  // Tiket aktif yang paling baru dikerjakan
  const activeTicket = inProgress[0] ?? onHold[0] ?? pending[0] ?? null;

  return (
    <div className="space-y-4 mb-2">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-muted/40 border border-border rounded-xl p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Wrench className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Dikerjakan</span>
          </div>
          <p className="text-2xl font-black text-foreground">{inProgress.length}</p>
        </div>
        <div className="bg-muted/40 border border-border rounded-xl p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Package className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Tunggu Part</span>
          </div>
          <p className="text-2xl font-black text-foreground">{onHold.length}</p>
        </div>
        <div className="bg-muted/40 border border-border rounded-xl p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Antrian</span>
          </div>
          <p className="text-2xl font-black text-foreground">{pending.length}</p>
        </div>
        <div className="bg-muted/40 border border-border rounded-xl p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Selesai</span>
          </div>
          <p className="text-2xl font-black text-foreground">{done.length}</p>
        </div>
      </div>

      {/* Active ticket highlight */}
      {activeTicket && (
        <button
          onClick={() => onSelect(activeTicket)}
          className="w-full text-left bg-muted/30 border border-border rounded-xl p-4 hover:bg-muted/50 transition-colors group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {activeTicket.status === 'InProgress' && (
                  <span className="text-[9px] font-black uppercase tracking-widest bg-foreground text-background px-2 py-0.5 rounded-full">
                    Sedang Dikerjakan
                  </span>
                )}
                {activeTicket.status === 'OnHold' && (
                  <span className="text-[9px] font-black uppercase tracking-widest bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    Tunggu Sparepart
                  </span>
                )}
                {activeTicket.status === 'Pending' && (
                  <span className="text-[9px] font-black uppercase tracking-widest bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    Antrian
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-foreground truncate">{activeTicket.deviceModel}</p>
              <p className="text-xs text-muted-foreground truncate">{activeTicket.customerName} • {activeTicket.issue}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ServiceManagementPage() {
  const { services, fetchTransactions, fetchServices } = usePosStore();
  const { user: currentUser, isTechnician: isUserTechnician, can } = useAuth();

  const canCreate = can('Service', 'create');

  const activeTabs = isUserTechnician ? TECHNICIAN_TABS : CASHIER_TABS;
  const defaultTab = isUserTechnician ? 'antrian' : 'masuk';

  const [searchQuery, setSearchQuery]     = useState("");
  const [activeTab, setActiveTab]         = useState<string>(defaultTab);
  const [isRegOpen, setIsRegOpen]         = useState(false);
  const [isPickupOpen, setIsPickupOpen]   = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    no: true, date: true, customer: true, device: true,
    issue: true, technician: true, status: true, billing: true,
  });

  // Reset tab when role changes
  useEffect(() => {
    setActiveTab(isUserTechnician ? 'antrian' : 'masuk');
  }, [isUserTechnician]);

  // Tiket milik teknisi ini
  const myTickets = useMemo(
    () => services.filter(t => t.technicianId === currentUser?.id),
    [services, currentUser?.id]
  );

  // Count badges per tab
  const tabCounts = useMemo(() => {
    const base = isUserTechnician ? myTickets : services;
    return Object.fromEntries(
      activeTabs.map(tab => [
        tab.value,
        base.filter(t => (tab.statuses as readonly string[]).includes(t.status)).length,
      ])
    ) as Record<string, number>;
  }, [services, myTickets, isUserTechnician, activeTabs]);

  // Filtered list for current tab
  const filteredServices = useMemo(() => {
    const tab = activeTabs.find(t => t.value === activeTab);
    if (!tab) return [];
    return services
      .filter(t => {
        if (isUserTechnician && t.technicianId !== currentUser?.id) return false;
        if (!(tab.statuses as readonly string[]).includes(t.status)) return false;
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          t.customerName.toLowerCase().includes(q) ||
          t.deviceModel.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          (t.pickupCode?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => b.dateOpened - a.dateOpened);
  }, [services, searchQuery, activeTab, activeTabs, isUserTechnician, currentUser?.id]);

  const handlePickupConfirm = () => {
    fetchServices().catch(console.error);
    fetchTransactions().catch(console.error);
  };

  return (
    <Layout title="Manajemen Servis" requiredModule="Service" requiredLevel="Read">
      <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-1">

          {/* ── TECHNICIAN VIEW ─────────────────────────────────────────── */}
          {isUserTechnician && (
            <div className="space-y-4 pt-1">
              {/* Summary cards + active ticket */}
              <TechnicianSummary myTickets={myTickets} onSelect={setSelectedTicket} />

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                {/* Tab bar + search dalam satu baris, border hanya dari TabsList */}
                <div className="flex items-center justify-between gap-3 border-b border-border">
                  <TabsList className="bg-transparent p-0 h-auto gap-0 flex rounded-none border-none">
                    {TECHNICIAN_TABS.map(tab => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="
                          relative bg-transparent rounded-none px-4 py-2.5 text-xs font-semibold
                          text-muted-foreground border-b-2 border-transparent -mb-px
                          data-[state=active]:border-primary data-[state=active]:text-foreground
                          data-[state=active]:bg-transparent data-[state=active]:shadow-none
                          flex items-center gap-1.5 shrink-0 whitespace-nowrap
                        "
                      >
                        {tab.label}
                        {tabCounts[tab.value] > 0 && (
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none text-white ${tab.color}`}>
                            {tabCounts[tab.value]}
                          </span>
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {/* Search */}
                  <div className="relative pb-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/30" />
                    <Input
                      placeholder="Cari device atau pelanggan..."
                      className="pl-9 h-9 w-52 text-xs"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {TECHNICIAN_TABS.map(tab => (
                  <TabsContent key={tab.value} value={tab.value} className="m-0 mt-3">
                    <ServiceTable
                      services={filteredServices}
                      onSelect={setSelectedTicket}
                      hideStatusColumn={false}
                      showIssueColumn={true}
                      visibleColumns={{
                        no: true, date: true, customer: true, device: true,
                        issue: true, technician: false, status: true, billing: false,
                      }}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}

          {/* ── CASHIER / ADMIN VIEW ─────────────────────────────────────── */}
          {!isUserTechnician && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-0">

              {/* Tab bar + actions */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border">
                <div className="overflow-x-auto no-scrollbar flex-1 min-w-0">
                  <TabsList className="bg-transparent p-0 h-auto gap-0 flex w-max min-w-full rounded-none border-none">
                    {CASHIER_TABS.map(tab => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="
                          relative bg-transparent rounded-none px-4 py-2.5 text-xs font-semibold
                          text-muted-foreground border-b-2 border-transparent -mb-px
                          data-[state=active]:border-primary data-[state=active]:text-foreground
                          data-[state=active]:bg-transparent data-[state=active]:shadow-none
                          flex items-center gap-1.5 shrink-0 whitespace-nowrap
                        "
                      >
                        {tab.label}
                        {tabCounts[tab.value] > 0 && (
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none text-white ${tab.color}`}>
                            {tabCounts[tab.value]}
                          </span>
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              </div>

              {/* Search + action buttons */}
              <div className="flex items-center justify-between gap-3 pt-3 pb-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/30" />
                  <Input
                    placeholder="Cari pelanggan, device, ID, kode ambil..."
                    className="pl-9 h-9 text-xs"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Registrasi — hanya di tab Masuk dan jika punya canCreate */}
                  {activeTab === 'masuk' && canCreate && (
                    <Button onClick={() => setIsRegOpen(true)} className="h-9 text-xs gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Registrasi
                    </Button>
                  )}

                  {/* Pengambilan — hanya di tab Siap Diambil */}
                  {activeTab === 'siap-ambil' && (
                    <Button variant="outline" onClick={() => setIsPickupOpen(true)} className="h-9 text-xs gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Pengambilan
                    </Button>
                  )}

                  {/* Column visibility */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-9 w-9">
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel className="text-[10px] font-bold uppercase text-muted-foreground/60">
                        Atur Kolom
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {TABLE_COLUMNS.map(col => (
                        <DropdownMenuCheckboxItem
                          key={col.id}
                          checked={visibleColumns[col.id]}
                          onCheckedChange={checked =>
                            setVisibleColumns(prev => ({ ...prev, [col.id]: !!checked }))
                          }
                          className="text-xs"
                        >
                          {col.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Tab contents */}
              {CASHIER_TABS.map(tab => (
                <TabsContent key={tab.value} value={tab.value} className="m-0">
                  <ServiceTable
                    services={filteredServices}
                    onSelect={setSelectedTicket}
                    hideStatusColumn={tab.value !== 'riwayat'}
                    showIssueColumn={tab.value === 'masuk' || visibleColumns.issue}
                    visibleColumns={visibleColumns}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}

        </div>
      </div>

      {/* Dialogs */}
      <RegisterServiceDialog open={isRegOpen} onOpenChange={setIsRegOpen} />

      <PickupDialog
        open={isPickupOpen}
        onOpenChange={setIsPickupOpen}
        onConfirm={handlePickupConfirm}
      />

      <ServiceDetailDialog
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onUpdate={updated => setSelectedTicket(updated)}
      />
    </Layout>
  );
}