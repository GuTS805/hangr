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
  { icon: "🛡️", title: "Public meetups only", desc: "Every group must meet at a verified safe place — cafes, malls, parks. No private locations.", color: "bg-blue-50 border-blue-100" },
  { icon: "⭐", title: "Trust scores", desc: "Users build reputation through meetup reviews. ⭐ 4.8 Trusted means something here.", color: "bg-amber-50 border-amber-100" },
  { icon: "♀", title: "Women-only groups", desc: "Female users can create groups that only women can join. Your safety, your rules.", color: "bg-pink-50 border-pink-100" },
  { icon: "🎓", title: "Verified profiles", desc: "Google and college email verification. Know who you're meeting before you go.", color: "bg-purple-50 border-purple-100" },
  { icon: "⏱", title: "Auto-expires", desc: "Groups disappear after a few hours. No stale plans, no awkward follow-ups.", color: "bg-green-50 border-green-100" },
  { icon: "🚩", title: "Report & block", desc: "One-tap report with instant block. Mods review every report within 24 hours.", color: "bg-red-50 border-red-100" },
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

// ── Avatar mini ───────────────────────────────────────────────────────────────
function MiniAvatar({ src, name }: { src: string; name: string }) {
  const isUrl = src?.startsWith("http");
  const isEmoji = !isUrl && src?.length <= 2;
  if (isUrl) return (
    <img src={src} referrerPolicy="no-referrer" alt=""
      className="w-10 h-10 rounded-full object-cover border-2 border-white flex-shrink-0" />
  );
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm border-2 border-white flex-shrink-0">
      {isEmoji ? src : name.slice(0, 2).toUpperCase()}
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

    // Free people nearby (not self)
    const nearbyFree = nearbyUsers
      .filter((u) => u.isFree && u.id !== currentUser.id)
      .slice(0, 3);

    // Post-meetup rating prompts
    const now = Date.now();
    const ratingPrompts = groups.filter(
      (g) => g.expiresAt <= now && g.expiresAt >= now - 24 * 60 * 60 * 1000 &&
        g.members.some((m) => m.id === currentUser.id) && !dismissedRatings.includes(g.id),
    );

    // Top spots sorted by groups active there
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
        <div className="max-w-2xl mx-auto px-3 sm:px-4 pb-8 space-y-4">

          {/* Rating prompts */}
          {ratingPrompts.map((g) => (
            <div key={g.id} className="bg-violet-50 border border-violet-200 rounded-2xl p-4 flex items-center gap-3 mt-4">
              <span className="text-2xl">⭐</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-violet-900">How was {g.name}?</p>
                <p className="text-xs text-violet-600 mt-0.5">Rate your experience</p>
              </div>
              <button onClick={() => router.push(`/groups/${g.id}`)}
                className="px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-xl hover:bg-violet-700 transition-colors">Rate →</button>
              <button onClick={() => setDismissedRatings((d) => [...d, g.id])}
                className="text-violet-300 hover:text-violet-500 text-xl leading-none">×</button>
            </div>
          ))}

          {/* ── HERO STATUS CARD ── */}
          <div className={`relative overflow-hidden rounded-3xl transition-all duration-500 ${
            isFree
              ? "bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600"
              : "bg-gradient-to-br from-gray-800 via-gray-900 to-black"
          }`}>
            {/* Background decorative circles */}
            {isFree && (
              <>
                <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white/10 rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full animate-pulse" />
              </>
            )}
            {!isFree && (
              <>
                <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/5 rounded-full" />
                <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-white/5 rounded-full" />
              </>
            )}

            <div className="relative p-5 sm:p-6">
              {/* Top row */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {isFree && <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse inline-block" />}
                    <span className="text-white/70 text-xs font-semibold uppercase tracking-widest">
                      {isFree ? "Live · Visible to people nearby" : "Offline · Hidden from others"}
                    </span>
                  </div>
                  <h2 className="text-white text-2xl font-extrabold leading-tight">
                    {isFree ? "You're free! 🎉" : "Ready to hang out?"}
                  </h2>
                  {isFree && freeUntil && (
                    <p className="text-white/70 text-xs mt-1">{formatFreeUntil(freeUntil)} remaining · auto-off at 2h</p>
                  )}
                  {!isFree && (
                    <p className="text-white/50 text-xs mt-1">Tap to go visible · people nearby will see you</p>
                  )}
                </div>
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {currentUser.avatar?.startsWith("http") || currentUser.avatar?.startsWith("data:") ? (
                    <img src={currentUser.avatar} referrerPolicy="no-referrer" alt=""
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-white/30" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-2xl font-bold text-white">
                      {currentUser.avatar?.length <= 2 ? currentUser.avatar : currentUser.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {isFree && <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />}
                </div>
              </div>

              {/* Toggle button */}
              <button onClick={handleToggleFree}
                className={`w-full py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 mb-4 ${
                  isFree
                    ? "bg-white text-emerald-600 hover:bg-white/90 shadow-lg"
                    : "bg-blue-500 text-white hover:bg-blue-400 shadow-lg shadow-blue-900/40"
                }`}>
                {isFree ? "🟢 I'm Free! · Tap to go offline" : "😴 Tap to go Free now"}
              </button>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: "🔥", value: (currentUser.streakDays ?? 0) > 0 ? `${currentUser.streakDays}d` : "—", label: "Streak", color: "text-orange-300" },
                  { icon: "👥", value: currentUser.totalMeetups ?? 0, label: "Meetups", color: "text-blue-300" },
                  { icon: "⭐", value: currentUser.trustScore > 0 ? currentUser.trustScore.toFixed(1) : "New", label: "Trust", color: "text-yellow-300" },
                ].map(({ icon, value, label, color }) => (
                  <div key={label} className="bg-white/10 rounded-2xl px-3 py-2.5 text-center backdrop-blur-sm">
                    <p className={`text-lg font-extrabold text-white`}>{icon} {value}</p>
                    <p className={`text-xs font-medium mt-0.5 ${color}`}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── LIVE ACTIVITY BANNER ── */}
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-gray-700">Live nearby</span>
            </div>
            <div className="h-4 w-px bg-gray-200 flex-shrink-0" />
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-none text-xs text-gray-500 font-medium flex-1">
              <span className="flex-shrink-0">🧑‍🤝‍🧑 <strong className="text-gray-800">{nearbyFree.length}</strong> free now</span>
              <span className="flex-shrink-0">🏘️ <strong className="text-gray-800">{totalActive}</strong> active groups</span>
              <span className="flex-shrink-0">📍 <strong className="text-gray-800">{spots.filter(s => s.activeGroups > 0).length}</strong> hot spots</span>
            </div>
            <button onClick={() => router.push("/explore")}
              className="flex-shrink-0 text-xs text-blue-600 font-semibold hover:underline">Explore →</button>
          </div>

          {/* ── QUICK START ── */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">⚡ Quick start</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
              {QUICK_ACTS.map((a) => (
                <button key={a.label} onClick={() => setShowQuickRoom(true)}
                  className="flex-shrink-0 flex flex-col items-center gap-1.5 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-2xl px-4 py-3 transition-all group">
                  <span className="text-2xl">{a.emoji}</span>
                  <span className="text-xs font-semibold text-gray-700 group-hover:text-blue-700 whitespace-nowrap">{a.label}</span>
                </button>
              ))}
              <button onClick={() => setShowCreate(true)}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 bg-gray-900 hover:bg-gray-700 rounded-2xl px-4 py-3 transition-all">
                <span className="text-2xl">➕</span>
                <span className="text-xs font-semibold text-white whitespace-nowrap">Custom</span>
              </button>
            </div>
          </div>

          {/* ── WHO'S FREE NEARBY ── */}
          {nearbyFree.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <p className="text-sm font-bold text-gray-900">Free right now</p>
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{nearbyFree.length}</span>
                </div>
                <button onClick={() => router.push("/explore")} className="text-xs text-blue-600 font-semibold hover:underline">See all →</button>
              </div>
              <div className="divide-y divide-gray-50">
                {nearbyFree.map((u) => {
                  const shared = u.interests.filter((i) => currentUser.interests.includes(i));
                  return (
                    <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="relative">
                        <MiniAvatar src={u.avatar} name={u.name} />
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-bold text-gray-900">{u.name}</p>
                          <span className="text-xs text-gray-400">{u.age}</span>
                          {u.isVerified && <span className="text-blue-500 text-xs">✓</span>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {u.distanceKm !== undefined && (
                            <span className="text-xs font-semibold text-green-600">
                              📍 {u.distanceKm < 1 ? `${Math.round(u.distanceKm * 1000)}m` : `${u.distanceKm.toFixed(1)}km`}
                            </span>
                          )}
                          {shared.length > 0 && (
                            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded-full font-medium">
                              {INTEREST_EMOJI[shared[0]]} {shared[0]}{shared.length > 1 ? ` +${shared.length - 1}` : ""}
                            </span>
                          )}
                          {u.statusText && (
                            <span className="text-xs text-gray-400 italic truncate max-w-[100px]">&quot;{u.statusText}&quot;</span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => handlePing(u.id)} disabled={pingedUsers.includes(u.id)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          pingedUsers.includes(u.id)
                            ? "bg-green-50 text-green-600 border border-green-200"
                            : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200"
                        }`}>
                        {pingedUsers.includes(u.id) ? "✓ Sent" : "👋 Ping"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">👀</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-blue-900">Nobody free nearby yet</p>
                <p className="text-xs text-blue-600 mt-0.5">Go free above — you might be the first one nearby</p>
              </div>
              <button onClick={() => router.push("/explore")}
                className="flex-shrink-0 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors">Browse →</button>
            </div>
          )}

          {/* ── HOT SPOTS ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-900">📍 Pick a meetup spot</p>
              <button onClick={() => router.push("/explore")} className="text-xs text-blue-600 font-semibold hover:underline">Open map →</button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {spots.map((loc) => (
                <button key={loc.id} onClick={() => meetAtSpot(loc)}
                  className={`relative flex flex-col items-start gap-2 p-3 rounded-2xl border-2 text-left transition-all hover:shadow-md active:scale-95 ${
                    selectedSpotId === loc.id
                      ? "border-emerald-400 bg-emerald-50 shadow-emerald-100 shadow-md"
                      : "border-gray-100 bg-white hover:border-gray-200"
                  }`}>
                  {loc.activeGroups > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                  )}
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border ${SAFE_LOCATION_COLORS[loc.type]}`}>
                    {SAFE_LOCATION_ICONS[loc.type]}
                  </span>
                  <div className="w-full">
                    <p className="text-xs font-bold text-gray-900 leading-tight line-clamp-2">{loc.name}</p>
                    <p className="text-xs text-gray-400 capitalize mt-0.5">{loc.type}</p>
                    {loc.distanceKm !== undefined && (
                      <p className="text-xs font-semibold text-blue-600 mt-0.5">
                        {loc.distanceKm < 1 ? `${Math.round(loc.distanceKm * 1000)}m` : `${loc.distanceKm.toFixed(1)} km`} away
                      </p>
                    )}
                  </div>
                  <div className="w-full flex items-center justify-between">
                    {loc.activeGroups > 0 ? (
                      <span className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded-full font-bold">{loc.activeGroups} active</span>
                    ) : (
                      <span className="text-xs bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">Safe ✓</span>
                    )}
                    <span className="text-gray-300 text-sm">›</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── INTERESTS ── */}
          {currentUser.interests.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-sm font-bold text-gray-900">Your vibe</p>
                <button onClick={() => router.push("/profile")} className="text-xs text-blue-600 font-semibold hover:underline">Edit</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {currentUser.interests.map((i) => <InterestBadge key={i} interest={i} size="md" />)}
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">✏️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">No interests set</p>
                <p className="text-xs text-amber-700 mt-0.5">Add some so we can match you with people nearby</p>
              </div>
              <button onClick={() => router.push("/profile")} className="text-xs font-semibold text-amber-700 hover:underline">Add →</button>
            </div>
          )}

          {/* ── YOUR GROUPS ── */}
          {activeGroups.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-sm font-bold text-gray-900">Your groups</p>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{activeGroups.length}</span>
              </div>
              <div className="space-y-2">{activeGroups.map((g) => <GroupCard key={g.id} group={g} />)}</div>
            </div>
          )}

          {/* ── SUGGESTED GROUPS ── */}
          {suggestedGroups.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-900">Matches your interests</p>
                  <span className="bg-violet-100 text-violet-700 text-xs font-bold px-2 py-0.5 rounded-full">{suggestedGroups.length}</span>
                </div>
                <button onClick={() => router.push("/explore")} className="text-xs text-blue-600 font-semibold hover:underline">See all →</button>
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
  return (
    <div className="bg-white">

      {/* HERO */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-40 -translate-y-1/2" />
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-purple-100 rounded-full blur-3xl opacity-30" />
        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-green-700">47 people free in Noida right now</span>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6">
            Stop scrolling.<br />
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">Go meet people.</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
            Find people nearby who are free <em>right now</em>. One button, no planning, no DMs — just show up.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button onClick={() => router.push("/auth")}
              className="px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 text-base w-full sm:w-auto">
              I&apos;m Free right now →
            </button>
            <Link href="/explore"
              className="px-8 py-4 bg-gray-100 text-gray-700 font-semibold rounded-2xl hover:bg-gray-200 transition-colors text-base w-full sm:w-auto text-center">
              Browse groups
            </Link>
          </div>
          <p className="text-xs text-gray-400 mt-4">Free · No spam · Public meetups only</p>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-gray-100 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-extrabold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-4xl font-bold text-gray-900">Three steps to a hangout</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <div key={i} className="relative bg-white border border-gray-200 rounded-3xl p-7 hover:border-blue-200 hover:shadow-md transition-all group">
              <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center text-2xl mb-5 group-hover:bg-blue-50 transition-colors">{step.icon}</div>
              <div className="absolute top-6 right-6 text-5xl font-black text-gray-100 select-none">{i + 1}</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* INTERESTS */}
      <section className="bg-gray-50 border-y border-gray-100 py-14">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3">What people hang out for</p>
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Find your people</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {LANDING_INTERESTS.map((interest, i) => (
              <span key={interest}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold border transition-all cursor-default select-none ${i % 3 === 0 ? "bg-blue-600 text-white border-blue-600 text-base" : i % 3 === 1 ? "bg-white text-gray-700 border-gray-300" : "bg-gray-100 text-gray-600 border-gray-100"}`}>
                {interest}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3">Built for safety</p>
          <h2 className="text-4xl font-bold text-gray-900">Meeting strangers, done right</h2>
          <p className="text-gray-500 mt-3 max-w-lg mx-auto">Every feature was designed around one question: would you feel safe using this?</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className={`border rounded-2xl p-6 ${f.color} hover:shadow-sm transition-shadow`}>
              <span className="text-3xl mb-4 block">{f.icon}</span>
              <h3 className="text-base font-bold text-gray-900 mb-1.5">{f.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MOCK FEED */}
      <section className="bg-gray-50 border-y border-gray-100 py-16">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3">Live right now</p>
            <h2 className="text-3xl font-bold text-gray-900">People hanging out today</h2>
          </div>
          <div className="space-y-3">
            {[
              { emoji: "🎮", name: "Valorant Squad", loc: "Blue Tokai, Sector 62", members: "2/5", time: "Tonight 8 PM" },
              { emoji: "☕", name: "Late Night Chai", loc: "Chai Point, Sector 18", members: "2/6", time: "In 1 hour", femaleOnly: true },
              { emoji: "⚽", name: "Evening Football", loc: "Sector 50 Park", members: "1/10", time: "6 PM today" },
            ].map((g) => (
              <div key={g.name} className="bg-white border border-gray-200 rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-gray-300 hover:shadow-sm transition-all">
                <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">{g.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-gray-900 text-sm">{g.name}</span>
                    {g.femaleOnly && <span className="text-xs text-pink-600 bg-pink-50 border border-pink-200 px-1.5 py-0.5 rounded-full">♀ Women only</span>}
                    <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">🌍 Public</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">📍 {g.loc} · 🕐 {g.time}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-gray-400">{g.members}</span>
                  <button onClick={() => router.push("/auth")}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors">Join</button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-5">Sign in to see all groups and join ones near you</p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-5xl font-extrabold text-gray-900 leading-tight mb-4">
          Your free hour<br />
          <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">starts now.</span>
        </h2>
        <p className="text-gray-500 text-lg mb-10 max-w-md mx-auto">No plans needed. Just tap once and find someone to hang out with today.</p>
        <button onClick={() => router.push("/auth")}
          className="px-10 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95 text-lg">
          Get started — it&apos;s free →
        </button>
        <div className="flex items-center justify-center gap-6 mt-8 text-sm text-gray-400">
          <span>✓ No sign-up fee</span>
          <span>✓ Public meetups only</span>
          <span>✓ Verified profiles</span>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">hangr</span>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-400">Real-time spontaneous meetups</span>
          </div>
          <div className="flex items-center gap-5 text-sm text-gray-400">
            <span>🛡️ Safe meetups only</span>
            <span>📍 Noida, India</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
