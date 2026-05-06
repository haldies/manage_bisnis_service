"use client";
import { useState, useEffect, useMemo } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePosStore } from "@/lib/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, Search
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Role, isSuperAdmin } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";

import { StaffRoster } from "@/components/staff/StaffRoster";
import { AttendanceTable } from "@/components/staff/AttendanceTable";
import { PayrollReport } from "@/components/staff/PayrollReport";
import { PayrollSettings } from "@/components/staff/PayrollSettings";
import { OperationalTab } from "@/components/staff/OperationalTab";
import { RolePermissionTable } from "@/components/staff/RolePermissionTable";
import { StaffDialog } from "@/components/staff/StaffDialog";
import { DragScroll } from "@/components/ui/drag-scroll";

export default function StaffManagementPage() {
  const { 
    users, addUser, removeUser,
    cashAdvances, leaveRequests, overtimes, addCashAdvance, updateCashAdvance,
    addLeaveRequest, updateLeaveRequest, addOvertime, updateOvertime,
    updateRolePermission, updateUser, attendances, 
    storeProfile, updateStoreProfile, services, transactions,
    roles, bonusPools, addBonusPool, removeBonusPool
  } = usePosStore();

  const { user: currentUser, branch: currentBranch, branches, isSuperAdmin: isOwner, setBranch, canAccess } = useAuth();

  const [activeTab, setActiveTab] = useState("roster");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const defaultRole = roles.find((r: Role) => !isSuperAdmin(r.name))?.id || roles[0]?.id || "";

  const [newUser, setNewUser] = useState({
    name: "",
    username: "",
    phone: "",
    address: "",
    roleId: defaultRole,
    branchId: "all",
    password: "",
    baseSalary: "" as any,
    leaveQuota: "12" as any,
    allowance: "" as any,
    wageType: "Monthly" as any,
    wageRate: "" as any,
    insuranceDed: "" as any,
    incentiveRate: "" as any,
    incentiveType: "None" as any
  });

  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setNewUser({
      name: user.name,
      username: user.username || "",
      phone: user.phone || "",
      address: user.address || "",
      roleId: user.roleId || "",
      branchId: user.branchId || "all",
      password: user.password || "",
      baseSalary: user.baseSalary?.toString() || "",
      leaveQuota: user.leaveQuota?.toString() || "12",
      allowance: user.allowance?.toString() || "",
      wageType: user.wageType || "Monthly",
      wageRate: user.wageRate?.toString() || "",
      insuranceDed: user.insuranceDed?.toString() || "",
      incentiveRate: user.incentiveRate?.toString() || "",
      incentiveType: user.incentiveType || "None"
    });
    setIsDialogOpen(true);
  };

  const handleAddOrUpdateStaff = async () => {
    if (!newUser.name) return;
    try {
      const userToSave = {
        ...newUser,
        branchId: newUser.branchId === 'all' ? undefined : newUser.branchId,
        wageType: 'Monthly' as any,
        baseSalary: parseFloat(newUser.baseSalary as any) || 0,
        leaveQuota: parseInt(newUser.leaveQuota as any) || 12,
        allowance: 0, 
        wageRate: 0, 
        insuranceDed: 0,
        incentiveRate: parseFloat(newUser.incentiveRate as any) || 0,
        incentiveType: newUser.incentiveType || "None"
      };

      if (editingUser) {
        await updateUser(editingUser.id, userToSave);
      } else {
        await addUser(userToSave);
      }
      setNewUser({ name: "", username: "", phone: "", address: "", roleId: defaultRole, branchId: "all", password: "", baseSalary: "" as any, leaveQuota: "12", allowance: "" as any, wageType: "Monthly", wageRate: "" as any, insuranceDed: "" as any, incentiveRate: "" as any, incentiveType: "None" });
      setEditingUser(null);
      setIsDialogOpen(false);
    } catch (e) {
      alert("Failed to save staff data");
    }
  };

  const calculateTHP = (user: any) => {
    const now = new Date();
    const payDay = storeProfile.payDay || 1;
    let startDate: Date;
    let endDate: Date;

    if (payDay === 1) {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else {
      if (now.getDate() >= payDay) {
        startDate = new Date(now.getFullYear(), now.getMonth(), payDay);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, payDay - 1, 23, 59, 59);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, payDay);
        endDate = new Date(now.getFullYear(), now.getMonth(), payDay - 1, 23, 59, 59);
      }
    }

    const isInPeriod = (dateVal: any) => {
      const d = new Date(dateVal);
      return d >= startDate && d <= endDate;
    };

    const logs = attendances.filter(a => a.employeeId === user.id && isInPeriod(a.date));
    const presentCount = logs.filter(l => l.status === 'Present' || l.status === 'Late').length;
    
    const wageType = user.wageType || 'Monthly';
    const wageRate = Number(user.wageRate || 0);
    const baseSalary = Number(user.baseSalary || storeProfile.baseSalary || 0);

    let base = 0;
    if (wageType === 'Monthly') base = baseSalary;
    else if (wageType === 'Daily') base = wageRate * presentCount;
    else if (wageType === 'Hourly') base = wageRate * (presentCount * 8);

    let totalIncentive = 0;
    const userIncentiveSource = user.incentiveType || 'None'; // This is the source in schema
    const userIncentiveMode = user.incentiveMode || 'Percentage';
    const userIncentiveRate = Number(user.incentiveRate || 0);

    const totalWorkDays = Number(storeProfile.totalWorkDays || 26);
    const approvedLeaves = leaveRequests.filter(l => l.employeeId === user.id && l.status === 'Approved' && isInPeriod(l.startDate));
    const leaveDays = approvedLeaves.length;

    if (userIncentiveSource === 'Service' || userIncentiveSource === 'All') {
      const techTickets = (services || []).filter(s => 
        s.technicianId === user.id && 
        (s.status === 'Completed' || s.status === 'Returned') &&
        isInPeriod(s.updatedAt || s.dateOpened)
      );
      
      totalIncentive += techTickets.reduce((sum, t) => {
        const fee = Number(t.serviceFee || 0);
        // Priority: Ticket Custom > Global/User settings
        const tType = t.incentiveType || 'Percentage';
        const tValue = Number(t.incentiveValue || 0);

        if (tValue > 0) {
          if (tType === 'Flat') return sum + tValue;
          return sum + (fee * tValue / 100);
        }

        // Use User/Global settings if ticket is 0
        if (userIncentiveMode === 'Flat') return sum + userIncentiveRate;
        return sum + (fee * userIncentiveRate / 100);
      }, 0);
    }

    if (userIncentiveSource === 'Retail' || userIncentiveSource === 'All') {
      const userTransactions = (transactions || []).filter(t => t.cashierId === user.id && t.status === 'Success' && isInPeriod(t.date));
      if (userIncentiveMode === 'Flat') {
        totalIncentive += userTransactions.length * userIncentiveRate;
      } else {
        totalIncentive += userTransactions.reduce((sum, t) => sum + (Number(t.total) * userIncentiveRate / 100), 0);
      }
    }

    if (userIncentiveSource === 'Profit' || userIncentiveSource === 'All') {
      // Calculate Branch Profit for current period
      const branchTransactions = transactions.filter(t => t.branchId === user.branchId && t.status === 'Success' && isInPeriod(t.date));
      const totalRevenue = branchTransactions.reduce((sum, t) => sum + Number(t.total), 0);
      const totalCost = branchTransactions.reduce((sum, t) => {
        const itemCost = t.items.reduce((iSum, item) => iSum + (Number(item.costPrice || 0) * item.quantity), 0);
        return sum + itemCost;
      }, 0);
      // Finance logs expenses
      const { financeLogs } = usePosStore.getState(); // Get directly from store
      const branchExpenses = (financeLogs || []).filter(l => l.branchId === user.branchId && l.type === 'Expense' && isInPeriod(l.date));
      const totalExpenses = branchExpenses.reduce((sum, l) => sum + Number(l.amount), 0);
      
      const netProfit = Math.max(0, totalRevenue - totalCost - totalExpenses);
      
      if (userIncentiveMode === 'Flat') {
        if (netProfit > 0) totalIncentive += userIncentiveRate;
      } else {
        totalIncentive += (netProfit * userIncentiveRate / 100);
      }
    }

    // Shared Bonus Pool Logic (Granular Targeting)
    let totalSharedBonus = 0;
    const currentMonth = startDate.getMonth() + 1;
    const currentYear = startDate.getFullYear();

    const activePools = (bonusPools || []).filter(p => p.month === currentMonth && p.year === currentYear);

    activePools.forEach(p => {
      // 1. Direct Employee Target
      if (p.employeeId) {
        if (p.employeeId === user.id) {
          totalSharedBonus += Number(p.amount);
        }
        return;
      }

      // 2. Group Targets (All, Branch, or Role)
      const isBranchMatch = !p.branchId || p.branchId === user.branchId;
      const isRoleMatch = !p.roleId || p.roleId === user.roleId;

      if (isBranchMatch && isRoleMatch) {
        // Calculate how many people share this pool
        const eligibleUsers = users.filter(u => {
          const branchOk = !p.branchId || u.branchId === p.branchId;
          const roleOk = !p.roleId || u.roleId === p.roleId;
          return branchOk && roleOk;
        });

        if (eligibleUsers.length > 0) {
          totalSharedBonus += Number(p.amount) / eligibleUsers.length;
        }
      }
    });

    // THR Logic
    let thrBonus = 0;
    const thrMonth = storeProfile.thrMonth;
    const thrMinMonths = storeProfile.thrMinWorkMonths ?? 12;
    
    if (thrMonth && (startDate.getMonth() + 1) === thrMonth) {
      const joinDate = new Date(user.joinDate || user.createdAt);
      const diffTime = Math.abs(now.getTime() - joinDate.getTime());
      const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44)); // Average month length
      
      if (diffMonths >= thrMinMonths) {
        thrBonus = baseSalary * (storeProfile.thrMultiplier || 1); 
      }
    }

    const userAdvances = cashAdvances.filter(c => c.employeeId === user.id && c.status === 'Approved' && isInPeriod(c.date));
    const totalAdvance = userAdvances.reduce((sum, c) => sum + Number(c.amount), 0);
    const insurance = Number(user.insuranceDed || 0);
    
    // Proportional Alpha Deduction: Only count Alpha for days that have already passed
    const dailyRate = totalWorkDays > 0 ? baseSalary / totalWorkDays : 0;
    
    const periodEnd = new Date(endDate);
    const today = new Date();
    const effectiveEnd = periodEnd > today ? today : periodEnd;
    const daysPassedInPeriod = Math.max(1, Math.ceil((effectiveEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Alpha is (Days Passed) - (Days Present + Approved Leaves)
    const alphaDays = Math.max(0, daysPassedInPeriod - (presentCount + leaveDays));
    const totalAbsentPenalty = alphaDays * dailyRate;
    
    // Fixed late penalty removed as per user request (no more manual input)
    const totalLatePenalty = 0; 


    const userOvertimes = overtimes.filter(o => o.employeeId === user.id && o.status === 'Approved' && isInPeriod(o.date));
    const totalOvertimeHours = userOvertimes.reduce((sum, o) => sum + Number(o.hours), 0);
    const totalOvertimePay = totalOvertimeHours * Number(storeProfile.overtimeRate || 0);

    const totalDeductions = totalAdvance + insurance + totalLatePenalty + totalAbsentPenalty;

    return {
      base, 
      attendanceBonus: totalSharedBonus, // Using this slot for Shared Bonus
      incentive: totalIncentive,
      thr: thrBonus,
      deductions: totalDeductions,
      thp: base + totalSharedBonus + totalIncentive + thrBonus + totalOvertimePay - totalDeductions,
      advances: totalAdvance, 
      insurance,
      latePenalty: totalLatePenalty,
      absentPenalty: totalAbsentPenalty,
      overtimePay: totalOvertimePay,
      overtimeHours: totalOvertimeHours,
      alphaDays,
      presentCount,
      wageType,
      wageRate
    };
  };

  const handleDownloadPDF = async (user: any) => {
    const data = calculateTHP(user);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Styles
    const margin = 20;
    let y = 30;

    // Header
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.text("SLIP GAJI KARYAWAN", margin, y);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Periode: ${new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`, margin, y + 8);
    
    pdf.setFont("helvetica", "bold");
    pdf.text("KASIRAI POS", 190, y, { align: "right" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text("Premium Business Solution", 190, y + 4, { align: "right" });

    y += 20;
    pdf.setLineWidth(0.8);
    pdf.line(margin, y, 190, y);

    // Employee Info
    y += 15;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("INFORMASI PEGAWAI", margin, y);
    
    y += 10;
    pdf.setFont("helvetica", "normal");
    pdf.text("Nama", margin, y);
    pdf.text(`: ${user.name}`, margin + 30, y);
    
    y += 6;
    pdf.text("Jabatan", margin, y);
    pdf.text(`: ${user.role?.name || '-'}`, margin + 30, y);
    
    y += 6;
    pdf.text("Cabang", margin, y);
    pdf.text(`: ${user.branchId || 'Global'}`, margin + 30, y);

    // Earnings
    y += 15;
    pdf.setFont("helvetica", "bold");
    pdf.text("RINCIAN PENGHASILAN", margin, y);
    pdf.setLineWidth(0.2);
    pdf.line(margin, y + 2, 190, y + 2);

    y += 10;
    pdf.setFont("helvetica", "normal");
    pdf.text("Gaji Pokok", margin, y);
    pdf.text(formatCurrency(data.base), 190, y, { align: "right" });

    if (data.incentive > 0) {
      y += 6;
      pdf.text("Komisi Penjualan / Jasa", margin, y);
      pdf.text(`+ ${formatCurrency(data.incentive)}`, 190, y, { align: "right" });
    }

    if (data.attendanceBonus > 0) {
      y += 6;
      pdf.text("Bonus Sharing (Tim)", margin, y);
      pdf.text(`+ ${formatCurrency(data.attendanceBonus)}`, 190, y, { align: "right" });
    }

    if (data.thr > 0) {
      y += 6;
      pdf.setFont("helvetica", "bold");
      pdf.text("THR (Tunjangan Hari Raya)", margin, y);
      pdf.text(`+ ${formatCurrency(data.thr)}`, 190, y, { align: "right" });
      pdf.setFont("helvetica", "normal");
    }

    if (data.overtimePay > 0) {
      y += 6;
      pdf.text(`Lembur (${data.overtimeHours} Jam)`, margin, y);
      pdf.text(`+ ${formatCurrency(data.overtimePay)}`, 190, y, { align: "right" });
    }

    // Deductions
    y += 15;
    pdf.setFont("helvetica", "bold");
    pdf.text("POTONGAN & KASBON", margin, y);
    pdf.line(margin, y + 2, 190, y + 2);

    y += 10;
    pdf.setFont("helvetica", "normal");
    if (data.advances > 0) {
      pdf.text("Kasbon / Pinjaman", margin, y);
      pdf.text(`- ${formatCurrency(data.advances)}`, 190, y, { align: "right" });
      y += 6;
    }

    if (data.absentPenalty > 0) {
      pdf.text(`Potongan Alpha (${data.alphaDays} Hari)`, margin, y);
      pdf.text(`- ${formatCurrency(data.absentPenalty)}`, 190, y, { align: "right" });
      y += 6;
    }

    if (data.insurance > 0) {
      pdf.text("BPJS / Asuransi", margin, y);
      pdf.text(`- ${formatCurrency(data.insurance)}`, 190, y, { align: "right" });
      y += 6;
    }

    if (data.advances === 0 && data.absentPenalty === 0 && data.insurance === 0) {
      pdf.setFont("helvetica", "italic");
      pdf.text("Tidak ada potongan (Disiplin)", margin, y);
      pdf.setFont("helvetica", "normal");
    }

    // Total
    y += 20;
    pdf.setFillColor(245, 245, 245);
    pdf.rect(margin, y - 5, 170, 15, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("TOTAL GAJI DITERIMA (THP)", margin + 5, y + 4);
    pdf.text(formatCurrency(data.thp), 185, y + 4, { align: "right" });

    // Signatures
    y += 40;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "italic");
    pdf.text("Penerima,", margin + 20, y);
    pdf.text("Manajemen Kasirai,", 140, y);

    y += 25;
    pdf.setFont("helvetica", "bold");
    pdf.text(user.name, margin + 20, y);
    pdf.text("Authorized Signature", 140, y);
    
    // Preview in new tab instead of direct download
    const blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchBranch = !currentBranch || u.branchId === currentBranch.id;
      const matchSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (u.username || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchBranch && matchSearch;
    });
  }, [users, currentBranch, searchQuery]);

  const filteredAttendances = useMemo(() => {
    return attendances.filter(log => !currentBranch || log.branchId === currentBranch.id);
  }, [attendances, currentBranch]);

  const filteredCashAdvances = useMemo(() => {
    return cashAdvances.filter(c => {
      const user = users.find(u => u.id === c.employeeId);
      return !currentBranch || user?.branchId === currentBranch.id;
    });
  }, [cashAdvances, users, currentBranch]);

  const filteredLeaveRequests = useMemo(() => {
    return leaveRequests.filter(l => {
      const user = users.find(u => u.id === l.employeeId);
      return !currentBranch || user?.branchId === currentBranch.id;
    });
  }, [leaveRequests, users, currentBranch]);

  const filteredOvertimes = useMemo(() => {
    return (overtimes || []).filter(o => {
      const user = users.find(u => u.id === o.employeeId);
      return !currentBranch || user?.branchId === currentBranch.id;
    });
  }, [overtimes, users, currentBranch]);

  // Handle auto-branch selection for new staff
  useEffect(() => {
    if (currentBranch && !editingUser) {
      setNewUser(prev => ({ ...prev, branchId: currentBranch.id }));
    } else if (!currentBranch && !editingUser) {
      setNewUser(prev => ({ ...prev, branchId: 'all' }));
    }
  }, [currentBranch, editingUser]);

  return (
    <Layout title="Manajemen Staf & Payroll" requiredModule="Staff" requiredLevel="Read">
      <div className="space-y-6 pb-24 animate-in fade-in duration-700">
        
        {/* Modern Context Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-card border border-border/40 p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">Ketenagakerjaan</h2>
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {currentBranch ? `Cabang: ${currentBranch.name}` : "Semua Cabang (Global)"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {isOwner && (
              <Select 
                value={currentBranch?.id || 'global'} 
                onValueChange={(value) => setBranch(value === 'global' ? null : value)}
              >
                <SelectTrigger className="h-11 w-full lg:w-[200px] rounded-xl bg-muted/20 border-none px-4 ui-label uppercase tracking-widest focus:ring-0">
                  <MapPin className="h-4 w-4 mr-2 text-primary" />
                  <SelectValue placeholder="Semua Cabang" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/40 shadow-2xl">
                  <SelectItem value="global" className="ui-label uppercase py-3 font-bold">Seluruh Cabang</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id} className="ui-label uppercase py-3">
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="relative flex-1 lg:w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
              <Input 
                placeholder="Cari nama atau username..." 
                className="pl-12 h-11 rounded-xl bg-muted/20 border-none focus:ring-0" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Button 
              className="h-11 px-8 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-bold uppercase tracking-widest text-[10px]" 
              onClick={() => { setEditingUser(null); setIsDialogOpen(true); }}
              disabled={!canAccess('Staff', 'Full')}
            >
              Tambah Staf
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
          <DragScroll className="-mx-4 px-4 mb-8 py-1">
            <TabsList className="bg-muted/10 p-1 h-11 rounded-lg inline-flex flex-nowrap min-w-max gap-0">
              {[
                { id: 'roster', label: 'Pegawai' },
                { id: 'attendance', label: 'Presensi' },
                { id: 'operasional', label: 'Kasbon & Cuti' },
                { id: 'payroll', label: 'Laporan Gaji' },
                { id: 'payroll-settings', label: 'Pengaturan Gaji' },
              ].map(tab => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="rounded-md px-5 ui-label data-[state=active]:bg-foreground data-[state=active]:text-background shrink-0 whitespace-nowrap"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </DragScroll>

              <TabsContent value="roster" className="m-0">
                <StaffRoster 
                  users={filteredUsers} 
                  branches={branches} 
                  storeProfile={storeProfile} 
                  onEdit={handleOpenEdit} 
                  onDelete={removeUser} 
                />
              </TabsContent>

              <TabsContent value="attendance" className="m-0 space-y-6">
                <AttendanceTable attendances={filteredAttendances} />
              </TabsContent>

              <TabsContent value="payroll" className="m-0">
                <PayrollReport 
                  users={filteredUsers} 
                  calculateTHP={calculateTHP} 
                  handleDownloadPDF={handleDownloadPDF} 
                />
              </TabsContent>

              <TabsContent value="payroll-settings" className="m-0">
                <PayrollSettings 
                  storeProfile={storeProfile} 
                  updateStoreProfile={updateStoreProfile} 
                />
              </TabsContent>

              <TabsContent value="operasional" className="m-0">
                <OperationalTab 
                  users={filteredUsers} 
                  cashAdvances={filteredCashAdvances} 
                  leaveRequests={filteredLeaveRequests} 
                  overtimes={filteredOvertimes}
                  addCashAdvance={addCashAdvance}
                  updateCashAdvance={updateCashAdvance}
                  addLeaveRequest={addLeaveRequest}
                  updateLeaveRequest={updateLeaveRequest}
                  addOvertime={addOvertime}
                  updateOvertime={updateOvertime}
                  bonusPools={bonusPools}
                  addBonusPool={addBonusPool}
                  removeBonusPool={removeBonusPool}
                  roles={roles}
                  branches={branches}
                />
              </TabsContent>

            </Tabs>

        <StaffDialog 
          isOpen={isDialogOpen} 
          onOpenChange={setIsDialogOpen} 
          editingUser={editingUser} 
          newUser={newUser} 
          setNewUser={setNewUser} 
          onSave={handleAddOrUpdateStaff} 
          branches={branches} 
        />
      </div>
    </Layout>
  );
}
