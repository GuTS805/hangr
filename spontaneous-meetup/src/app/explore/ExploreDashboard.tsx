"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import GroupCard from "./ExploreGroupCard";
import UserCard from "@/components/UserCard";
import CreateGroupModal from "@/components/CreateGroupModal";
import QuickRoomModal from "@/components/QuickRoomModal";
import MapView from "@/components/MapView.client";
import type { CustomPin } from "@/components/MapView.client";
import type { Interest, SafeLocation } from "@/types";
import { INTEREST_EMOJI, SAFE_LOCATIONS, SAFE_LOCATION_ICONS } from "@/lib/mock-data";
import { requestGeolocation, type GeoState } from "@/lib/geo";
import { fetchNearbyPlaces } from "@/lib/overpass";
import "./explore.css";

type Tab = "people" | "groups" | "map";
type Radius = 0.5 | 1 | 2 | 99;
type PlaceType = "all" | SafeLocation["type"];
const interests: Interest[] = ["Gaming", "Cricket", "Coding", "Cafes", "Anime", "Music", "Gym", "Football", "Movies", "Food"];
const placeTypes: { type: PlaceType; label: string; icon: string }[] = [
  { type: "all", label: "All", icon: "" }, { type: "cafe", label: "Cafes", icon: "☕" },
  { type: "mall", label: "Malls", icon: "🛍️" }, { type: "park", label: "Parks", icon: "🌳" },
  { type: "library", label: "Libraries", icon: "📚" }, { type: "sports", label: "Sports", icon: "⚽" },
];

function EmptyArt({ kind }: { kind: "people" | "groups" }) {
  return <div className={`explore-empty-art ${kind}`} aria-hidden="true">
    <div className="art-orbit"/><div className="art-cloud left"/><div className="art-cloud right"/>
    {kind === "people" ? <div className="art-binoculars"><i/><i/><b/><b/></div> : <div className="art-friend"><i/><b>♣</b></div>}
    <div className="art-ground"><i/><i/><i/></div>
  </div>;
}

