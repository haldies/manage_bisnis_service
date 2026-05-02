"use client";
import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Search } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePosStore } from "@/lib/store";
import { ServiceStatus, ServiceTicket } from "@/lib/types";

// Components
import RegisterServiceDialog from "../../components/service/RegisterServiceDialog";
import ServiceDetailDialog from "../../components/service/ServiceDetailDialog";
import ServiceTypeDialog from "../../components/service/ServiceTypeDialog";
import ServiceTable from "../../components/service/ServiceTable";
import ServiceTypeTable from "../../components/service/ServiceTypeTable";

export default function ServiceManagementPage() {
  const { services, serviceTypes } = usePosStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | 'All'>('All');
  const [activeView, setActiveView] = useState("tickets");

  // Dialog States
  const [isRegOpen, setIsRegOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);

  const filteredServices = useMemo(() => {
    return services.filter(t => {
      const matchesSearch = t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.deviceModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase());
      const isNotCancelled = t.status !== 'Cancelled' && t.status !== 'Delivered';
      const matchesStatus = statusFilter === 'All' ? isNotCancelled : t.status === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => b.dateOpened - a.dateOpened);
  }, [services, searchQuery, statusFilter]);

  return (
    <Layout title="Manajemen Servis" requiredModule="Service" requiredLevel="Read">
      <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-1">
          <Tabs value={activeView} onValueChange={setActiveView} className="space-y-8">
            <div className="flex justify-between items-center">
              <TabsList className="bg-muted/20 p-1 rounded-xl">
                <TabsTrigger value="tickets" className="rounded-lg px-6 py-2 text-xs font-bold data-[state=active]:bg-background">Daftar Servis</TabsTrigger>
                <TabsTrigger value="types" className="rounded-lg px-6 py-2 text-xs font-bold data-[state=active]:bg-background">Jenis Jasa</TabsTrigger>
              </TabsList>

              {activeView === 'types' && (
                <Button onClick={() => { setEditingType(null); setIsTypeDialogOpen(true); }} className="h-9 text-xs">
                  Tambah Data Jasa
                </Button>
              )}
            </div>

            <TabsContent value="tickets" className="m-0 space-y-8">
              {/* Header / Filter */}
              <div className="flex flex-row items-center gap-3 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/30" />
                  <Input
                    placeholder="Cari pelanggan, device, atau ID..."
                    className="pl-9 h-10 w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="min-w-[140px]">
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Semua Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">Semua Status</SelectItem>
                      <SelectItem value="Pending">Antrian</SelectItem>
                      <SelectItem value="InProgress">Mengerjakan</SelectItem>
                      <SelectItem value="ReadyToPay">Menunggu Pembayaran</SelectItem>
                      <SelectItem value="Paid">Siap Diambil</SelectItem>
                      <SelectItem value="Completed">Sudah Diambil</SelectItem>
                      <SelectItem value="Delivered">Selesai</SelectItem>
                      <SelectItem value="Cancelled">Dibatalkan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={() => setIsRegOpen(true)} className="h-10 px-6 rounded-md">
                  Registrasi Servis
                </Button>
              </div>

              <ServiceTable services={filteredServices} onSelect={setSelectedTicket} />
            </TabsContent>

            <TabsContent value="types" className="m-0">
              <ServiceTypeTable onEdit={(type) => { setEditingType(type); setIsTypeDialogOpen(true); }} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dialogs */}
      <RegisterServiceDialog open={isRegOpen} onOpenChange={setIsRegOpen} />

      <ServiceDetailDialog
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onUpdate={(updated) => setSelectedTicket(updated)}
      />

      <ServiceTypeDialog
        open={isTypeDialogOpen}
        onOpenChange={setIsTypeDialogOpen}
        editingType={editingType}
      />
    </Layout>
  );
}
