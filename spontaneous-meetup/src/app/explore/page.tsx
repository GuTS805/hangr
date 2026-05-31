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
  const { currentUser, groups, nearbyUsers, cachedUserPos } = useStore();

  const [tab, setTab]               = useState<Tab>("people");
  const [filter, setFilter]         = useState<Interest | "All">("All");
  const [radius, setRadius]         = useState<RadiusFilter>(2);
  const [locFilter, setLocFilter]   = useState<LocationFilter>("all");
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showQuickRoom, setShowQuickRoom] = useState(false);
  const [prefilledLoc, setPrefilledLoc]   = useState<SafeLocation | null>(null);

  // GPS — initialise from background-prefetched position if already available
  const [geoState, setGeoState] = useState<GeoState>(() =>
    cachedUserPos
      ? { status: "ok", position: cachedUserPos, accuracy: 50 }
      : { status: "idle" }
  );
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

  // When cachedUserPos arrives (background prefetch completed after component mount), apply it
  useEffect(() => {
    if (cachedUserPos && geoState.status === "idle") {
      setGeoState({ status: "ok", position: cachedUserPos, accuracy: 50 });
    }
  }, [cachedUserPos]); // eslint-disable-line react-hooks/exhaustive-deps

  // Request GPS when user switches to map tab — skip if already have position
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
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 bg-[#F2F1EB] min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-black">Who&apos;s nearby?</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50 mt-1">
              {activePeople.length} {activePeople.length === 1 ? "person" : "people"} free within {radius === 99 ? "any distance" : `${radius} km`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (!currentUser) { router.push("/auth"); return; } setShowQuickRoom(true); }}
              className="bg-black border-2 border-black text-[#FFE500] font-black uppercase px-4 py-2 shadow-[3px_3px_0_#FFE500]"
            >
              ⚡ QUICK
            </button>
            <button
              onClick={() => { if (!currentUser) { router.push("/auth"); return; } setPrefilledLoc(null); setShowCreate(true); }}
              className="bg-[#FFE500] border-2 border-black text-black font-black uppercase tracking-wide shadow-[3px_3px_0_#0A0A0A] px-4 py-2 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
            >
              + GROUP
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-4 border-2 border-black">
          {(["people", "groups", "map"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs sm:text-sm font-black uppercase tracking-wide transition-all ${
                tab === t
                  ? "bg-black text-[#FFE500] border-r-2 border-black"
                  : "bg-white text-black border-r-2 border-black hover:bg-[#FFE500] transition-colors last:border-r-0"
              }`}>
              {t === "people" ? `PEOPLE ${activePeople.length}`
                : t === "groups" ? `GROUPS ${groups.length}`
                : "MAP"}
            </button>
          ))}
        </div>

        {/* Interest filter (non-map) */}
        {tab !== "map" && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
            <button onClick={() => setFilter("All")}
              className={`flex-shrink-0 px-3 py-1 text-xs font-bold uppercase transition-colors ${
                filter === "All"
                  ? "bg-black text-[#FFE500] border-2 border-black"
                  : "border-2 border-black text-black bg-white hover:bg-[#FFE500] transition-colors"
              }`}>
              All
            </button>
            {INTERESTS.map((i) => (
              <button key={i} onClick={() => setFilter(filter === i ? "All" : i as Interest)}
                className={`flex-shrink-0 px-3 py-1 text-xs font-bold uppercase transition-colors ${
                  filter === i
                    ? "bg-black text-[#FFE500] border-2 border-black"
                    : "border-2 border-black text-black bg-white hover:bg-[#FFE500] transition-colors"
                }`}>
                {INTEREST_EMOJI[i]} {i}
              </button>
            ))}
          </div>
        )}

        {/* ── GROUPS ── */}
        {tab === "groups" && (
          <div className="space-y-2">
            {filteredGroups.length === 0 ? (
              <div className="border-2 border-black bg-white shadow-[4px_4px_0_#0A0A0A] text-center py-12">
                <p className="text-4xl mb-3">😕</p>
                <p className="font-black uppercase text-black">No groups yet</p>
                <button onClick={() => setShowCreate(true)}
                  className="mt-3 bg-[#FFE500] border-2 border-black text-black font-black uppercase tracking-wide shadow-[3px_3px_0_#0A0A0A] px-4 py-2 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all">
                  Create one →
                </button>
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
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50 flex-shrink-0">Within</span>
              {([0.5, 1, 2, 99] as RadiusFilter[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`flex-shrink-0 px-3 py-1 text-xs font-bold uppercase transition-colors ${
                    radius === r
                      ? "bg-black text-[#FFE500] border-2 border-black"
                      : "border-2 border-black text-black bg-white hover:bg-[#FFE500] transition-colors"
                  }`}
                >
                  {r === 99 ? "Any" : r < 1 ? `${r * 1000}m` : `${r} km`}
                </button>
              ))}
            </div>

            {filteredPeople.length === 0 ? (
              <div className="border-2 border-black bg-white shadow-[4px_4px_0_#0A0A0A] text-center py-12">
                <p className="text-4xl mb-3">👀</p>
                <p className="font-black uppercase text-black">No one free within {radius === 99 ? "range" : radius < 1 ? `${radius * 1000}m` : `${radius} km`}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50 mt-1">Try expanding the radius</p>
                {radius !== 99 && (
                  <button
                    onClick={() => setRadius(99)}
                    className="mt-3 bg-[#FFE500] border-2 border-black text-black font-black uppercase tracking-wide shadow-[3px_3px_0_#0A0A0A] px-4 py-2 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
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
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50 mb-3">Most active nearby</p>
                <div className="border-2 border-black bg-white shadow-[4px_4px_0_#0A0A0A]">
                  <div className="bg-[#FFE500] border-b-2 border-black px-4 py-3">
                    <span className="font-black uppercase tracking-wide text-black text-sm">Leaderboard</span>
                  </div>
                  {leaderboard.map((u, i) => (
                    <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b-2 border-black last:border-b-0">
                      <span className="w-7 h-7 bg-[#FFE500] border-2 border-black flex items-center justify-center text-xs font-black text-black flex-shrink-0">
                        {i + 1}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-[#FFE500] text-xs font-black flex-shrink-0 overflow-hidden">
                        {u.avatar?.startsWith("http")
                          ? <img src={u.avatar} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="" />
                          : <span>{u.avatar?.slice(0, 1)}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black uppercase text-black truncate">{u.name}</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50">{u.totalMeetups} meetups · {u.trustScore.toFixed(1)} ★</p>
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
            <div className="flex items-center justify-between border-2 border-black bg-white shadow-[3px_3px_0_#0A0A0A] px-4 py-3">
              <div className="flex items-center gap-2.5">
                {geoState.status === "loading" && (
                  <div className="w-4 h-4 border-2 border-black border-t-[#FFE500] animate-spin flex-shrink-0" />
                )}
                {geoState.status === "ok" && (
                  <span className="w-3 h-3 bg-[#00C44A] border-2 border-black inline-block flex-shrink-0" />
                )}
                {geoState.status === "error" && (
                  <span className="w-3 h-3 bg-black border-2 border-black inline-block flex-shrink-0" />
                )}
                {geoState.status === "idle" && (
                  <span className="w-3 h-3 bg-white border-2 border-black inline-block flex-shrink-0" />
                )}

                <p className="text-sm text-black font-black uppercase">
                  {geoState.status === "loading" && "Getting your location…"}
                  {geoState.status === "ok" && overpassLoading && "Found you · Searching nearby places…"}
                  {geoState.status === "ok" && !overpassLoading && overpassLocs.length > 0 && `${overpassLocs.length} places found · ±${Math.round(userAccuracy)}m`}
                  {geoState.status === "ok" && !overpassLoading && overpassLocs.length === 0 && overpassFetched && `No places via OSM · ±${Math.round(userAccuracy)}m — drop a pin`}
                  {geoState.status === "ok" && !overpassLoading && !overpassFetched && `Located · ±${Math.round(userAccuracy)}m`}
                  {geoState.status === "error"   && `Location unavailable — ${geoState.message}`}
                  {geoState.status === "idle"    && "Location not yet detected"}
                </p>
              </div>
              <button
                onClick={locateMe}
                disabled={geoState.status === "loading"}
                className="bg-[#FFE500] border-2 border-black text-black font-black uppercase tracking-wide shadow-[3px_3px_0_#0A0A0A] px-4 py-2 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all disabled:opacity-50"
              >
                {geoState.status === "loading"
                  ? "Locating…"
                  : geoState.status === "ok" ? "Refresh" : "Locate me"}
              </button>
            </div>

            {/* Hint banner */}
            <div className="border-2 border-black bg-black text-white px-4 py-3">
              <p className="text-xs font-black uppercase">
                <strong className="text-[#FFE500]">Tap a marker</strong> to select a safe location ·{" "}
                <strong className="text-[#FFE500]">Tap anywhere on the map</strong> to drop a custom meeting point
              </p>
            </div>

            {/* Location type filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {(["all","cafe","mall","park","library","sports"] as LocationFilter[]).map((t) => (
                <button key={t} onClick={() => setLocFilter(t)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase transition-colors ${
                    locFilter === t
                      ? "bg-black text-[#FFE500] border-2 border-black"
                      : "border-2 border-black text-black bg-white hover:bg-[#FFE500] transition-colors"
                  }`}>
                  {t === "all" ? "All" : `${SAFE_LOCATION_ICONS[t]} ${t.charAt(0).toUpperCase() + t.slice(1)}s`}
                </button>
              ))}
            </div>

            {/* Map */}
            <div className="border-2 border-black shadow-[4px_4px_0_#0A0A0A]">
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
            </div>

            {/* ── Bottom selection panel ── */}
            {(selectedLoc || customPin) && (
              <div className={`border-2 border-black bg-white shadow-[4px_4px_0_#0A0A0A] p-4 transition-all`}>
                {customPin && !selectedLoc ? (
                  /* Custom pin panel */
                  <div>
                    <div className="bg-[#FFE500] border-b-2 border-black px-4 py-3 -mx-4 -mt-4 mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">📌</span>
                        <div>
                          <p className="font-black uppercase text-black text-sm">Custom meeting point</p>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50">
                            {customPin.lat.toFixed(5)}, {customPin.lng.toFixed(5)} · Drag pin to adjust
                          </p>
                        </div>
                      </div>
                      <button onClick={clearCustomPin} className="bg-black text-[#FFE500] font-black border-2 border-black w-7 h-7 flex items-center justify-center text-lg leading-none">×</button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={customPinName}
                        onChange={(e) => setCustomPinName(e.target.value)}
                        placeholder='Name this spot — e.g. "Near Metro Gate 2"'
                        className="flex-1 border-2 border-black bg-white px-4 py-3 font-medium focus:outline-none focus:shadow-[3px_3px_0_#0A0A0A] text-sm"
                      />
                      <button onClick={meetAtCustomPin}
                        className="bg-[#FFE500] border-2 border-black text-black font-black uppercase tracking-wide shadow-[3px_3px_0_#0A0A0A] px-4 py-2 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all whitespace-nowrap">
                        Meet here →
                      </button>
                    </div>
                  </div>
                ) : selectedLoc && (
                  /* Safe location panel */
                  <div>
                    <div className="bg-[#FFE500] border-b-2 border-black px-4 py-3 -mx-4 -mt-4 mb-4">
                      <span className="font-black uppercase text-black text-sm">Selected location</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="w-12 h-12 border-2 border-black bg-white flex items-center justify-center text-2xl flex-shrink-0">
                        {SAFE_LOCATION_ICONS[selectedLoc.type]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-black uppercase text-black">{selectedLoc.name}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50 capitalize">{selectedLoc.type} · {selectedLoc.neighborhood}</span>
                          {selectedLoc.distanceKm !== undefined && (
                            <span className="text-xs font-black uppercase text-black">
                              {fmtDistance(selectedLoc.distanceKm)} away
                            </span>
                          )}
                          <span className="border-2 border-black bg-[#00C44A] text-black text-[10px] font-black uppercase px-2 py-0.5">Safe ✓</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <button onClick={() => meetAtSafeLoc(selectedLoc)}
                          className="bg-[#00C44A] border-2 border-black text-black font-black uppercase px-4 py-2 shadow-[3px_3px_0_#0A0A0A]">
                          Meet here →
                        </button>
                        <button onClick={() => setSelectedLocId(null)}
                          className="text-xs text-center font-black uppercase text-black/50 hover:text-black">
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Nearby locations list */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50 mb-3">
                {geoState.status === "ok" ? "Nearest to you" : "All locations"}
              </p>

              {/* Loading state */}
              {overpassLoading && (
                <div className="flex items-center gap-3 py-6 px-4 border-2 border-black bg-white shadow-[3px_3px_0_#0A0A0A] mb-3">
                  <div className="w-5 h-5 border-2 border-black border-t-[#FFE500] animate-spin flex-shrink-0" />
                  <div>
                    <p className="text-sm text-black font-black uppercase">Searching cafes, parks &amp; spots near you…</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50 mt-0.5">Trying multiple servers, this may take a few seconds</p>
                  </div>
                </div>
              )}

              {/* Empty state after all retries — drop a pin */}
              {!overpassLoading && overpassFetched && filteredLocs.length === 0 && (
                <div className="border-2 border-black bg-white shadow-[4px_4px_0_#0A0A0A] mb-3">
                  <div className="bg-[#FFE500] border-b-2 border-black px-4 py-3">
                    <span className="font-black uppercase text-black text-sm">No places found</span>
                  </div>
                  <div className="text-center py-10 px-4">
                    <p className="text-3xl mb-2">📌</p>
                    <p className="text-sm font-black uppercase text-black mb-1">No places found via OpenStreetMap</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50 mb-4">
                      OSM data might be sparse in your area.<br />
                      Drop a custom pin on the map to set any meeting spot.
                    </p>
                    <button
                      onClick={() => {
                        if (!userPos) return;
                        setOverpassLoading(true);
                        setOverpassFetched(false);
                        fetchNearbyPlaces(userPos.lat, userPos.lng, 50000).then((places) => {
                          setOverpassLocs(places);
                          setOverpassLoading(false);
                          setOverpassFetched(true);
                        });
                      }}
                      className="bg-[#FFE500] border-2 border-black text-black font-black uppercase tracking-wide shadow-[3px_3px_0_#0A0A0A] px-4 py-2 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
                    >
                      Retry with 50 km radius →
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredLocs.map((loc) => {
                  const isSelected  = loc.id === selectedLocId;
                  const groupsHere  = groups.filter((g) => g.safeLocationId === loc.id);
                  return (
                    <div key={loc.id}
                      onClick={() => { setSelectedLocId(isSelected ? null : loc.id); setCustomPin(null); }}
                      className={`border-2 border-black cursor-pointer transition-all ${
                        isSelected
                          ? "shadow-none translate-x-[3px] translate-y-[3px] bg-[#FFE500]"
                          : "bg-white shadow-[3px_3px_0_#0A0A0A] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
                      }`}>
                      {/* Card header */}
                      <div className={`border-b-2 border-black px-4 py-3 flex items-center justify-between ${isSelected ? "bg-[#FFE500]" : "bg-[#FFE500]"}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{SAFE_LOCATION_ICONS[loc.type]}</span>
                          <p className="font-black uppercase text-black text-sm leading-tight">{loc.name}</p>
                        </div>
                        <span className="border-2 border-black bg-[#00C44A] text-black text-[10px] font-black uppercase px-2 py-0.5 flex-shrink-0">Safe ✓</span>
                      </div>
                      <div className="p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50 capitalize mb-1">{loc.type} · {loc.neighborhood}</p>
                        {loc.distanceKm !== undefined && (
                          <p className="text-xs font-black uppercase text-black mb-2">
                            {fmtDistance(loc.distanceKm)} away
                          </p>
                        )}
                        {groupsHere.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {groupsHere.map((g) => (
                              <span key={g.id} className="text-xs border-2 border-black bg-white text-black font-bold uppercase px-2 py-0.5">
                                {INTEREST_EMOJI[g.topic]} {g.name}
                              </span>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); meetAtSafeLoc(loc); }}
                          className="w-full py-2 bg-black border-2 border-black text-[#FFE500] font-black uppercase text-xs shadow-[3px_3px_0_#FFE500] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
                        >
                          + Meet here
                        </button>
                      </div>
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
