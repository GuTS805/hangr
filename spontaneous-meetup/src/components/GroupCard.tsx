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
    <span className={`font-medium ${critical ? "text-red-600 animate-pulse" : urgent ? "text-orange-500" : "text-amber-600"}`}>
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
      <div className={`bg-white border rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all ${isExpired ? "opacity-60" : "border-gray-200"}`}>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
              {INTEREST_EMOJI[group.topic] ?? "✨"}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-semibold text-gray-900 text-sm">{group.name}</h3>
                {group.femaleOnly && (
                  <span className="px-1.5 py-0.5 bg-pink-50 border border-pink-200 text-pink-600 text-xs rounded-full font-medium">♀ Women only</span>
                )}
                <span className="px-1.5 py-0.5 bg-green-50 border border-green-200 text-green-700 text-xs rounded-full font-medium">🌍 Public</span>
              </div>
              <p className="text-xs text-gray-500">{group.neighborhood}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <InterestBadge interest={group.topic} />
            {currentUser && !isMember && (
              <button onClick={() => setShowReport(true)} title="Report group"
                className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 text-xs">🚩</button>
            )}
          </div>
        </div>

        {/* Safe location */}
        {safeLocation && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
            <span>{SAFE_LOCATION_ICONS[safeLocation.type]}</span>
            <span className="font-medium">{safeLocation.name}</span>
            <span className="ml-auto px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">Safe place ✓</span>
          </div>
        )}

        {/* Friend vouching */}
        {vouchedBy.length > 0 && (
          <div className="flex items-center gap-1.5 mb-2 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1.5">
            <span className="text-xs">🤝</span>
            <span className="text-xs text-indigo-700 font-medium">
              {vouchedBy[0].name}{vouchedBy.length > 1 ? ` +${vouchedBy.length - 1}` : ""} you know {vouchedBy.length > 1 ? "are" : "is"} in this group
            </span>
          </div>
        )}

        {/* Time */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <span>🕐 {group.plannedTime}</span>
          <span>⏱ <ExpiryBadge expiresAt={group.expiresAt} /></span>
        </div>

        {/* Vibe reactions */}
        <div className="flex items-center gap-1.5 mb-3">
          {REACTIONS.map((emoji) => (
            <button key={emoji} onClick={() => handleReaction(emoji)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-all ${
                myReaction === emoji
                  ? "bg-blue-100 border-blue-300 text-blue-700"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}>
              {emoji} {reactions[emoji] > 0 && <span>{reactions[emoji]}</span>}
            </button>
          ))}
          <button onClick={copyInvite}
            className="ml-auto flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors">
            {copied ? "✓ Copied" : "🔗 Invite"}
          </button>
        </div>

        {/* Attendance confirmation banner */}
        {needsConfirmation && (
          <div className="mb-3 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <span className="text-base">⏰</span>
            <p className="text-xs text-orange-800 flex-1 font-medium">Meet-up is soon — are you still coming?</p>
            <button onClick={() => setConfirmed(true)}
              className="px-2.5 py-1 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors">
              I&apos;m coming ✓
            </button>
          </div>
        )}
        {confirmed && isMember && (
          <div className="mb-3 bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="text-green-600 text-xs font-medium">✓ You confirmed attendance</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              {group.members.slice(0, 4).map((m) => (
                <div key={m.id} title={m.name}
                  className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center border-2 border-white overflow-hidden">
                  {m.avatar?.startsWith("http") ? (
                    <img src={m.avatar} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span>{m.avatar?.charAt(0)}</span>
                  )}
                </div>
              ))}
            </div>
            <span className="text-xs text-gray-500">{group.members.length}/{group.maxMembers}</span>
          </div>

          <div className="flex items-center gap-2">
            {isExpired && showRepost && onRepost && (
              <button onClick={() => onRepost(group)}
                className="px-3 py-1 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors">
                🔁 Repost
              </button>
            )}
            <Link href={`/groups/${group.id}`} className="text-xs text-blue-600 hover:underline font-medium">Open →</Link>
            {canJoin && !isExpired && (
              <button onClick={() => joinGroup(group.id)}
                className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">Join</button>
            )}
            {isMember && (
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-lg">Joined ✓</span>
            )}
            {!canJoin && !isMember && group.femaleOnly && currentUser?.gender !== "Female" && (
              <span className="px-2 py-1 bg-pink-50 text-pink-500 text-xs font-medium rounded-lg">♀ Only</span>
            )}
            {isFull && !isMember && (
              <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-lg">Full</span>
            )}
          </div>
        </div>
      </div>

      {showReport && (
        <ReportModal targetId={group.id} targetName={group.name} targetType="group" onClose={() => setShowReport(false)} />
      )}
    </>
  );
}
