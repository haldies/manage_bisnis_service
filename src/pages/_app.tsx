import "@/styles/globals.css";
import type { AppProps } from "next/app";

import { TooltipProvider } from "@/components/ui/tooltip";

import { useEffect } from "react";
import { usePosStore } from "@/lib/store";

export default function App({ Component, pageProps }: AppProps) {
  const fetchInitialData = usePosStore((s) => s.fetchInitialData);
  const currentUser = usePosStore((s) => s.currentUser);
  const setHasHydrated = usePosStore((s) => s.setHasHydrated);
  const _hasHydrated = usePosStore((s) => s._hasHydrated);

  // Safety net: if Zustand persist rehydration never fires (e.g. SSR, corrupt storage),
  // force hydrated=true after a short timeout so the app doesn't get stuck on "Memuat..."
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!usePosStore.getState()._hasHydrated) {
        setHasHydrated(true);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [setHasHydrated]);

  // Only fetch initial data when user is logged in
  useEffect(() => {
    if (currentUser) {
      fetchInitialData();
    }
  }, [currentUser?.id, fetchInitialData]);

  return (
    <TooltipProvider>
      <Component {...pageProps} />
    </TooltipProvider>
  );
}

