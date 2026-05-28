"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import GroupCard from "@/components/GroupCard";
import UserCard from "@/components/UserCard";
import CreateGroupModal from "@/components/CreateGroupModal";
import QuickRoomModal from "@/components/QuickRoomModal";
import MapView from "@/components/MapView.client";
import type { CustomPin } from "@/components/MapView.client";
import { Interest, SafeLocation } from "@/types";
import {
  INTERESTS, INTEREST_EMOJI,
  SAFE_LOCATIONS, SAFE_LOCATION_ICONS, SAFE_LOCATION_COLORS,
} from "@/lib/mock-data";
import { haversine, fmtDistance, requestGeolocation, GeoState, LatLng } from "@/lib/geo";
import { fetchNearbyPlaces } from "@/lib/overpass";

type Tab           = "people" | "groups" | "map";
type LocationFilter = "all" | "cafe" | "mall" | "park" | "library" | "sports";
type RadiusFilter  = 0.5 | 1 | 2 | 99;

// ── enrich safe-location list with real distance ──────────────────────────
function withDistance(userPos: LatLng | null): SafeLocation[] {
  return SAFE_LOCATIONS.map((loc) => ({
    ...loc,
    distanceKm: userPos
      ? Math.round(haversine(userPos, { lat: loc.lat, lng: loc.lng }) * 10) / 10
      : loc.distanceKm,
  })).sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
}

