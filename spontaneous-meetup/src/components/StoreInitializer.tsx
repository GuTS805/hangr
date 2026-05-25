"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";

export default function StoreInitializer() {
  const pathname = usePathname();
  const { initAuth } = useStore();

  useEffect(() => {
    // Skip on auth pages — callback page does its own session handling
    if (pathname.startsWith("/auth")) return;
    initAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
