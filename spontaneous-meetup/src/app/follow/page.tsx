"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { INTEREST_EMOJI } from "@/lib/mock-data";
import { Interest } from "@/types";

interface MockUser {
  id: string;
  name: string;
  avatar: string;
  neighborhood: string;
  interests: Interest[];
  isVerified: boolean;
  trustScore: number;
  mutualCount: number;
}

const MOCK_FOLLOWING: MockUser[] = [
  { id: "u1", name: "Priya Verma", avatar: "PR", neighborhood: "Indirapuram", interests: ["Cafes", "Music", "Anime"], isVerified: false, trustScore: 4.8, mutualCount: 3 },
  { id: "u2", name: "Arjun Sharma", avatar: "AS", neighborhood: "Crossing Republik", interests: ["Gaming", "Coding"], isVerified: true, trustScore: 4.7, mutualCount: 5 },
  { id: "u3", name: "Sahil Khan", avatar: "SK", neighborhood: "Vaishali", interests: ["Gaming", "Football", "Cricket"], isVerified: true, trustScore: 4.9, mutualCount: 2 },
  { id: "u4", name: "Neha Gupta", avatar: "NG", neighborhood: "Raj Nagar Ext.", interests: ["Cricket", "Movies"], isVerified: false, trustScore: 4.5, mutualCount: 1 },
];

const MOCK_FOLLOWERS: MockUser[] = [
  { id: "u2", name: "Arjun Sharma", avatar: "AS", neighborhood: "Crossing Republik", interests: ["Gaming", "Coding"], isVerified: true, trustScore: 4.7, mutualCount: 5 },
  { id: "u5", name: "Rohit Mishra", avatar: "RO", neighborhood: "Kaushambi", interests: ["Cafes", "Cricket"], isVerified: false, trustScore: 4.3, mutualCount: 1 },
  { id: "u6", name: "Sneha Rawat", avatar: "SR", neighborhood: "Sector 50", interests: ["Movies", "Music", "Anime"], isVerified: true, trustScore: 5.0, mutualCount: 4 },
  { id: "u7", name: "Vishal Tyagi", avatar: "VT", neighborhood: "Kaushambi", interests: ["Coding", "Gaming"], isVerified: false, trustScore: 4.2, mutualCount: 2 },
  { id: "u8", name: "Kabir Tiwari", avatar: "KT", neighborhood: "Indirapuram", interests: ["Football", "Cricket", "Gym"], isVerified: false, trustScore: 4.6, mutualCount: 3 },
];

const MOCK_SUGGESTIONS: MockUser[] = [
  { id: "u9", name: "Riya Mehta", avatar: "RM", neighborhood: "Sector 62", interests: ["Anime", "Gaming", "Music"], isVerified: true, trustScore: 4.9, mutualCount: 6 },
  { id: "u10", name: "Dev Agarwal", avatar: "DA", neighborhood: "Vaishali", interests: ["Coding", "Cafes"], isVerified: false, trustScore: 4.4, mutualCount: 3 },
  { id: "u11", name: "Tanya Singh", avatar: "TS", neighborhood: "Crossing Republik", interests: ["Movies", "Food", "Music"], isVerified: true, trustScore: 4.7, mutualCount: 5 },
];

const AVATAR_COLORS = [
  "linear-gradient(135deg,#2563eb,#7c3aed)",
  "linear-gradient(135deg,#059669,#2563eb)",
  "linear-gradient(135deg,#d97706,#dc2626)",
  "linear-gradient(135deg,#7c3aed,#db2777)",
  "linear-gradient(135deg,#0891b2,#059669)",
  "linear-gradient(135deg,#dc2626,#d97706)",
  "linear-gradient(135deg,#db2777,#7c3aed)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
];

function UserAvatar({ initials, idx, size = 48 }: { initials: string; idx: number; size?: number }) {
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 border-2 border-black"
      style={{ width: size, height: size, fontSize: size * 0.35, background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}>
      {initials}
    </div>
  );
}

function UserCard({ user, idx, isFollowing, onToggle }: {
  user: MockUser;
  idx: number;
  isFollowing: boolean;
  onToggle: () => void;
}) {
  const { currentUser } = useStore();
  const router = useRouter();

  return (
    <div className="bg-white border-b-2 border-black px-4 py-3.5 flex items-center gap-3 hover:bg-[#F2F1EB] transition-colors">
      <button onClick={() => router.push(`/profile/${user.id}`)} className="flex-shrink-0 active:opacity-70 transition-opacity">
        <UserAvatar initials={user.avatar} idx={idx} size={48} />
      </button>

      <button onClick={() => router.push(`/profile/${user.id}`)} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-black text-sm text-black uppercase">{user.name}</span>
          {user.isVerified && (
            <span className="border-2 border-black bg-black text-[#FFE500] text-[10px] font-black uppercase px-2 py-0.5">VERIFIED</span>
          )}
          <span className="border-2 border-black bg-[#FFE500] text-black text-[10px] font-black uppercase px-2 py-0.5">⭐ {user.trustScore}</span>
        </div>
        <p className="text-xs text-black/50 mt-0.5 font-medium">📍 {user.neighborhood} · {user.mutualCount} mutual</p>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {user.interests.slice(0, 3).map(i => (
            <span key={i} className="border-2 border-black bg-[#FFE500] text-black text-[10px] font-black uppercase px-2 py-0.5">
              {INTEREST_EMOJI[i as Interest]} {i}
            </span>
          ))}
        </div>
      </button>

      <button
        onClick={() => { if (!currentUser) { router.push("/auth"); return; } onToggle(); }}
        className={`flex-shrink-0 font-black uppercase tracking-wide px-4 py-2 border-2 border-black text-xs transition-all active:translate-x-[2px] active:translate-y-[2px] ${
          isFollowing
            ? "bg-white text-black shadow-[2px_2px_0_#0A0A0A] hover:bg-[#FF2D2D] hover:text-white active:shadow-none"
            : "bg-[#FFE500] text-black shadow-[3px_3px_0_#0A0A0A] active:shadow-none"
        }`}>
        {isFollowing ? "Following" : "Follow"}
      </button>
    </div>
  );
}

