import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MapPin, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AttendanceTableProps {
  attendances: any[];
}

export function AttendanceTable({ attendances }: AttendanceTableProps) {
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);

  return (
    <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/10">
          <TableRow className="hover:bg-transparent border-b border-border/40">
            <TableHead className="ui-label py-4 pl-6">Selfie</TableHead>
            <TableHead className="ui-label py-4">Pegawai</TableHead>
            <TableHead className="ui-label py-4">Absen Masuk</TableHead>
            <TableHead className="ui-label py-4">Absen Pulang</TableHead>
            <TableHead className="ui-label py-4 text-center">Status</TableHead>
            <TableHead className="ui-label py-4 text-right pr-6">Security</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attendances.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="h-48 text-center"><span className="ui-meta opacity-20">Data presensi hari ini belum tersedia</span></TableCell></TableRow>
          ) : (
            attendances.map((log) => (
              <TableRow key={log.id} className="hover:bg-muted/5 border-b border-border/10 last:border-0">
                <TableCell className="py-4 pl-6">
                  <div className="flex -space-x-2">
                    {log.photoUrl && (
                      <div 
                        className="h-10 w-10 rounded-lg overflow-hidden border-2 border-white shadow-sm cursor-zoom-in hover:scale-110 transition-transform active:scale-95"
                        onClick={() => setSelectedImage({ url: log.photoUrl, title: `Selfie Masuk - ${log.employeeName}` })}
                      >
                        <img src={log.photoUrl} alt="In" className="h-full w-full object-cover" />
                      </div>
                    )}
                    {log.checkOutPhotoUrl && (
                      <div 
                        className="h-10 w-10 rounded-lg overflow-hidden border-2 border-white shadow-sm cursor-zoom-in hover:scale-110 transition-transform active:scale-95"
                        onClick={() => setSelectedImage({ url: log.checkOutPhotoUrl, title: `Selfie Pulang - ${log.employeeName}` })}
                      >
                        <img src={log.checkOutPhotoUrl} alt="Out" className="h-full w-full object-cover" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-[13px] text-foreground">{log.employeeName}</span>
                    <span className="ui-meta uppercase tracking-tight">{log.branchId}</span>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[11px] font-bold">{new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <span className="ui-meta ml-3.5 ">{new Date(log.checkInTime).toLocaleDateString([], { day: '2-digit', month: 'short' })}</span>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  {log.checkOutTime ? (
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="text-[11px] font-bold">{new Date(log.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <span className="text-[10px] text-primary/60 ml-3.5 font-medium">{log.workDurationMinutes}m Kerja</span>
                    </div>
                  ) : <span className="ui-meta opacity-30 ">Belum Pulang</span>}
                </TableCell>
                <TableCell className="py-4 text-center">
                  <Badge className="ui-label px-3 py-1 bg-muted text-foreground border-border">{log.status}</Badge>
                </TableCell>
                <TableCell className="py-4 text-right pr-6">
                  <div className="flex items-center gap-2 justify-end">
                    {log.isInRadius ? (
                      <div className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-lg">
                        <MapPin className="h-3 w-3 text-foreground" />
                        <span className="ui-label text-foreground">Radius OK</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-muted/20 px-2 py-1 rounded-lg">
                        <MapPin className="h-3 w-3 text-muted-foreground/40" />
                        <span className="ui-label opacity-40">Luar Area</span>
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent 
          className="sm:max-w-[450px] p-0 overflow-hidden bg-transparent border-none shadow-none"
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedImage?.title}</DialogTitle>
          </DialogHeader>
          <div className="relative group">
            <img 
              src={selectedImage?.url} 
              alt="Detail" 
              className="w-full h-auto rounded-2xl shadow-2xl border-4 border-white/10" 
            />
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-white font-bold tracking-tight">{selectedImage?.title}</p>
            </div>
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/80 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

