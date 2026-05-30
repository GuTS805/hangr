"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { INTEREST_EMOJI, SAFE_LOCATIONS } from "@/lib/mock-data";
import { Interest } from "@/types";

interface SavedGroup {
  id: string;
  name: string;
  topic: Interest;
  safeLocationId?: string;
  memberCount: number;
  memberNames: string[];
  memberAvatars: string[];
  endedAt: number;
  savedAt: number;
}

const TOPIC_GRADIENTS: Record<string, string> = {
  Cafes:    "from-amber-400 to-orange-500",
  Gaming:   "from-violet-500 to-purple-700",
  Cricket:  "from-green-500 to-emerald-700",
  Coding:   "from-blue-500 to-indigo-700",
  Anime:    "from-pink-500 to-rose-600",
  Music:    "from-fuchsia-500 to-pink-600",
  Gym:      "from-red-500 to-orange-600",
  Football: "from-lime-500 to-green-600",
  Movies:   "from-sky-500 to-blue-600",
  Food:     "from-yellow-400 to-orange-500",
};

function timeAgo(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  if (d < 30) return `${Math.floor(d / 7)} week${Math.floor(d / 7) > 1 ? "s" : ""} ago`;
  return `${Math.floor(d / 30)} month${Math.floor(d / 30) > 1 ? "s" : ""} ago`;
}

function AvatarStack({ avatars, names }: { avatars: string[]; names: string[] }) {
  const show = avatars.slice(0, 4);
  return (
    <div className="flex -space-x-2">
      {show.map((av, i) => {
        const isUrl = av?.startsWith("http") || av?.startsWith("data:");
        return isUrl ? (
          <img key={i} src={av} alt={names[i]} referrerPolicy="no-referrer"
            className="w-7 h-7 rounded-full object-cover border-2 border-white" />
        ) : (
          <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white"
            style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
            {av?.slice(0, 2) ?? names[i]?.slice(0, 2).toUpperCase() ?? "?"}
          </div>
        );
      })}
      {avatars.length > 4 && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white bg-gray-400">
          +{avatars.length - 4}
        </div>
      )}
    </div>
  );
}

function FavouriteCard({ group, onRemove }: { group: SavedGroup; onRemove: () => void }) {
  const grad = TOPIC_GRADIENTS[group.topic] ?? "from-gray-500 to-gray-700";
  const location = SAFE_LOCATIONS.find(l => l.id === group.safeLocationId);

  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      {/* Gradient header */}
      <div className={`bg-gradient-to-br ${grad} p-5 relative`}>
        <button onClick={onRemove}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors"
          title="Remove from favourites">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <div className="text-4xl mb-2">{INTEREST_EMOJI[group.topic] ?? "🏘️"}</div>
        <p className="text-white font-extrabold text-lg leading-tight">{group.name}</p>
        <p className="text-white/70 text-xs mt-1 font-semibold uppercase tracking-wide">{group.topic}</p>
      </div>

      {/* Details */}
      <div className="p-4 space-y-3">
        {/* Members */}
        <div className="flex items-center gap-2">
          <AvatarStack avatars={group.memberAvatars} names={group.memberNames} />
          <div className="text-xs text-gray-500 min-w-0">
            <span className="font-semibold text-gray-700">{group.memberNames.slice(0, 2).join(", ")}</span>
            {group.memberCount > 2 && <span className="text-gray-400"> +{group.memberCount - 2} more</span>}
          </div>
        </div>

        {/* Location */}
        {location && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="text-base">📍</span>
            <span className="truncate">{location.name}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <div className="text-xs text-gray-400">
            <span className="font-semibold">Ended</span> {timeAgo(group.endedAt)}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>{group.memberCount} members</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FavouritesPage() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [favourites, setFavourites] = useState<SavedGroup[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    const saved = localStorage.getItem(`hangr_favourites_${currentUser.id}`);
    if (saved) setFavourites(JSON.parse(saved));
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function removeFavourite(groupId: string) {
    if (!currentUser) return;
    const updated = favourites.filter(g => g.id !== groupId);
    setFavourites(updated);
    localStorage.setItem(`hangr_favourites_${currentUser.id}`, JSON.stringify(updated));
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-5xl">⭐</p>
        <p className="text-xl font-bold text-gray-800">Your Favourites</p>
        <p className="text-gray-400 text-sm">Sign in to save group memories</p>
        <button onClick={() => router.push("/auth")}
          className="px-6 py-2.5 rounded-full text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Favourites ⭐</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {favourites.length === 0 ? "Your saved group memories" : `${favourites.length} saved group${favourites.length > 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {favourites.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center px-8">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl mb-6"
              style={{ background: "linear-gradient(135deg,#fef9c3,#fef08a)" }}>
              ⭐
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No favourites yet</h2>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              When a group session ends, you'll get the option to save it here as a memory.
            </p>
            <button onClick={() => router.push("/explore")}
              className="mt-6 px-6 py-2.5 rounded-full text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
              Find a group →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favourites
              .sort((a, b) => b.savedAt - a.savedAt)
              .map(group => (
                <FavouriteCard key={group.id} group={group} onRemove={() => removeFavourite(group.id)} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