type Tab = "following" | "followers" | "suggestions";

export default function FollowPage() {
  const { currentUser } = useStore();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("following");
  const [followingSet, setFollowingSet] = useState<Set<string>>(
    new Set(MOCK_FOLLOWING.map(u => u.id))
  );
  const [search, setSearch] = useState("");

  function toggle(userId: string) {
    setFollowingSet(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "following",    label: "Following",    count: followingSet.size },
    { key: "followers",    label: "Followers",    count: MOCK_FOLLOWERS.length },
    { key: "suggestions",  label: "Suggest",      count: MOCK_SUGGESTIONS.length },
  ];

  const lists: Record<Tab, MockUser[]> = {
    following:   MOCK_FOLLOWING.filter(u => followingSet.has(u.id)),
    followers:   MOCK_FOLLOWERS,
    suggestions: MOCK_SUGGESTIONS,
  };

  const filtered = lists[tab].filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.neighborhood.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F2F1EB]">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white border-b-2 border-black">
        <div className="max-w-xl mx-auto px-4 pt-4 pb-0">
          <h1 className="text-3xl font-black uppercase tracking-tight text-black mb-3">People</h1>

          {/* Search */}
          <div className="flex items-center gap-2 border-2 border-black bg-white px-4 py-2.5 mb-3 focus-within:shadow-[3px_3px_0_#0A0A0A] transition-shadow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black/40 flex-shrink-0">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search people..."
              className="flex-1 bg-transparent text-sm outline-none text-black placeholder-black/40 font-medium"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-0 border-2 border-black">
            {tabs.map((t, i) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-black uppercase tracking-wide transition-all ${
                  tab === t.key
                    ? "bg-black text-[#FFE500]"
                    : "bg-transparent text-black hover:bg-[#FFE500] transition-colors"
                } ${i < tabs.length - 1 ? "border-r-2 border-black" : ""}`}>
                {t.label}
                <span className={`text-[11px] px-1.5 py-0.5 border border-current font-black ${
                  tab === t.key ? "border-[#FFE500] text-[#FFE500]" : "border-black text-black"
                }`}>{t.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto">
        {/* Guest banner */}
        {!currentUser && (
          <div className="mx-4 mt-4 border-2 border-black bg-white shadow-[4px_4px_0_#0A0A0A]">
            <div className="bg-[#FFE500] border-b-2 border-black px-4 py-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50">GUEST</span>
            </div>
            <div className="px-4 py-3 flex items-center gap-3">
              <span className="text-2xl flex-shrink-0">👥</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-black uppercase">Sign in to follow people</p>
                <p className="text-xs text-black/50 mt-0.5 font-medium">Build your hangout crew</p>
              </div>
              <button onClick={() => router.push("/auth")}
                className="bg-[#FFE500] border-2 border-black text-black font-black uppercase tracking-wide shadow-[3px_3px_0_#0A0A0A] px-4 py-2 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all text-xs flex-shrink-0">
                Sign in
              </button>
            </div>
          </div>
        )}

        {tab === "suggestions" && (
          <p className="px-4 pt-4 text-[10px] font-black uppercase tracking-[0.2em] text-black/50">
            People with similar interests near you
          </p>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <p className="text-4xl mb-3">{tab === "following" ? "🤝" : tab === "followers" ? "👥" : "✨"}</p>
            <p className="font-black uppercase text-black text-xl mb-1">
              {tab === "following" ? "Not following anyone yet" : tab === "followers" ? "No followers yet" : "No suggestions"}
            </p>
            <p className="text-sm font-medium text-black/50 mt-1">
              {tab === "following" ? "Check suggestions to find people" : "Go free to get discovered!"}
            </p>
            {tab === "following" && (
              <button onClick={() => setTab("suggestions")}
                className="mt-4 bg-[#FFE500] border-2 border-black text-black font-black uppercase tracking-wide shadow-[3px_3px_0_#0A0A0A] px-4 py-2 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all text-sm">
                Find people →
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 mx-4 border-2 border-black bg-white shadow-[4px_4px_0_#0A0A0A]">
            {filtered.map((user, idx) => (
              <UserCard
                key={user.id}
                user={user}
                idx={idx}
                isFollowing={followingSet.has(user.id)}
                onToggle={() => toggle(user.id)}
              />
            ))}
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
