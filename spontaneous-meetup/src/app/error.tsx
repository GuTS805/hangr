"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F2F1EB] flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <p className="text-[100px] font-black uppercase leading-none text-black">ERR</p>
        <div
          className="mb-6 px-6 py-5"
          style={{ border: "2px solid #FF2D2D", background: "#FF2D2D", boxShadow: "4px 4px 0 #0A0A0A" }}
        >
          <p className="text-xl font-black uppercase tracking-tight text-white">Something went wrong</p>
          <p className="text-xs font-mono text-white/70 mt-1 uppercase tracking-wider">
            An unexpected error occurred.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-3 text-sm font-black uppercase tracking-wide transition-all"
            style={{
              border: "2px solid #0A0A0A",
              background: "#FFE500",
              color: "#0A0A0A",
              boxShadow: "4px 4px 0 #0A0A0A",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translate(4px,4px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "";
              (e.currentTarget as HTMLElement).style.boxShadow = "4px 4px 0 #0A0A0A";
            }}
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-5 py-3 text-sm font-black uppercase tracking-wide transition-all"
            style={{ border: "2px solid #0A0A0A", background: "#fff", color: "#0A0A0A" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#0A0A0A"; (e.currentTarget as HTMLElement).style.color = "#FFE500"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.color = "#0A0A0A"; }}
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
