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
  const { currentUser, deleteServiceTicket } = usePosStore();

  return (
    <div className="bg-card rounded-lg border shadow-sm">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground">ID & Tanggal</TableHead>
            <TableHead className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground">Pelanggan</TableHead>
            <TableHead className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground">Device</TableHead>
            <TableHead className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground">Keluhan</TableHead>
            <TableHead className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground">Hasil Diagnosa</TableHead>
            <TableHead className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground">Status</TableHead>
            <TableHead className="px-4 py-3 text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-xs font-medium">
                Belum ada data servis aktif.
              </TableCell>
            </TableRow>
          ) : (
            services.map(ticket => (
              <TableRow 
                key={ticket.id} 
                className="border-b border-border/20 transition-colors cursor-pointer group"
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
                </TableCell>
                <TableCell className="px-4 py-3" onClick={() => onSelect(ticket)}>
                  <p className="text-[10px] truncate max-w-[150px]">{ticket.issue}</p>
                </TableCell>
                <TableCell className="px-4 py-3" onClick={() => onSelect(ticket)}>
                  <p className="text-[10px] truncate max-w-[150px] italic text-primary/80">{ticket.diagnosis || "Belum ada diagnosa"}</p>
                </TableCell>
                <TableCell className="px-4 py-3" onClick={() => onSelect(ticket)}>
                  {ticket.status === 'Pending' && <span className="text-[10px] font-bold uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Antrian</span>}
                  {ticket.status === 'InProgress' && <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">Mengerjakan</span>}
                  {ticket.status === 'ReadyToPay' && <span className="text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Menunggu Pembayaran</span>}
                  {ticket.status === 'Paid' && <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">Siap Diambil</span>}
                  {ticket.status === 'Completed' && <span className="text-[10px] font-bold uppercase text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">Sudah Diambil</span>}
                  {ticket.status === 'Cancelled' && <span className="text-[10px] font-bold uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">Batal</span>}
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onSelect(ticket); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {currentUser?.role === 'Admin' && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); deleteServiceTicket(ticket.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>

              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
