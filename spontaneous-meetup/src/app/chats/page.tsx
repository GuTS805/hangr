"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

interface MockChat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: number;
  unread: number;
  isOnline: boolean;
  isVerified: boolean;
}

const MOCK_CHATS: MockChat[] = [
  { id: "c1", name: "Priya Verma", avatar: "PR", lastMessage: "Haan yaar, 7 baje mil lete 👍", timestamp: Date.now() - 4 * 60000, unread: 2, isOnline: true, isVerified: true },
  { id: "c2", name: "Arjun Sharma", avatar: "AS", lastMessage: "Bhai gaming session kab kar rahe?", timestamp: Date.now() - 18 * 60000, unread: 0, isOnline: true, isVerified: false },
  { id: "c3", name: "Sahil Khan", avatar: "SK", lastMessage: "FIFA pe aaja aaj raat! 🎮", timestamp: Date.now() - 1 * 3600000, unread: 1, isOnline: false, isVerified: true },
  { id: "c4", name: "Neha Gupta", avatar: "NG", lastMessage: "Cricket match Sunday ko pakka?", timestamp: Date.now() - 3 * 3600000, unread: 0, isOnline: false, isVerified: false },
  { id: "c5", name: "Rohit Mishra", avatar: "RO", lastMessage: "Chai pi ke aata hoon, 10 min", timestamp: Date.now() - 5 * 3600000, unread: 0, isOnline: true, isVerified: false },
  { id: "c6", name: "Sneha Rawat", avatar: "SR", lastMessage: "Woh movie really good thi! 🎬", timestamp: Date.now() - 1 * 86400000, unread: 0, isOnline: false, isVerified: true },
  { id: "c7", name: "Vishal Tyagi", avatar: "VT", lastMessage: "Starbucks ya Blue Tokai?", timestamp: Date.now() - 2 * 86400000, unread: 0, isOnline: false, isVerified: false },
];

const AVATAR_COLORS = [
  "linear-gradient(135deg,#2563eb,#7c3aed)",
  "linear-gradient(135deg,#059669,#2563eb)",
  "linear-gradient(135deg,#d97706,#dc2626)",
  "linear-gradient(135deg,#7c3aed,#db2777)",
  "linear-gradient(135deg,#0891b2,#059669)",
  "linear-gradient(135deg,#dc2626,#d97706)",
  "linear-gradient(135deg,#db2777,#7c3aed)",
];

function ChatAvatar({ initials, idx, size = 48, isOnline }: { initials: string; idx: number; size?: number; isOnline?: boolean }) {
  return (
    <div className="relative flex-shrink-0">
      <div className="rounded-full flex items-center justify-center text-white font-bold border-2 border-black"
        style={{ width: size, height: size, fontSize: size * 0.35, background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}>
        {initials}
      </div>
      {isOnline && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00C44A] rounded-full border-2 border-black" />
      )}
    </div>
  );
}

