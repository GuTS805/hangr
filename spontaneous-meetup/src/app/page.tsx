"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import GroupCard from "@/components/GroupCard";
import CreateGroupModal from "@/components/CreateGroupModal";
import QuickRoomModal from "@/components/QuickRoomModal";
import InterestBadge from "@/components/InterestBadge";
import Link from "next/link";

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

const INTERESTS = ["🎮 Gaming", "🏏 Cricket", "💻 Coding", "☕ Cafes", "⛩️ Anime", "🎵 Music", "💪 Gym", "⚽ Football", "🎬 Movies", "🍕 Food"];

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

export default function HomePage() {
  const router = useRouter();
  const { currentUser, needsOnboarding, isFree, freeUntil, groups } = useStore();
  const handleToggleFree = useGeoToggleFree();
  const [showCreate, setShowCreate] = useState(false);
  const [showQuickRoom, setShowQuickRoom] = useState(false);
  const [dismissedRatings, setDismissedRatings] = useState<string[]>([]);

  // ── Logged-in dashboard ──
  if (currentUser) {
    // First-time user — send to onboarding
    if (needsOnboarding) {
      router.replace("/auth");
      return null;
    }
    const myGroups = groups.filter((g) => g.members.some((m) => m.id === currentUser.id));
    const suggestedGroups = groups
      .filter((g) => !g.members.some((m) => m.id === currentUser.id) && currentUser.interests.includes(g.topic))
      .slice(0, 3);

    // Groups that expired in the last 24h that the user was in (for post-meetup rating)
    const now = Date.now();
    const ratingPrompts = groups.filter(
      (g) =>
        g.expiresAt <= now &&
        g.expiresAt >= now - 24 * 60 * 60 * 1000 &&
        g.members.some((m) => m.id === currentUser.id) &&
        !dismissedRatings.includes(g.id),
    );

    return (
      <>
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">

          {/* Post-meetup rating prompts */}
          {ratingPrompts.map((g) => (
            <div key={g.id} className="bg-violet-50 border border-violet-200 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">⭐</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-violet-900">How was {g.name}?</p>
                <p className="text-xs text-violet-600 mt-0.5">Rate your meetup experience</p>
              </div>
              <button
                onClick={() => router.push(`/groups/${g.id}`)}
                className="px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-xl hover:bg-violet-700 transition-colors">
                Rate →
              </button>
              <button onClick={() => setDismissedRatings((d) => [...d, g.id])}
                className="text-violet-300 hover:text-violet-500 text-lg leading-none">×</button>
            </div>
          ))}

          {/* I'm Free card */}
          <div className={`rounded-2xl p-6 text-center transition-all ${isFree ? "bg-green-50 border-2 border-green-300" : "bg-white border-2 border-gray-200"}`}>
            <h2 className="text-lg font-bold text-gray-900">
              {isFree ? "You're visible to nearby people" : "Are you free right now?"}
            </h2>
            {isFree && freeUntil && (
              <p className="text-sm text-green-600 mt-1">Active for {formatFreeUntil(freeUntil)} · Auto-off after 2h</p>
            )}
            {!isFree && (
              <p className="text-sm text-gray-500 mt-1">Tap to let nearby people know you&apos;re free to hang out</p>
            )}
            <button
              onClick={handleToggleFree}
              className={`mt-4 px-8 py-3 rounded-xl font-bold text-base transition-all active:scale-95 ${isFree ? "bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-200" : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"}`}
            >
              {isFree ? "🟢  I'm Free!" : "😴  I'm Bored / Free"}
            </button>
            {isFree && <p className="text-xs text-gray-400 mt-3">Tap again to go offline</p>}
          </div>

          {/* Interests */}
          {currentUser.interests.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Your interests</p>
              <div className="flex flex-wrap gap-1.5">
                {currentUser.interests.map((i) => <InterestBadge key={i} interest={i} size="md" />)}
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">✏️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">No interests set</p>
                <p className="text-xs text-amber-700 mt-0.5">Add interests so we can match you with nearby people</p>
              </div>
              <button onClick={() => router.push("/profile")} className="text-xs font-semibold text-amber-700 hover:underline">
                Edit →
              </button>
            </div>
          )}

          {/* Free nudge — shown when offline and no active groups */}
          {!isFree && myGroups.length === 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">👀</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900">See who&apos;s nearby</p>
                <p className="text-xs text-blue-700 mt-0.5">Tap &quot;I&apos;m Bored / Free&quot; above to appear on the map and find people right now</p>
              </div>
              <button onClick={() => router.push("/explore")} className="text-xs font-semibold text-blue-700 hover:underline">
                Explore →
              </button>
            </div>
          )}

          {myGroups.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Your groups</p>
              <div className="space-y-2">{myGroups.map((g) => <GroupCard key={g.id} group={g} />)}</div>
            </div>
          )}

          {suggestedGroups.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Matches your interests</p>
                <button onClick={() => router.push("/explore")} className="text-xs text-blue-600 font-medium hover:underline">See all →</button>
              </div>
              <div className="space-y-2">{suggestedGroups.map((g) => <GroupCard key={g.id} group={g} />)}</div>
            </div>
          )}

          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-5 text-center">
            <p className="text-gray-500 text-sm mb-3">No group for what you want to do?</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setShowQuickRoom(true)} className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
                ⚡ Quick Room
              </button>
              <button onClick={() => setShowCreate(true)} className="px-5 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors">
                + Custom group
              </button>
            </div>
          </div>
        </div>
        {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} />}
        {showQuickRoom && <QuickRoomModal onClose={() => setShowQuickRoom(false)} />}
      </>
    );
  }

  // ── Landing page (logged out) ──
  return (
    <div className="bg-white">

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-white">
        {/* Background blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-40 -translate-y-1/2" />
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-purple-100 rounded-full blur-3xl opacity-30" />

        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-green-700">47 people free in Noida right now</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6">
            Stop scrolling.
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              Go meet people.
            </span>
          </h1>

          <p className="text-xl text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
            Find people nearby who are free <em>right now</em>. One button, no planning, no DMs — just show up.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={() => router.push("/auth")}
              className="px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 text-base w-full sm:w-auto"
            >
              I&apos;m Free right now →
            </button>
            <Link
              href="/explore"
              className="px-8 py-4 bg-gray-100 text-gray-700 font-semibold rounded-2xl hover:bg-gray-200 transition-colors text-base w-full sm:w-auto text-center"
            >
              Browse groups
            </Link>
          </div>

          <p className="text-xs text-gray-400 mt-4">Free · No spam · Public meetups only</p>
        </div>
      </section>

      {/* ── STATS BAR ── */}
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

      {/* ── HOW IT WORKS ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-4xl font-bold text-gray-900">Three steps to a hangout</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <div key={i} className="relative bg-white border border-gray-200 rounded-3xl p-7 hover:border-blue-200 hover:shadow-md transition-all group">
              <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center text-2xl mb-5 group-hover:bg-blue-50 transition-colors">
                {step.icon}
              </div>
              <div className="absolute top-6 right-6 text-5xl font-black text-gray-100 select-none">
                {i + 1}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── INTERESTS CLOUD ── */}
      <section className="bg-gray-50 border-y border-gray-100 py-14">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3">What people hang out for</p>
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Find your people</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {INTERESTS.map((interest, i) => (
              <span
                key={interest}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold border transition-all cursor-default select-none ${
                  i % 3 === 0 ? "bg-blue-600 text-white border-blue-600 text-base" :
                  i % 3 === 1 ? "bg-white text-gray-700 border-gray-300" :
                  "bg-gray-100 text-gray-600 border-gray-100"
                }`}
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3">Built for safety</p>
          <h2 className="text-4xl font-bold text-gray-900">Meeting strangers, done right</h2>
          <p className="text-gray-500 mt-3 max-w-lg mx-auto">
            Every feature was designed around one question: would you feel safe using this?
          </p>
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

      {/* ── MOCK ACTIVITY FEED ── */}
      <section className="bg-gray-50 border-y border-gray-100 py-16">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3">Live right now</p>
            <h2 className="text-3xl font-bold text-gray-900">People hanging out today</h2>
          </div>
          <div className="space-y-3">
            {[
              { emoji: "🎮", name: "Valorant Squad", loc: "Blue Tokai, Sector 62", members: "2/5", time: "Tonight 8 PM", badge: "Gaming" },
              { emoji: "☕", name: "Late Night Chai", loc: "Chai Point, Sector 18", members: "2/6", time: "In 1 hour", badge: "Cafes", femaleOnly: true },
              { emoji: "⚽", name: "Evening Football", loc: "Sector 50 Park", members: "1/10", time: "6 PM today", badge: "Football" },
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
                  <button
                    onClick={() => router.push("/auth")}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Join
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-5">Sign in to see all groups and join ones near you</p>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-5xl font-extrabold text-gray-900 leading-tight mb-4">
          Your free hour
          <br />
          <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
            starts now.
          </span>
        </h2>
        <p className="text-gray-500 text-lg mb-10 max-w-md mx-auto">
          No plans needed. Just tap once and find someone to hang out with today.
        </p>
        <button
          onClick={() => router.push("/auth")}
          className="px-10 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95 text-lg"
        >
          Get started — it&apos;s free →
        </button>
        <div className="flex items-center justify-center gap-6 mt-8 text-sm text-gray-400">
          <span>✓ No sign-up fee</span>
          <span>✓ Public meetups only</span>
          <span>✓ Verified profiles</span>
        </div>
      </section>

      {/* ── FOOTER ── */}
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
