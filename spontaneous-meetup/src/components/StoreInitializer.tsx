"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";

export default function StoreInitializer() {
  const pathname = usePathname();
  const { initAuth } = useStore();

  useEffect(() => {
    if (pathname === "/auth/callback") return;
    initAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Background geo prefetch — runs silently if permission already granted.
  // By the time the user opens the map, position is ready instantly.
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;

    function prefetch() {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          useStore.getState().setCachedUserPos({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {}, // silently ignore — user just hasn't granted yet
        { timeout: 8000, maximumAge: 60000, enableHighAccuracy: false },
      );
    }

    if (navigator.permissions) {
      // Only fetch if already granted — don't trigger a prompt
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        if (result.state === "granted") prefetch();

        // If they grant permission later during this session, prefetch then
        result.onchange = () => { if (result.state === "granted") prefetch(); };
      }).catch(() => {});
    } else {
      // Permissions API not available (some browsers) — try silently, will fail quietly if not granted
      prefetch();
    }
  }, []);

  // On tab/browser close, mark user offline immediately
  useEffect(() => {
    function handleUnload() {
      const { isFree } = useStore.getState();
      if (!isFree) return;
      fetch("/api/go-offline", { method: "POST", keepalive: true });
    }
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, []);

  return null;
}
