import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { usePosStore } from "@/lib/store";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { Button } from "@/components/ui/button";

import { ModuleName, AccessLevel } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert, XCircle, Package } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  requiredModule?: ModuleName;
  requiredLevel?: AccessLevel;
}

export function Layout({ children, title, requiredModule, requiredLevel = 'Read' }: LayoutProps) {
  const { fetchTransfers, stockTransfers, _hasHydrated } = usePosStore();
  const { user: currentUser, branch: currentBranch, isSuperAdmin: userIsSuperAdmin, canAccess, logout } = useAuth();
  const router = useRouter();

  // --- GLOBAL REALTIME POLLING & NOTIFICATIONS ---
  const [lastProcessedId, setLastProcessedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: string, message: string } | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(async () => {
      try {
        await fetchTransfers();
        const newTransfers = usePosStore.getState().stockTransfers;
        
        if (newTransfers.length > 0) {
          const latest = newTransfers[0];
          
          if (latest.id !== lastProcessedId && latest.status === 'Pending') {
            const shouldNotify = userIsSuperAdmin || latest.fromBranchId === currentBranch?.id;
            
            if (shouldNotify) {
              setLastProcessedId(latest.id);
              
              setToast({ id: latest.id, message: `Ada permintaan stok baru!` });
              setTimeout(() => setToast(null), 8000);

              const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
              audio.play().catch(() => {});
              
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification("📦 Ada Permintaan Stok!", {
                  body: `Segera cek! Ada permintaan stok baru masuk.`,
                  icon: "/icon.png"
                });
              }
            }
          }
        }
      } catch {
        // Silent fail — network hiccup, tidak perlu log ke console
      }
    }, 10000); 

    return () => clearInterval(interval);
  }, [currentBranch?.id, currentUser?.id, fetchTransfers, lastProcessedId]);


  // Prevent Auth Flicker during hydration
  if (!_hasHydrated) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-muted border-t-foreground rounded-full animate-spin" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Menghubungkan Sesi...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || (!currentBranch && !userIsSuperAdmin)) {
    return <AuthScreen />;
  }

  // Permission Check
  if (requiredModule && !userIsSuperAdmin) {
    const hasAccess = canAccess(requiredModule, requiredLevel);

    // ── Debug: selalu log permission check agar mudah debug ──
    const roleName   = currentUser?.role?.name ?? '(no role)';
    const dbPerms    = (currentUser?.role as any)?.permissions ?? [];
    const rawEntry   = dbPerms.find((p: any) =>
      p.module?.toLowerCase() === requiredModule.toLowerCase()
    );
    const { rolePermissions } = usePosStore.getState();
    const storeEntry =
      rolePermissions[roleName] ??
      Object.entries(rolePermissions).find(
        ([k]) => k.toLowerCase() === roleName.toLowerCase()
      )?.[1];

    console.group(
      `%c[Layout] Permission check — ${requiredModule} (need: ${requiredLevel})  →  ${hasAccess ? '✅ ALLOWED' : '❌ BLOCKED'}`,
      hasAccess ? 'color:#22c55e;font-weight:bold' : 'color:#ef4444;font-weight:bold'
    );
    console.log('User          :', currentUser?.username, '|', roleName);
    console.log('Module        :', requiredModule, '| Required level:', requiredLevel);
    console.log('Store entry   :', storeEntry ?? '⚠️ NOT FOUND in rolePermissions');
    console.log('DB perm entry :', rawEntry
      ? `canRead=${rawEntry.canRead} canCreate=${rawEntry.canCreate} canUpdate=${rawEntry.canUpdate} canDelete=${rawEntry.canDelete}`
      : '⚠️ NOT FOUND in user.role.permissions'
    );
    console.log('rolePermissions keys:', Object.keys(rolePermissions));
    console.groupEnd();

    if (!hasAccess) {
      return (
        <SidebarProvider defaultOpen={true}>
          <div className="flex h-screen w-full overflow-hidden bg-background">
            <AppSidebar />
            <SidebarInset className="flex flex-col flex-1 overflow-hidden min-w-0">
              <Header title="Akses Dibatalkan" />
              <main className="flex-1 flex items-center justify-center bg-muted/10">
                <div className="text-center space-y-6 max-w-sm mx-auto p-8">
                  <div className="h-20 w-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <ShieldAlert className="h-10 w-10 text-red-500" />
                  </div>
                  <h2 className="ui-title text-2xl">Akses Terbatas</h2>
                  <p className="ui-meta text-muted-foreground">Maaf, akun Anda ({currentUser.role?.name}) tidak memiliki izin untuk mengakses modul <strong>{requiredModule}</strong>.</p>
                  <Button variant="outline" className="rounded-xl px-8" onClick={() => window.location.href = '/'}>
                    Kembali ke Beranda
                  </Button>
                </div>
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      );
    }
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden bg-background relative">
        <AppSidebar />
        
        {/* GLOBAL FLOATING TOAST */}
        {toast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-top-10 duration-500">
             <div className="bg-foreground text-background px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10 min-w-[320px]">
                <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center animate-bounce">
                   <Package className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex-1">
                   <p className="text-xs font-black uppercase tracking-widest opacity-50">Notifikasi Baru</p>
                   <p className="text-sm font-bold">{toast.message}</p>
                   <div className="flex gap-2 mt-3">
                      <Button 
                        size="sm" 
                        className="h-8 bg-primary text-primary-foreground text-xs font-bold uppercase px-4 rounded-lg"
                        onClick={() => {
                          router.push('/inventory?tab=mutasi');
                          setToast(null);
                        }}
                      >
                         Cek Detail
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-background/50 hover:text-background hover:bg-white/10 text-xs font-bold uppercase px-4 rounded-lg"
                        onClick={() => setToast(null)}
                      >
                         Batal
                      </Button>
                   </div>
                </div>
             </div>
          </div>
        )}

        <SidebarInset className="flex flex-col flex-1 overflow-hidden min-w-0">
          <Header title={title} />
          <main className="flex-1 overflow-y-auto no-scrollbar p-4 lg:p-6 bg-muted/10">
            <div className="max-w-[1600px] mx-auto h-full">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