export default function ExploreDashboard() {
  const router = useRouter();
  const { currentUser, groups, nearbyUsers, cachedUserPos } = useStore();
  const [tab, setTab] = useState<Tab>("people");
  const [interest, setInterest] = useState<Interest | "All">("All");
  const [radius, setRadius] = useState<Radius>(2);
  const [placeType, setPlaceType] = useState<PlaceType>("all");
  const [query, setQuery] = useState("");
  const [more, setMore] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [prefilled, setPrefilled] = useState<SafeLocation | null>(null);
  const [selected, setSelected] = useState<SafeLocation | null>(null);
  const [pin, setPin] = useState<CustomPin | null>(null);
  const [pinName, setPinName] = useState("");
  const [geo, setGeo] = useState<GeoState>(() => cachedUserPos ? { status: "ok", position: cachedUserPos, accuracy: 50 } : { status: "idle" });
  const [livePlaces, setLivePlaces] = useState<SafeLocation[] | null>(null);
  const [flyToUser, setFlyToUser] = useState(false);
  const [renderTime] = useState(() => Date.now());
  const userPos = geo.status === "ok" ? geo.position : null;
  const neighborhood = currentUser?.neighborhood?.trim().toLowerCase() === "cross"
    ? "Crossing Republik" : currentUser?.neighborhood || "Crossing Republik";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const nextTab = params.get("tab");
      if (nextTab === "groups" || nextTab === "map") setTab(nextTab);
      setQuery(params.get("q") ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!userPos) return;
    let active = true;
    fetchNearbyPlaces(userPos.lat, userPos.lng).then(places => { if (active) setLivePlaces(places); });
    return () => { active = false; };
  }, [userPos?.lat, userPos?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const people = nearbyUsers.filter(u => u.isFree && u.id !== currentUser?.id && (radius === 99 || (u.distanceKm ?? 99) <= radius) && (interest === "All" || u.interests.includes(interest)) && `${u.name} ${u.neighborhood} ${u.interests.join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  const nearbyCount = nearbyUsers.filter(u => u.isFree && u.id !== currentUser?.id && (radius === 99 || (u.distanceKm ?? 99) <= radius)).length;
  const visibleGroups = groups.filter(g => g.expiresAt > renderTime && (interest === "All" || g.topic === interest) && `${g.name} ${g.topic} ${g.location}`.toLowerCase().includes(query.toLowerCase()));
  const places = (userPos ? livePlaces ?? [] : SAFE_LOCATIONS)
    .filter(loc => (radius === 99 || (loc.distanceKm ?? 99) <= radius) && (placeType === "all" || loc.type === placeType) && `${loc.name} ${loc.type} ${loc.neighborhood}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99)).slice(0, 8);
  const hotspots = SAFE_LOCATIONS.filter(loc => ["sl3", "sl1", "sl2", "sl7", "sl20"].includes(loc.id));

  const create = (location: SafeLocation | null = null) => { if (!currentUser) { router.push("/auth"); return; } setPrefilled(location); setShowCreate(true); };
  const quick = () => { if (currentUser) setShowQuick(true); else router.push("/auth"); };
  const locate = () => requestGeolocation(next => { setGeo(next); if (next.status === "ok") { setFlyToUser(true); setTimeout(() => setFlyToUser(false), 1200); } });
  const selectPlace = (location: SafeLocation) => { setSelected(location); setPin(null); };
  const dropPin = useCallback((point: CustomPin) => { setPin(point); setSelected(null); }, []);
  const meetAtPin = () => { if (pin) create({ id: `custom_${Date.now()}`, name: pinName.trim() || "Custom meeting point", type: "cafe", neighborhood: "Custom location", lat: pin.lat, lng: pin.lng }); };

  return <div className={`explore-shell explore-tab-${tab}`}><div className="explore-layout">
    <main className="explore-main">
      <div className="explore-heading"><div><h1>Who&apos;s nearby?</h1><p>{tab === "people" ? "Find people around you who share your interests" : tab === "groups" ? "Find groups, meet new people and do more together — right in your neighbourhood." : "Discover people, groups and great places around you."}</p></div><div className="explore-heading-actions"><button className="explore-quick-btn" onClick={quick}>⚡ &nbsp; Quick Meetup</button><button className="explore-create-btn" onClick={() => create()}>✚ &nbsp; Create Group</button></div></div>
      <div className="explore-search-row"><label className="explore-search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder={tab === "groups" ? "Search groups, interests or activities..." : "Search people, groups, or places..."}/></label><button className="explore-select-location" onClick={locate}>◎ &nbsp; Current location <span>⌄</span></button><button className="explore-select-radius" onClick={() => setRadius(radius === 2 ? 99 : 2)}>◎ &nbsp; {radius === 99 ? "Any distance" : `Within ${radius} km`} <span>⌄</span></button></div>
      <div className="explore-tabs" role="tablist" aria-label="Explore sections">{(["people", "groups", "map"] as Tab[]).map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}><span>{t === "people" ? "♟" : t === "groups" ? "♣" : "◫"}</span>{t[0].toUpperCase() + t.slice(1)}{t !== "map" && <small>{t === "people" ? nearbyCount : visibleGroups.length}</small>}</button>)}</div>
      {tab === "map" ? <div className="explore-chip-row map-chips">{placeTypes.map(item => <button key={item.type} className={placeType === item.type ? "active" : ""} onClick={() => setPlaceType(item.type)}>{item.icon} {item.label}</button>)}</div> : <div className="explore-chip-row"><b>{tab === "people" ? "Interests & Vibes" : "Explore by interest"}</b><div className="explore-chips"><button className={interest === "All" ? "active" : ""} onClick={() => setInterest("All")}>▦ &nbsp; All</button>{interests.slice(0, more ? undefined : 8).map(i => <button key={i} className={interest === i ? "active" : ""} onClick={() => setInterest(i)}>{INTEREST_EMOJI[i]} &nbsp;{i}</button>)}<button onClick={() => setMore(v => !v)}>··· &nbsp; {more ? "Less" : "More"}⌄</button></div></div>}
      {tab === "people" && <div className="explore-radius-row"><b>Search within</b>{([0.5,1,2,99] as Radius[]).map(r => <button key={r} className={radius === r ? "active" : ""} onClick={() => setRadius(r)}>{r === 99 ? "Any" : r === .5 ? "500 m" : `${r} km`}</button>)}<button className="explore-radius-location" onClick={locate}>◎ &nbsp; {neighborhood}, Ghaziabad &nbsp;⌄</button></div>}
      {tab === "people" && (people.length ? <div className="explore-results">{people.map(u => <UserCard key={u.id} user={u} matchScore={currentUser ? Math.round(u.interests.filter(i => currentUser.interests.includes(i)).length / Math.max(1, currentUser.interests.length) * 100) : 0}/>)}</div> : <section className="explore-empty"><EmptyArt kind="people"/><h2>No one nearby within {radius === 99 ? "your area" : radius === .5 ? "500 m" : `${radius} km`}</h2><p>Looks like it&apos;s a bit quiet around you right now.<br/>Try expanding the search radius or explore more people.</p><button className="explore-primary" onClick={() => setRadius(99)}>⚲ &nbsp; Show everyone &nbsp; →</button><div className="explore-suggestions"><h3>Try these instead</h3><div><button onClick={() => setRadius(99)}><i>📍</i><span><b>Expand radius</b><small>Search in a larger area</small></span>›</button><button onClick={() => setTab("groups")}><i>♣</i><span><b>Join a group</b><small>Meet people with similar interests</small></span>›</button><button onClick={() => setTab("map")}><i>⚡</i><span><b>Try the map</b><small>Find popular places near you</small></span>›</button><button onClick={() => setInterest("All")}><i>♧</i><span><b>Explore other interests</b><small>Discover new communities</small></span>›</button></div></div></section>)}
      {tab === "groups" && (visibleGroups.length ? <div className="explore-results">{visibleGroups.map(g => <GroupCard key={g.id} group={g} showRepost onRepost={() => create()}/>)}</div> : <section className="explore-empty"><EmptyArt kind="groups"/><h2>No groups nearby yet</h2><p>Be the first to bring people together in your neighbourhood.</p><button className="explore-primary" onClick={() => create()}>＋ &nbsp; Create a group</button><div className="explore-suggestions"><h3>OTHER WAYS TO GET STARTED</h3><div><button onClick={() => setTab("map")}><i>◫</i><span><b>Explore on map</b><small>See what&apos;s happening around you.</small></span>›</button><button onClick={quick}><i>⚡</i><span><b>Start a quick meetup</b><small>Find people for something today.</small></span>›</button><button onClick={() => { setRadius(99); setTab("people"); }}><i>◎</i><span><b>Expand radius</b><small>Try a larger area to find groups.</small></span>›</button></div></div></section>)}
      {tab === "map" && <div className="explore-map-wrap"><MapView locations={selected && !places.some(loc => loc.id === selected.id) ? [selected, ...places] : places} selectedId={selected?.id ?? null} userPosition={userPos} userAccuracy={geo.status === "ok" ? geo.accuracy : 0} customPin={pin} flyToUser={flyToUser} onSelect={selectPlace} onCustomPin={dropPin} showLabels height="min(61vh, 580px)"/><button className="explore-recenter" onClick={locate}>➤ &nbsp; Re-center</button><button className="explore-map-view" onClick={() => setPlaceType("all")}>▱ &nbsp; Map view⌄</button>{(selected || pin) && <div className="explore-map-selection"><div><strong>{selected?.name || "Custom meeting point"}</strong><small>{selected ? `${selected.type} · ${selected.neighborhood}` : "Drag the pin to adjust your meeting point"}</small></div>{pin && <input value={pinName} onChange={e => setPinName(e.target.value)} placeholder="Name this spot"/>}<button onClick={() => selected ? create(selected) : meetAtPin()}>Meet here →</button><button aria-label="Dismiss selected place" onClick={() => { setSelected(null); setPin(null); }}>×</button></div>}</div>}
    </main>
    <aside className="explore-rail"><section className="explore-rail-card explore-location-card"><div className="explore-location-line"><span className="explore-rail-icon">📍</span><div><b>Your location</b><strong>{neighborhood}, Ghaziabad</strong><small>Within {radius === 99 ? "any distance" : `${radius} km`} ⌄</small></div><button onClick={locate}>Change</button></div></section><section className="explore-safe-card"><span>⬡</span><div><b>You&apos;re in a safe zone</b><p>This area has good community activity and verified places.</p></div><span className="safe-info">ⓘ</span></section><section className="explore-rail-card explore-hotspots"><div className="explore-rail-title"><div><h2>🔥 &nbsp; Nearby hotspots</h2><p>Popular places around you</p></div><button onClick={() => setTab("map")}>View all →</button></div>{hotspots.map(loc => <button className="explore-hotspot" key={loc.id} onClick={() => { setTab("map"); selectPlace(loc); }}><span className={`hotspot-art ${loc.type}`}>{SAFE_LOCATION_ICONS[loc.type]}</span><span className="hotspot-label"><b>{loc.name}</b><small>{loc.type} · {loc.distanceKm?.toFixed(1)} km</small></span><span className="hotspot-verified">✓ Verified</span></button>)}</section><section className="explore-rail-card explore-map-promo"><h2>🗺️ &nbsp; Discover on map</h2><p>See groups, people and places nearby.</p><div className="explore-map-graphic"><span>📍</span><i/><i/><i/><i/></div><button onClick={() => setTab("map")}>Open map view &nbsp; →</button></section></aside>
  </div>{showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} prefilledLocation={prefilled}/>} {showQuick && <QuickRoomModal onClose={() => setShowQuick(false)}/>}</div>;
}

