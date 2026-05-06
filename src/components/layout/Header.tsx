"use client";
import { Menu, Bell, Search, User, ChevronRight, MapPin, Package, Clock, Camera, MapPinned, Circle, LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePosStore } from "@/lib/store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  title: string;
}

export function Header({
  title,
}: HeaderProps) {
  const { currentUser, logout } = usePosStore();

  return (
    <header className="flex h-16 items-center gap-2 border-b border-border/20 bg-background/60 backdrop-blur-xl px-4 lg:px-8 sticky top-0 z-30">
      <SidebarTrigger className="h-9 w-9" />

      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-black leading-tight tracking-[0.1em] truncate uppercase">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-10 px-2 rounded-xl hover:bg-foreground/5 transition-all outline-none">
              <div className="h-8 w-8 rounded-full bg-foreground/5 flex items-center justify-center border border-foreground/10">
                 <User className="h-4 w-4 text-foreground" />
              </div>
              <div className="flex flex-col items-start leading-none hidden md:flex">
                 <span className="text-xs font-bold">{currentUser?.name || 'User'}</span>
                 <span className="text-[10px] font-medium opacity-40">{currentUser?.role?.name || 'Guest'}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-2xl border-border/40">
            <DropdownMenuLabel className="px-3 py-2">
               <p className="text-xs font-bold uppercase tracking-widest opacity-40">Akun Saya</p>
               <p className="text-sm font-bold mt-1">{currentUser?.username || 'No Username'}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-2 opacity-50" />
            <DropdownMenuItem 
              onClick={logout}
              className="rounded-xl h-11 px-3 text-red-500 focus:text-red-500 focus:bg-red-500/5 cursor-pointer font-bold text-xs gap-3"
            >
              <LogOut className="h-4 w-4" />
              KELUAR APLIKASI
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function AttendanceControl() {
  const { currentUser, currentBranch, branches, addAttendance, updateAttendance, attendances } = usePosStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const today = new Date().toISOString().split('T')[0];
  const todayRecord = attendances.find(a => a.employeeId === currentUser?.id && a.date === today);
  const isClockedIn = !!todayRecord;
  const isClockedOut = !!todayRecord?.checkOutTime;

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    setPhoto(canvas.toDataURL("image/jpeg"));
    const stream = video.srcObject as MediaStream;
    stream.getTracks().forEach(t => t.stop());
  };

  const handleAttendance = async () => {
    if (!currentUser || !currentBranch) return;
    setLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => 
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true })
      );

      if (!isClockedIn) {
        // Clock In
        await addAttendance({
          employeeId: currentUser.id,
          employeeName: currentUser.name,
          branchId: currentBranch.id,
          date: today,
          checkInTime: Date.now(),
          status: 'Present',
          isInRadius: true,
          isMockGPS: false,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          photoUrl: photo || undefined,
        });
      } else {
        // Clock Out
        await updateAttendance(todayRecord.id, {
          checkOutTime: Date.now(),
          checkOutPhotoUrl: photo,
          checkOutLatitude: pos.coords.latitude,
          checkOutLongitude: pos.coords.longitude,
          isInRadius: true,
          isMockGPS: false,
        });
      }
      setIsDialogOpen(false);
      setPhoto(null);
    } catch (err: any) {
      alert(err.message || "Gagal melakukan absensi");
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => {
      setIsDialogOpen(open);
      if (open) startCamera();
      else setPhoto(null);
    }}>
      <DialogTrigger asChild>
        <Button 
          variant={isClockedIn && !isClockedOut ? "outline" : "ghost"} 
          className={cn(
            "h-9 px-3 gap-2 rounded-md transition-all border-border/10",
            isClockedIn && !isClockedOut ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/20" : "hover:bg-primary/5"
          )}
        >
          <Clock className={cn("h-4 w-4", isClockedIn && !isClockedOut && "animate-pulse")} />
          <div className="flex flex-col items-start leading-none group-data-[collapsible=icon]:hidden">
            <span className="text-[9px] font-black uppercase tracking-widest">
              {isClockedOut ? 'Selesai' : isClockedIn ? 'Kerja' : 'Absen'}
            </span>
            {isClockedIn && !isClockedOut && (
              <span className="text-[8px] opacity-60 font-bold">In: {new Date(todayRecord.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{isClockedIn ? 'Absen Pulang' : 'Absen Masuk'}</DialogTitle>
          <DialogDescription>Gunakan kamera untuk melakukan verifikasi wajah saat melakukan absensi.</DialogDescription>
        </DialogHeader>
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Camera className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-black text-lg uppercase tracking-tight">
                {isClockedIn ? 'Absen Pulang' : 'Absen Masuk'}
              </h3>
              <p className="ui-meta">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
          </div>

          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-inner">
            {photo ? (
              <img src={photo} className="w-full h-full object-cover" alt="Selfie" />
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
            )}
            <div className="absolute bottom-4 left-4 right-4 flex justify-center">
               {!photo ? (
                 <Button onClick={takePhoto} className="h-12 w-12 rounded-full p-0 shadow-xl border-4 border-white">
                    <Circle className="h-6 w-6 fill-current" />
                 </Button>
               ) : (
                 <Button onClick={() => { setPhoto(null); startCamera(); }} variant="secondary" size="sm" className="rounded-full px-6 ui-label bg-white/20 backdrop-blur-md text-white border-white/20">Ulangi</Button>
               )}
            </div>
          </div>

          <div className="bg-muted/30 p-4 rounded-2xl space-y-3">
             <div className="flex items-center gap-3">
                <MapPinned className="h-4 w-4 text-primary" />
                <span className="ui-label font-bold text-foreground">{currentBranch?.name || 'Mendeteksi Lokasi...'}</span>
             </div>
             <p className="ui-meta leading-relaxed">Pastikan Anda berada dalam radius kantor dan wajah terlihat jelas.</p>
          </div>

          <Button 
            className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20"
            disabled={!photo || loading}
            onClick={handleAttendance}
          >
            {loading ? 'Memproses...' : isClockedIn ? 'Konfirmasi Pulang' : 'Konfirmasi Masuk'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
