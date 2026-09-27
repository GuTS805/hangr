"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import "./chats.css";

type Chat = { id: string; name: string; avatar: string; last: string; time: string; unread: number; verified?: boolean; area: string; mutual: number; color: string };
type Message = { id: string; from: "me" | "them"; text: string; time: string };
const chats: Chat[] = [
  { id: "c1", name: "Priya Verma", avatar: "PR", last: "Haan yaar, 7 baje mil lete 👍", time: "4m", unread: 2, verified: true, area: "Indirapuram", mutual: 3, color: "linear-gradient(135deg,#3469ff,#6938df)" },
  { id: "c2", name: "Arjun Sharma", avatar: "AS", last: "Bhai gaming session kab kar rahe?", time: "18m", unread: 0, area: "Crossing Republik", mutual: 5, color: "linear-gradient(135deg,#08b58e,#2866de)" },
  { id: "c3", name: "Sahil Khan", avatar: "SK", last: "FIFA pe aaja aaj raat! 🎮", time: "1h", unread: 1, verified: true, area: "Vaishali", mutual: 2, color: "linear-gradient(135deg,#f29319,#e84420)" },
  { id: "c4", name: "Neha Gupta", avatar: "NG", last: "Cricket match Sunday ko pakka?", time: "3h", unread: 0, area: "Raj Nagar Ext.", mutual: 1, color: "linear-gradient(135deg,#7429de,#c226a8)" },
  { id: "c5", name: "Rohit Mishra", avatar: "RO", last: "Chai pi ke aata hoon, 10 min", time: "5h", unread: 0, area: "Indirapuram", mutual: 4, color: "linear-gradient(135deg,#f68a1e,#d5332b)" },
  { id: "c6", name: "Sneha Rawat", avatar: "SR", last: "Woh movie really good thi! 🎬", time: "1d", unread: 0, verified: true, area: "Vaishali", mutual: 3, color: "linear-gradient(135deg,#f67f4c,#e62f3a)" },
  { id: "c7", name: "Vishal Tyagi", avatar: "VT", last: "Starbucks ya Blue Tokai?", time: "2d", unread: 0, area: "Kaushambi", mutual: 2, color: "linear-gradient(135deg,#c02eb8,#6916a4)" },
];
const seedMessages: Record<string, Message[]> = {
  c1: [
    { id: "m1", from: "them", text: "Heyy! 👋", time: "10:12 AM" },
    { id: "m2", from: "them", text: "Kal ka plan still on hai?", time: "10:12 AM" },
    { id: "m3", from: "me", text: "Haan bilkul! 7 baje milte hain?", time: "10:13 AM" },
    { id: "m4", from: "them", text: "Perfect! 😄", time: "10:13 AM" },
    { id: "m5", from: "them", text: "Same place? Cafe 24x7?", time: "10:14 AM" },
    { id: "m6", from: "me", text: "Haan yaar, 7 baje mil lete 👍", time: "10:15 AM" },
    { id: "m7", from: "them", text: "Done! I'll see you there\nAur haan, Arjun ko bhi bata dena.", time: "10:15 AM" },
    { id: "m8", from: "me", text: "Okay, done! 🙌", time: "10:16 AM" },
    { id: "m9", from: "them", text: "Cool! 🚀", time: "10:16 AM" },
  ],
};
type Filter = "all" | "unread" | "groups";
function Avatar({ chat, size = "normal" }: { chat: Chat; size?: "normal" | "small" }) { return <span className={`chat-avatar ${size === "small" ? "chat-avatar-small" : ""}`} style={{ background: chat.color }}>{chat.avatar}<i /></span>; }
function clockTime() { return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); }

