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

  // When the user closes or navigates away from the site, mark them offline.
  // fetch with keepalive=true continues even after the page unloads.
  useEffect(() => {
    function handleUnload() {
      const { isFree } = useStore.getState();
      if (!isFree) return;
      fetch("/api/go-offline", {
        method: "POST",
        keepalive: true,
      });
    }

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload); // Safari / iOS
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, []);

  return null;
}
