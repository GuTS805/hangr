"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Interest } from "@/types";
import { INTEREST_EMOJI, SAFE_LOCATIONS } from "@/lib/mock-data";

const QUICK_ACTIVITIES: { emoji: string; label: string; interest: Interest; time: string }[] = [
  { emoji: "☕", label: "Chai run", interest: "Cafes", time: "Right now" },
  { emoji: "🏏", label: "Cricket", interest: "Cricket", time: "In 1 hour" },
  { emoji: "🎮", label: "Gaming cafe", interest: "Gaming", time: "Tonight 8 PM" },
  { emoji: "🍕", label: "Food trip", interest: "Food", time: "Right now" },
  { emoji: "💻", label: "Study/code", interest: "Coding", time: "In 30 min" },
  { emoji: "⚽", label: "Football", interest: "Football", time: "Evening 5 PM" },
  { emoji: "🎬", label: "Movie hangout", interest: "Movies", time: "Tonight" },
  { emoji: "🎵", label: "Music jam", interest: "Music", time: "Tonight 7 PM" },
];

interface Props { onClose: () => void }

export default function QuickRoomModal({ onClose }: Props) {
  const router = useRouter();
  const { createGroup, currentUser } = useStore();
  const [picked, setPicked] = useState<typeof QUICK_ACTIVITIES[0] | null>(null);
  const [maxMembers] = useState(6);

  function launch() {
    if (!picked || !currentUser) return;
    const loc = SAFE_LOCATIONS[0];
    createGroup(
      `${picked.emoji} ${picked.label} — anyone?`,
      picked.interest,
      loc.id,
      loc.name,
      picked.time,
      false,
    );
    onClose();
    router.push("/explore?tab=groups");
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold text-gray-900">Quick Room</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 text-xl">×</button>
          </div>
          <p className="text-xs text-gray-400">Pick an activity → instantly visible to nearby people</p>
        </div>

        <div className="px-4 pb-4 grid grid-cols-2 gap-2">
          {QUICK_ACTIVITIES.map((a) => (
            <button key={a.label} onClick={() => setPicked(a)}
              className={`flex items-center gap-2.5 p-3 rounded-2xl border-2 text-left transition-all ${
                picked?.label === a.label
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-100 hover:border-gray-200 bg-gray-50"
              }`}>
              <span className="text-2xl">{a.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{a.label}</p>
                <p className="text-xs text-gray-400">{a.time}</p>
              </div>
            </button>
          ))}
        </div>

        {picked && (
          <div className="px-4 pb-5">
            <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mb-3 flex items-center gap-3">
              <span className="text-2xl">{picked.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-blue-900">{picked.label}</p>
                <p className="text-xs text-blue-500">{picked.time} · up to {maxMembers} people · public place</p>
              </div>
            </div>
            <button onClick={launch}
              className="w-full bg-blue-600 text-white py-3 rounded-2xl font-bold text-sm hover:bg-blue-700 active:scale-95 transition-all">
              🚀 Open room now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
