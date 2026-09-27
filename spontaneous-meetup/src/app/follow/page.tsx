"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { INTEREST_EMOJI } from "@/lib/mock-data";
import { Interest } from "@/types";
import "./people.css";

type Person = { id: string; name: string; avatar: string; area: string; interests: Interest[]; verified?: boolean; rating: number; mutual: number; color: string };
const people: Person[] = [
  { id: "u1", name: "Priya Verma", avatar: "PR", area: "Indirapuram", interests: ["Cafes", "Music", "Anime"], rating: 4.8, mutual: 3, color: "linear-gradient(135deg,#3469ff,#7437df)" },
  { id: "u2", name: "Arjun Sharma", avatar: "AS", area: "Crossing Republik", interests: ["Gaming", "Coding"], verified: true, rating: 4.7, mutual: 5, color: "linear-gradient(135deg,#08b58e,#2767e4)" },
  { id: "u3", name: "Sahil Khan", avatar: "SK", area: "Vaishali", interests: ["Gaming", "Football", "Cricket"], verified: true, rating: 4.9, mutual: 2, color: "linear-gradient(135deg,#f69a16,#eb3132)" },
  { id: "u4", name: "Neha Gupta", avatar: "NG", area: "Raj Nagar Ext.", interests: ["Cricket", "Movies"], rating: 4.5, mutual: 1, color: "linear-gradient(135deg,#7227e5,#c629ab)" },
  { id: "u5", name: "Rohit Mishra", avatar: "RO", area: "Indirapuram", interests: ["Cafes", "Football"], rating: 4.6, mutual: 4, color: "linear-gradient(135deg,#f3912b,#c43324)" },
  { id: "u6", name: "Sneha Rawat", avatar: "SR", area: "Vaishali", interests: ["Movies", "Music"], rating: 4.7, mutual: 3, color: "linear-gradient(135deg,#fd8462,#ba3987)" },
  { id: "u7", name: "Vishal Tyagi", avatar: "VT", area: "Raj Nagar Ext.", interests: ["Food", "Coding"], rating: 4.4, mutual: 2, color: "linear-gradient(135deg,#087dab,#6e2cbd)" },
];
const suggestions = people.slice(4);
const discover: { label: string; icon: string; match: Interest }[] = [
  { label: "Cafes", icon: "☕", match: "Cafes" }, { label: "Gaming", icon: "🎮", match: "Gaming" },
  { label: "Cricket", icon: "🏏", match: "Cricket" }, { label: "Movies", icon: "🎬", match: "Movies" },
  { label: "Music", icon: "🎵", match: "Music" }, { label: "Fitness", icon: "🏋️", match: "Gym" },
  { label: "Tech", icon: "💻", match: "Coding" }, { label: "Anime", icon: "⛩️", match: "Anime" },
  { label: "Food", icon: "🍴", match: "Food" },
];
type Tab = "following" | "followers" | "suggestions";

function Avatar({ person, small = false }: { person: Person; small?: boolean }) {
  return <span className={`people-avatar ${small ? "people-avatar-small" : ""}`} style={{ background: person.color }}>{person.avatar}<i /></span>;
}

