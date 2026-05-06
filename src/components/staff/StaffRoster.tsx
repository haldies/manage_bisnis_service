import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MapPin, Pencil, Trash2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface StaffRosterProps {
  users: any[];
  branches: any[];
  storeProfile: any;
  onEdit: (user: any) => void;
  onDelete: (id: string) => void;
}

export function StaffRoster({ users, branches, storeProfile, onEdit, onDelete }: StaffRosterProps) {
  const { canAccess } = useAuth();
  const hasFullAccess = canAccess('Staff', 'Full');
  return (
    <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/10">
          <TableRow className="hover:bg-transparent border-b border-border/40">
            <TableHead className="ui-label py-4 pl-6">Pegawai</TableHead>
            <TableHead className="ui-label py-4">Kontak</TableHead>
            <TableHead className="ui-label py-4">Lokasi Tugas</TableHead>
            <TableHead className="ui-label py-4">Gaji Pokok</TableHead>
            <TableHead className="ui-label py-4 text-center">Role</TableHead>
            <TableHead className="ui-label py-4 text-right pr-6">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="h-48 text-center"><span className="ui-meta opacity-20">Belum ada data pegawai</span></TableCell></TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id} className="hover:bg-muted/5 border-b border-border/10 last:border-0">
                <TableCell className="py-4 pl-6">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-[13px] text-foreground">{user.name}</span>
                    <span className="ui-meta uppercase">ID: {user.id.slice(-6).toUpperCase()}</span>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <span className="ui-meta">{user.username || "—"}</span>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-muted-foreground/40" />
                    <span className="ui-label text-foreground">
                      {user.branchId ? branches.find(b => b.id === user.branchId)?.name : 'Global'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <span className="font-bold text-[12px] text-foreground">
                    {formatCurrency(Number(user.baseSalary || storeProfile.baseSalary || 0))}
                  </span>
                </TableCell>
                 <TableCell className="py-4 text-center">
                  <span className={cn(
                     "ui-label font-black uppercase tracking-widest text-[10px]",
                     user.role?.name === 'Super Admin' ? "text-primary" : "text-muted-foreground"
                  )}>
                    {user.role?.name || '-'}
                  </span>
                </TableCell>
                <TableCell className="py-4 text-right pr-6">
                  {hasFullAccess && (
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md hover:bg-muted" onClick={() => onEdit(user)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md hover:bg-muted" onClick={() => onDelete(user.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
