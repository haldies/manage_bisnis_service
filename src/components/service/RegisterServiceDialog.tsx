"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePosStore } from "@/lib/store";
import { ServiceTicket } from "@/lib/types";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Device list now managed via database



interface RegisterServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RegisterServiceDialog({ open, onOpenChange }: RegisterServiceDialogProps) {
  const { users, currentUser, currentBranch, addServiceTicket, deviceModels } = usePosStore();

  
  const [openDevice, setOpenDevice] = useState(false);
  const [regForm, setRegForm] = useState({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    deviceModel: "",
    deviceSerial: "",
    issue: "",
    technicianId: ""
  });


  const handleRegister = async () => {
    if (!regForm.customerName || !regForm.deviceModel || !regForm.technicianId || regForm.technicianId === 'none') {
      alert("Harap isi Nama Pelanggan, Model Device, dan Pilih Teknisi!");
      return;
    }
    
    const ticket: Omit<ServiceTicket, 'id'> = {
      ...regForm,
      dateOpened: Date.now(),
      status: 'Pending',
      estimatedCost: 0,
      serviceFee: 0,
      spareparts: [],
      branchId: currentBranch?.id || 'b1'
    };

    await addServiceTicket(ticket);
    onOpenChange(false);
    setRegForm({
      customerName: "",
      customerPhone: "",
      customerAddress: "",
      deviceModel: "",
      deviceSerial: "",
      issue: "",
      technicianId: ""
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-xl" aria-describedby={undefined}>
        <DialogHeader className="p-6 border-b">
          <DialogTitle>Registrasi Servis</DialogTitle>
          <DialogDescription>Input data pelanggan dan detail device.</DialogDescription>
        </DialogHeader>
        
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nama Pelanggan</Label>
              <Input 
                value={regForm.customerName} 
                onChange={(e) => setRegForm({...regForm, customerName: e.target.value})} 
                placeholder="John Doe" 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">No. WhatsApp</Label>
              <Input 
                value={regForm.customerPhone} 
                onChange={(e) => setRegForm({...regForm, customerPhone: e.target.value})} 
                placeholder="0812..." 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Alamat</Label>
            <Input 
              value={regForm.customerAddress} 
              onChange={(e) => setRegForm({...regForm, customerAddress: e.target.value})} 
              placeholder="Jl. Sudirman No. 123" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Model Device</Label>
              <Popover open={openDevice} onOpenChange={setOpenDevice}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openDevice}
                    className="w-full justify-between font-normal text-xs h-10 border-input"
                  >
                    {regForm.deviceModel || "Pilih atau Ketik Model..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Cari atau ketik model baru..." 
                      className="h-9" 
                      onValueChange={(v) => setRegForm({...regForm, deviceModel: v})}
                    />
                    <CommandList>
                      <CommandEmpty className="py-2 px-4">
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start text-xs h-8 px-0 hover:bg-transparent"
                          onClick={() => setOpenDevice(false)}
                        >
                          Gunakan "{regForm.deviceModel}"
                        </Button>
                      </CommandEmpty>
                      <CommandGroup>
                        {deviceModels.map((dm) => (
                          <CommandItem
                            key={dm.id}
                            value={dm.name}
                            onSelect={(currentValue) => {
                              setRegForm({...regForm, deviceModel: currentValue});
                              setOpenDevice(false);
                            }}
                            className="text-xs"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                regForm.deviceModel === dm.name ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {dm.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>

                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Serial/IMEI</Label>
              <Input 
                value={regForm.deviceSerial} 
                onChange={(e) => setRegForm({...regForm, deviceSerial: e.target.value})} 
                placeholder="Opsional" 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Keluhan</Label>
            <Textarea 
              value={regForm.issue} 
              onChange={(e) => setRegForm({...regForm, issue: e.target.value})} 
              placeholder="Contoh: Layar pecah, mati total, air masuk..." 
              className="min-h-[100px] resize-none"
            />
          </div>


          <div className="space-y-1.5">
            <Label className="text-xs">Teknisi *</Label>
            <Select value={regForm.technicianId} onValueChange={(v) => setRegForm({...regForm, technicianId: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Teknisi" />
              </SelectTrigger>
              <SelectContent>
                {users.filter(u => u.role === 'Technician').map(tech => (
                  <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="p-6 border-t bg-muted/50">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleRegister}>Simpan Data</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
