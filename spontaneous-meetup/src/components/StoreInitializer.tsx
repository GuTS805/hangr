"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";

export default function StoreInitializer() {
  const pathname = usePathname();
  const { initAuth } = useStore();

  useEffect(() => {
    // Skip only on callback — it handles its own session exchange
    if (pathname === "/auth/callback") return;
    initAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
