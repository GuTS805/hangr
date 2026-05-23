"use client";

import { useState } from "react";
import { User } from "@/types";
import { useStore } from "@/lib/store";
import { fmtDistance } from "@/lib/geo";
import TrustBadge from "./TrustBadge";
import ReportModal from "./ReportModal";
import ReviewModal from "./ReviewModal";
import { INTEREST_EMOJI } from "@/lib/mock-data";

interface Props {
  user: User;
  groupId?: string;
  matchScore?: number; // 0-100, for interest-based highlight
  metBefore?: boolean;
}

const STATUS_PRESETS = [
  "Free for chai ☕", "Up for cricket 🏏", "Bored af, ping me 😴",
  "Down for anything 🙌", "Study break needed 📚", "Food hunt 🍕",
];

function timeLeft(freeUntil: number): string {
  const diff = freeUntil - Date.now();
  if (diff <= 0) return "";
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function streakLabel(days: number): string | null {
  if (days < 2) return null;
  if (days >= 30) return `🔥 ${days}d streak`;
  if (days >= 7) return `🔥 ${days}d`;
  return `🔥 ${days}d`;
}

function meetupBadge(total: number): string | null {
  if (total >= 10) return "🏆 10+ meetups";
  if (total >= 3) return "⭐ Regular";
  if (total >= 1) return "🆕 First meetup";
  return null;
}

function AvatarEl({ src, size = 14 }: { src: string; size?: number }) {
  const dim = `w-${size} h-${size}`;
  const isUrl = src?.startsWith("http");
  if (isUrl) return (
    <img src={src} referrerPolicy="no-referrer" alt=""
      className={`${dim} rounded-2xl object-cover flex-shrink-0`} />
  );
  return (
    <div className={`${dim} rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-lg flex-shrink-0`}>
      {src?.length <= 2 ? src : src?.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function UserCard({ user, groupId, matchScore, metBefore }: Props) {
  const { currentUser, blockedUserIds, pingUser, groups } = useStore();
  const [showReport, setShowReport] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pinged, setPinged] = useState(false);

  const isBlocked = blockedUserIds.includes(user.id);
  const isSelf = currentUser?.id === user.id;

  // Compute metBefore from shared groups if not passed as prop
  const sharedGroups = groups.filter(
    (g) => g.members.some((m) => m.id === currentUser?.id) && g.members.some((m) => m.id === user.id)
  );
  const hasMetBefore = metBefore ?? sharedGroups.length > 0;

  if (isBlocked) return null;

  async function handlePing() {
    setPinged(true);
    await pingUser(user.id);
    setTimeout(() => setPinged(false), 3000);
  }

  const isTopMatch = matchScore !== undefined && matchScore >= 60;
  const streak = streakLabel(user.streakDays ?? 0);
  const badge = meetupBadge(user.totalMeetups ?? 0);

  return (
    <>
      <div className={`bg-white border rounded-2xl p-4 hover:shadow-md transition-all relative ${
        isTopMatch ? "border-blue-300 shadow-blue-50 shadow-sm" : "border-gray-200"
      }`}>

        {/* Top match ribbon */}
        {isTopMatch && (
          <div className="absolute -top-2 left-4 bg-blue-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
            🎯 Top match
          </div>
        )}

        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <AvatarEl src={user.avatar} />
            {user.isFree && (
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
            )}
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-bold text-gray-900 text-base">{user.name}, {user.age}</p>
                  {user.isVerified && <span title="Verified" className="text-blue-500 text-xs">✓</span>}
                  {user.collegeVerified && <span title="College Verified" className="text-purple-500 text-xs">🎓</span>}
                  {user.showGender && user.gender && (
                    <span className="text-xs text-gray-400">{user.gender === "Female" ? "♀" : user.gender === "Male" ? "♂" : "⚧"}</span>
                  )}
                  {hasMetBefore && (
                    <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full font-medium">Met before ✓</span>
                  )}
                </div>

                {/* Distance + free — hero line */}
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {user.distanceKm !== undefined && (
                    <span className="text-sm font-bold text-green-600">📍 {fmtDistance(user.distanceKm)} away</span>
                  )}
                  {user.isFree && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
                        Free now
                        {user.freeUntil && <span className="text-green-500 font-normal ml-0.5">{timeLeft(user.freeUntil)}</span>}
                      </span>
                    </>
                  )}
                </div>

                {/* Status text */}
                {user.statusText && (
                  <p className="text-xs text-gray-500 italic mt-1">"{user.statusText}"</p>
                )}
              </div>

              {!isSelf && (
                <div className="relative flex-shrink-0">
                  <button onClick={() => setMenuOpen((v) => !v)}
                    className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 text-lg leading-none">⋯</button>
                  {menuOpen && (
                    <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[140px] overflow-hidden">
                      {groupId && (
                        <button onClick={() => { setShowReview(true); setMenuOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                          ⭐ Leave review
                        </button>
                      )}
                      <button onClick={() => { setShowReport(true); setMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50">
                        🚩 Report
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {streak && <span className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full font-medium">{streak}</span>}
              {badge && <span className="text-xs bg-purple-50 text-purple-600 border border-purple-200 px-2 py-0.5 rounded-full font-medium">{badge}</span>}
            </div>

            <div className="mt-1.5">
              <TrustBadge score={user.trustScore} reviewCount={user.reviewCount}
                isVerified={user.isVerified} collegeVerified={user.collegeVerified} />
            </div>

            {/* Interests */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {user.interests.map((i) => {
                const shared = currentUser?.interests.includes(i);
                return (
                  <span key={i}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${shared ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                    {INTEREST_EMOJI[i]} {i}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Ping CTA */}
        {!isSelf && user.isFree && (
          <button onClick={handlePing} disabled={pinged}
            className={`mt-3 w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
              pinged ? "bg-green-100 text-green-700 border border-green-300"
                     : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
            }`}>
            {pinged ? "✓ Ping sent! Waiting for reply…" : "👋 Ping to hang out"}
          </button>
        )}
      </div>

      {showReport && <ReportModal targetId={user.id} targetName={user.name} targetType="user" onClose={() => setShowReport(false)} />}
      {showReview && groupId && <ReviewModal toUserId={user.id} toUserName={user.name} groupId={groupId} onClose={() => setShowReview(false)} />}
    </>
  );
}

export { STATUS_PRESETS };
