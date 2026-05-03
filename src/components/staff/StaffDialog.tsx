import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote, CalendarIcon } from "lucide-react";
import { Role } from "@/lib/types";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface StaffDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingUser: any;
  newUser: any;
  setNewUser: (user: any) => void;
  onSave: () => void;
  branches: any[];
}

import { usePosStore } from "@/lib/store";

export function StaffDialog({ 
  isOpen, onOpenChange, editingUser, newUser, setNewUser, onSave, branches 
}: StaffDialogProps) {
  const { roles } = usePosStore();
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-none rounded-3xl shadow-2xl">
        <DialogHeader className="p-8 pb-0">
          <DialogTitle className="ui-title text-xl">{editingUser ? 'Edit Staf' : 'Tambah Staf'}</DialogTitle>
          <DialogDescription className="sr-only">
            Formulir untuk {editingUser ? 'mengubah' : 'menambahkan'} data profil dan informasi gaji staf.
          </DialogDescription>
        </DialogHeader>
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="ui-meta text-muted-foreground ml-1">Nama</Label>
              <Input value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} className="h-12 rounded-xl" placeholder="Nama Lengkap" />
            </div>
            <div className="space-y-1.5">
              <Label className="ui-meta text-muted-foreground ml-1">Nomor HP</Label>
              <Input value={newUser.phone} onChange={(e) => setNewUser({...newUser, phone: e.target.value})} className="h-12 rounded-xl" placeholder="081xxx" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="ui-meta text-muted-foreground ml-1">Alamat</Label>
            <Input value={newUser.address} onChange={(e) => setNewUser({...newUser, address: e.target.value})} className="h-12 rounded-xl" placeholder="Alamat Tinggal" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="ui-meta text-muted-foreground ml-1">Email</Label>
              <Input value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="h-12 rounded-xl" placeholder="Email" />
            </div>
            <div className="space-y-1.5">
              <Label className="ui-meta text-muted-foreground ml-1">Password</Label>
              <Input type="password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="h-12 rounded-xl" placeholder="Akses Login" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="ui-meta text-muted-foreground ml-1">Jabatan</Label>
              <Select value={newUser.roleId} onValueChange={(val) => setNewUser({...newUser, roleId: val})}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Pilih Jabatan" /></SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="ui-meta text-muted-foreground ml-1">Cabang</Label>
              <Select value={newUser.branchId} onValueChange={(val) => setNewUser({...newUser, branchId: val})}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Cabang</SelectItem>
                  {branches.map(b => ( b.id ? <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem> : null ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="pt-4 border-t border-border/10 space-y-4">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-primary" />
              <h4 className="text-[11px] font-black uppercase tracking-widest text-foreground">Detail Gaji & Akses</h4>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="ui-meta text-muted-foreground ml-1">Gaji Pokok</Label>
                  <Input 
                    type="number" 
                    value={newUser.baseSalary} 
                    onChange={(e) => setNewUser({...newUser, baseSalary: e.target.value})} 
                    className="h-12 font-bold rounded-xl" 
                    placeholder="Contoh: 3000000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="ui-meta text-muted-foreground ml-1">Jatah Cuti (Hari/Tahun)</Label>
                  <Input 
                    type="number" 
                    value={newUser.leaveQuota} 
                    onChange={(e) => setNewUser({...newUser, leaveQuota: e.target.value})} 
                    className="h-12 font-bold rounded-xl" 
                    placeholder="12"
                  />
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <Label className="ui-meta text-muted-foreground ml-1">Tanggal Bergabung</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full h-12 rounded-xl justify-start text-left font-bold",
                          !newUser.joinDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {newUser.joinDate ? format(new Date(newUser.joinDate), "PPP") : <span>Pilih Tanggal</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newUser.joinDate ? new Date(newUser.joinDate) : new Date()}
                        onSelect={(date) => setNewUser({...newUser, joinDate: date})}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-1.5">
                  <Label className="ui-meta text-muted-foreground ml-1">Sumber Bonus</Label>
                  <Select value={newUser.incentiveType || "None"} onValueChange={(val) => setNewUser({...newUser, incentiveType: val})}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">Tidak Ada</SelectItem>
                      <SelectItem value="Service">Jasa Servis</SelectItem>
                      <SelectItem value="Retail">Penjualan Retail</SelectItem>
                      <SelectItem value="Profit">Laba Bersih Cabang</SelectItem>
                      <SelectItem value="All">Semua Sumber</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="ui-meta text-muted-foreground ml-1">Metode Bonus</Label>
                  <Select value={newUser.incentiveMode || "Percentage"} onValueChange={(val) => setNewUser({...newUser, incentiveMode: val})}>
                    <SelectTrigger className="h-12 rounded-xl text-primary font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Percentage">Persentase (%)</SelectItem>
                      <SelectItem value="Flat">Angka Tetap (Rp)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 mt-4">
                <div className="space-y-1.5">
                  <Label className="ui-meta text-muted-foreground ml-1">Nilai Bonus (Rp / %)</Label>
                  <Input 
                    type="number" 
                    value={newUser.incentiveRate} 
                    onChange={(e) => setNewUser({...newUser, incentiveRate: e.target.value})} 
                    className="h-12 font-bold rounded-xl text-primary" 
                    placeholder="Contoh: 10 atau 50000"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="p-8 pt-6 border-t border-border/5 bg-muted/5 flex justify-end gap-3">
          <Button variant="outline" className="h-11 px-8 rounded-xl ui-label border-border/40" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button className="h-11 px-8 rounded-xl ui-label bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200" onClick={onSave}>
             Simpan Perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
