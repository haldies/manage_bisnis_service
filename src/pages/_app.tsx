import "@/styles/globals.css";
import type { AppProps } from "next/app";

import { TooltipProvider } from "@/components/ui/tooltip";

import { useEffect } from "react";
import { usePosStore } from "@/lib/store";

export default function App({ Component, pageProps }: AppProps) {
  const fetchInitialData = usePosStore((s) => s.fetchInitialData);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  return (
    <TooltipProvider>
      <Component {...pageProps} />
    </TooltipProvider>
  );
}

