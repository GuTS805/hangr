"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Group } from "@/types";
import { useStore } from "@/lib/store";
import InterestBadge from "./InterestBadge";
import ReportModal from "./ReportModal";
import { INTEREST_EMOJI, SAFE_LOCATIONS, SAFE_LOCATION_ICONS } from "@/lib/mock-data";

interface Props {
  group: Group;
  onRepost?: (group: Group) => void;
  showRepost?: boolean;
}

function timeLeft(expiresAt: number): { label: string; urgent: boolean; critical: boolean } {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return { label: "Expired", urgent: true, critical: true };
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const label = h > 0 ? `${h}h ${m}m left` : `${m}m left`;
  return { label, urgent: diff < 30 * 60 * 1000, critical: diff < 10 * 60 * 1000 };
}

function ExpiryBadge({ expiresAt }: { expiresAt: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 30000); return () => clearInterval(id); }, []);
  void tick;
  const { label, urgent, critical } = timeLeft(expiresAt);
  return (
    <span
      className="font-black text-xs uppercase"
      style={{ color: critical ? "#FF2D2D" : urgent ? "#FF6B00" : "#0A0A0A" }}
    >
      {label}
    </span>
  );
}

const REACTIONS = ["🔥", "💯", "👀", "🙌"];
type ReactionMap = Record<string, number>;

function isWithinOneHour(plannedTime: string): boolean {
  const d = new Date(plannedTime);
  if (!isNaN(d.getTime())) return d.getTime() - Date.now() < 60 * 60 * 1000 && d.getTime() > Date.now();
  return plannedTime.toLowerCase().includes("in ");
}