// Simple mock chat detail view
function ChatDetail({ chat, onBack }: { chat: MockChat; onBack: () => void }) {
  const { currentUser } = useStore();
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState([
    { id: "m1", from: "them", text: chat.lastMessage, ts: chat.timestamp },
  ]);

  function send() {
    if (!msg.trim()) return;
    setMessages(prev => [...prev, { id: `m${Date.now()}`, from: "me", text: msg.trim(), ts: Date.now() }]);
    setMsg("");
  }

  return (
    <div className="flex flex-col h-screen bg-[#F2F1EB]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-black bg-[#FFE500] sticky top-0 z-10">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center border-2 border-black bg-white shadow-[2px_2px_0_#0A0A0A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all text-black">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <ChatAvatar initials={chat.avatar} idx={MOCK_CHATS.indexOf(chat)} size={38} isOnline={chat.isOnline} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-black text-black text-sm uppercase tracking-tight">{chat.name}</p>
            {chat.isVerified && (
              <span className="border-2 border-black bg-black text-[#FFE500] text-[10px] font-black uppercase px-2 py-0.5">VERIFIED</span>
            )}
          </div>
          <p className="text-xs font-bold text-black/60 uppercase">{chat.isOnline ? "Online" : "Offline"}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[72%] px-4 py-2.5 text-sm leading-relaxed border-2 border-black ${
              m.from === "me"
                ? "bg-black text-[#FFE500] shadow-[3px_3px_0_#FFE500]"
                : "bg-white text-black shadow-[3px_3px_0_#0A0A0A]"
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {!currentUser && (
          <div className="text-center py-6">
            <p className="text-sm font-bold text-black/50 uppercase">Sign in to send messages</p>
          </div>
        )}
      </div>

      {/* Input */}
      {currentUser && (
        <div className="px-4 py-3 bg-white border-t-2 border-black flex items-center gap-3">
          <input
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") send(); }}
            placeholder="Message likhoo..."
            className="flex-1 border-2 border-black bg-white px-4 py-3 font-medium focus:outline-none focus:shadow-[3px_3px_0_#0A0A0A] transition-shadow text-sm"
          />
          <button onClick={send} disabled={!msg.trim()}
            className="w-10 h-10 flex items-center justify-center bg-[#FFE500] border-2 border-black text-black shadow-[3px_3px_0_#0A0A0A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all disabled:opacity-40 flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default function ChatsPage() {
  const { currentUser } = useStore();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeChat, setActiveChat] = useState<MockChat | null>(null);

  if (activeChat) {
    return <ChatDetail chat={activeChat} onBack={() => setActiveChat(null)} />;
  }

  const filtered = MOCK_CHATS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F2F1EB]">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white border-b-2 border-black">
        <div className="max-w-xl mx-auto px-4 py-4">
          <h1 className="text-3xl font-black uppercase tracking-tight text-black mb-3">Chats</h1>
          {/* Search */}
          <div className="flex items-center gap-2 border-2 border-black bg-white px-4 py-2.5 focus-within:shadow-[3px_3px_0_#0A0A0A] transition-shadow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black/50 flex-shrink-0">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search chats..."
              className="flex-1 bg-transparent text-sm outline-none text-black placeholder-black/40 font-medium"
            />
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto">
        {/* Guest prompt */}
        {!currentUser && (
          <div className="mx-4 mt-4 border-2 border-black bg-white shadow-[4px_4px_0_#0A0A0A]">
            <div className="bg-[#FFE500] border-b-2 border-black px-4 py-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50">GUEST</span>
            </div>
            <div className="px-4 py-3 flex items-center gap-3">
              <span className="text-2xl flex-shrink-0">💬</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-black uppercase">Sign in to chat</p>
                <p className="text-xs text-black/50 mt-0.5 font-medium">Connect with people you met at hangouts</p>
              </div>
              <button onClick={() => router.push("/auth")}
                className="bg-[#FFE500] border-2 border-black text-black font-black uppercase tracking-wide shadow-[3px_3px_0_#0A0A0A] px-4 py-2 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all text-xs flex-shrink-0">
                Sign in
              </button>
            </div>
          </div>
        )}

        {/* Online now strip */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50 mb-3">Online now</p>
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {MOCK_CHATS.filter(c => c.isOnline).map((c, i) => (
              <button key={c.id} onClick={() => setActiveChat(c)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 active:opacity-70 transition-opacity">
                <ChatAvatar initials={c.avatar} idx={i} size={50} isOnline />
                <span className="text-xs text-black font-black uppercase w-14 text-center truncate">{c.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat list */}
        <div className="mt-2 mx-4 border-2 border-black bg-white shadow-[4px_4px_0_#0A0A0A]">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-black/40">
              <p className="text-4xl mb-3">💬</p>
              <p className="font-black uppercase">No chats found</p>
            </div>
          ) : (
            <div>
              {filtered.map((chat, idx) => (
                <button key={chat.id} onClick={() => setActiveChat(chat)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#FFE500] transition-colors text-left active:bg-[#FFE500] ${idx < filtered.length - 1 ? "border-b-2 border-black" : ""}`}>
                  <ChatAvatar initials={chat.avatar} idx={idx} size={50} isOnline={chat.isOnline} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-black uppercase ${chat.unread > 0 ? "text-black" : "text-black/70"}`}>{chat.name}</span>
                        {chat.isVerified && (
                          <span className="border-2 border-black bg-black text-[#FFE500] text-[10px] font-black uppercase px-2 py-0.5">VERIFIED</span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-black/40 flex-shrink-0">{timeAgo(chat.timestamp)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate font-medium ${chat.unread > 0 ? "text-black" : "text-black/40"}`}>
                        {chat.lastMessage}
                      </p>
                      {chat.unread > 0 && (
                        <span className="ml-2 flex-shrink-0 w-5 h-5 bg-[#FF2D2D] text-white border-2 border-black text-[11px] font-bold flex items-center justify-center">
                          {chat.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}
