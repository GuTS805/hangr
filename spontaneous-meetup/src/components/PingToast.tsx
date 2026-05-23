"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

interface PingNotification {
  id: string;
  fromName: string;
  fromAvatar: string;
  fromId: string;
}

export default function PingToast() {
  const { currentUser } = useStore();
  const [pings, setPings] = useState<PingNotification[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel(`pings_${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pings",
          filter: `to_user_id=eq.${currentUser.id}`,
        },
        async (payload) => {
          const fromId = payload.new.from_user_id as string;
          // Fetch pinger's name and avatar
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, avatar")
            .eq("id", fromId)
            .single();

          const notification: PingNotification = {
            id: `${fromId}_${Date.now()}`,
            fromId,
            fromName: profile?.name ?? "Someone",
            fromAvatar: profile?.avatar ?? "??",
          };

          setPings((prev) => [...prev, notification]);

          // Auto-dismiss after 6s
          setTimeout(() => {
            setPings((prev) => prev.filter((p) => p.id !== notification.id));
          }, 6000);
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [currentUser?.id]);

  if (pings.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col gap-2 max-w-xs w-full">
      {pings.map((ping) => (
        <div
          key={ping.id}
          className="bg-white border border-gray-200 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300"
        >
          {ping.fromAvatar.startsWith("http") ? (
            <img
              src={ping.fromAvatar}
              alt={ping.fromName}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
              {ping.fromAvatar}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{ping.fromName}</p>
            <p className="text-xs text-gray-500">wants to hang out 👋</p>
          </div>
          <button
            onClick={() => setPings((prev) => prev.filter((p) => p.id !== ping.id))}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0 text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
