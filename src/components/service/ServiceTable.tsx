"use client";
import { Edit, ShoppingCart, Clock, MessageCircle } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { usePosStore } from "@/lib/store";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ServiceTicket } from "@/lib/types";

interface ServiceTableProps {
  services: ServiceTicket[];
  onSelect: (ticket: ServiceTicket) => void;
  hideStatusColumn?: boolean;
  showIssueColumn?: boolean;
  visibleColumns?: Record<string, boolean>;
}

// ─── Aging helpers ───────────────────────────────────────────────────────────

function agingDays(ticket: ServiceTicket): number {
  const since = ticket.readyAt ?? ticket.dateOpened;
  return Math.floor((Date.now() - since) / (24 * 60 * 60 * 1000));
}

type AgingLevel = 'normal' | 'warning' | 'critical';

function getAgingLevel(ticket: ServiceTicket): AgingLevel {
  if (ticket.status !== 'ReadyForPickup') return 'normal';
  const days = agingDays(ticket);
  if (days >= 7) return 'critical';
  if (days >= 3) return 'warning';
  return 'normal';
}

const AGING_STYLES: Record<AgingLevel, string> = {
  normal:   '',
  warning:  'bg-amber-50',
  critical: 'bg-red-50',
};

const AGING_BADGE: Record<Exclude<AgingLevel, 'normal'>, { cls: string }> = {
  warning:  { cls: 'bg-amber-100 text-amber-700' },
  critical: { cls: 'bg-red-100 text-red-700' },
};

// ─── Payment status badge ────────────────────────────────────────────────────

