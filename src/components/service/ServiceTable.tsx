"use client";
import { Edit, Trash2 } from "lucide-react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { usePosStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { ServiceTicket } from "@/lib/types";

interface ServiceTableProps {
  services: ServiceTicket[];
  onSelect: (ticket: ServiceTicket) => void;
}

export default function ServiceTable({ services, onSelect }: ServiceTableProps) {
  const { users } = usePosStore();

  return (
    <div className="rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/40">
            <TableHead className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground">ID & Tanggal</TableHead>
            <TableHead className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground">Pelanggan</TableHead>
            <TableHead className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground">Device</TableHead>
            <TableHead className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground">Teknisi</TableHead>
            <TableHead className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground">Status</TableHead>
            <TableHead className="px-4 py-3 text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-xs font-medium">
                Belum ada data servis aktif.
              </TableCell>
            </TableRow>
          ) : (
            services.map(ticket => {
              const tech = users.find(u => u.id === ticket.technicianId);
              return (
                <TableRow 
                  key={ticket.id} 
                  className="border-b border-border/10 transition-colors cursor-pointer hover:bg-muted/30"
                >
                  <TableCell className="px-4 py-3" onClick={() => onSelect(ticket)}>
                    <p className="text-xs font-bold">#{ticket.id.slice(-6).toUpperCase()}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(ticket.dateOpened)}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3" onClick={() => onSelect(ticket)}>
                    <p className="text-xs font-bold">{ticket.customerName}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{ticket.customerPhone}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3" onClick={() => onSelect(ticket)}>
                    <p className="text-xs font-bold">{ticket.deviceModel}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[120px]">{ticket.issue}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3" onClick={() => onSelect(ticket)}>
                    <p className="text-xs font-bold text-primary/80">{tech?.name || "-"}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3" onClick={() => onSelect(ticket)}>
                    {ticket.status === 'Pending' && <span className="text-[10px] font-semibold text-amber-600">Antrian</span>}
                    {ticket.status === 'InProgress' && <span className="text-[10px] font-semibold text-blue-600">Mengerjakan</span>}
                    {ticket.status === 'ReadyToPay' && <span className="text-[10px] font-semibold text-emerald-600">Menunggu Bayar</span>}
                    {ticket.status === 'Paid' && <span className="text-[10px] font-semibold text-emerald-700">Siap Diambil</span>}
                    {ticket.status === 'Completed' && <span className="text-[10px] font-semibold text-violet-600">Sudah Diambil</span>}
                    {ticket.status === 'Delivered' && <span className="text-[10px] font-semibold text-muted-foreground">Selesai</span>}
                    {ticket.status === 'Cancelled' && <span className="text-[10px] font-semibold text-red-500 line-through">Batal</span>}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onSelect(ticket); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
