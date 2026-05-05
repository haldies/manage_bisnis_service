import { useEffect } from "react";
import { useRouter } from "next/router";

export default function ManagePrintersRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/settings?tab=printer");
  }, [router]);
  return null;
}
