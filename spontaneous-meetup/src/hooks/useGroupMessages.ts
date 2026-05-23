"use client";

import { useState, useEffect } from "react";
import { supabase, MessageRow } from "@/lib/supabase";
import { Message } from "@/types";

function mapRow(row: MessageRow): Message {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userAvatar: row.user_avatar,
    text: row.text,
    timestamp: new Date(row.created_at).getTime(),
  };
}

export function useGroupMessages(groupId: string) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!groupId) return;

    // Load initial messages
    supabase
      .from("messages")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setMessages((data as MessageRow[]).map(mapRow));
      });

    // Subscribe to new messages in real-time
    const channel = supabase
      .channel(`messages:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${groupId}`,
        },
        ({ new: row }) => {
          setMessages((prev) => {
            const msg = mapRow(row as MessageRow);
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [groupId]);

  return messages;
}