export default function GroupCard({ group, onRepost, showRepost }: Props) {
  const { currentUser, joinGroup, groups } = useStore();
  const [showReport, setShowReport] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [reactions, setReactions] = useState<ReactionMap>({ "🔥": 0, "💯": 0, "👀": 0, "🙌": 0 });

  const isMember = currentUser ? group.members.some((m) => m.id === currentUser.id) : false;
  const isFull = group.members.length >= group.maxMembers;
  const safeLocation = SAFE_LOCATIONS.find((l) => l.id === group.safeLocationId);
  const isExpired = group.expiresAt <= Date.now();

  const canJoin = !isMember && !isFull && !!currentUser &&
    (!group.femaleOnly || currentUser.gender === "Female");
  const needsConfirmation = isMember && !confirmed && isWithinOneHour(group.plannedTime);

  const badTrustMembers = group.members.filter(
    (m) => m.trustScore > 0 && m.trustScore < 3.0 && m.reviewCount >= 3
  );

  const vouchedBy = currentUser
    ? group.members.filter((m) => {
        if (m.id === currentUser.id) return false;
        return groups.some(
          (g) => g.id !== group.id &&
            g.members.some((gm) => gm.id === currentUser.id) &&
            g.members.some((gm) => gm.id === m.id)
        );
      })
    : [];

  function handleReaction(emoji: string) {
    setReactions((prev) => {
      const next = { ...prev };
      if (myReaction === emoji) {
        next[emoji] = Math.max(0, (next[emoji] ?? 0) - 1);
        setMyReaction(null);
      } else {
        if (myReaction) next[myReaction] = Math.max(0, (next[myReaction] ?? 0) - 1);
        next[emoji] = (next[emoji] ?? 0) + 1;
        setMyReaction(emoji);
      }
      return next;
    });
  }

  function copyInvite() {
    const url = `${window.location.origin}/groups/${group.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <div
        className="bg-white mb-3 transition-all"
        style={{
          border: "2px solid #0A0A0A",
          boxShadow: isExpired ? "none" : "4px 4px 0 #0A0A0A",
          opacity: isExpired ? 0.55 : 1,
        }}
      >
        {/* Yellow header bar */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "2px solid #0A0A0A", background: "#FFE500" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 flex items-center justify-center text-xl flex-shrink-0"
              style={{ border: "2px solid #0A0A0A", background: "#fff" }}
            >
              {INTEREST_EMOJI[group.topic] ?? "✨"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-sm uppercase tracking-wide text-black">{group.name}</h3>
                {group.femaleOnly && (
                  <span className="text-[10px] font-black uppercase px-1.5 py-0.5"
                    style={{ border: "2px solid #0A0A0A", background: "#0A0A0A", color: "#FFE500" }}>
                    ♀ Women only
                  </span>
                )}
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5"
                  style={{ border: "2px solid #0A0A0A", background: "#00C44A", color: "#0A0A0A" }}>
                  🌍 Public
                </span>
              </div>
              <p className="text-xs font-mono text-black/50 mt-0.5">{group.neighborhood}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <InterestBadge interest={group.topic} />
            {currentUser && !isMember && (
              <button onClick={() => setShowReport(true)} title="Report group"
                className="w-6 h-6 flex items-center justify-center text-xs hover:opacity-70"
                style={{ border: "2px solid #0A0A0A", background: "#fff" }}>
                🚩
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-2">

          {/* Safe location */}
          {safeLocation && (
            <div className="flex items-center gap-2 px-3 py-2"
              style={{ border: "2px solid #0A0A0A", background: "#F2F1EB" }}>
              <span>{SAFE_LOCATION_ICONS[safeLocation.type]}</span>
              <span className="text-xs font-bold uppercase text-black flex-1">{safeLocation.name}</span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5"
                style={{ border: "2px solid #0A0A0A", background: "#00C44A", color: "#0A0A0A" }}>
                Safe ✓
              </span>
            </div>
          )}

          {/* Low trust warning */}
          {badTrustMembers.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2"
              style={{ border: "2px solid #FF2D2D", background: "#FF2D2D11" }}>
              <span className="text-xs">⚠️</span>
              <span className="text-xs font-bold text-[#FF2D2D] uppercase">
                {badTrustMembers.length === 1
                  ? `${badTrustMembers[0].name} has low trust (${badTrustMembers[0].trustScore.toFixed(1)})`
                  : `${badTrustMembers.length} members have low trust scores`}
              </span>
            </div>
          )}

          {/* Friend vouching */}
          {vouchedBy.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2"
              style={{ border: "2px solid #0038FF", background: "#0038FF11" }}>
              <span className="text-xs">🤝</span>
              <span className="text-xs font-bold uppercase" style={{ color: "#0038FF" }}>
                {vouchedBy[0].name}{vouchedBy.length > 1 ? ` +${vouchedBy.length - 1}` : ""} you know {vouchedBy.length > 1 ? "are" : "is"} in this group
              </span>
            </div>
          )}

          {/* Time row */}
          <div className="flex items-center gap-4 text-xs font-mono text-black/60">
            <span>🕐 {group.plannedTime}</span>
            <span>⏱ <ExpiryBadge expiresAt={group.expiresAt} /></span>
          </div>

          {/* Reactions */}
          <div className="flex items-center gap-1.5">
            {REACTIONS.map((emoji) => (
              <button key={emoji} onClick={() => handleReaction(emoji)}
                className="flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase transition-all"
                style={myReaction === emoji
                  ? { border: "2px solid #0A0A0A", background: "#0A0A0A", color: "#FFE500" }
                  : { border: "2px solid #0A0A0A", background: "#fff", color: "#0A0A0A" }}>
                {emoji} {reactions[emoji] > 0 && <span>{reactions[emoji]}</span>}
              </button>
            ))}
            <button onClick={copyInvite}
              className="ml-auto flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase transition-all"
              style={{ border: "2px solid #0A0A0A", background: copied ? "#00C44A" : "#fff", color: "#0A0A0A" }}>
              {copied ? "✓ Copied" : "🔗 Invite"}
            </button>
          </div>

          {/* Attendance confirmation */}
          {needsConfirmation && (
            <div className="flex items-center gap-2 px-3 py-2"
              style={{ border: "2px solid #FF6B00", background: "#FF6B0011" }}>
              <span className="text-sm">⏰</span>
              <p className="text-xs font-bold uppercase text-black flex-1">Meet-up is soon — still coming?</p>
              <button onClick={() => setConfirmed(true)}
                className="px-2 py-1 text-xs font-black uppercase transition-all"
                style={{ border: "2px solid #0A0A0A", background: "#FFE500", color: "#0A0A0A", boxShadow: "2px 2px 0 #0A0A0A" }}>
                I&apos;m in ✓
              </button>
            </div>
          )}
          {confirmed && isMember && (
            <div className="px-3 py-2"
              style={{ border: "2px solid #00C44A", background: "#00C44A22" }}>
              <span className="text-xs font-black uppercase text-black">✓ Attendance confirmed</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            {/* Member avatars */}
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {group.members.slice(0, 4).map((m) => (
                  <div key={m.id} title={m.name}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black overflow-hidden flex-shrink-0"
                    style={{ border: "2px solid #0A0A0A", background: "#FFE500", color: "#0A0A0A" }}>
                    {m.avatar?.startsWith("http") ? (
                      <img src={m.avatar} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span>{m.avatar?.charAt(0)}</span>
                    )}
                  </div>
                ))}
              </div>
              <span className="text-xs font-black uppercase text-black/50">
                {group.members.length}/{group.maxMembers}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {isExpired && showRepost && onRepost && (
                <button onClick={() => onRepost(group)}
                  className="px-3 py-1 text-xs font-black uppercase transition-all"
                  style={{ border: "2px solid #0A0A0A", background: "#0A0A0A", color: "#FFE500", boxShadow: "2px 2px 0 #FFE500" }}>
                  🔁 Repost
                </button>
              )}
              <Link href={`/groups/${group.id}`}
                className="px-3 py-1 text-xs font-black uppercase transition-all"
                style={{ border: "2px solid #0A0A0A", background: "#fff", color: "#0A0A0A" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#FFE500"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                Open →
              </Link>
              {canJoin && !isExpired && (
                <button onClick={() => joinGroup(group.id)}
                  className="px-3 py-1 text-xs font-black uppercase transition-all"
                  style={{ border: "2px solid #0A0A0A", background: "#FFE500", color: "#0A0A0A", boxShadow: "2px 2px 0 #0A0A0A" }}>
                  Join
                </button>
              )}
              {isMember && (
                <span className="px-3 py-1 text-xs font-black uppercase"
                  style={{ border: "2px solid #00C44A", background: "#00C44A22", color: "#0A0A0A" }}>
                  Joined ✓
                </span>
              )}
              {!canJoin && !isMember && group.femaleOnly && currentUser?.gender !== "Female" && (
                <span className="px-2 py-1 text-xs font-black uppercase"
                  style={{ border: "2px solid #0A0A0A", background: "#F2F1EB", color: "#0A0A0A" }}>
                  ♀ Only
                </span>
              )}
              {isFull && !isMember && (
                <span className="px-3 py-1 text-xs font-black uppercase"
                  style={{ border: "2px solid #0A0A0A", background: "#F2F1EB", color: "#0A0A0A" }}>
                  Full
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {showReport && (
        <ReportModal targetId={group.id} targetName={group.name} targetType="group" onClose={() => setShowReport(false)} />
      )}
    </>
  );
}
