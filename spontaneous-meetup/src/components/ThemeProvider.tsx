"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

export default function ThemeProvider() {
  const { darkMode, toggleDarkMode } = useStore();

  // On first mount: read saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("hangr_dark");
    if (saved === "true" && !darkMode) toggleDarkMode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync dark class to <html> whenever darkMode changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return null;
}
