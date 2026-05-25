"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Interest, SafeLocation } from "@/types";
import { INTERESTS, INTEREST_EMOJI, SAFE_LOCATIONS, SAFE_LOCATION_ICONS } from "@/lib/mock-data";

interface Props {
  onClose: () => void;
  prefilledLocation?: SafeLocation | null;
}

const EXPIRY_OPTIONS = [
  { label: "1 hour",  value: 1 },
  { label: "2 hours", value: 2 },
  { label: "4 hours", value: 4 },
  { label: "8 hours", value: 8 },
  { label: "Today",   value: 12 },
];

export default function CreateGroupModal({ onClose, prefilledLocation }: Props) {
  const router = useRouter();
  const { createGroup, currentUser } = useStore();
  const [name, setName] = useState("");
  const [topic, setTopic] = useState<Interest>("Gaming");
  const [safeLocationId, setSafeLocationId] = useState(prefilledLocation?.id ?? SAFE_LOCATIONS[0].id);
  const [plannedTime, setPlannedTime] = useState("");
  const [femaleOnly, setFemaleOnly] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState(4);

  const selectedLocation = SAFE_LOCATIONS.find((l) => l.id === safeLocationId)!;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !plannedTime.trim()) return;
    createGroup(name.trim(), topic, safeLocationId, selectedLocation.name, plannedTime.trim(), femaleOnly, expiresInHours);
    onClose();
    router.push("/explore");
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Create a Group</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        {/* Public-only notice */}
        <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 mb-5">
          <span className="text-blue-500 mt-0.5 text-sm">ℹ️</span>
          <p className="text-xs text-blue-700">
            All groups are <strong>public meetups only</strong> at verified safe locations — cafes, malls, or parks.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Late night chai run"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setTopic(i as Interest)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    topic === i ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {INTEREST_EMOJI[i]} {i}
                </button>
              ))}
            </div>
          </div>

          {/* Safe location picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Place{" "}
              <span className="text-xs text-emerald-600 font-normal">✓ Safe locations only</span>
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {SAFE_LOCATIONS.map((loc) => (
                <label
                  key={loc.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    safeLocationId === loc.id
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="location"
                    value={loc.id}
                    checked={safeLocationId === loc.id}
                    onChange={() => setSafeLocationId(loc.id)}
                    className="accent-blue-600"
                  />
                  <span className="text-lg">{SAFE_LOCATION_ICONS[loc.type]}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{loc.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{loc.type} · {loc.neighborhood}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Planned time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Planned Time</label>
            <input
              value={plannedTime}
              onChange={(e) => setPlannedTime(e.target.value)}
              placeholder="e.g. Tonight 8 PM / In 1 hour"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Expiry duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group expires in
              <span className="text-xs text-gray-400 font-normal ml-1">(after this, the group disappears)</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setExpiresInHours(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    expiresInHours === opt.value
                      ? "bg-amber-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Female-only toggle */}
          {currentUser?.gender === "Female" && (
            <label className="flex items-center gap-3 p-3 bg-pink-50 border border-pink-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={femaleOnly}
                onChange={(e) => setFemaleOnly(e.target.checked)}
                className="w-4 h-4 accent-pink-500"
              />
              <div>
                <p className="text-sm font-semibold text-pink-700">♀ Women-only group</p>
                <p className="text-xs text-pink-500">Only women can join this group</p>
              </div>
            </label>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Create Group
          </button>
        </form>
      </div>
    </div>
  );
}
