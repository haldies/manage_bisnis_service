"use client";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  ReceiptText, Package, Wrench, LineChart,
  Smartphone, Users, LogOut, MapPin, Settings,
  ChevronLeft, ChevronRight, Truck, ChevronDown,
  UserCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePosStore } from "@/lib/store";
import { ModuleName, AccessLevel } from "@/lib/types";
import { useSidebar } from "@/components/ui/sidebar";
import { useState } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: any;
  module: ModuleName;
  requiredLevel?: AccessLevel;
};

type NavGroup = {
  label: string;
  collapsible?: boolean;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Monitoring",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LineChart, module: "Finance", requiredLevel: "Read" },
    ],
  },
  {
    label: "Operasional",
    items: [
      { label: "Kasir", href: "/", icon: Smartphone, module: "POS", requiredLevel: "Read" },
      { label: "Servis", href: "/service", icon: Wrench, module: "Service", requiredLevel: "Read" },
      { label: "Transaksi", href: "/transactions", icon: ReceiptText, module: "Transactions", requiredLevel: "Read" },
    ],
  },
  {
    label: "Manajemen",
    collapsible: true,
    items: [
      { label: "Inventori", href: "/inventory", icon: Package, module: "Inventory", requiredLevel: "Read" },
      { label: "Supplier & PO", href: "/suppliers", icon: Truck, module: "Inventory", requiredLevel: "Read" },
      { label: "Staf & Payroll", href: "/staff", icon: Users, module: "Staff", requiredLevel: "Read" },
      { label: "Cabang", href: "/branches", icon: MapPin, module: "Staff", requiredLevel: "Full" },
      { label: "Laporan", href: "/finance", icon: LineChart, module: "Finance", requiredLevel: "Read" },
      { label: "Pengaturan", href: "/settings", icon: Settings, module: "Settings", requiredLevel: "Read" },
    ],
  },
];

export function AppSidebar() {
  const router = useRouter();
  const { open, setOpen, openMobile, setOpenMobile, isMobile } = useSidebar();
  const { currentUser, currentBranch, logout, rolePermissions } = usePosStore();

  // Track collapsed state per group label
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleGroup = (label: string) => {
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isModuleAllowed = (module: ModuleName, requiredLevel: AccessLevel = "Read") => {
    if (!currentUser) return false;
    if (currentUser.role?.name === "Owner") return true;

    const levels: AccessLevel[] = ["None", "Read", "Full"];

    const storePerms = rolePermissions[currentUser.role?.name || ""];
    if (storePerms && module in storePerms) {
      const userLevel = storePerms[module];
      return levels.indexOf(userLevel) >= levels.indexOf(requiredLevel);
    }

    const rolePerm = (currentUser.role as any)?.permissions;
    if (Array.isArray(rolePerm) && rolePerm.length > 0) {
      const p = rolePerm.find((p: any) => p.module === module);
      if (p) {
        let userLevel: AccessLevel = "None";
        if (p.canCreate || p.canUpdate || p.canDelete) userLevel = "Full";
        else if (p.canRead) userLevel = "Read";
        return levels.indexOf(userLevel) >= levels.indexOf(requiredLevel);
      }
      return false;
    }

    return false;
  };

  const isOpen = isMobile ? openMobile : open;
  const setIsOpen = isMobile ? setOpenMobile : setOpen;

  return (
    <>
      {isMobile && openMobile && (
        <div
          className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setOpenMobile(false)}
        />
      )}

      <aside
        className={cn(
          "fixed md:relative z-[70] md:z-auto flex flex-col h-screen bg-sidebar border-r border-sidebar-border",
          "transition-all duration-300 ease-in-out shrink-0",
          isOpen ? "w-56" : "w-0 md:w-16 overflow-hidden"
        )}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-3 shrink-0 border-b border-sidebar-border/50">
          {isOpen && (
            <span className="text-sm font-black uppercase tracking-widest text-sidebar-foreground truncate">
              {currentBranch?.name?.replace("Kasirai ", "") || "Menu"}
            </span>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
              "text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent",
              "transition-colors duration-200",
              !isOpen && "mx-auto"
            )}
          >
            {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-4 no-scrollbar">
          {NAV_GROUPS.map((group) => {
            const allowedItems = group.items.filter((item) =>
              isModuleAllowed(item.module, item.requiredLevel)
            );
            if (allowedItems.length === 0) return null;

            const isGroupCollapsed = group.collapsible && collapsed[group.label];
            // Auto-expand if any item in group is active
            const hasActiveItem = allowedItems.some(item =>
              item.href === "/" ? router.pathname === "/" : router.pathname.startsWith(item.href)
            );

            return (
              <div key={group.label}>
                {isOpen && (
                  group.collapsible ? (
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className="w-full flex items-center justify-between px-3 mb-1 group"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/30 group-hover:text-sidebar-foreground/50 transition-colors">
                        {group.label}
                      </p>
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 text-sidebar-foreground/20 transition-transform duration-200",
                          isGroupCollapsed && !hasActiveItem ? "" : "rotate-180"
                        )}
                      />
                    </button>
                  ) : (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/30 px-3 mb-1">
                      {group.label}
                    </p>
                  )
                )}

                {/* Items — hidden when collapsed (unless has active item) */}
                {(!isGroupCollapsed || hasActiveItem || !isOpen) && (
                  <div className="space-y-0.5">
                    {allowedItems.map((item) => {
                      const isActive =
                        item.href === "/"
                          ? router.pathname === "/"
                          : router.pathname.startsWith(item.href);
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          title={!isOpen ? item.label : undefined}
                          className={cn(
                            "flex items-center gap-3 h-9 px-3 rounded-lg",
                            "transition-all duration-150 group",
                            isActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground font-bold"
                              : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground font-medium"
                          )}
                        >
                          <Icon
                            className={cn(
                              "shrink-0 transition-transform duration-150",
                              isOpen ? "h-4 w-4" : "h-4 w-4 mx-auto",
                              isActive ? "opacity-100" : "opacity-60 group-hover:opacity-100"
                            )}
                          />
                          {isOpen && (
                            <span className="text-sm truncate">{item.label}</span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-sidebar-border/50 p-2 space-y-0.5">
          {/* Portal Saya — untuk semua pegawai */}
          {currentUser && (
            <Link
              href="/my"
              title={!isOpen ? "Portal Saya" : undefined}
              className={cn(
                "flex items-center gap-3 h-9 px-3 rounded-lg transition-all duration-150 group",
                router.pathname.startsWith("/my")
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-bold"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground font-medium"
              )}
            >
              <UserCircle className={cn("h-4 w-4 shrink-0 opacity-60 group-hover:opacity-100", !isOpen && "mx-auto")} />
              {isOpen && <span className="text-sm truncate">Portal Saya</span>}
            </Link>
          )}

          {/* User info + logout */}
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg",
              isOpen ? "justify-between" : "justify-center"
            )}
          >
            {isOpen && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-sidebar-foreground truncate">
                  {currentUser?.name || "User"}
                </span>
                <span className="text-[10px] text-sidebar-foreground/40 font-medium truncate">
                  {currentUser?.role?.name}
                </span>
              </div>
            )}
            <button
              onClick={logout}
              title="Keluar"
              className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-sidebar-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-colors duration-200"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
