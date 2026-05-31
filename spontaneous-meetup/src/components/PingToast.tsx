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
          className="flex items-center gap-3 px-4 py-3 anim-slide-up"
          style={{
            border: "2px solid #0A0A0A",
            background: "#FFE500",
            boxShadow: "4px 4px 0 #0A0A0A",
          }}
        >
          {/* Avatar */}
          {ping.fromAvatar.startsWith("http") ? (
            <img
              src={ping.fromAvatar}
              alt={ping.fromName}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              style={{ border: "2px solid #0A0A0A" }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
              style={{ border: "2px solid #0A0A0A", background: "#0A0A0A", color: "#FFE500" }}
            >
              {ping.fromAvatar}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-sm font-black uppercase text-black truncate">{ping.fromName}</p>
            <p className="text-[10px] font-bold uppercase text-black/50">wants to hang out 👋</p>
          </div>

          <button
            onClick={() => setPings((prev) => prev.filter((p) => p.id !== ping.id))}
            className="w-7 h-7 flex items-center justify-center font-black text-xl leading-none text-black hover:bg-black hover:text-[#FFE500] transition-colors flex-shrink-0"
            style={{ border: "2px solid #0A0A0A" }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
