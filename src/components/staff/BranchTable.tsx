import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MapPin, Pencil, Trash2 } from "lucide-react";

interface BranchTableProps {
  branches: any[];
  onEdit: (branch: any) => void;
  onDelete: (id: string) => void;
}

export function BranchTable({ branches, onEdit, onDelete }: BranchTableProps) {
  return (
    <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/10">
          <TableRow className="hover:bg-transparent border-b border-border/40">
            <TableHead className="ui-label py-4 pl-6">Cabang</TableHead>
            <TableHead className="ui-label py-4">Alamat</TableHead>
            <TableHead className="ui-label py-4">Koordinat</TableHead>
            <TableHead className="ui-label py-4">Radius</TableHead>
            <TableHead className="ui-label py-4 text-right pr-6">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {branches.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="h-48 text-center"><span className="ui-meta opacity-20">Belum ada data cabang</span></TableCell></TableRow>
          ) : (
            branches.map(b => (
              <TableRow key={b.id} className="hover:bg-muted/5 border-b border-border/10 last:border-0">
                <TableCell className="py-4 pl-6"><span className="font-medium text-[13px]">{b.name}</span></TableCell>
                <TableCell className="py-4"><span className="ui-meta">{b.address}</span></TableCell>
                <TableCell className="py-4"><span className="ui-meta font-mono text-[10px]">{b.latitude?.toFixed(4)}, {b.longitude?.toFixed(4)}</span></TableCell>
                <TableCell className="py-4"><span className="ui-meta">{b.radiusMeters}m</span></TableCell>
                <TableCell className="py-4 text-right pr-6">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onEdit(b)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onDelete(b.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
