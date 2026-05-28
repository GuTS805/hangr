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
    <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
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
    <div className="bg-white border-b border-gray-100 px-4 py-3.5 flex items-center gap-3">
      <UserAvatar initials={user.avatar} idx={idx} size={48} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-sm text-gray-900">{user.name}</span>
          {user.isVerified && (
            <svg width="13" height="13" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#3b82f6"/><polyline points="8 12 11 15 16 9" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )}
          <span className="text-xs text-amber-500 font-semibold">⭐ {user.trustScore}</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">📍 {user.neighborhood} · {user.mutualCount} mutual</p>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {user.interests.slice(0, 3).map(i => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: "rgba(124,58,237,0.08)", color: "#7c3aed" }}>
              {INTEREST_EMOJI[i as Interest]} {i}
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={() => { if (!currentUser) { router.push("/auth"); return; } onToggle(); }}
        className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
          isFollowing
            ? "border border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-500 hover:bg-red-50"
            : "text-white"
        }`}
        style={isFollowing ? {} : { background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
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
    { key: "suggestions",  label: "Suggestions",  count: MOCK_SUGGESTIONS.length },
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
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-xl mx-auto px-4 pt-4 pb-0">
          <h1 className="text-xl font-bold text-gray-900 mb-3">People</h1>

          {/* Search */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2.5 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 flex-shrink-0">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search people..."
              className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder-gray-400"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold transition-all border-b-2 ${
                  tab === t.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}>
                {t.label}
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                  tab === t.key ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
                }`}>{t.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto">
        {/* Guest banner */}
        {!currentUser && (
          <div className="mx-4 mt-4 p-4 rounded-2xl border-2 flex items-center gap-3"
            style={{ background: "rgba(37,99,235,0.06)", borderColor: "rgba(37,99,235,0.18)" }}>
            <span className="text-2xl flex-shrink-0">👥</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800">Sign in to follow people</p>
              <p className="text-xs text-gray-500 mt-0.5">Build your hangout crew</p>
            </div>
            <button onClick={() => router.push("/auth")}
              className="px-3 py-1.5 rounded-full text-xs font-bold text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
              Sign in
            </button>
          </div>
        )}

        {tab === "suggestions" && (
          <p className="px-4 pt-4 text-xs text-gray-400 font-semibold">
            People with similar interests near you
          </p>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">{tab === "following" ? "🤝" : tab === "followers" ? "👥" : "✨"}</p>
            <p className="font-semibold text-gray-600">
              {tab === "following" ? "Not following anyone yet" : tab === "followers" ? "No followers yet" : "No suggestions"}
            </p>
            <p className="text-sm mt-1 text-gray-400">
              {tab === "following" ? "Check suggestions to find people" : "Go free to get discovered!"}
            </p>
            {tab === "following" && (
              <button onClick={() => setTab("suggestions")}
                className="mt-4 px-5 py-2 rounded-full text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
                Find people →
              </button>
            )}
          </div>
        ) : (
          <div className="mt-2">
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
