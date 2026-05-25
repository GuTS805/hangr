"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import GroupCard from "@/components/GroupCard";
import CreateGroupModal from "@/components/CreateGroupModal";
import QuickRoomModal from "@/components/QuickRoomModal";
import InterestBadge from "@/components/InterestBadge";
import Link from "next/link";
import { SAFE_LOCATIONS, SAFE_LOCATION_ICONS, SAFE_LOCATION_COLORS, INTEREST_EMOJI } from "@/lib/mock-data";
import { SafeLocation } from "@/types";

function formatFreeUntil(ts: number): string {
  const diff = ts - Date.now();
  if (diff <= 0) return "expired";
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const STEPS = [
  { icon: "🟢", title: "Tap \"I'm Free\"", desc: "One button. Instantly visible to people nearby for 2 hours." },
  { icon: "👀", title: "See who's around", desc: "Browse groups and people with matching interests near you." },
  { icon: "📍", title: "Meet up", desc: "Pick a verified café, mall, or park — and just show up." },
];

const FEATURES = [
  { icon: "🛡️", title: "Public meetups only", desc: "Every group must meet at a verified safe place — cafes, malls, parks. No private locations.", color: "border-blue-900/40", bg: "rgba(123,167,212,0.07)" },
  { icon: "⭐", title: "Trust scores", desc: "Users build reputation through meetup reviews. ⭐ 4.8 Trusted means something here.", color: "border-amber-800/40", bg: "rgba(232,188,80,0.07)" },
  { icon: "♀", title: "Women-only groups", desc: "Female users can create groups that only women can join. Your safety, your rules.", color: "border-pink-800/40", bg: "rgba(236,72,153,0.07)" },
  { icon: "🎓", title: "Verified profiles", desc: "Google and college email verification. Know who you're meeting before you go.", color: "border-purple-800/40", bg: "rgba(139,92,246,0.07)" },
  { icon: "⏱", title: "Auto-expires", desc: "Groups disappear after a few hours. No stale plans, no awkward follow-ups.", color: "border-green-800/40", bg: "rgba(82,168,98,0.07)" },
  { icon: "🚩", title: "Report & block", desc: "One-tap report with instant block. Mods review every report within 24 hours.", color: "border-red-800/40", bg: "rgba(224,117,117,0.07)" },
];

const LANDING_INTERESTS = ["🎮 Gaming", "🏏 Cricket", "💻 Coding", "☕ Cafes", "⛩️ Anime", "🎵 Music", "💪 Gym", "⚽ Football", "🎬 Movies", "🍕 Food"];

const STATS = [
  { value: "2 min", label: "avg time to find a group" },
  { value: "100%", label: "meetups at verified places" },
  { value: "4.7★", label: "avg user trust score" },
  { value: "0", label: "private meetups allowed" },
];

function useGeoToggleFree() {
  const { toggleFree, updateStreak } = useStore();
  return () => {
    const doToggle = (lat?: number, lng?: number) => {
      toggleFree(lat, lng);
      updateStreak();
    };
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      doToggle();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => doToggle(pos.coords.latitude, pos.coords.longitude),
      () => doToggle(),
      { timeout: 6000, maximumAge: 60000 },
    );
  };
}

function MiniAvatar({ src, name }: { src: string; name: string }) {
  const isUrl = src?.startsWith("http");
  const isEmoji = !isUrl && src?.length <= 2;
  if (isUrl) return (
    <img src={src} referrerPolicy="no-referrer" alt=""
      className="w-10 h-10 rounded-full object-cover border-2 border-white flex-shrink-0" />
  );
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-white flex-shrink-0"
      style={{ background: "linear-gradient(135deg,#52A862,#448C50)" }}>
      {isEmoji ? src : name.slice(0, 2).toUpperCase()}
    </div>
  );
}