export default function ChatsPage() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [activeId, setActiveId] = useState("c1");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Record<string, Message[]>>(seedMessages);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const active = chats.find(c => c.id === activeId) ?? chats[0];
  const unreadCount = chats.reduce((sum, c) => sum + (readIds.includes(c.id) ? 0 : c.unread), 0);
  const visible = useMemo(() => chats.filter(c => (filter !== "unread" || (c.unread > 0 && !readIds.includes(c.id))) && (filter !== "groups") && `${c.name} ${c.last}`.toLowerCase().includes(query.toLowerCase())), [filter, query, readIds]);
  function selectChat(id: string) { setActiveId(id); setReadIds(prev => prev.includes(id) ? prev : [...prev, id]); setShowMobileDetail(true); setShowMenu(false); }
  function send() {
    const value = draft.trim(); if (!value) return;
    if (!currentUser) { router.push("/auth"); return; }
    setMessages(prev => ({ ...prev, [activeId]: [...(prev[activeId] ?? [{ id: `intro-${activeId}`, from: "them", text: active.last, time: "Earlier" }]), { id: `${Date.now()}`, from: "me", text: value, time: clockTime() }] }));
    setDraft(""); setShowEmoji(false);
  }
  function attach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (!currentUser) { router.push("/auth"); return; }
    setMessages(prev => ({ ...prev, [activeId]: [...(prev[activeId] ?? []), { id: `${Date.now()}`, from: "me", text: `📎 ${file.name}`, time: clockTime() }] }));
    e.target.value = "";
  }
  function showNotice(message: string) { setNotice(message); window.setTimeout(() => setNotice(""), 3000); }

  return <main className="chats-page">
    <section className={`chats-list-panel ${showMobileDetail ? "chats-mobile-hidden" : ""}`}>
      <header className="chats-list-header"><div><h1>Chats</h1><p>Connect. Share. Hang out.</p></div><button className="chats-filter-icon" onClick={() => setFilter(filter === "unread" ? "all" : "unread")} aria-label="Toggle unread filter">☷</button></header>
      <label className="chats-search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search chats, people or messages..." /></label>
      <div className="chats-online"><div><strong><i /> Online now</strong><button onClick={() => setFilter("all")}>See all →</button></div><div className="chats-online-users">{chats.map(c => <button key={c.id} onClick={() => selectChat(c.id)}><Avatar chat={c} size="small" /><span>{c.name.split(" ")[0]}</span></button>)}</div></div>
      <nav className="chats-filters" aria-label="Chat filters"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>▣ &nbsp; All</button><button className={filter === "unread" ? "active" : ""} onClick={() => setFilter("unread")}>◯ &nbsp; Unread <b>{unreadCount}</b></button><button className={filter === "groups" ? "active" : ""} onClick={() => setFilter("groups")}>♧ &nbsp; Groups</button></nav>
      <div className="chats-threads">{visible.length ? visible.map(c => <button key={c.id} className={`chats-thread ${activeId === c.id ? "selected" : ""}`} onClick={() => selectChat(c.id)}><Avatar chat={c} size="small" /><span className="chats-thread-body"><span><strong>{c.name}</strong>{c.verified && <em>VERIFIED</em>}</span><small>{c.last}</small></span><span className="chats-thread-time">{c.time}{c.unread > 0 && !readIds.includes(c.id) && <b>{c.unread}</b>}</span></button>) : <p className="chats-empty">{filter === "groups" ? "No group chats yet" : "No chats found"}</p>}</div>
    </section>
    <section className={`chats-detail ${showMobileDetail ? "chats-mobile-open" : ""}`}>
      <header className="chats-detail-header"><button className="chats-back" onClick={() => setShowMobileDetail(false)} aria-label="Back to chats">←</button><Avatar chat={active} size="small" /><div className="chats-contact"><div><strong>{active.name}</strong>{active.verified && <em>VERIFIED</em>}</div><p><i /> Online now &nbsp;·&nbsp; {active.area} &nbsp;·&nbsp; {active.mutual} mutual</p></div><div className="chats-detail-actions"><button title="Voice calling is coming soon" onClick={() => showNotice("Voice calling is coming soon")}>♧</button><button title="Video calling is coming soon" onClick={() => showNotice("Video calling is coming soon")}>▣</button><button aria-label="More chat options" onClick={() => setShowMenu(!showMenu)}>⋮</button>{showMenu && <div className="chats-detail-menu"><button onClick={() => router.push(`/profile/${active.id.replace("c","u")}`)}>View profile</button><button onClick={() => { setMessages(prev => ({ ...prev, [activeId]: [] })); setShowMenu(false); }}>Clear messages</button></div>}</div></header>
      <div className="chats-messages"><span className="chats-day">Today</span>{(messages[activeId] ?? [{ id: `intro-${activeId}`, from: "them", text: active.last, time: "Earlier" }]).map(m => <div className={`chats-message ${m.from === "me" ? "mine" : "theirs"}`} key={m.id}>{m.from === "them" && <Avatar chat={active} size="small" />}<span className="chats-bubble">{m.text}</span><small>{m.time}{m.from === "me" && <span> ✓✓</span>}</small></div>)}</div>
      {notice && <div className="chats-notice">{notice}</div>}
      <div className="chats-composer"><input ref={fileRef} type="file" className="hidden" onChange={attach} /><button className="chats-add" onClick={() => fileRef.current?.click()} aria-label="Attach file">+</button><div className="chats-input-wrap"><input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }} placeholder="Type a message..." /><button onClick={() => setShowEmoji(!showEmoji)} aria-label="Choose emoji">☻</button><button onClick={() => fileRef.current?.click()} aria-label="Attach image">▣</button>{showEmoji && <div className="chats-emoji">{["😀","😄","🙌","👍","❤️","🎮","☕","🎉"].map(e => <button key={e} onClick={() => { setDraft(prev => prev + e); setShowEmoji(false); }}>{e}</button>)}</div>}</div><button className="chats-send" onClick={send} aria-label="Send message">➤</button></div>
    </section>
  </main>;
}
