"use client";

import { useState } from "react";
import { Group } from "@/types";
import { useStore } from "@/lib/store";
import { SAFE_LOCATIONS, SAFE_LOCATION_ICONS, SAFE_LOCATION_COLORS } from "@/lib/mock-data";

interface Props {
  group: Group;
  onLocationSelect?: (locId: string) => void; // tells map to fly there
}

export default function LocationVotePanel({ group, onLocationSelect }: Props) {
  const { currentUser, voteForLocation, finalizeLocation, reopenVoting } = useStore();
  const [justVoted, setJustVoted] = useState(false);

  const isCreator = currentUser?.id === group.createdBy;
  const isMember  = currentUser ? group.members.some((m) => m.id === currentUser.id) : false;
  const myVote    = currentUser ? group.votes[currentUser.id] : null;

  // Tally votes
  const tally: Record<string, number> = {};
  Object.values(group.votes).forEach((locId) => { tally[locId] = (tally[locId] ?? 0) + 1; });
  const totalVotes = Object.values(tally).reduce((a, b) => a + b, 0);
  const sortedLocs = SAFE_LOCATIONS
    .filter((l) => tally[l.id] || group.votingOpen) // show voted + all if open
    .sort((a, b) => (tally[b.id] ?? 0) - (tally[a.id] ?? 0));

  const winnerLoc  = SAFE_LOCATIONS.find((l) => l.id === group.finalLocationId);

  function handleVote(locId: string) {
    if (!isMember || !group.votingOpen) return;
    voteForLocation(group.id, locId);
    onLocationSelect?.(locId);
    setJustVoted(true);
    setTimeout(() => setJustVoted(false), 2000);
  }

  // ── Finalized state ──
  if (!group.votingOpen && winnerLoc) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-bold text-gray-900">📍 Meetup Location Decided!</p>
          {isCreator && (
            <button onClick={() => reopenVoting(group.id)} className="text-xs text-gray-400 hover:text-blue-600 hover:underline">
              Reopen voting
            </button>
          )}
        </div>
        <div className="p-4">
          <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 text-center">
            <span className="text-4xl block mb-2">{SAFE_LOCATION_ICONS[winnerLoc.type]}</span>
            <p className="text-lg font-bold text-gray-900">{winnerLoc.name}</p>
            <p className="text-sm text-gray-500 capitalize mb-3">{winnerLoc.type} · {winnerLoc.neighborhood}</p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <span className="text-emerald-700 font-semibold">✓ Verified safe place</span>
              {winnerLoc.distanceKm && <span className="text-gray-500">📍 {winnerLoc.distanceKm} km away</span>}
            </div>
          </div>
          <p className="text-xs text-center text-gray-400 mt-3">
            Won with {tally[winnerLoc.id] ?? 0} / {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    );
  }

  // ── Voting open state ──
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">🗳️ Vote: Where should we meet?</p>
          <p className="text-xs text-gray-400 mt-0.5">{totalVotes} vote{totalVotes !== 1 ? "s" : ""} · {group.members.length - totalVotes > 0 ? `${group.members.length - totalVotes} pending` : "All voted"}</p>
        </div>
        {isCreator && totalVotes > 0 && (
          <button
            onClick={() => finalizeLocation(group.id)}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Finalize ✓
          </button>
        )}
      </div>

      {justVoted && (
        <div className="bg-green-50 px-4 py-2 text-xs text-green-700 font-medium text-center border-b border-green-100">
          ✓ Vote recorded!
        </div>
      )}

      <div className="p-3 space-y-2">
        {sortedLocs.map((loc) => {
          const votes    = tally[loc.id] ?? 0;
          const pct      = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isMyVote = myVote === loc.id;
          const colorCls = SAFE_LOCATION_COLORS[loc.type];

          return (
            <div
              key={loc.id}
              onClick={() => { onLocationSelect?.(loc.id); handleVote(loc.id); }}
              className={`relative rounded-xl border p-3 cursor-pointer transition-all overflow-hidden ${
                isMyVote
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              } ${!isMember || !group.votingOpen ? "cursor-default" : ""}`}
            >
              {/* Vote bar background */}
              {totalVotes > 0 && (
                <div
                  className="absolute inset-y-0 left-0 bg-blue-100/60 transition-all rounded-l-xl"
                  style={{ width: `${pct}%` }}
                />
              )}

              <div className="relative flex items-center gap-3">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border flex-shrink-0 ${colorCls}`}>
                  {SAFE_LOCATION_ICONS[loc.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{loc.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{loc.type} · {loc.neighborhood}{loc.distanceKm ? ` · ${loc.distanceKm} km` : ""}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  {votes > 0 && (
                    <p className="text-sm font-bold text-gray-800">{pct}%</p>
                  )}
                  <p className="text-xs text-gray-400">{votes} vote{votes !== 1 ? "s" : ""}</p>
                  {isMyVote && <span className="text-xs text-blue-600 font-semibold">✓ You</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!isMember && (
        <p className="text-xs text-center text-gray-400 pb-3">Join the group to vote</p>
      )}
    </div>
  );
}
