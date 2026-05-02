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
import { Role } from "@/lib/types";

import { StaffRoster } from "@/components/staff/StaffRoster";
import { AttendanceTable } from "@/components/staff/AttendanceTable";
import { PayrollReport } from "@/components/staff/PayrollReport";
import { PayrollSettings } from "@/components/staff/PayrollSettings";
import { OperationalTab } from "@/components/staff/OperationalTab";
import { RolePermissionTable } from "@/components/staff/RolePermissionTable";
import { StaffDialog } from "@/components/staff/StaffDialog";

export default function StaffManagementPage() {
  const { 
    users, branches, addUser, removeUser, currentUser, currentBranch,
    cashAdvances, leaveRequests, overtimes, addCashAdvance, updateCashAdvance,
    addLeaveRequest, updateLeaveRequest, addOvertime, updateOvertime,
    rolePermissions, updateRolePermission, updateUser, attendances, 
    setBranch, storeProfile, updateStoreProfile, services, transactions
  } = usePosStore();

  const [activeTab, setActiveTab] = useState("roster");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const defaultRole = Object.keys(rolePermissions).filter(r => r !== 'Admin')[0] || 'Admin';

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    role: defaultRole as Role,
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
      email: user.email || "",
      phone: user.phone || "",
      address: user.address || "",
      role: user.role,
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
      setNewUser({ name: "", email: "", phone: "", address: "", role: defaultRole, branchId: "all", password: "", baseSalary: "" as any, leaveQuota: "12", allowance: "" as any, wageType: "Monthly", wageRate: "" as any, insuranceDed: "" as any, incentiveRate: "" as any, incentiveType: "None" });
      setEditingUser(null);
      setIsDialogOpen(false);
    } catch (e) {
      alert("Failed to save staff data");
    }
  };

  const calculateTHP = (user: any) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const isCurrentMonth = (dateStr: any) => {
      const d = new Date(dateStr);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    };

    const logs = attendances.filter(a => a.employeeId === user.id && isCurrentMonth(a.createdAt));
    const presentCount = logs.filter(l => l.status === 'hadir' || l.status === 'terlambat').length;
    
    const wageType = user.wageType || 'Monthly';
    const wageRate = user.wageRate || 0;
    const baseSalary = user.baseSalary || storeProfile.baseSalary || 0;

    let base = 0;
    if (wageType === 'Monthly') base = baseSalary;
    else if (wageType === 'Daily') base = wageRate * presentCount;
    else if (wageType === 'Hourly') base = wageRate * (presentCount * 8);

    const totalAttendanceBonus = (storeProfile.attendanceRate || 0) * presentCount;

    let totalIncentive = 0;
    let incentiveType = user.incentiveType || 'None';
    
    // Auto-detect for technicians
    if (user.role === 'Technician' && (incentiveType === 'None' || !incentiveType)) {
      incentiveType = 'Service';
    }

    const userIncentivePercent = (user.incentiveRate !== undefined && user.incentiveRate !== null && !isNaN(user.incentiveRate) && user.incentiveRate > 0) 
      ? user.incentiveRate 
      : (storeProfile.serviceIncentive || 10);

    if (incentiveType === 'Service' || incentiveType === 'All') {
      const techTickets = services.filter(s => 
        s.technicianId === user.id && 
        (s.status === 'Paid' || s.status === 'Completed') &&
        isCurrentMonth(s.updatedAt || s.dateOpened)
      );
      totalIncentive += techTickets.reduce((sum, t) => sum + ((t.serviceFee || 0) * userIncentivePercent / 100), 0);
    }

    if (incentiveType === 'Retail' || incentiveType === 'All') {
      const userTransactions = transactions.filter(t => t.cashierId === user.id && isCurrentMonth(t.date));
      totalIncentive += userTransactions.reduce((sum, t) => sum + (t.total * userIncentivePercent / 100), 0);
    }

    const lateLogs = logs.filter(l => l.status === 'terlambat');
    const totalLatePenalty = lateLogs.length * (storeProfile.latePenalty || 0);

    const userAdvances = cashAdvances.filter(c => c.employeeId === user.id && c.status === 'Approved' && isCurrentMonth(c.date));
    const totalAdvance = userAdvances.reduce((sum, c) => sum + c.amount, 0);
    const insurance = user.insuranceDed || 0;
    
    // Automatic Alpha Detection
    const totalWorkDays = storeProfile.totalWorkDays || 26;
    const approvedLeaves = leaveRequests.filter(l => l.employeeId === user.id && l.status === 'Approved' && isCurrentMonth(l.startDate));
    const leaveDays = approvedLeaves.length;
    
    // Alpha is days not present and not on leave
    const alphaDays = Math.max(0, totalWorkDays - (presentCount + leaveDays));
    const totalAbsentPenalty = alphaDays * (storeProfile.absentPenalty || 0);

    const userOvertimes = overtimes.filter(o => o.employeeId === user.id && o.status === 'Approved' && isCurrentMonth(o.date));
    const totalOvertimeHours = userOvertimes.reduce((sum, o) => sum + o.hours, 0);
    const totalOvertimePay = totalOvertimeHours * (storeProfile.overtimeRate || 0);

    const totalDeductions = totalAdvance + insurance + totalLatePenalty + totalAbsentPenalty;

    return {
      base, 
      attendanceBonus: totalAttendanceBonus,
      incentive: totalIncentive,
      deductions: totalDeductions,
      thp: base + totalAttendanceBonus + totalIncentive + totalOvertimePay - totalDeductions,
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
    pdf.text(`: ${user.role}`, margin + 30, y);
    
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

    y += 6;
    pdf.text("Uang Kehadiran & Lembur", margin, y);
    pdf.text(`+ ${formatCurrency(data.attendanceBonus + data.overtimePay)}`, 190, y, { align: "right" });

    y += 6;
    pdf.text("Insentif & Bonus lainnya", margin, y);
    pdf.text(`+ ${formatCurrency(data.incentive)}`, 190, y, { align: "right" });

    // Deductions
    y += 15;
    pdf.setFont("helvetica", "bold");
    pdf.text("POTONGAN & KASBON", margin, y);
    pdf.line(margin, y + 2, 190, y + 2);

    y += 10;
    pdf.setFont("helvetica", "normal");
    pdf.text("Kasbon / Pinjaman", margin, y);
    pdf.text(`- ${formatCurrency(data.advances)}`, 190, y, { align: "right" });

    y += 6;
    pdf.text("Potongan Telat / Alpha", margin, y);
    pdf.text(`- ${formatCurrency(data.latePenalty + data.absentPenalty)}`, 190, y, { align: "right" });

    y += 6;
    pdf.text("Asuransi & Lainnya", margin, y);
    pdf.text(`- ${formatCurrency(data.insurance)}`, 190, y, { align: "right" });

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
    
    pdf.save(`Slip_Gaji_${user.name.replace(/\s+/g, '_')}.pdf`);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchBranch = !currentBranch || u.branchId === currentBranch.id;
      const matchSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (u.email || "").toLowerCase().includes(searchQuery.toLowerCase());
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
              <div className={cn("h-2 w-2 rounded-full", currentBranch ? "bg-emerald-500" : "bg-amber-500")} />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {currentBranch ? `Cabang: ${currentBranch.name}` : "Semua Cabang (Global)"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {currentUser?.role === 'Admin' && (
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
                placeholder="Cari nama atau email..." 
                className="pl-12 h-11 rounded-xl bg-muted/20 border-none focus:ring-0" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Button 
              className="h-11 px-8 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-bold uppercase tracking-widest text-[10px]" 
              onClick={() => { setEditingUser(null); setIsDialogOpen(true); }}
            >
              Tambah Staf
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
          <div className="mb-8 overflow-x-auto no-scrollbar touch-pan-x py-1">
            <TabsList className="bg-transparent p-0 gap-1 flex-nowrap w-max">
              {[
                { id: 'roster', label: 'Pegawai' },
                { id: 'attendance', label: 'Presensi' },
                { id: 'operasional', label: 'Kasbon & Cuti' },
                { id: 'payroll', label: 'Laporan Gaji' },
                { id: 'payroll-settings', label: 'Pengaturan Gaji' },
                { id: 'access', label: 'Hak Akses', adminOnly: true }
              ].filter(t => !t.adminOnly || currentUser?.role === 'Admin').map(tab => (
                <TabsTrigger 
                  key={tab.id}
                  value={tab.id} 
                  className="rounded-full px-6 py-2.5 ui-label data-[state=active]:bg-foreground data-[state=active]:text-background border border-transparent data-[state=active]:border-foreground/10 transition-all shrink-0 whitespace-nowrap"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

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
                />
              </TabsContent>

              <TabsContent value="access" className="m-0">
                <RolePermissionTable 
                  rolePermissions={rolePermissions} 
                  updateRolePermission={updateRolePermission} 
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
