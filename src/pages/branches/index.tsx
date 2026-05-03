"use client";
import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
   Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
   Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { usePosStore } from "@/lib/store";
import {
   Plus, MapPin, Phone, Building2, Navigation, Target, Trash2, Pencil
} from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const BranchMap = dynamic(() => import("@/components/branches/BranchMap"), {
   ssr: false,
   loading: () => <div className="h-[300px] w-full bg-muted animate-pulse rounded-2xl flex items-center justify-center text-[10px] font-bold uppercase tracking-widest opacity-40">Memuat Peta...</div>
});

export default function BranchesPage() {
   const { branches, addBranch, updateBranch, removeBranch, currentUser } = usePosStore();
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [editingBranch, setEditingBranch] = useState<any>(null);
   const [deleteTarget, setDeleteTarget] = useState<any>(null);

   const initialForm = {
      name: "",
      address: "",
      phone: "",
      latitude: "",
      longitude: "",
      radiusMeters: "50"
   };

   const [form, setForm] = useState(initialForm);

   const handleOpenModal = (branch?: any) => {
      if (branch) {
         setEditingBranch(branch);
         setForm({
            name: branch.name,
            address: branch.address,
            phone: branch.phone,
            latitude: branch.latitude?.toString() || "",
            longitude: branch.longitude?.toString() || "",
            radiusMeters: branch.radiusMeters?.toString() || "50"
         });
      } else {
         setEditingBranch(null);
         setForm(initialForm);
      }
      setIsModalOpen(true);
   };

   const handleSave = async () => {
      if (!form.name || !form.address || !form.latitude || !form.longitude) {
         alert("Semua field termasuk Koordinat (Latitude & Longitude) wajib diisi!");
         return;
      }

      const payload = {
         ...form,
         latitude: parseFloat(form.latitude),
         longitude: parseFloat(form.longitude),
         radiusMeters: parseInt(form.radiusMeters)
      };

      try {
         if (editingBranch) {
            await updateBranch(editingBranch.id, payload);
         } else {
            await addBranch(payload);
         }
         setIsModalOpen(false);
      } catch (e) {
         console.error(e);
         alert("Gagal menyimpan data cabang");
      }
   };

   return (
      <Layout title="Manajemen Cabang" requiredModule="Staff" requiredLevel="Full">
         <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
               <div>
                  <h2 className="ui-title">Daftar Cabang</h2>
                  <p className="ui-meta">Kelola outlet dan geofence lokasi absensi staf.</p>
               </div>
               <Button onClick={() => handleOpenModal()} className="rounded-xl h-11 px-6 ui-badge gap-2">
                  <Plus className="h-4 w-4" /> Tambah Cabang
               </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
               {branches.map(branch => (
                  <Card key={branch.id} className="overflow-hidden border-border/40 hover:shadow-lg transition-all group rounded-2xl">
                     <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                           <div className="flex gap-3 min-w-0">
                              <div className="h-10 w-10 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0 border border-foreground/5">
                                 <Building2 className="h-5 w-5 text-foreground/40" />
                              </div>
                              <div className="min-w-0">
                                 <h3 className="text-xs font-black uppercase tracking-tight truncate pr-2">{branch.name}</h3>
                                 <p className="text-[10px] font-bold opacity-40 truncate">{branch.phone}</p>
                              </div>
                           </div>
                           <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg hover:bg-foreground/5" onClick={() => handleOpenModal(branch)}>
                                 <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg hover:bg-red-50" onClick={() => setDeleteTarget(branch)}>
                                 <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <div className="flex items-start gap-2 bg-muted/30 p-2.5 rounded-xl">
                              <MapPin className="h-3 w-3 mt-0.5 text-foreground/40" />
                              <p className="text-[10px] font-medium leading-relaxed line-clamp-2 opacity-70">{branch.address}</p>
                           </div>

                           <div className="flex items-center justify-between px-1">
                              <div className="flex items-center gap-1.5">
                                 <Navigation className="h-3 w-3 text-primary" />
                                 <span className="text-[9px] font-black font-mono opacity-50">{branch.latitude?.toFixed(4)}, {branch.longitude?.toFixed(4)}</span>
                              </div>
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10">
                                 <Target className="h-2.5 w-2.5 text-primary" />
                                 <span className="text-[9px] font-black text-primary">{branch.radiusMeters}m</span>
                              </div>
                           </div>
                        </div>
                     </CardContent>
                  </Card>
               ))}
            </div>
         </div>

         <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
               <div className="bg-foreground p-8 text-background shrink-0">
                  <DialogTitle className="text-2xl tracking-tighter">
                     {editingBranch ? 'Update Cabang' : 'Cabang Baru'}
                  </DialogTitle>
                  <DialogDescription className="text-background/60 text-xs mt-1">
                     Wajib isi koordinat GPS untuk mengaktifkan fitur absensi geofence.
                  </DialogDescription>
               </div>

               <div className="max-h-[70vh] overflow-y-auto no-scrollbar p-8 space-y-5 pt-4">
                  <div className="space-y-1.5">
                     <Label className="ui-label ml-1">Nama Cabang / Outlet</Label>
                     <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-11 rounded-xl bg-muted/50 border-none" placeholder="Contoh: Kasirai Bandung" />
                  </div>
                  <div className="space-y-1.5">
                     <Label className="ui-label ml-1">Alamat Lengkap</Label>
                     <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="h-11 rounded-xl bg-muted/50 border-none" placeholder="Jl. Dipatiukur No. 1..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <Label className="ui-label ml-1">Telepon</Label>
                        <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="h-11 rounded-xl bg-muted/50 border-none" placeholder="0812..." />
                     </div>
                     <div className="space-y-1.5">
                        <Label className="ui-label ml-1">Radius (Meter)</Label>
                        <Input type="number" value={form.radiusMeters} onChange={e => setForm({ ...form, radiusMeters: e.target.value })} className="h-11 rounded-xl bg-muted/50 border-none" />
                     </div>
                  </div>

                  <div className="pt-4 border-t border-border/10 space-y-4">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <Navigation className="h-4 w-4 text-primary" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-primary">Koordinat Geofence (Wajib)</span>
                        </div>
                        <Button
                           variant="ghost"
                           size="sm"
                           className="h-8 px-3 rounded-full text-[9px] font-black uppercase bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20"
                           onClick={() => {
                              if (navigator.geolocation) {
                                 navigator.geolocation.getCurrentPosition((pos) => {
                                    setForm({
                                       ...form,
                                       latitude: pos.coords.latitude.toString(),
                                       longitude: pos.coords.longitude.toString()
                                    });
                                 });
                              }
                           }}
                        >
                           Gunakan Lokasi Saat Ini
                        </Button>
                     </div>

                     <BranchMap
                        lat={parseFloat(form.latitude) || -6.200000}
                        lng={parseFloat(form.longitude) || 106.816666}
                        radius={parseInt(form.radiusMeters) || 100}
                        onChange={(lat, lng) => setForm({ ...form, latitude: lat.toFixed(6), longitude: lng.toFixed(6) })}
                     />

                     <p className="text-[9px] text-muted-foreground italic px-1">Tip: Klik pada peta atau geser pin untuk menyesuaikan lokasi tepat outlet Anda.</p>
                  </div>

                  <Button className="w-full h-12 rounded-2xl ui-badge mt-4 sticky bottom-0 shadow-2xl" onClick={handleSave}>
                     {editingBranch ? 'Simpan Perubahan' : 'Buat Cabang Sekarang'}
                  </Button>
               </div>
            </DialogContent>
         </Dialog>

         <Dialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
            <DialogContent className="max-w-sm p-8 text-center rounded-3xl border-none shadow-2xl">
               <div className="h-20 w-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="h-10 w-10 text-red-500" />
               </div>
               <DialogTitle className="ui-title text-xl">Hapus Cabang?</DialogTitle>
               <DialogDescription className="mt-2">Seluruh data stok dan transaksi di cabang <strong>{deleteTarget?.name}</strong> akan terpengaruh.</DialogDescription>
               <div className="grid grid-cols-2 gap-3 mt-8">
                  <Button variant="ghost" className="h-12 rounded-xl" onClick={() => setDeleteTarget(null)}>Batal</Button>
                  <Button variant="destructive" className="h-12 rounded-xl" onClick={async () => {
                     await removeBranch(deleteTarget.id);
                     setDeleteTarget(null);
                  }}>Ya, Hapus</Button>
               </div>
            </DialogContent>
         </Dialog>
      </Layout>
   );
}
