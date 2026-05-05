import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Role, ModuleName, AccessLevel } from "@/lib/types";
import { useState } from "react";
import { Trash2, Plus, Loader2, RotateCcw } from "lucide-react";
import { usePosStore } from "@/lib/store";

interface RolePermissionTableProps {
  rolePermissions: any;
  updateRolePermission: (role: Role | string, module: ModuleName, level: AccessLevel) => void;
}

const MODULES: ModuleName[] = ['Cashier', 'Service', 'Inventory', 'Finance', 'Staff', 'Transactions', 'Printers'];

export function RolePermissionTable({ rolePermissions, updateRolePermission }: RolePermissionTableProps) {
  const { addRole, deleteRole, renameRole, resetRoles } = usePosStore();

  const [newRoleName, setNewRoleName] = useState("");
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const allRoles = Object.keys(rolePermissions || {}).filter(roleName => roleName !== 'Admin');

  const handleAddRole = async () => {
    const trimmed = newRoleName.trim();
    if (!trimmed || allRoles.includes(trimmed) || trimmed === 'Admin') return;
    setIsAdding(true);
    setError(null);
    try {
      await addRole(trimmed);
      setNewRoleName("");
    } catch (e: any) {
      setError(e.message || 'Gagal menambahkan role');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteRole = async (role: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus role "${role}"?`)) return;
    setError(null);
    try {
      await deleteRole(role);
    } catch (e: any) {
      setError(e.message || 'Gagal menghapus role');
    }
  };

  const handleResetRoles = async () => {
    if (!confirm('Reset semua role ke default? Semua role kustom akan dihapus dan dibuat ulang dengan Owner, Kasir, Teknisi, Admin.\n\nLanjutkan?')) return;
    setIsResetting(true);
    setError(null);
    try {
      await resetRoles(true);
    } catch (e: any) {
      setError(e.message || 'Gagal mereset role');
    } finally {
      setIsResetting(false);
    }
  };

  const handleStartEdit = (role: string) => {
    setEditingRole(role);
    setEditingName(role);
  };

  const handleFinishEdit = async () => {
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== editingRole && !allRoles.includes(trimmed) && trimmed !== 'Admin') {
      setError(null);
      try {
        await renameRole(editingRole!, trimmed);
      } catch (e: any) {
        setError(e.message || 'Gagal mengubah nama role');
      }
    }
    setEditingRole(null);
    setEditingName("");
  };

  const handlePermissionChange = async (role: string, module: ModuleName, level: AccessLevel) => {
    const key = `${role}:${module}`;
    setSavingCell(key);
    setError(null);
    try {
      await updateRolePermission(role, module, level);
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan perubahan');
    } finally {
      setSavingCell(null);
    }
  };

  const levelColor = (level: string) => {
    if (level === "Full") return "bg-primary/10 text-primary border-primary/20";
    if (level === "Read") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    return "bg-muted/30 text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      {/* Add Custom Role + Reset */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Nama role baru (cth: Supervisor)"
          className="h-9 max-w-xs bg-muted/20 border-none text-sm"
          value={newRoleName}
          onChange={(e) => setNewRoleName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddRole()}
          disabled={isAdding}
        />
        <Button onClick={handleAddRole} size="sm" className="h-9 gap-1.5 rounded-lg text-xs" disabled={isAdding}>
          {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Tambah Role
        </Button>
        <Button
          onClick={handleResetRoles}
          size="sm"
          variant="outline"
          className="h-9 gap-1.5 rounded-lg text-xs text-muted-foreground ml-auto"
          disabled={isResetting}
        >
          {isResetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          Reset ke Default
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-500 font-semibold px-1">{error}</p>
      )}

      {/* Permission Table */}
      <div className="rounded-xl border border-border/40 bg-card overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/10">
            <TableRow className="hover:bg-transparent border-b border-border/40">
              <TableHead className="ui-label py-4 pl-6 uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                MODUL APLIKASI
              </TableHead>
              {allRoles.map((role) => (
                <TableHead key={role} className="ui-label py-4 text-center uppercase tracking-widest text-foreground font-bold whitespace-nowrap">
                  {editingRole === role ? (
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={handleFinishEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleFinishEdit();
                        if (e.key === "Escape") setEditingRole(null);
                      }}
                      className="w-24 text-center text-xs font-bold bg-muted border border-border rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-primary"
                    />
                  ) : (
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleStartEdit(role)}
                        className="hover:text-primary transition-colors underline-offset-2 hover:underline cursor-text"
                        title="Klik untuk edit nama role"
                      >
                        {role}
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role)}
                        className="text-red-400 hover:text-red-600 transition-colors ml-1"
                        title={`Hapus role ${role}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </TableHead>
              ))}
              {allRoles.length === 0 && (
                <TableHead className="py-4 text-center text-muted-foreground font-normal italic">
                  Belum ada role, silakan tambahkan.
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {MODULES.map((module) => (
              <TableRow key={module} className="hover:bg-muted/5 border-b border-border/10 last:border-0">
                <TableCell className="py-4 pl-6 whitespace-nowrap">
                  <span className="font-medium text-[13px] text-foreground">{module}</span>
                </TableCell>
                {allRoles.map((role) => {
                  const level = rolePermissions[role]?.[module] || "None";
                  const key = `${role}:${module}`;
                  const isSaving = savingCell === key;
                  return (
                    <TableCell key={role} className="py-4 text-center">
                      <div className="relative inline-flex items-center justify-center">
                        {isSaving && (
                          <Loader2 className="absolute h-3 w-3 animate-spin text-muted-foreground z-10" />
                        )}
                        <Select
                          value={level}
                          onValueChange={(v: AccessLevel) => handlePermissionChange(role, module, v)}
                          disabled={isSaving}
                        >
                          <SelectTrigger
                            className={cn(
                              "h-8 mx-auto w-28 border-border/40 text-xs font-medium",
                              levelColor(level),
                              isSaving && "opacity-50"
                            )}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="None">Tidak Ada</SelectItem>
                            <SelectItem value="Read">Baca Saja</SelectItem>
                            <SelectItem value="Full">Penuh</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  );
                })}
                {allRoles.length === 0 && <TableCell />}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-[11px] text-muted-foreground px-1">
        * Role <strong>Owner</strong> secara otomatis memiliki akses <strong>Penuh</strong> ke seluruh modul. Perubahan hak akses langsung tersimpan ke database.
      </p>
    </div>
  );
}