function PaymentBadge({ ticket }: { ticket: ServiceTicket }) {
  const ps = ticket.paymentStatus ?? 'Unpaid';
  if (ps === 'Paid') return null;
  const totalCost = (ticket.spareparts?.reduce((s, p) => s + Number(p.price) * (p.quantity || 1), 0) || 0) + Number(ticket.serviceFee || 0);
  const remaining = ps === 'DP' ? totalCost - (ticket.dpAmount || 0) : totalCost;
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full w-fit ${
      ps === 'DP' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
    }`}>
      {ps === 'DP' ? `DP • sisa ${formatCurrency(remaining)}` : 'Belum Bayar'}
    </span>
  );
}

// ─── Sparepart needs order badge ─────────────────────────────────────────────

function NeedsOrderBadge({ ticket }: { ticket: ServiceTicket }) {
  const hasNeedsOrder = ticket.spareparts?.some(p => (p as any).needsOrder);
  if (!hasNeedsOrder) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 w-fit">
      <ShoppingCart className="h-2.5 w-2.5" /> Perlu PO
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ServiceTable({
  services,
  onSelect,
  hideStatusColumn = false,
  showIssueColumn = false,
  visibleColumns = {}
}: ServiceTableProps) {
  const { users, currentUser } = usePosStore();
  const isTechnician = currentUser?.role?.name === 'Technician' ||
    currentUser?.role?.name === 'Owner';
  const show = (col: string) => visibleColumns[col] !== false;

  return (
    <div className="rounded-lg overflow-hidden">
      <div className="overflow-x-auto w-full">
      <Table className="min-w-[600px]">
        <TableHeader>
          <TableRow className="border-b border-border/40">
            {show('no') && <TableHead className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground w-12">No</TableHead>}
            {show('date') && <TableHead className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground">Tanggal</TableHead>}
            {show('customer') && <TableHead className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground">Pelanggan</TableHead>}
            {show('device') && <TableHead className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground">Device</TableHead>}
            {show('issue') && showIssueColumn && (
              <TableHead className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground">Keluhan</TableHead>
            )}
            {show('technician') && <TableHead className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground">Teknisi</TableHead>}
            {show('status') && !hideStatusColumn && (
              <TableHead className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground">Status</TableHead>
            )}
            {show('billing') && !isTechnician && (
              <TableHead className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground text-right">Tagihan</TableHead>
            )}
            <TableHead className="px-4 py-3 text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-xs font-medium">
                Belum ada data servis aktif.
              </TableCell>
            </TableRow>
          ) : (
            services.map((ticket, index) => {
              const tech = users.find(u => u.id === ticket.technicianId);
              const agingLevel = getAgingLevel(ticket);
              const days = agingDays(ticket);
              const totalCost = (ticket.spareparts?.reduce((s, p) => s + Number(p.price) * (p.quantity || 1), 0) || 0) + Number(ticket.serviceFee || 0);
              const paid = ticket.dpAmount || 0;
              const remaining = totalCost - paid;

              return (
                <TableRow
                  key={ticket.id}
                  className={`border-b border-border/10 transition-colors cursor-pointer hover:bg-muted/30 ${AGING_STYLES[agingLevel]}`}
                >
                  {show('no') && (
                    <TableCell className="px-4 py-3" onClick={() => onSelect(ticket)}>
                      <p className="text-xs text-muted-foreground font-medium">{index + 1}</p>
                    </TableCell>
                  )}

                  {show('date') && (
                    <TableCell className="px-4 py-3" onClick={() => onSelect(ticket)}>
                      <p className="text-xs font-bold">{formatDate(ticket.dateOpened)}</p>
                      {agingLevel !== 'normal' && (
                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full w-fit mt-1 ${AGING_BADGE[agingLevel].cls}`}>
                          <Clock className="h-2.5 w-2.5" />
                          {days} hari menginap
                        </span>
                      )}
                    </TableCell>
                  )}

                  {show('customer') && (
                    <TableCell className="px-4 py-3" onClick={() => onSelect(ticket)}>
                      <p className="text-xs font-bold">{ticket.customerName}</p>
                    </TableCell>
                  )}

                  {show('device') && (
                    <TableCell className="px-4 py-3" onClick={() => onSelect(ticket)}>
                      <p className="text-xs font-bold">{ticket.deviceModel}</p>
                      {!showIssueColumn && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[120px]">{ticket.issue}</p>
                      )}
                      <NeedsOrderBadge ticket={ticket} />
                    </TableCell>
                  )}

                  {show('issue') && showIssueColumn && (
                    <TableCell className="px-4 py-3" onClick={() => onSelect(ticket)}>
                      <p className="text-[10px] font-medium text-destructive/80 leading-relaxed max-w-[200px] line-clamp-2">
                        {ticket.issue}
                      </p>
                    </TableCell>
                  )}

                  {show('technician') && (
                    <TableCell className="px-4 py-3" onClick={() => onSelect(ticket)}>
                      <p className="text-xs font-bold text-primary/80">{tech?.name || "-"}</p>
                    </TableCell>
                  )}

                  {show('status') && !hideStatusColumn && (
                    <TableCell className="px-4 py-3" onClick={() => onSelect(ticket)}>
                      <div className="flex flex-col gap-1">
                        {ticket.status === 'Pending' && <span className="text-[10px] font-semibold text-amber-600">Masuk</span>}
                        {ticket.status === 'InProgress' && <span className="text-[10px] font-semibold text-blue-600">Proses</span>}
                        {ticket.status === 'OnHold' && <span className="text-[10px] font-semibold text-orange-500">Tunggu Sparepart</span>}
                        {ticket.status === 'WaitingApproval' && <span className="text-[10px] font-semibold text-purple-600">Konfirmasi Harga</span>}
                        {ticket.status === 'ReadyForPickup' && <span className="text-[10px] font-semibold text-emerald-600">Siap Diambil</span>}
                        {ticket.status === 'Completed' && <span className="text-[10px] font-semibold text-violet-600">Selesai</span>}
                        {ticket.status === 'Returned' && <span className="text-[10px] font-semibold text-orange-500">Dikembalikan</span>}
                        {ticket.status === 'Cancelled' && <span className="text-[10px] font-semibold text-red-500 line-through">Batal</span>}
                        {agingLevel !== 'normal' && (
                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full w-fit ${AGING_BADGE[agingLevel].cls}`}>
                            <Clock className="h-2.5 w-2.5" /> {days} hari
                          </span>
                        )}
                      </div>
                    </TableCell>
                  )}

                  {show('billing') && !isTechnician && (
                    <TableCell className="px-4 py-3 text-right" onClick={() => onSelect(ticket)}>
                      {totalCost > 0 ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <p className="text-xs font-semibold">{formatCurrency(totalCost)}</p>
                          {ticket.paymentStatus === 'DP' && (
                            <p className="text-[9px] text-blue-600 font-bold">DP {formatCurrency(paid)} • sisa {formatCurrency(remaining)}</p>
                          )}
                          {(ticket.paymentStatus === 'Unpaid' || !ticket.paymentStatus) && ticket.status === 'ReadyForPickup' && (
                            <p className="text-[9px] text-red-500 font-bold">Belum Bayar</p>
                          )}
                          {ticket.paymentStatus === 'Paid' && (
                            <p className="text-[9px] text-emerald-600 font-bold">Lunas</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}

                  <TableCell className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {ticket.customerPhone && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            const digits = ticket.customerPhone.replace(/\D/g, '');
                            const wa = digits.startsWith('0') ? '62' + digits.slice(1) : digits.startsWith('62') ? digits : '62' + digits;
                            window.open(`https://wa.me/${wa}`, '_blank');
                          }}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      )}
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
    </div>
  );
}
