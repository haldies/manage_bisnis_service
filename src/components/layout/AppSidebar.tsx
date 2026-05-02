"use client";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  ReceiptText,
  Package,
  User,
  Circle,
  Printer,
  Wrench,
  LineChart,
  Smartphone,
  Users,
  LogOut,
  MapPin,
  Settings,
  ChevronRight,
  Search,
  Command
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePosStore } from "@/lib/store";
import { ModuleName, AccessLevel } from "@/lib/types";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarRail,
} from "@/components/ui/sidebar";

const NAV_GROUPS: { 
  label: string, 
  items: { label: string, href: string, icon: any, module: ModuleName, requiredLevel?: AccessLevel }[] 
}[] = [
  {
    label: "Monitoring",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LineChart, module: 'Finance', requiredLevel: 'Read' },
    ]
  },
  {
    label: "Operasional",
    items: [
      { label: "Kasir", href: "/?view=cashier", icon: Smartphone, module: 'Cashier', requiredLevel: 'Read' },
      { label: "Servis Device", href: "/service", icon: Wrench, module: 'Service', requiredLevel: 'Read' },
      { label: "Riwayat Transaksi", href: "/transactions", icon: ReceiptText, module: 'Transactions', requiredLevel: 'Read' },
    ]
  },
  {
    label: "Manajemen Data",
    items: [
      { label: "Produk & Inventori", href: "/inventory", icon: Package, module: 'Inventory', requiredLevel: 'Read' },
      { label: "Staf & Payroll", href: "/staff", icon: Users, module: 'Staff', requiredLevel: 'Read' },
      { label: "Manajemen Cabang", href: "/branches", icon: MapPin, module: 'Finance', requiredLevel: 'Full' },
      { label: "Laporan", href: "/finance", icon: LineChart, module: 'Finance', requiredLevel: 'Read' },
    ]
  }
];

export function AppSidebar() {
  const router = useRouter();
  const { currentUser, currentBranch, logout, rolePermissions } = usePosStore();

  const isModuleAllowed = (module: ModuleName, requiredLevel: AccessLevel = 'Read') => {
    if (!currentUser) return false;
    // Admin has full access implicitly
    if (currentUser.role === 'Admin') return true;
    
    const permissions = rolePermissions[currentUser.role];
    const userLevel = permissions?.[module] || 'None';
    
    const levels: AccessLevel[] = ['None', 'Read', 'Full'];
    return levels.indexOf(userLevel) >= levels.indexOf(requiredLevel);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarHeader className="h-16 flex flex-col justify-center px-4">
        <div className="flex flex-col truncate group-data-[collapsible=icon]:hidden">
          {currentBranch && (
            <span className="ui-title truncate font-black text-foreground uppercase tracking-widest">
              {currentBranch.name.replace('Kasirai ', '')}
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {NAV_GROUPS.map((group) => {
          const allowedItems = group.items.filter(item => isModuleAllowed(item.module, item.requiredLevel));
          if (allowedItems.length === 0) return null;

          return (
            <SidebarGroup key={group.label} className="py-2">
              <SidebarGroupLabel className="ui-meta px-3 mb-1 opacity-40 group-data-[collapsible=icon]:hidden">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {allowedItems.map((item) => {
                    const isActive = item.href === "/" 
                      ? router.pathname === "/" 
                      : router.pathname.startsWith(item.href);
                    
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                          className={cn(
                            "h-9 px-3 rounded-lg transition-all duration-200",
                            isActive 
                              ? "bg-foreground text-background font-black" 
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground font-bold"
                          )}
                        >
                          <Link href={item.href} className="flex items-center">
                            <span className="ui-badge uppercase tracking-tight text-[11px]">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}

        <SidebarSeparator className="my-4 opacity-50" />

        <SidebarGroup className="py-1">
          <SidebarMenu>
             <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={router.pathname === "/manage-printers"}
                  tooltip="Konfigurasi Printer"
                  className={cn(
                    "h-9 px-3 rounded-lg",
                    router.pathname === "/manage-printers" ? "bg-foreground text-background font-black" : "text-muted-foreground hover:bg-muted/50 font-bold"
                  )}
                >
                  <Link href="/manage-printers">
                    <span className="ui-badge uppercase tracking-tight text-[11px]">Printer Settings</span>
                  </Link>
                </SidebarMenuButton>
             </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
