"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Ping } from "@/types";
import { PingRow } from "@/lib/supabase";

function timeAgo(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function Avatar({ src, name }: { src: string; name: string }) {
  const isUrl = src.startsWith("http") || src.startsWith("data:");
  return isUrl ? (
    <img src={src} alt={name} referrerPolicy="no-referrer"
      className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
  ) : (
    <div className="w-9 h-9 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
      {src.slice(0, 2)}
    </div>
  );
}

export default function NotificationsPanel() {
  const { currentUser, receivedPings, loadPings, respondToPing } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Real-time: new pings arrive → add to store and reload
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel(`pings_inbox_${currentUser.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "pings",
        filter: `to_user_id=eq.${currentUser.id}`,
      }, async (payload) => {
        const fromId = (payload.new as PingRow).from_user_id;
        const { data: profile } = await supabase
          .from("profiles").select("name, avatar").eq("id", fromId).single();
        const newPing: Ping = {
          id: (payload.new as PingRow).id,
          fromUserId: fromId,
          fromUserName: (profile as { name: string; avatar: string } | null)?.name ?? "Someone",
          fromUserAvatar: (profile as { name: string; avatar: string } | null)?.avatar ?? "??",
          toUserId: currentUser.id,
          status: "pending",
          timestamp: Date.now(),
        };
        useStore.setState((s) => ({
          receivedPings: [newPing, ...s.receivedPings.filter((p) => p.id !== newPing.id)],
        }));
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!currentUser) return null;

  const count = receivedPings.length;

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => { setOpen((v) => !v); if (!open) loadPings(); }}
        className="relative w-8 h-8 flex items-center justify-center rounded-full transition-colors"
        style={{ color: "rgba(255,255,255,0.7)" }}
        title="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="font-bold text-gray-900 text-sm">Pings</p>
            {count > 0 && (
              <span className="text-xs text-gray-400">{count} pending</span>
            )}
          </div>

          {receivedPings.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-2xl mb-1">🔔</p>
              <p className="text-sm text-gray-500">No pings yet</p>
              <p className="text-xs text-gray-400 mt-1">When someone wants to hang out, they&apos;ll ping you here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {receivedPings.map((ping) => (
                <div key={ping.id} className="px-4 py-3 flex items-center gap-3">
                  <Avatar src={ping.fromUserAvatar} name={ping.fromUserName} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{ping.fromUserName}</p>
                    <p className="text-xs text-gray-500">wants to hang out 👋 · {timeAgo(ping.timestamp)}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => {
                        respondToPing(ping.id, "accepted");
                        setOpen(false);
                        router.push("/explore");
                      }}
                      className="px-2.5 py-1 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 transition-colors"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => respondToPing(ping.id, "declined")}
                      className="px-2.5 py-1 bg-gray-100 text-gray-500 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