export default function ExplorePage() {
  const router = useRouter();
  const { currentUser, groups, nearbyUsers } = useStore();

  const [tab, setTab]               = useState<Tab>("people");
  const [filter, setFilter]         = useState<Interest | "All">("All");
  const [radius, setRadius]         = useState<RadiusFilter>(2);
  const [locFilter, setLocFilter]   = useState<LocationFilter>("all");
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showQuickRoom, setShowQuickRoom] = useState(false);
  const [prefilledLoc, setPrefilledLoc]   = useState<SafeLocation | null>(null);

  // GPS
  const [geoState, setGeoState]         = useState<GeoState>({ status: "idle" });
  const [flyToUser, setFlyToUser]       = useState(false);
  const flyTimerRef                     = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Overpass nearby places (replaces mock locations when GPS available)
  const [overpassLocs, setOverpassLocs] = useState<SafeLocation[]>([]);
  const [overpassLoading, setOverpassLoading] = useState(false);
  const [overpassFetched, setOverpassFetched] = useState(false);

  // Custom pin
  const [customPin, setCustomPin]   = useState<CustomPin | null>(null);
  const [customPinName, setCustomPinName] = useState("");

  const userPos = geoState.status === "ok" ? geoState.position : null;
  const userAccuracy = geoState.status === "ok" ? geoState.accuracy : 0;

  // When GPS becomes available, fetch real nearby places from Overpass
  useEffect(() => {
    if (!userPos) return;
    setOverpassLoading(true);
    setOverpassFetched(false);
    fetchNearbyPlaces(userPos.lat, userPos.lng).then((places) => {
      setOverpassLocs(places);
      setOverpassLoading(false);
      setOverpassFetched(true);
    });
  }, [userPos?.lat, userPos?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // When GPS is available: use Overpass results (even if empty — never show fake Crossing Republik data)
  // When GPS not available: show mock data with approximate distances
  const baseLocs: SafeLocation[] = userPos
    ? overpassLocs
    : withDistance(null);

  const sortedLocs = baseLocs.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
  const filteredLocs = locFilter === "all"
    ? sortedLocs
    : sortedLocs.filter((l) => l.type === locFilter);

  const selectedLoc = sortedLocs.find((l) => l.id === selectedLocId) ?? null;

  const filteredGroups = groups.filter((g) => filter === "All" || g.topic === filter);
  const activePeople   = nearbyUsers
    .filter((u) => u.isFree && u.id !== currentUser?.id)
    .filter((u) => radius === 99 || (u.distanceKm ?? 99) <= radius)
    .sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
  const filteredPeople = filter === "All"
    ? activePeople
    : activePeople.filter((u) => u.interests.includes(filter));

  // Neighborhood leaderboard: top users by trust score in same area
  const leaderboard = [...nearbyUsers]
    .filter((u) => u.id !== currentUser?.id && (u.totalMeetups ?? 0) > 0)
    .sort((a, b) => (b.trustScore ?? 0) - (a.trustScore ?? 0))
    .slice(0, 5);

  function matchScore(u: (typeof nearbyUsers)[0]): number {
    if (!currentUser || currentUser.interests.length === 0) return 0;
    const shared = u.interests.filter((i) => currentUser.interests.includes(i)).length;
    return Math.round((shared / currentUser.interests.length) * 100);
  }

  function handleRepost(_group: import("@/types").Group) {
    setPrefilledLoc(null);
    setShowCreate(true);
  }

  // Request GPS automatically when user switches to map tab
  useEffect(() => {
    if (tab === "map" && geoState.status === "idle") {
      requestGeolocation(setGeoState);
    }
  }, [tab, geoState.status]);

  function locateMe() {
    requestGeolocation((s) => {
      setGeoState(s);
      if (s.status === "ok") {
        setFlyToUser(true);
        clearTimeout(flyTimerRef.current);
        flyTimerRef.current = setTimeout(() => setFlyToUser(false), 1200);
      }
    });
  }

  const handleCustomPin = useCallback((pin: CustomPin) => {
    setCustomPin(pin);
    setSelectedLocId(null); // deselect safe location when custom pin is placed
    setCustomPinName("");
  }, []);

  function clearCustomPin() {
    setCustomPin(null);
    setCustomPinName("");
  }

  function meetAtCustomPin() {
    if (!currentUser) { router.push("/auth"); return; }
    if (!customPin) return;
    const loc: SafeLocation = {
      id: `custom_${Date.now()}`,
      name: customPinName.trim() || "Custom meeting point",
      type: "cafe",
      neighborhood: "Custom location",
      lat: customPin.lat,
      lng: customPin.lng,
    };
    setPrefilledLoc(loc);
    setShowCreate(true);
  }

  function meetAtSafeLoc(loc: SafeLocation) {
    if (!currentUser) { router.push("/auth"); return; }
    setPrefilledLoc(loc);
    setShowCreate(true);
  }

  return (
    <>
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Who&apos;s nearby?</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              {activePeople.length} {activePeople.length === 1 ? "person" : "people"} free within {radius === 99 ? "any distance" : `${radius} km`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (!currentUser) { router.push("/auth"); return; } setShowQuickRoom(true); }}
              className="px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-xl hover:bg-violet-700 transition-colors"
            >
              ⚡ Quick
            </button>
            <button
              onClick={() => { if (!currentUser) { router.push("/auth"); return; } setPrefilledLoc(null); setShowCreate(true); }}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              + Group
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4 gap-1">
          {(["people", "groups", "map"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {t === "people" ? `👥 ${activePeople.length}`
                : t === "groups" ? `🏘️ ${groups.length}`
                : "📍 Map"}
            </button>
          ))}
        </div>

        {/* Interest filter (non-map) */}
        {tab !== "map" && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
            <button onClick={() => setFilter("All")}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${filter === "All" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
              All
            </button>
            {INTERESTS.map((i) => (
              <button key={i} onClick={() => setFilter(filter === i ? "All" : i as Interest)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${filter === i ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                {INTEREST_EMOJI[i]} {i}
              </button>
            ))}
          </div>
        )}

        {/* ── GROUPS ── */}
        {tab === "groups" && (
          <div className="space-y-2">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-3">😕</p><p>No groups yet</p>
                <button onClick={() => setShowCreate(true)} className="mt-3 text-blue-600 font-medium text-sm hover:underline">Create one →</button>
              </div>
            ) : filteredGroups.map((g) => (
              <GroupCard key={g.id} group={g} onRepost={handleRepost} showRepost />
            ))}
          </div>
        )}

        {/* ── PEOPLE ── */}
        {tab === "people" && (
          <div className="space-y-3">
            {/* Radius filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium flex-shrink-0">Within</span>
              {([0.5, 1, 2, 99] as RadiusFilter[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    radius === r
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {r === 99 ? "Any" : r < 1 ? `${r * 1000}m` : `${r} km`}
                </button>
              ))}
            </div>

            {filteredPeople.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-3">👀</p>
                <p className="text-sm font-medium text-gray-500">No one free within {radius === 99 ? "range" : radius < 1 ? `${radius * 1000}m` : `${radius} km`}</p>
                <p className="text-xs text-gray-400 mt-1">Try expanding the radius</p>
                {radius !== 99 && (
                  <button
                    onClick={() => setRadius(99)}
                    className="mt-3 text-blue-600 font-medium text-sm hover:underline"
                  >
                    Show everyone →
                  </button>
                )}
              </div>
            ) : (
              filteredPeople.map((u) => (
                <UserCard key={u.id} user={u} matchScore={matchScore(u)} />
              ))
            )}

            {/* Neighborhood leaderboard */}
            {leaderboard.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">🏆 Most active nearby</p>
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
                  {leaderboard.map((u, i) => (
                    <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-sm font-bold text-gray-400 w-4">{i + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                        {u.avatar?.startsWith("http")
                          ? <img src={u.avatar} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="" />
                          : <span>{u.avatar?.slice(0, 1)}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.totalMeetups} meetups · ⭐ {u.trustScore.toFixed(1)}</p>
                      </div>
                      {i === 0 && <span className="text-lg">🥇</span>}
                      {i === 1 && <span className="text-lg">🥈</span>}
                      {i === 2 && <span className="text-lg">🥉</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MAP / NEARBY ── */}
        {tab === "map" && (
          <div className="space-y-4">

            {/* GPS status bar */}
            <div className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2.5">
                {geoState.status === "loading" && (
                  <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                )}
                {geoState.status === "ok" && <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />}
                {geoState.status === "error" && <span className="w-2.5 h-2.5 bg-red-400 rounded-full" />}
                {geoState.status === "idle" && <span className="w-2.5 h-2.5 bg-gray-300 rounded-full" />}

                <p className="text-sm text-gray-700 font-medium">
                  {geoState.status === "loading" && "Getting your location…"}
                  {geoState.status === "ok" && overpassLoading && "📍 Found you · Loading nearby places…"}
                  {geoState.status === "ok" && !overpassLoading && `📍 ${overpassLocs.length > 0 ? `${overpassLocs.length} real places` : "Showing places"} near you · ±${Math.round(userAccuracy)}m`}
                  {geoState.status === "error"   && `Location unavailable — ${geoState.message}`}
                  {geoState.status === "idle"    && "Location not yet detected"}
                </p>
              </div>
              <button
                onClick={locateMe}
                disabled={geoState.status === "loading"}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {geoState.status === "loading"
                  ? "Locating…"
                  : geoState.status === "ok" ? "🔄 Refresh" : "📍 Locate me"}
              </button>
            </div>

            {/* Hint banner */}
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
              <span className="text-blue-500 text-sm">ℹ️</span>
              <p className="text-xs text-blue-700">
                <strong>Tap a marker</strong> to select a safe location · <strong>Tap anywhere on the map</strong> to drop a custom meeting point
              </p>
            </div>

            {/* Location type filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {(["all","cafe","mall","park","library","sports"] as LocationFilter[]).map((t) => (
                <button key={t} onClick={() => setLocFilter(t)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    locFilter === t ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}>
                  {t === "all" ? "🗺️ All" : `${SAFE_LOCATION_ICONS[t]} ${t.charAt(0).toUpperCase() + t.slice(1)}s`}
                </button>
              ))}
            </div>

            {/* Map */}
            <MapView
              locations={filteredLocs}
              selectedId={selectedLocId}
              userPosition={userPos}
              userAccuracy={userAccuracy}
              customPin={customPin}
              flyToUser={flyToUser}
              onSelect={(loc) => { setSelectedLocId(loc.id); setCustomPin(null); setCustomPinName(""); }}
              onCustomPin={handleCustomPin}
              height="460px"
            />

            {/* ── Bottom selection panel ── */}
            {(selectedLoc || customPin) && (
              <div className={`rounded-2xl border-2 p-4 transition-all ${
                customPin && !selectedLoc ? "border-blue-400 bg-blue-50" : "border-emerald-400 bg-emerald-50"
              }`}>
                {customPin && !selectedLoc ? (
                  /* Custom pin panel */
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">📌</span>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">Custom meeting point</p>
                          <p className="text-xs text-gray-500">
                            {customPin.lat.toFixed(5)}, {customPin.lng.toFixed(5)} · Drag pin to adjust
                          </p>
                        </div>
                      </div>
                      <button onClick={clearCustomPin} className="text-gray-400 hover:text-red-500 text-xl leading-none transition-colors">×</button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={customPinName}
                        onChange={(e) => setCustomPinName(e.target.value)}
                        placeholder='Name this spot — e.g. "Near Metro Gate 2"'
                        className="flex-1 border border-blue-200 bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button onClick={meetAtCustomPin}
                        className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors whitespace-nowrap">
                        Meet here →
                      </button>
                    </div>
                  </div>
                ) : selectedLoc && (
                  /* Safe location panel */
                  <div className="flex items-center gap-4">
                    <span className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border flex-shrink-0 ${SAFE_LOCATION_COLORS[selectedLoc.type]}`}>
                      {SAFE_LOCATION_ICONS[selectedLoc.type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{selectedLoc.name}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="text-xs text-gray-500 capitalize">{selectedLoc.type} · {selectedLoc.neighborhood}</span>
                        {selectedLoc.distanceKm !== undefined && (
                          <span className="text-xs text-blue-600 font-semibold">
                            📍 {fmtDistance(selectedLoc.distanceKm)} away
                          </span>
                        )}
                        <span className="text-xs text-emerald-600 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">✓ Safe place</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button onClick={() => meetAtSafeLoc(selectedLoc)}
                        className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors">
                        Meet here →
                      </button>
                      <button onClick={() => setSelectedLocId(null)}
                        className="text-xs text-center text-gray-400 hover:text-gray-600">
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Nearby locations list */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {geoState.status === "ok" ? "Nearest to you" : "All locations"}
              </p>

              {/* Loading state */}
              {overpassLoading && (
                <div className="flex items-center gap-3 py-6 px-4 bg-white border border-gray-200 rounded-2xl mb-3">
                  <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin flex-shrink-0" />
                  <p className="text-sm text-gray-600">Finding cafes, parks &amp; spots near you…</p>
                </div>
              )}

              {/* Empty state after fetch — offer wider radius */}
              {!overpassLoading && overpassFetched && filteredLocs.length === 0 && (
                <div className="text-center py-10 bg-white border border-gray-200 rounded-2xl mb-3">
                  <p className="text-3xl mb-2">🔍</p>
                  <p className="text-sm font-semibold text-gray-700 mb-1">No places found within 5 km</p>
                  <p className="text-xs text-gray-400 mb-4">Try expanding the search or drop a custom pin on the map</p>
                  <button
                    onClick={() => {
                      if (!userPos) return;
                      setOverpassLoading(true);
                      setOverpassFetched(false);
                      fetchNearbyPlaces(userPos.lat, userPos.lng, 15000).then((places) => {
                        setOverpassLocs(places);
                        setOverpassLoading(false);
                        setOverpassFetched(true);
                      });
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Search within 15 km →
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredLocs.map((loc) => {
                  const isSelected  = loc.id === selectedLocId;
                  const groupsHere  = groups.filter((g) => g.safeLocationId === loc.id);
                  return (
                    <div key={loc.id}
                      onClick={() => { setSelectedLocId(isSelected ? null : loc.id); setCustomPin(null); }}
                      className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                        isSelected
                          ? "border-emerald-400 bg-emerald-50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                      }`}>
                      <div className="flex items-start gap-3 mb-3">
                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border flex-shrink-0 ${SAFE_LOCATION_COLORS[loc.type]}`}>
                          {SAFE_LOCATION_ICONS[loc.type]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm leading-tight">{loc.name}</p>
                          <p className="text-xs text-gray-500 capitalize mt-0.5">{loc.type} · {loc.neighborhood}</p>
                          {loc.distanceKm !== undefined && (
                            <p className="text-xs text-blue-600 font-semibold mt-0.5">
                              📍 {fmtDistance(loc.distanceKm)} away
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                          Safe ✓
                        </span>
                      </div>
                      {groupsHere.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {groupsHere.map((g) => (
                            <span key={g.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {INTEREST_EMOJI[g.topic]} {g.name}
                            </span>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); meetAtSafeLoc(loc); }}
                        className="w-full py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                      >
                        + Meet here
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </div>

      {showCreate && (
        <CreateGroupModal
          onClose={() => { setShowCreate(false); setPrefilledLoc(null); }}
          prefilledLocation={prefilledLoc}
        />
      )}
      {showQuickRoom && <QuickRoomModal onClose={() => setShowQuickRoom(false)} />}
    </>
  );
}