// Section label — Duolingo style: small caps, letter-spaced, with a right-extending line
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-xs font-extrabold uppercase tracking-[2px] whitespace-nowrap" style={{ color: "var(--nav-text)" }}>
        {children}
      </span>
      <div className="flex-1 h-px" style={{ background: "var(--border-color)" }} />
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { currentUser, needsOnboarding, isFree, freeUntil, groups, nearbyUsers, pingUser } = useStore();
  const handleToggleFree = useGeoToggleFree();
  const [showCreate, setShowCreate] = useState(false);
  const [showQuickRoom, setShowQuickRoom] = useState(false);
  const [prefilledLoc, setPrefilledLoc] = useState<SafeLocation | null>(null);
  const [dismissedRatings, setDismissedRatings] = useState<string[]>([]);
  const [pingedUsers, setPingedUsers] = useState<string[]>([]);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);

  // ── Logged-in dashboard ───────────────────────────────────────────────────
  if (currentUser) {
    if (needsOnboarding) { router.replace("/auth"); return null; }

    const myGroups = groups.filter((g) => g.members.some((m) => m.id === currentUser.id));
    const activeGroups = myGroups.filter((g) => g.expiresAt > Date.now());
    const suggestedGroups = groups
      .filter((g) => !g.members.some((m) => m.id === currentUser.id) && currentUser.interests.includes(g.topic) && g.expiresAt > Date.now())
      .slice(0, 2);

    const nearbyFree = nearbyUsers
      .filter((u) => u.isFree && u.id !== currentUser.id)
      .slice(0, 3);

    const now = Date.now();
    const ratingPrompts = groups.filter(
      (g) => g.expiresAt <= now && g.expiresAt >= now - 24 * 60 * 60 * 1000 &&
        g.members.some((m) => m.id === currentUser.id) && !dismissedRatings.includes(g.id),
    );

    const spots = SAFE_LOCATIONS.slice(0, 5).map((loc) => ({
      ...loc,
      activeGroups: groups.filter((g) => g.safeLocationId === loc.id && g.expiresAt > Date.now()).length,
    })).sort((a, b) => b.activeGroups - a.activeGroups);

    function handlePing(userId: string) {
      setPingedUsers((p) => [...p, userId]);
      pingUser(userId);
    }

    function meetAtSpot(loc: SafeLocation) {
      setPrefilledLoc(loc);
      setSelectedSpotId(loc.id);
      setShowCreate(true);
    }

    const totalActive = groups.filter((g) => g.expiresAt > Date.now()).length;
    const QUICK_ACTS = [
      { emoji: "☕", label: "Chai run" }, { emoji: "🎮", label: "Gaming" },
      { emoji: "🍕", label: "Food trip" }, { emoji: "🏏", label: "Cricket" },
      { emoji: "💻", label: "Study/Code" }, { emoji: "🎬", label: "Movie" },
    ];

    return (
      <>
        <div className="max-w-2xl mx-auto px-3 sm:px-4 pb-10 space-y-4">

          {/* Rating prompts */}
          {ratingPrompts.map((g) => (
            <div key={g.id} className="rounded-2xl p-4 flex items-center gap-3 mt-4 border-2"
              style={{ background: "#faf5ff", borderColor: "#d8b4fe" }}>
              <span className="text-2xl">⭐</span>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: "#6b21a8" }}>How was {g.name}?</p>
                <p className="text-xs mt-0.5" style={{ color: "#9333ea" }}>Rate your experience</p>
              </div>
              <button onClick={() => router.push(`/groups/${g.id}`)}
                className="duo-btn duo-btn-sm"
                style={{ background: "#9333ea", color: "#fff", boxShadow: "0 3px 0 #7e22ce" }}>
                Rate
              </button>
              <button onClick={() => setDismissedRatings((d) => [...d, g.id])}
                className="text-xl leading-none" style={{ color: "#c084fc" }}>×</button>
            </div>
          ))}

          {/* ── HERO STATUS CARD ── */}
          <div className="relative overflow-hidden rounded-3xl transition-all duration-500"
            style={{
              background: isFree
                ? "linear-gradient(135deg,#52A862 0%,#448C50 60%,#3da000 100%)"
                : "linear-gradient(135deg,#1E1B3A 0%,#2A2550 100%)",
            }}>
            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
            {isFree && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
            )}

            <div className="relative p-5 sm:p-6">
              {/* Top row */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {isFree && <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse inline-block" />}
                    <span className="text-xs font-extrabold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.70)" }}>
                      {isFree ? "Live · Visible to people nearby" : "Offline · Hidden from others"}
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold leading-tight text-white">
                    {isFree ? "You're free! 🎉" : "Ready to hang out?"}
                  </h2>
                  {isFree && freeUntil && (
                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>{formatFreeUntil(freeUntil)} remaining · auto-off at 2h</p>
                  )}
                  {!isFree && (
                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.50)" }}>Tap to go visible · people nearby will see you</p>
                  )}
                </div>
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {currentUser.avatar?.startsWith("http") || currentUser.avatar?.startsWith("data:") ? (
                    <img src={currentUser.avatar} referrerPolicy="no-referrer" alt=""
                      className="w-14 h-14 rounded-2xl object-cover border-2" style={{ borderColor: "rgba(255,255,255,0.30)" }} />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-extrabold text-white"
                      style={{ background: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.30)" }}>
                      {currentUser.avatar?.length <= 2 ? currentUser.avatar : currentUser.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {isFree && <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white" style={{ background: "#52A862" }} />}
                </div>
              </div>

              {/* 3D Toggle button */}
              <button onClick={handleToggleFree}
                className="w-full py-3 rounded-2xl font-extrabold text-sm transition-all active:scale-95 mb-4"
                style={isFree
                  ? { background: "#fff", color: "#448C50", boxShadow: "0 4px 0 rgba(0,0,0,0.15)" }
                  : { background: "#52A862", color: "#fff", boxShadow: "0 4px 0 #3D7D47" }
                }>
                {isFree ? "🟢 I'm Free! · Tap to go offline" : "😴 Tap to go Free now"}
              </button>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: "🔥", value: (currentUser.streakDays ?? 0) > 0 ? `${currentUser.streakDays}d` : "—", label: "Streak" },
                  { icon: "👥", value: currentUser.totalMeetups ?? 0, label: "Meetups" },
                  { icon: "⭐", value: currentUser.trustScore > 0 ? currentUser.trustScore.toFixed(1) : "New", label: "Trust" },
                ].map(({ icon, value, label }) => (
                  <div key={label} className="rounded-2xl px-3 py-2.5 text-center" style={{ background: "rgba(255,255,255,0.12)" }}>
                    <p className="text-lg font-extrabold text-white">{icon} {value}</p>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── LIVE ACTIVITY BANNER ── */}
          <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 border-2" style={{ borderColor: "var(--border-color)" }}>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#52A862" }} />
              <span className="text-xs font-extrabold" style={{ color: "var(--gray-text)" }}>Live nearby</span>
            </div>
            <div className="h-4 w-px flex-shrink-0" style={{ background: "var(--border-color)" }} />
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-none text-xs flex-1 font-semibold" style={{ color: "var(--gray-light)" }}>
              <span className="flex-shrink-0">🧑‍🤝‍🧑 <strong style={{ color: "var(--gray-text)" }}>{nearbyFree.length}</strong> free now</span>
              <span className="flex-shrink-0">🏘️ <strong style={{ color: "var(--gray-text)" }}>{totalActive}</strong> active groups</span>
              <span className="flex-shrink-0">📍 <strong style={{ color: "var(--gray-text)" }}>{spots.filter(s => s.activeGroups > 0).length}</strong> hot spots</span>
            </div>
            <button onClick={() => router.push("/explore")}
              className="flex-shrink-0 text-xs font-bold hover:underline" style={{ color: "var(--duo-blue)" }}>
              Explore →
            </button>
          </div>

          {/* ── QUICK START ── */}
          <div>
            <SectionLabel>⚡ Quick start</SectionLabel>
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
              {QUICK_ACTS.map((a) => (
                <button key={a.label} onClick={() => setShowQuickRoom(true)}
                  className="flex-shrink-0 flex flex-col items-center gap-1.5 rounded-2xl px-4 py-3 transition-all group border-2 bg-white"
                  style={{ borderColor: "var(--border-color)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--duo-blue)"; (e.currentTarget as HTMLElement).style.background = "#eff9ff"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)"; (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                  <span className="text-2xl">{a.emoji}</span>
                  <span className="text-xs font-bold whitespace-nowrap" style={{ color: "var(--gray-text)" }}>{a.label}</span>
                </button>
              ))}
              <button onClick={() => setShowCreate(true)}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 rounded-2xl px-4 py-3 transition-all"
                style={{ background: "var(--dark-blue)" }}>
                <span className="text-2xl">➕</span>
                <span className="text-xs font-bold text-white whitespace-nowrap">Custom</span>
              </button>
            </div>
          </div>

          {/* ── WHO'S FREE NEARBY ── */}
          {nearbyFree.length > 0 ? (
            <div className="bg-white rounded-3xl overflow-hidden border-2" style={{ borderColor: "var(--border-color)" }}>
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b" style={{ borderColor: "var(--border-color)" }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#52A862" }} />
                  <p className="text-sm font-extrabold" style={{ color: "var(--gray-text)" }}>Free right now</p>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full" style={{ background: "rgba(82,168,98,0.12)", color: "#52A862" }}>{nearbyFree.length}</span>
                </div>
                <button onClick={() => router.push("/explore")} className="text-xs font-bold hover:underline" style={{ color: "var(--duo-blue)" }}>See all →</button>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--border-color)" }}>
                {nearbyFree.map((u) => {
                  const shared = u.interests.filter((i) => currentUser.interests.includes(i));
                  return (
                    <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="relative">
                        <MiniAvatar src={u.avatar} name={u.name} />
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: "#52A862" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-extrabold" style={{ color: "var(--gray-text)" }}>{u.name}</p>
                          <span className="text-xs" style={{ color: "var(--nav-text)" }}>{u.age}</span>
                          {u.isVerified && <span className="text-xs" style={{ color: "var(--duo-blue)" }}>✓</span>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {u.distanceKm !== undefined && (
                            <span className="text-xs font-bold" style={{ color: "#52A862" }}>
                              📍 {u.distanceKm < 1 ? `${Math.round(u.distanceKm * 1000)}m` : `${u.distanceKm.toFixed(1)}km`}
                            </span>
                          )}
                          {shared.length > 0 && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold border"
                              style={{ background: "rgba(123,167,212,0.08)", color: "var(--duo-blue)", borderColor: "rgba(123,167,212,0.20)" }}>
                              {INTEREST_EMOJI[shared[0]]} {shared[0]}{shared.length > 1 ? ` +${shared.length - 1}` : ""}
                            </span>
                          )}
                          {u.statusText && (
                            <span className="text-xs italic truncate max-w-[100px]" style={{ color: "var(--nav-text)" }}>&quot;{u.statusText}&quot;</span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => handlePing(u.id)} disabled={pingedUsers.includes(u.id)}
                        className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                        style={pingedUsers.includes(u.id)
                          ? { background: "rgba(82,168,98,0.10)", color: "#52A862", border: "1.5px solid rgba(82,168,98,0.30)" }
                          : { background: "var(--duo-blue)", color: "#fff", boxShadow: "0 3px 0 #5A87B4" }
                        }>
                        {pingedUsers.includes(u.id) ? "✓ Sent" : "👋 Ping"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl p-5 flex items-center gap-4 border-2"
              style={{ background: "rgba(123,167,212,0.06)", borderColor: "rgba(123,167,212,0.15)" }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: "rgba(123,167,212,0.12)" }}>👀</div>
              <div className="flex-1">
                <p className="text-sm font-extrabold" style={{ color: "var(--dark-blue)" }}>Nobody free nearby yet</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--duo-blue)" }}>Go free above — you might be the first one nearby</p>
              </div>
              <button onClick={() => router.push("/explore")}
                className="duo-btn duo-btn-sm flex-shrink-0"
                style={{ background: "var(--duo-blue)", color: "#fff", boxShadow: "0 3px 0 #5A87B4" }}>
                Browse
              </button>
            </div>
          )}

          {/* ── HOT SPOTS ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>📍 Pick a meetup spot</SectionLabel>
              <button onClick={() => router.push("/explore")} className="text-xs font-bold hover:underline mb-4" style={{ color: "var(--duo-blue)" }}>
                Open map →
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {spots.map((loc) => (
                <button key={loc.id} onClick={() => meetAtSpot(loc)}
                  className="relative flex flex-col items-start gap-2 p-3 rounded-2xl text-left transition-all active:scale-95 border-2 bg-white"
                  style={selectedSpotId === loc.id
                    ? { borderColor: "#52A862", background: "rgba(82,168,98,0.10)", boxShadow: "0 4px 16px rgba(82,168,98,0.20)" }
                    : { borderColor: "var(--border-color)" }
                  }
                  onMouseEnter={e => { if (selectedSpotId !== loc.id) (e.currentTarget as HTMLElement).style.borderColor = "var(--duo-blue)"; }}
                  onMouseLeave={e => { if (selectedSpotId !== loc.id) (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)"; }}>
                  {loc.activeGroups > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--duo-orange)" }} />
                  )}
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border ${SAFE_LOCATION_COLORS[loc.type]}`}>
                    {SAFE_LOCATION_ICONS[loc.type]}
                  </span>
                  <div className="w-full">
                    <p className="text-xs font-extrabold leading-tight line-clamp-2" style={{ color: "var(--gray-text)" }}>{loc.name}</p>
                    <p className="text-xs capitalize mt-0.5" style={{ color: "var(--nav-text)" }}>{loc.type}</p>
                    {loc.distanceKm !== undefined && (
                      <p className="text-xs font-bold mt-0.5" style={{ color: "var(--duo-blue)" }}>
                        {loc.distanceKm < 1 ? `${Math.round(loc.distanceKm * 1000)}m` : `${loc.distanceKm.toFixed(1)} km`} away
                      </p>
                    )}
                  </div>
                  <div className="w-full flex items-center justify-between">
                    {loc.activeGroups > 0 ? (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-bold border"
                        style={{ background: "rgba(255,150,0,0.08)", color: "var(--duo-orange)", borderColor: "rgba(255,150,0,0.25)" }}>
                        {loc.activeGroups} active
                      </span>
                    ) : (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: "rgba(82,168,98,0.10)", color: "#52A862" }}>
                        Safe ✓
                      </span>
                    )}
                    <span className="text-sm" style={{ color: "var(--nav-text)" }}>›</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── INTERESTS ── */}
          {currentUser.interests.length > 0 ? (
            <div className="bg-white rounded-2xl p-4 border-2" style={{ borderColor: "var(--border-color)" }}>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-sm font-extrabold" style={{ color: "var(--gray-text)" }}>Your vibe</p>
                <button onClick={() => router.push("/profile")} className="text-xs font-bold hover:underline" style={{ color: "var(--duo-blue)" }}>Edit</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {currentUser.interests.map((i) => <InterestBadge key={i} interest={i} size="md" />)}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-4 flex items-center gap-3 border-2"
              style={{ background: "rgba(255,200,0,0.06)", borderColor: "rgba(255,200,0,0.30)" }}>
              <span className="text-2xl">✏️</span>
              <div className="flex-1">
                <p className="text-sm font-extrabold" style={{ color: "#92600a" }}>No interests set</p>
                <p className="text-xs mt-0.5" style={{ color: "#a16207" }}>Add some so we can match you with people nearby</p>
              </div>
              <button onClick={() => router.push("/profile")} className="text-xs font-bold hover:underline" style={{ color: "#92600a" }}>Add →</button>
            </div>
          )}

          {/* ── YOUR GROUPS ── */}
          {activeGroups.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <SectionLabel>Your groups</SectionLabel>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full mb-4"
                  style={{ background: "rgba(123,167,212,0.12)", color: "var(--duo-blue)" }}>
                  {activeGroups.length}
                </span>
              </div>
              <div className="space-y-2">{activeGroups.map((g) => <GroupCard key={g.id} group={g} />)}</div>
            </div>
          )}

          {/* ── SUGGESTED GROUPS ── */}
          {suggestedGroups.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <SectionLabel>Matches your interests</SectionLabel>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full mb-4"
                    style={{ background: "rgba(82,168,98,0.12)", color: "#52A862" }}>
                    {suggestedGroups.length}
                  </span>
                </div>
                <button onClick={() => router.push("/explore")} className="text-xs font-bold hover:underline mb-4" style={{ color: "var(--duo-blue)" }}>See all →</button>
              </div>
              <div className="space-y-2">{suggestedGroups.map((g) => <GroupCard key={g.id} group={g} />)}</div>
            </div>
          )}

        </div>

        {showCreate && <CreateGroupModal onClose={() => { setShowCreate(false); setPrefilledLoc(null); setSelectedSpotId(null); }} prefilledLocation={prefilledLoc} />}
        {showQuickRoom && <QuickRoomModal onClose={() => setShowQuickRoom(false)} />}
      </>
    );
  }

  // ── Landing page (logged out) ─────────────────────────────────────────────
  const MOCK_GROUPS = [
    { emoji: "🎮", name: "Valorant Squad", loc: "Blue Tokai, Sector 62", members: "2/5", time: "Tonight 8 PM" },
    { emoji: "☕", name: "Late Night Chai", loc: "Chai Point, Sector 18", members: "2/6", time: "In 1 hour", femaleOnly: true },
    { emoji: "⚽", name: "Evening Football", loc: "Sector 50 Park", members: "1/10", time: "6 PM today" },
  ];

  return (
    <div style={{ background: "#F8F7FF", fontFamily: "'Nunito',sans-serif" }}>

      {/* ── HERO ── */}
      <section style={{ position: "relative", overflow: "hidden", background: "linear-gradient(150deg,rgba(82,168,98,0.10) 0%,#F8F7FF 40%,rgba(123,167,212,0.10) 100%)", minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center" }}>
        {/* bg blobs */}
        <div style={{ position: "absolute", top: "-15%", left: "-8%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(82,168,98,0.07) 0%,transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-20%", right: "-8%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(123,167,212,0.07) 0%,transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1320, margin: "0 auto", padding: "64px 40px", width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>

          {/* Left — text */}
          <div className="anim-slide-up">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(82,168,98,0.09)", border: "2px solid rgba(82,168,98,0.22)", borderRadius: 100, padding: "7px 18px", marginBottom: 32 }}>
              <div style={{ position: "relative", width: 10, height: 10, flexShrink: 0 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#52A862" }} />
                <div className="anim-ping" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#52A862" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#448C50" }}>47 people free in Noida right now</span>
            </div>

            <h1 style={{ fontFamily: "'Feather Bold','Nunito',sans-serif", fontWeight: "normal", fontSize: "clamp(38px,4.5vw,68px)", lineHeight: 1.1, color: "#1E1B3A", marginBottom: 24 }}>
              Stop scrolling.<br />
              <span style={{ color: "#52A862" }}>Go meet people.</span>
            </h1>

            <p style={{ fontSize: 18, color: "#777", lineHeight: 1.65, maxWidth: 440, marginBottom: 36 }}>
              Find people nearby who are free <em>right now</em>. One button, no planning, no DMs — just show up.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
              <button onClick={() => router.push("/auth")} className="duo-btn duo-btn-primary" style={{ fontSize: 16, height: 52, padding: "0 32px", borderRadius: 14, boxShadow: "0 5px 0 var(--green-shadow)" }}>
                I&apos;m Free right now →
              </button>
              <Link href="/explore" className="duo-btn duo-btn-secondary" style={{ fontSize: 16, height: 52, padding: "0 32px", borderRadius: 14 }}>
                Browse groups
              </Link>
            </div>

            {/* Social proof row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex" }}>
                {["🦊","🎮","🐻","🦋","🎯"].map((e, i) => (
                  <div key={i} style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#52A862,#448C50)", border: "2.5px solid #fff", marginLeft: i > 0 ? -10 : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{e}</div>
                ))}
              </div>
              <p style={{ fontSize: 13, color: "#777", fontWeight: 600 }}>
                <strong style={{ color: "#1E1B3A" }}>2,400+</strong> people found hangouts this week
              </p>
            </div>
          </div>

          {/* Right — phone mockup + floating cards */}
          <div style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center", padding: "60px 100px" }}>

            {/* ── Phone ── */}
            <div style={{ width: 258, height: 520, background: "#1E1B3A", borderRadius: 42, border: "8px solid #2A2550", boxShadow: "0 48px 96px rgba(30,27,58,0.38), 0 0 0 1px rgba(255,255,255,0.07)", overflow: "hidden", position: "relative", flexShrink: 0 }}>
              {/* Dynamic island */}
              <div style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 88, height: 22, background: "#000", borderRadius: 11 }} />
              </div>
              {/* Content */}
              <div style={{ padding: "0 10px" }}>
                {/* Status card */}
                <div style={{ background: "linear-gradient(135deg,#52A862,#448C50)", borderRadius: 20, padding: 14, marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.90)" }} />
                    <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>Live · Visible nearby</span>
                  </div>
                  <p style={{ color: "#fff", fontSize: 17, fontWeight: 900, marginBottom: 2 }}>You&apos;re free! 🎉</p>
                  <p style={{ color: "rgba(255,255,255,0.68)", fontSize: 9, marginBottom: 10 }}>1h 47m remaining · auto-off at 2h</p>
                  <div style={{ background: "rgba(255,255,255,0.22)", borderRadius: 12, padding: "8px 0", textAlign: "center", color: "#fff", fontSize: 11, fontWeight: 800 }}>
                    🟢 I&apos;m Free! · Tap to go offline
                  </div>
                </div>
                {/* Stats */}
                <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
                  {[["🔥","5d","Streak"],["👥","3","Meetups"],["⭐","4.8","Trust"]].map(([ic,v,l]) => (
                    <div key={l as string} style={{ flex: 1, background: "rgba(255,255,255,0.07)", borderRadius: 14, padding: "7px 4px", textAlign: "center" }}>
                      <p style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>{ic} {v}</p>
                      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 8, marginTop: 1 }}>{l}</p>
                    </div>
                  ))}
                </div>
                {/* Nearby list */}
                <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 14, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ padding: "8px 10px 5px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#52A862", display: "inline-block" }} />
                    <span style={{ color: "#fff", fontSize: 10, fontWeight: 800 }}>Free right now</span>
                    <span style={{ background: "rgba(82,168,98,0.20)", color: "#52A862", padding: "1px 6px", borderRadius: 8, fontSize: 9, fontWeight: 800, marginLeft: "auto" }}>3</span>
                  </div>
                  {[{e:"🦊",n:"Priya K.",d:"300m",i:"Coding"},{e:"🎮",n:"Arjun S.",d:"500m",i:"Gaming"},{e:"🐻",n:"Riya M.",d:"1.2km",i:"Music"}].map(u=>(
                    <div key={u.n} style={{ display:"flex",alignItems:"center",gap:7,padding:"7px 10px",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#52A862,#3da000)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0 }}>{u.e}</div>
                      <div style={{ flex:1 }}>
                        <p style={{ color:"#fff",fontSize:10,fontWeight:700 }}>{u.n}</p>
                        <p style={{ color:"rgba(255,255,255,0.40)",fontSize:8 }}>📍 {u.d} · {u.i}</p>
                      </div>
                      <div style={{ background:"#7BA7D4",color:"#fff",fontSize:8,fontWeight:800,padding:"3px 7px",borderRadius:7,boxShadow:"0 2px 0 #5A87B4" }}>Ping</div>
                    </div>
                  ))}
                </div>
                {/* Quick acts */}
                <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
                  {["☕ Chai","🎮 Games","🍕 Food","🏏 Cricket"].map(a=>(
                    <div key={a} style={{ padding:"5px 8px",background:"rgba(255,255,255,0.07)",borderRadius:10,fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.80)",border:"1px solid rgba(255,255,255,0.10)" }}>{a}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Floating cards ── */}
            {/* Top-left: live count */}
            <div className="anim-float desktop-only" style={{ position:"absolute",top:16,left:8,background:"#fff",borderRadius:16,padding:"10px 14px",boxShadow:"0 8px 28px rgba(0,0,0,0.10)",border:"2px solid rgba(82,168,98,0.22)",display:"flex",alignItems:"center",gap:8,zIndex:10,whiteSpace:"nowrap" }}>
              <div style={{ position:"relative",width:10,height:10,flexShrink:0 }}>
                <div style={{ position:"absolute",inset:0,borderRadius:"50%",background:"#52A862" }} />
                <div className="anim-ping" style={{ position:"absolute",inset:0,borderRadius:"50%",background:"#52A862" }} />
              </div>
              <span style={{ fontSize:13,fontWeight:800,color:"#1E1B3A" }}>47 free nearby</span>
            </div>
            {/* Left-mid: user joined */}
            <div className="anim-float-d2 desktop-only" style={{ position:"absolute",top:"42%",left:0,background:"#fff",borderRadius:16,padding:"10px 14px",boxShadow:"0 8px 28px rgba(0,0,0,0.10)",border:"2px solid rgba(123,167,212,0.22)",display:"flex",alignItems:"center",gap:9,zIndex:10,whiteSpace:"nowrap" }}>
              <div style={{ width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#52A862,#3da000)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0 }}>🦊</div>
              <div>
                <p style={{ fontSize:12,fontWeight:800,color:"#1E1B3A" }}>Priya joined!</p>
                <p style={{ fontSize:10,color:"#777",marginTop:1 }}>Chai run · 300m away</p>
              </div>
            </div>
            {/* Top-right: trust */}
            <div className="anim-float-d1 desktop-only" style={{ position:"absolute",top:52,right:4,background:"#fff",borderRadius:16,padding:"10px 16px",boxShadow:"0 8px 28px rgba(0,0,0,0.10)",border:"2px solid rgba(255,200,0,0.30)",zIndex:10,whiteSpace:"nowrap" }}>
              <p style={{ fontSize:12,fontWeight:800,color:"#1E1B3A" }}>⭐ 4.8 Trust Score</p>
              <p style={{ fontSize:10,color:"#777",marginTop:2 }}>124 verified meetups</p>
            </div>
            {/* Right-mid: groups active */}
            <div className="anim-float-d3 desktop-only" style={{ position:"absolute",bottom:100,right:2,background:"#fff",borderRadius:16,padding:"10px 14px",boxShadow:"0 8px 28px rgba(0,0,0,0.10)",border:"2px solid rgba(255,150,0,0.25)",zIndex:10,whiteSpace:"nowrap" }}>
              <p style={{ fontSize:12,fontWeight:800,color:"#1E1B3A" }}>🏘️ 3 groups active</p>
              <p style={{ fontSize:10,color:"#777",marginTop:2 }}>Gaming · Chai · Cricket</p>
            </div>
            {/* Bottom-left: ping */}
            <div className="anim-float-d4 desktop-only" style={{ position:"absolute",bottom:30,left:10,background:"#fff",borderRadius:16,padding:"10px 14px",boxShadow:"0 8px 28px rgba(0,0,0,0.10)",border:"2px solid rgba(82,168,98,0.20)",display:"flex",alignItems:"center",gap:8,zIndex:10,whiteSpace:"nowrap" }}>
              <span style={{ fontSize:18 }}>👋</span>
              <div>
                <p style={{ fontSize:11,fontWeight:800,color:"#1E1B3A" }}>Arjun pinged you!</p>
                <p style={{ fontSize:10,color:"#777" }}>Gaming · 500m away</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ background:"var(--dark-blue)" }}>
        <div style={{ maxWidth:1320,margin:"0 auto",padding:"40px 40px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:0 }}>
          {STATS.map(({ value, label },i) => (
            <div key={label} style={{ textAlign:"center",padding:"20px 16px",borderRight: i < 3 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
              <p style={{ fontSize:34,fontWeight:900,color:"#fff",marginBottom:4 }}>{value}</p>
              <p style={{ fontSize:13,color:"rgba(255,255,255,0.50)",fontWeight:600 }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding:"88px 0",position:"relative",overflow:"hidden",background:"#F3F1FF" }}>
        {/* Left floating emojis */}
        <div className="desktop-only" style={{ position:"absolute",left:40,top:"50%",transform:"translateY(-50%)",display:"flex",flexDirection:"column",gap:20 }}>
          {[["🟢","rgba(82,168,98,0.10)","rgba(82,168,98,0.18)"],["📍","rgba(123,167,212,0.10)","rgba(123,167,212,0.18)"],["👥","rgba(82,168,98,0.10)","rgba(82,168,98,0.18)"],["🎉","rgba(255,200,0,0.12)","rgba(255,200,0,0.22)"]].map(([e,bg,border],i)=>(
            <div key={e as string} className={["anim-float","anim-float-d1","anim-float-d2","anim-float-d3"][i]} style={{ width:52,height:52,borderRadius:16,background:bg as string,border:`2px solid ${border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>{e}</div>
          ))}
        </div>
        {/* Right floating emojis */}
        <div className="desktop-only" style={{ position:"absolute",right:40,top:"50%",transform:"translateY(-50%)",display:"flex",flexDirection:"column",gap:20 }}>
          {[["⭐","rgba(255,200,0,0.12)","rgba(255,200,0,0.22)"],["🛡️","rgba(123,167,212,0.10)","rgba(123,167,212,0.18)"],["🎓","rgba(82,168,98,0.10)","rgba(82,168,98,0.18)"],["🚀","rgba(255,150,0,0.10)","rgba(255,150,0,0.20)"]].map(([e,bg,border],i)=>(
            <div key={e as string} className={["anim-float-d2","anim-float","anim-float-d3","anim-float-d1"][i]} style={{ width:52,height:52,borderRadius:16,background:bg as string,border:`2px solid ${border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>{e}</div>
          ))}
        </div>

        <div style={{ maxWidth:920,margin:"0 auto",padding:"0 40px" }}>
          <div style={{ textAlign:"center",marginBottom:52 }}>
            <p style={{ fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:2,color:"#52A862",marginBottom:12 }}>How it works</p>
            <h2 style={{ fontSize:40,fontWeight:900,color:"#1E1B3A" }}>Three steps to a hangout</h2>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20 }}>
            {STEPS.map((step, i) => (
              <div key={i} className="group" style={{ position:"relative",background:"rgba(255,255,255,0.75)",borderRadius:24,padding:28,border:"2px solid var(--border-color)",boxShadow:"0 4px 0 var(--border-color)",transition:"all 0.2s",cursor:"default",backdropFilter:"blur(8px)" }}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor="#52A862";(e.currentTarget as HTMLElement).style.boxShadow="0 4px 0 rgba(82,168,98,0.25)";(e.currentTarget as HTMLElement).style.transform="translateY(-4px)";}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="var(--border-color)";(e.currentTarget as HTMLElement).style.boxShadow="0 4px 0 var(--border-color)";(e.currentTarget as HTMLElement).style.transform="";}}>
                <div style={{ width:48,height:48,borderRadius:16,background:"rgba(82,168,98,0.09)",border:"2px solid rgba(82,168,98,0.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,marginBottom:20 }}>{step.icon}</div>
                <div style={{ position:"absolute",top:24,right:24,fontSize:52,fontWeight:900,color:"var(--border-color)",lineHeight:1 }}>{i+1}</div>
                <h3 style={{ fontSize:17,fontWeight:800,color:"#1E1B3A",marginBottom:8 }}>{step.title}</h3>
                <p style={{ fontSize:14,color:"#777",lineHeight:1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTERESTS ── */}
      <section style={{ padding:"80px 0",background:"linear-gradient(135deg,rgba(82,168,98,0.05) 0%,rgba(123,167,212,0.04) 100%)",borderTop:"2px solid rgba(82,168,98,0.10)",borderBottom:"2px solid rgba(82,168,98,0.10)",position:"relative",overflow:"hidden" }}>
        {/* bg blobs */}
        <div style={{ position:"absolute",top:"-30%",left:"-5%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(82,168,98,0.06) 0%,transparent 70%)",pointerEvents:"none" }} />
        <div style={{ position:"absolute",bottom:"-30%",right:"-5%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(123,167,212,0.06) 0%,transparent 70%)",pointerEvents:"none" }} />

        <div style={{ maxWidth:1400,margin:"0 auto",padding:"0 40px",display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:48,alignItems:"center" }}>

          {/* Left — live activity by interest */}
          <div className="desktop-only" style={{ display:"flex",flexDirection:"column",gap:12 }}>
            <p style={{ fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:2,color:"#52A862",marginBottom:4 }}>Active right now</p>
            {[
              { emoji:"🎮", label:"Gaming",   count:12, color:"rgba(82,168,98,0.12)",  border:"rgba(82,168,98,0.25)",  text:"#448C50" },
              { emoji:"☕", label:"Cafes",    count:8,  color:"rgba(255,150,0,0.10)", border:"rgba(255,150,0,0.25)", text:"#c97200" },
              { emoji:"💻", label:"Coding",   count:6,  color:"rgba(123,167,212,0.10)",border:"rgba(123,167,212,0.25)",text:"#5A87B4" },
              { emoji:"🏏", label:"Cricket",  count:9,  color:"rgba(82,168,98,0.08)",  border:"rgba(82,168,98,0.20)",  text:"#448C50" },
              { emoji:"🎵", label:"Music",    count:4,  color:"rgba(255,200,0,0.10)", border:"rgba(255,200,0,0.25)", text:"#a07000" },
            ].map((item,i)=>(
              <div key={item.label} className={["anim-float","anim-float-d1","anim-float-d2","anim-float-d3","anim-float-d4"][i]}
                style={{ background:item.color,border:`2px solid ${item.border}`,borderRadius:16,padding:"12px 16px",display:"flex",alignItems:"center",gap:12 }}>
                <span style={{ fontSize:22,flexShrink:0 }}>{item.emoji}</span>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13,fontWeight:800,color:"#1E1B3A" }}>{item.label}</p>
                  <p style={{ fontSize:11,color:"#777",marginTop:1 }}>{item.count} groups active nearby</p>
                </div>
                <span style={{ fontSize:11,fontWeight:800,color:item.text,background:"rgba(255,255,255,0.60)",padding:"3px 8px",borderRadius:8 }}>{item.count}</span>
              </div>
            ))}
          </div>

          {/* Center — pill cloud */}
          <div style={{ textAlign:"center",maxWidth:560 }}>
            <p style={{ fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:2,color:"#52A862",marginBottom:12 }}>What people hang out for</p>
            <h2 style={{ fontSize:36,fontWeight:900,color:"#1E1B3A",marginBottom:32 }}>Find your people</h2>
            <div style={{ display:"flex",flexWrap:"wrap",justifyContent:"center",gap:12 }}>
              {LANDING_INTERESTS.map((interest, i) => (
                <span key={interest} style={{
                  padding:"10px 22px",borderRadius:100,fontSize:15,fontWeight:700,border:"2px solid",cursor:"default",userSelect:"none",
                  ...(i%3===0 ? {background:"#52A862",color:"#fff",borderColor:"#52A862"} : i%3===1 ? {background:"rgba(255,255,255,0.80)",color:"#4A4560",borderColor:"#E8E5F0",boxShadow:"0 2px 8px rgba(30,27,58,0.06)"} : {background:"rgba(82,168,98,0.10)",color:"#448C50",borderColor:"rgba(82,168,98,0.22)"})
                }}>{interest}</span>
              ))}
            </div>
            <p style={{ fontSize:13,color:"#777",marginTop:24,fontWeight:600 }}>+ dozens more interests · something for everyone</p>
          </div>

          {/* Right — "join a vibe" user stack */}
          <div className="desktop-only" style={{ display:"flex",flexDirection:"column",gap:12 }}>
            <p style={{ fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:2,color:"var(--duo-blue)",marginBottom:4 }}>Recently joined</p>
            {[
              { e:"🦊", n:"Priya K.",   interest:"☕ Cafes",   time:"2 min ago",   trust:"4.9★" },
              { e:"🎮", n:"Arjun S.",   interest:"🎮 Gaming",  time:"5 min ago",   trust:"4.7★" },
              { e:"🐻", n:"Riya M.",    interest:"🎵 Music",   time:"8 min ago",   trust:"5.0★" },
              { e:"🦋", n:"Kabir T.",   interest:"💻 Coding",  time:"12 min ago",  trust:"4.8★" },
              { e:"🎯", n:"Sneha R.",   interest:"🏏 Cricket", time:"15 min ago",  trust:"4.6★" },
            ].map((u,i)=>(
              <div key={u.n} className={["anim-float-d2","anim-float","anim-float-d3","anim-float-d1","anim-float-d4"][i]}
                style={{ background:"#fff",border:"2px solid var(--border-color)",borderRadius:16,padding:"11px 14px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
                <div style={{ width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#52A862,#448C50)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>{u.e}</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <p style={{ fontSize:13,fontWeight:800,color:"#1E1B3A" }}>{u.n}</p>
                  <p style={{ fontSize:11,color:"#777",marginTop:1 }}>{u.interest} · {u.time}</p>
                </div>
                <span style={{ fontSize:11,fontWeight:700,color:"#f59e0b",flexShrink:0 }}>{u.trust}</span>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding:"88px 0",background:"#F8F7FF",position:"relative",overflow:"hidden" }}>
        {/* Left side decorative column */}
        <div className="desktop-only" style={{ position:"absolute",left:0,top:0,bottom:0,width:200,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"flex-start",padding:"0 24px",gap:16,pointerEvents:"none" }}>
          {[
            { icon:"✓", text:"Verified profiles",    color:"rgba(82,168,98,0.10)",  border:"rgba(82,168,98,0.25)",   check:"#52A862" },
            { icon:"✓", text:"Public spots only",    color:"rgba(123,167,212,0.10)",border:"rgba(123,167,212,0.25)", check:"#7BA7D4" },
            { icon:"✓", text:"Trust scores",         color:"rgba(255,200,0,0.12)", border:"rgba(255,200,0,0.30)",  check:"#f59e0b" },
            { icon:"✓", text:"Auto-expires in 2h",   color:"rgba(82,168,98,0.10)",  border:"rgba(82,168,98,0.25)",   check:"#52A862" },
            { icon:"✓", text:"One-tap report",       color:"rgba(255,75,75,0.08)", border:"rgba(255,75,75,0.20)",  check:"#FF4B4B" },
          ].map((item,i)=>(
            <div key={item.text} className={["anim-float","anim-float-d2","anim-float-d1","anim-float-d3","anim-float-d4"][i]}
              style={{ background:item.color,border:`2px solid ${item.border}`,borderRadius:14,padding:"10px 14px",display:"flex",alignItems:"center",gap:8,whiteSpace:"nowrap" }}>
              <span style={{ width:20,height:20,borderRadius:"50%",background:item.check,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:900,flexShrink:0 }}>{item.icon}</span>
              <span style={{ fontSize:12,fontWeight:700,color:"#1E1B3A" }}>{item.text}</span>
            </div>
          ))}
        </div>

        {/* Right side decorative column */}
        <div className="desktop-only" style={{ position:"absolute",right:0,top:0,bottom:0,width:200,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"flex-end",padding:"0 24px",gap:20,pointerEvents:"none" }}>
          {[
            { val:"0",      label:"Private meetups",   color:"#FF4B4B" },
            { val:"100%",   label:"Verified spots",    color:"#52A862" },
            { val:"24h",    label:"Mod response time", color:"#7BA7D4" },
            { val:"4.7★",  label:"Safety rating",     color:"#f59e0b" },
          ].map((s,i)=>(
            <div key={s.label} className={["anim-float-d1","anim-float","anim-float-d3","anim-float-d2"][i]}
              style={{ background:"#fafafa",border:"2px solid var(--border-color)",borderRadius:14,padding:"12px 16px",textAlign:"right",boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
              <p style={{ fontSize:22,fontWeight:900,color:s.color,lineHeight:1 }}>{s.val}</p>
              <p style={{ fontSize:10,fontWeight:600,color:"#777",marginTop:3 }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div style={{ maxWidth:1200,margin:"0 auto",padding:"0 40px" }}>
          <div style={{ textAlign:"center",marginBottom:52 }}>
            <p style={{ fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:2,color:"#52A862",marginBottom:12 }}>Built for safety</p>
            <h2 style={{ fontSize:40,fontWeight:900,color:"#1E1B3A",marginBottom:12 }}>Meeting strangers, done right</h2>
            <p style={{ fontSize:16,color:"#777",maxWidth:480,margin:"0 auto" }}>Every feature was designed around one question: would you feel safe using this?</p>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16 }}>
            {FEATURES.map((f) => (
              <div key={f.title} className={`border-2 rounded-2xl p-6 ${f.color}`} style={{ transition:"all 0.2s",background:f.bg }}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.boxShadow="0 8px 24px rgba(0,0,0,0.30)";(e.currentTarget as HTMLElement).style.transform="translateY(-4px)";}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.boxShadow="";(e.currentTarget as HTMLElement).style.transform="";}}>
                <span style={{ fontSize:32,marginBottom:16,display:"block" }}>{f.icon}</span>
                <h3 style={{ fontSize:15,fontWeight:800,color:"#1E1B3A",marginBottom:8 }}>{f.title}</h3>
                <p style={{ fontSize:13,color:"#777",lineHeight:1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MOCK FEED (3-col) ── */}
      <section style={{ background:"var(--dark-blue)",padding:"80px 0" }}>
        <div style={{ maxWidth:1280,margin:"0 auto",padding:"0 40px",display:"grid",gridTemplateColumns:"1fr 480px 1fr",gap:40,alignItems:"start" }}>

          {/* Left col — social proof */}
          <div className="desktop-only" style={{ display:"flex",flexDirection:"column",gap:16,paddingTop:56 }}>
            {[
              { val:"2,400+", label:"Hangouts this week", color:"#52A862" },
              { val:"100%", label:"At verified locations", color:"#7BA7D4" },
              { val:"4.7★", label:"Avg trust score", color:"#FFC800" },
            ].map(s=>(
              <div key={s.label} style={{ background:"rgba(255,255,255,0.06)",borderRadius:20,padding:"20px 24px",border:"1px solid rgba(255,255,255,0.08)" }}>
                <p style={{ fontSize:32,fontWeight:900,color:s.color,marginBottom:4 }}>{s.val}</p>
                <p style={{ fontSize:13,color:"rgba(255,255,255,0.55)",fontWeight:600 }}>{s.label}</p>
              </div>
            ))}
            <div style={{ background:"rgba(255,255,255,0.06)",borderRadius:20,padding:"16px 20px",border:"1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display:"flex",marginBottom:10 }}>
                {["🦊","🎮","🐻","🦋"].map((e,i)=>(
                  <div key={i} style={{ width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#52A862,#448C50)",border:"2px solid rgba(255,255,255,0.20)",marginLeft:i>0?-8:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15 }}>{e}</div>
                ))}
              </div>
              <p style={{ fontSize:13,fontWeight:700,color:"#fff" }}>Arjun joined Gaming Squad</p>
              <p style={{ fontSize:11,color:"rgba(255,255,255,0.45)",marginTop:2 }}>2 minutes ago · 500m away</p>
            </div>
          </div>

          {/* Center col — feed */}
          <div>
            <div style={{ textAlign:"center",marginBottom:32 }}>
              <p style={{ fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:2,color:"#52A862",marginBottom:10 }}>Live right now</p>
              <h2 style={{ fontSize:30,fontWeight:900,color:"#fff" }}>People hanging out today</h2>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              {MOCK_GROUPS.map((g) => (
                <div key={g.name} style={{ borderRadius:20,padding:"14px 18px",display:"flex",alignItems:"center",gap:14,border:"2px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.06)",cursor:"pointer",transition:"border-color 0.15s" }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor="rgba(82,168,98,0.40)";}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.08)";}}>
                  <div style={{ width:44,height:44,borderRadius:14,background:"rgba(255,255,255,0.10)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>{g.emoji}</div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:3 }}>
                      <span style={{ fontWeight:800,fontSize:14,color:"#fff" }}>{g.name}</span>
                      {g.femaleOnly && <span style={{ fontSize:10,padding:"2px 7px",borderRadius:8,color:"#f9a8d4",background:"rgba(249,168,212,0.12)",border:"1px solid rgba(249,168,212,0.25)",fontWeight:700 }}>♀ Women only</span>}
                      <span style={{ fontSize:10,padding:"2px 7px",borderRadius:8,color:"#52A862",background:"rgba(82,168,98,0.12)",border:"1px solid rgba(82,168,98,0.25)",fontWeight:700 }}>Public</span>
                    </div>
                    <p style={{ fontSize:11,color:"rgba(255,255,255,0.50)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>📍 {g.loc} · 🕐 {g.time}</p>
                  </div>
                  <div style={{ display:"flex",alignItems:"center",gap:10,flexShrink:0 }}>
                    <span style={{ fontSize:11,color:"rgba(255,255,255,0.40)" }}>{g.members}</span>
                    <button onClick={() => router.push("/auth")} className="duo-btn duo-btn-sm duo-btn-primary">Join</button>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ textAlign:"center",fontSize:11,color:"rgba(255,255,255,0.30)",marginTop:20 }}>Sign in to see all groups near you</p>
          </div>

          {/* Right col — safety highlights */}
          <div className="desktop-only" style={{ display:"flex",flexDirection:"column",gap:16,paddingTop:56 }}>
            {[
              { icon:"🛡️", title:"Public meetups only", desc:"Every group meets at a verified café, mall, or park. No private locations." },
              { icon:"⭐", title:"Trust scores", desc:"Every user has a rating from past meetups. Know before you go." },
              { icon:"⏱", title:"Auto-expires", desc:"Groups vanish after a few hours. No stale plans, no awkward follow-ups." },
              { icon:"🚩", title:"One-tap report", desc:"Instant block + report. Mods review within 24 hours." },
            ].map(f=>(
              <div key={f.title} style={{ background:"rgba(255,255,255,0.06)",borderRadius:20,padding:"16px 20px",border:"1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize:22,display:"block",marginBottom:8 }}>{f.icon}</span>
                <p style={{ fontSize:13,fontWeight:800,color:"#fff",marginBottom:4 }}>{f.title}</p>
                <p style={{ fontSize:11,color:"rgba(255,255,255,0.50)",lineHeight:1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ background:"linear-gradient(135deg,#52A862 0%,#448C50 100%)",padding:"100px 0",position:"relative",overflow:"hidden" }}>
        {/* Decorative circles */}
        <div style={{ position:"absolute",top:"-40%",left:"-8%",width:500,height:500,borderRadius:"50%",background:"rgba(255,255,255,0.07)",pointerEvents:"none" }} />
        <div style={{ position:"absolute",bottom:"-50%",right:"-5%",width:600,height:600,borderRadius:"50%",background:"rgba(255,255,255,0.06)",pointerEvents:"none" }} />
        <div style={{ position:"absolute",top:"20%",right:"12%",width:200,height:200,borderRadius:"50%",background:"rgba(255,255,255,0.06)",pointerEvents:"none" }} />

        {/* Left floating user cards */}
        <div className="desktop-only" style={{ position:"absolute",left:60,top:"50%",transform:"translateY(-50%)",display:"flex",flexDirection:"column",gap:14 }}>
          {[{e:"🦊",n:"Priya K.",t:"Found a chai run!"},{e:"🎮",n:"Arjun S.",t:"Joined Gaming Squad"},{e:"🐻",n:"Riya M.",t:"Made 3 new friends"}].map((u,i)=>(
            <div key={u.n} className={["anim-float","anim-float-d1","anim-float-d2"][i]} style={{ background:"rgba(255,255,255,0.18)",backdropFilter:"blur(12px)",borderRadius:16,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,border:"1px solid rgba(255,255,255,0.30)",whiteSpace:"nowrap" }}>
              <div style={{ width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.30)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>{u.e}</div>
              <div>
                <p style={{ fontSize:12,fontWeight:800,color:"#fff" }}>{u.n}</p>
                <p style={{ fontSize:10,color:"rgba(255,255,255,0.80)" }}>{u.t}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Right floating stat cards */}
        <div className="desktop-only" style={{ position:"absolute",right:60,top:"50%",transform:"translateY(-50%)",display:"flex",flexDirection:"column",gap:14,alignItems:"flex-end" }}>
          {[{icon:"🔥",val:"5-day",sub:"avg streak"},{icon:"⭐",val:"4.8",sub:"trust score"},{icon:"👥",val:"2,400+",sub:"weekly hangouts"}].map((s,i)=>(
            <div key={s.sub} className={["anim-float-d3","anim-float","anim-float-d4"][i]} style={{ background:"rgba(255,255,255,0.18)",backdropFilter:"blur(12px)",borderRadius:16,padding:"12px 18px",border:"1px solid rgba(255,255,255,0.30)",whiteSpace:"nowrap",textAlign:"right" }}>
              <p style={{ fontSize:18,fontWeight:900,color:"#fff" }}>{s.icon} {s.val}</p>
              <p style={{ fontSize:10,color:"rgba(255,255,255,0.80)",marginTop:2 }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Center */}
        <div style={{ textAlign:"center",position:"relative",zIndex:1 }}>
          <h2 style={{ fontFamily:"'Feather Bold','Nunito',sans-serif",fontWeight:"normal",fontSize:"clamp(36px,5vw,60px)",lineHeight:1.15,color:"#fff",marginBottom:20 }}>
            Your free hour<br />starts now.
          </h2>
          <p style={{ fontSize:17,color:"rgba(255,255,255,0.80)",maxWidth:400,margin:"0 auto 36px",lineHeight:1.6 }}>
            No plans needed. Just tap once and find someone to hang out with today.
          </p>
          <button onClick={() => router.push("/auth")} className="duo-btn duo-btn-dark" style={{ fontSize:17,height:56,padding:"0 40px",borderRadius:16,boxShadow:"0 6px 0 rgba(0,0,0,0.20)" }}>
            Get started — it&apos;s free →
          </button>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:24,marginTop:24,fontSize:13,color:"rgba(255,255,255,0.75)",fontWeight:600 }}>
            <span>✓ No sign-up fee</span>
            <span>✓ Public meetups only</span>
            <span>✓ Verified profiles</span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background:"var(--dark-blue)",borderTop:"1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth:1280,margin:"0 auto",padding:"32px 40px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <span style={{ fontSize:18,fontWeight:900,color:"#fff" }}>hangr</span>
            <span style={{ color:"rgba(255,255,255,0.18)" }}>·</span>
            <span style={{ fontSize:14,color:"rgba(255,255,255,0.42)" }}>Real-time spontaneous meetups</span>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:24,fontSize:13,color:"rgba(255,255,255,0.38)",fontWeight:600 }}>
            <span>🛡️ Safe meetups only</span>
            <span>📍 Noida, India</span>
            <span>Free · No spam</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
