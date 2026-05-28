"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import GroupCard from "@/components/GroupCard";
import CreateGroupModal from "@/components/CreateGroupModal";
import QuickRoomModal from "@/components/QuickRoomModal";
import InterestBadge from "@/components/InterestBadge";
import { SAFE_LOCATIONS, SAFE_LOCATION_ICONS, SAFE_LOCATION_COLORS, INTEREST_EMOJI } from "@/lib/mock-data";
import { SafeLocation } from "@/types";
import FeedPage from "@/app/feed/page";

function formatFreeUntil(ts: number): string {
  const diff = ts - Date.now();
  if (diff <= 0) return "expired";
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}


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

  // ── Guest: show the feed so new visitors engage right away ───────────────
  return <FeedPage />;
}

