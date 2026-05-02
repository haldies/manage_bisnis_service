import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface PayrollReportProps {
  users: any[];
  calculateTHP: (user: any) => any;
  handleDownloadPDF: (user: any) => void;
}

export function PayrollReport({ users, calculateTHP, handleDownloadPDF }: PayrollReportProps) {
  return (
    <div className="space-y-4">
      {users.map(user => {
        const { base, attendanceBonus, incentive, deductions, thp, latePenalty, advances, insurance, alphaDays, absentPenalty, overtimePay, overtimeHours } = calculateTHP(user);
        return (
          <Card key={user.id} className="border border-border/40 overflow-hidden rounded-2xl">
            <CardContent className="p-0">
              <div className="p-6 bg-muted/5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-border/40">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-foreground/5 flex items-center justify-center text-foreground font-bold ">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-[14px] text-foreground">{user.name}</h4>
                    <p className="ui-label opacity-60">{user.role} • {user.branchId || 'Global'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="ui-meta mb-0.5">Total Take Home Pay</p>
                    <p className="text-lg font-black text-primary">{formatCurrency(thp)}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="h-10 rounded-xl ui-label gap-2"
                    onClick={() => handleDownloadPDF(user)}
                  >
                    <FileText className="h-4 w-4" /> Slip Gaji
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-border/40">
                <div className="p-6 space-y-4">
                  <h5 className="ui-label font-bold text-foreground/40 uppercase tracking-widest">Pendapatan Pokok</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="ui-label opacity-60">Gaji Pokok</span>
                      <span className="ui-label font-bold">{formatCurrency(base)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="ui-label text-emerald-600/70">Uang Absensi</span>
                      <span className="ui-label font-bold text-emerald-600">+{formatCurrency(attendanceBonus)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <h5 className="ui-label font-bold text-foreground/40 uppercase tracking-widest">Incentive & Bonus</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="ui-label text-emerald-600/70">Servis Unit</span>
                      <span className="ui-label font-bold text-emerald-600">{formatCurrency(incentive)}</span>
                    </div>
                    {overtimePay > 0 && (
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="ui-label text-emerald-600/70">Upah Lembur</span>
                          <span className="text-[9px] text-emerald-500/60">({overtimeHours} Jam)</span>
                        </div>
                        <span className="ui-label font-bold text-emerald-600">+{formatCurrency(overtimePay)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <h5 className="ui-label font-bold text-foreground/40 uppercase tracking-widest">Potongan</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="ui-label text-red-500/70">Kasbon / Advance</span>
                      <span className="ui-label font-bold text-red-500">-{formatCurrency(advances)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="ui-label text-red-500/70">Potongan Telat</span>
                      <span className="ui-label font-bold text-red-500">-{formatCurrency(latePenalty)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="ui-label text-red-500/70">Potongan Alpha</span>
                        {alphaDays > 0 && <span className="text-[9px] text-red-400">({alphaDays} hari)</span>}
                      </div>
                      <span className="ui-label font-bold text-red-500">-{formatCurrency(absentPenalty)}</span>
                    </div>
                    {insurance > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="ui-label text-red-500/70">Asuransi/Lainnya</span>
                        <span className="ui-label font-bold text-red-500">-{formatCurrency(insurance)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
