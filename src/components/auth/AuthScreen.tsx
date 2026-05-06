"use client";
import { useState, useEffect } from "react";
import { usePosStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthScreen() {
  const { login, setBranch, currentUser, currentBranch, branches } = usePosStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    const success = await login(username, password);
    if (!success) {
      setError("Login gagal. Periksa kembali akses Anda.");
    } else {
      // Auto-assign branch based on role
      const loggedInUser = usePosStore.getState().currentUser;
      if (loggedInUser?.role?.name === 'Owner') {
        setBranch(null);
      } else if (loggedInUser?.branchId) {
        setBranch(loggedInUser.branchId);
      }
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.role?.name !== 'Owner' && !currentBranch && branches.length > 0) {
      if (currentUser.branchId) {
        setBranch(currentUser.branchId);
      }
    }
  }, [currentUser, currentBranch, branches, setBranch]);

  // 1. LOGIN SCREEN
  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="rounded-md shadow-none focus-visible:ring-1"
                placeholder="Username"
              />
            </div>
            <div className="space-y-2 rounded-md">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-sm shadow-none focus-visible:ring-1"
              />
            </div>

            {error && <div className="text-destructive text-sm font-medium">{error}</div>}

            <Button 
              type="submit" 
              className="w-full rounded-md shadow-none" 
            >
              Masuk
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // 2. LOADING SCREEN (Auto-routing / Sync)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <h2 className="text-xl font-semibold tracking-tight">Memuat...</h2>
      
      {branches.length > 0 && !currentBranch && (
        <div className="mt-8 space-y-4 text-center max-w-sm">
          <p className="text-destructive text-sm font-medium">Akses ditolak atau data sesi tidak valid.</p>
          <Button 
            onClick={() => usePosStore.getState().logout()} 
            variant="outline" 
            className="w-full rounded-none shadow-none"
          >
            Kembali ke Login
          </Button>
        </div>
      )}
    </div>
  );
}
