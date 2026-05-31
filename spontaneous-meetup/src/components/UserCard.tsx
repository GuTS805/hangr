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
  matchScore?: number;
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

function AvatarEl({ src, size = 56 }: { src: string; size?: number }) {
  const isUrl = src?.startsWith("http");
  if (isUrl) return (
    <img src={src} referrerPolicy="no-referrer" alt=""
      className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size, border: "2px solid #0A0A0A" }} />
  );
  return (
    <div
      className="rounded-full flex items-center justify-center font-black flex-shrink-0"
      style={{
        width: size, height: size,
        fontSize: Math.round(size * 0.38),
        background: "#FFE500",
        color: "#0A0A0A",
        border: "2px solid #0A0A0A",
      }}
    >
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
      <div
        className="bg-white mb-3 relative transition-all"
        style={{
          border: isTopMatch ? "2px solid #FFE500" : "2px solid #0A0A0A",
          boxShadow: isTopMatch ? "4px 4px 0 #FFE500" : "4px 4px 0 #0A0A0A",
        }}
      >
        {/* Top match ribbon */}
        {isTopMatch && (
          <div
            className="absolute -top-px left-0 right-0 flex items-center justify-center py-1"
            style={{ background: "#FFE500", borderBottom: "2px solid #0A0A0A" }}
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-black">🎯 Top Match</span>
          </div>
        )}

        {/* Yellow header bar */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{
            borderBottom: "2px solid #0A0A0A",
            background: "#FFE500",
            marginTop: isTopMatch ? "24px" : 0,
          }}
        >
          <div className="relative flex-shrink-0">
            <AvatarEl src={user.avatar} size={44} />
            {user.isFree && (
              <span
                className="absolute -bottom-1 -right-1 w-3.5 h-3.5"
                style={{ background: "#00C44A", border: "2px solid #0A0A0A" }}
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-black text-sm uppercase tracking-wide text-black">{user.name}, {user.age}</p>
              {user.isVerified && (
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5"
                  style={{ border: "2px solid #0A0A0A", background: "#0038FF", color: "#fff" }}>
                  ✓ Verified
                </span>
              )}
              {user.collegeVerified && (
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5"
                  style={{ border: "2px solid #0A0A0A", background: "#0A0A0A", color: "#FFE500" }}>
                  🎓 College
                </span>
              )}
              {user.showGender && user.gender && (
                <span className="text-xs font-mono text-black/50">
                  {user.gender === "Female" ? "♀" : user.gender === "Male" ? "♂" : "⚧"}
                </span>
              )}
              {hasMetBefore && (
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5"
                  style={{ border: "2px solid #0A0A0A", background: "#00C44A", color: "#0A0A0A" }}>
                  Met before ✓
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              {user.distanceKm !== undefined && (
                <span className="text-xs font-black uppercase text-black">
                  📍 {fmtDistance(user.distanceKm)} away
                </span>
              )}
              {user.isFree && (
                <span className="text-[10px] font-black uppercase text-black">
                  · Free now
                  {user.freeUntil && <span className="ml-1 opacity-60">{timeLeft(user.freeUntil)}</span>}
                </span>
              )}
            </div>
          </div>

          {!isSelf && (
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="w-7 h-7 flex items-center justify-center font-black text-lg hover:bg-black hover:text-[#FFE500] transition-colors"
                style={{ border: "2px solid #0A0A0A" }}
              >
                ⋯
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-9 z-20 min-w-[150px]"
                  style={{ border: "2px solid #0A0A0A", background: "#FAFAF5", boxShadow: "3px 3px 0 #0A0A0A" }}
                >
                  {groupId && (
                    <button
                      onClick={() => { setShowReview(true); setMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase text-black hover:bg-[#FFE500] transition-colors"
                      style={{ borderBottom: "2px solid #0A0A0A" }}
                    >
                      ⭐ Leave review
                    </button>
                  )}
                  <button
                    onClick={() => { setShowReport(true); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase hover:bg-[#FF2D2D] hover:text-white transition-colors"
                    style={{ color: "#FF2D2D" }}
                  >
                    🚩 Report
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-2.5">
          {/* Status text */}
          {user.statusText && (
            <p className="text-xs font-mono text-black/50 italic">"{user.statusText}"</p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            {streak && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5"
                style={{ border: "2px solid #0A0A0A", background: "#FF6B00", color: "#fff" }}>
                {streak}
              </span>
            )}
            {badge && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5"
                style={{ border: "2px solid #0A0A0A", background: "#0A0A0A", color: "#FFE500" }}>
                {badge}
              </span>
            )}
          </div>

          <TrustBadge
            score={user.trustScore}
            reviewCount={user.reviewCount}
            isVerified={user.isVerified}
            collegeVerified={user.collegeVerified}
          />

          {/* Interests */}
          <div className="flex flex-wrap gap-1.5">
            {user.interests.map((i) => {
              const shared = currentUser?.interests.includes(i);
              return (
                <span
                  key={i}
                  className="text-[10px] font-black uppercase px-2 py-0.5"
                  style={{
                    border: "2px solid #0A0A0A",
                    background: shared ? "#0A0A0A" : "#fff",
                    color: shared ? "#FFE500" : "#0A0A0A",
                  }}
                >
                  {INTEREST_EMOJI[i]} {i}
                </span>
              );
            })}
          </div>

          {/* Ping CTA */}
          {!isSelf && user.isFree && (
            <button
              onClick={handlePing}
              disabled={pinged}
              className="w-full py-2.5 text-sm font-black uppercase tracking-wide transition-all"
              style={pinged
                ? { border: "2px solid #00C44A", background: "#00C44A22", color: "#0A0A0A" }
                : {
                    border: "2px solid #0A0A0A",
                    background: "#FFE500",
                    color: "#0A0A0A",
                    boxShadow: "3px 3px 0 #0A0A0A",
                  }}
            >
              {pinged ? "✓ Ping sent! Waiting for reply…" : "👋 Ping to hang out"}
            </button>
          )}
        </div>
      </div>

      {showReport && (
        <ReportModal targetId={user.id} targetName={user.name} targetType="user" onClose={() => setShowReport(false)} />
      )}
      {showReview && groupId && (
        <ReviewModal toUserId={user.id} toUserName={user.name} groupId={groupId} onClose={() => setShowReview(false)} />
      )}
    </>
  );
}

export { STATUS_PRESETS };