export default function FollowPage() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [tab, setTab] = useState<Tab>("following");
  const [following, setFollowing] = useState(() => new Set(["u1", "u2", "u3", "u4"]));
  const [search, setSearch] = useState("");
  const [interest, setInterest] = useState<Interest | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const tabCounts = { following: following.size, followers: 5, suggestions: people.filter(p => !following.has(p.id)).length };
  const filtered = useMemo(() => {
    const source = tab === "following" ? people.filter(p => following.has(p.id)) : tab === "followers" ? people.filter(p => ["u2", "u5", "u6", "u7", "u1"].includes(p.id)) : people.filter(p => !following.has(p.id));
    const query = search.trim().toLowerCase();
    return source.filter(p => (!query || `${p.name} ${p.area} ${p.interests.join(" ")}`.toLowerCase().includes(query)) && (!interest || p.interests.includes(interest)));
  }, [tab, following, search, interest]);
  function toggleFollow(id: string) {
    if (!currentUser) { router.push("/auth"); return; }
    setFollowing(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  return <div className="people-page">
    <section className="people-main">
      <header className="people-header"><div><h1>People</h1><p>Discover and connect with amazing people in your neighbourhood.</p></div><div className="people-header-art" aria-hidden="true"><div className="people-art-avatars">{people.slice(0,3).map(p => <Avatar key={p.id} person={p} small />)}</div><strong>Good people<br />make great<br />neighbourhoods!</strong></div></header>
      <label className="people-search"><span aria-hidden="true">⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people by name, area, interests..." /><span aria-hidden="true">☷</span></label>
      <nav className="people-tabs" aria-label="People lists">{(["following", "followers", "suggestions"] as Tab[]).map(t => <button key={t} onClick={() => { setTab(t); setInterest(null); }} className={tab === t ? "active" : ""} aria-current={tab === t ? "page" : undefined}><span>{t === "following" ? "👥" : t === "followers" ? "♧" : "✧"}</span>{t === "suggestions" ? "Suggestions" : t[0].toUpperCase() + t.slice(1)} <b>{tabCounts[t]}</b></button>)}</nav>
      {interest && <div className="people-filter-note">Showing {interest} people <button onClick={() => setInterest(null)}>Clear filter ×</button></div>}
      <div className="people-list">{filtered.length ? filtered.map(p => <article className="people-card" key={p.id}>
        <button className="people-person" onClick={() => router.push(`/profile/${p.id}`)} aria-label={`View ${p.name}'s profile`}><Avatar person={p} /></button>
        <div className="people-card-info"><button className="people-name" onClick={() => router.push(`/profile/${p.id}`)}>{p.name}</button>{p.verified && <span className="people-verified">VERIFIED</span>}<span className="people-rating">⭐ {p.rating}</span><p>📍 {p.area} <span>·</span> 👥 {p.mutual} mutual {p.mutual === 1 ? "friend" : "friends"}</p><div className="people-chips">{p.interests.map(i => <span key={i}>{INTEREST_EMOJI[i]} {i}</span>)}</div></div>
        <div className="people-card-actions"><button className={following.has(p.id) ? "following" : "follow"} onClick={() => toggleFollow(p.id)}>{following.has(p.id) ? "♙  Following" : "Follow"}</button><button className="more" onClick={() => setMenu(menu === p.id ? null : p.id)} aria-label={`More options for ${p.name}`}>•••</button>{menu === p.id && <div className="people-menu"><button onClick={() => router.push(`/profile/${p.id}`)}>View profile</button><button onClick={() => { toggleFollow(p.id); setMenu(null); }}>{following.has(p.id) ? "Unfollow" : "Follow"}</button></div>}</div>
      </article>) : <div className="people-empty">No people found. Try another search or interest.</div>}</div>
    </section>
    <aside className="people-sidebar"><section className="people-grow"><div className="people-grow-icon">👥</div><h2>Grow your circle</h2><p>Meet like-minded people in<br />your neighbourhood.</p><div className="people-grow-avatars">{people.slice(0,4).map(p => <Avatar key={p.id} person={p} small />)}<span>+12</span></div></section>
      <section className="people-side-card"><div className="people-side-title"><h2>People you may know</h2><button onClick={() => { setTab("suggestions"); setShowAllSuggestions(!showAllSuggestions); }}>{showAllSuggestions ? "Show less" : "See all"} →</button></div><div className="people-suggestions">{(showAllSuggestions ? people.filter(p => !following.has(p.id)) : suggestions).map(p => <div className="people-suggestion" key={p.id}><button onClick={() => router.push(`/profile/${p.id}`)}><Avatar person={p} small /></button><div><strong>{p.name}</strong><span className="people-rating">⭐ {p.rating}</span><p>📍 {p.area} · {p.mutual} mutual</p><div className="people-chips">{p.interests.slice(0,2).map(i => <span key={i}>{INTEREST_EMOJI[i]} {i}</span>)}</div></div><button className="people-mini-follow" onClick={() => toggleFollow(p.id)}>{following.has(p.id) ? "Following" : "Follow"}</button></div>)}</div></section>
      <section className="people-side-card"><div className="people-side-title"><h2>Discover by interests</h2><button onClick={() => { setTab("suggestions"); setInterest(null); }}>See all →</button></div><div className="people-discover">{discover.map(i => <button key={i.label} onClick={() => { setTab("suggestions"); setInterest(i.match); }}>{i.icon} &nbsp;{i.label}</button>)}</div></section>
    </aside>
  </div>;
}
