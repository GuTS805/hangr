"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

export default function StoreInitializer() {
  const { initAuth } = useStore();

  useEffect(() => {
    initAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
