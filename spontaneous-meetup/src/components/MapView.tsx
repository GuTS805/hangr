"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useCallback } from "react";
import {
  MapContainer, TileLayer, Marker, Popup,
  Circle, useMapEvents, useMap,
} from "react-leaflet";
import L from "leaflet";
import { SafeLocation } from "@/types";
import { SAFE_LOCATION_ICONS, MARKER_COLORS } from "@/lib/mock-data";
import { LatLng } from "@/lib/geo";

// ── Icon cache (never recreated between renders) ───────────────────────────
const iconCache = new Map<string, L.DivIcon>();

function makeLocIcon(type: string, selected: boolean): L.DivIcon {
  const key = `${type}:${selected}`;
  if (iconCache.has(key)) return iconCache.get(key)!;
  const color = MARKER_COLORS[type] ?? "#6b7280";
  const emoji = SAFE_LOCATION_ICONS[type] ?? "📍";
  const s = selected ? 46 : 38;
  const icon = L.divIcon({
    html: `
      <div style="width:${s}px;height:${s + 12}px;display:flex;flex-direction:column;align-items:center;
        filter:drop-shadow(0 ${selected ? 6 : 3}px ${selected ? 12 : 6}px rgba(0,0,0,${selected ? .4 : .25}));
        transition:filter .2s">
        <div style="width:${s}px;height:${s}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
          background:${color};border:${selected ? 4 : 3}px solid white;
          display:flex;align-items:center;justify-content:center;">
          <span style="transform:rotate(45deg);font-size:${selected ? 20 : 16}px;line-height:1">${emoji}</span>
        </div>
        <div style="width:2px;height:12px;background:${color};margin-top:-1px;border-radius:0 0 2px 2px"></div>
      </div>`,
    className: "",
    iconSize: [s, s + 12],
    iconAnchor: [s / 2, s + 12],
    popupAnchor: [0, -(s + 14)],
  });
  iconCache.set(key, icon);
  return icon;
}

const customPinIcon = L.divIcon({
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;
      filter:drop-shadow(0 6px 14px rgba(37,99,235,.55));
      animation:pinPop .35s cubic-bezier(.34,1.56,.64,1) both">
      <div style="width:44px;height:44px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        background:#2563eb;border:4px solid white;
        display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);font-size:20px;line-height:1">📌</span>
      </div>
      <div style="width:2px;height:14px;background:#2563eb;margin-top:-1px;border-radius:0 0 2px 2px"></div>
    </div>`,
  className: "",
  iconSize: [44, 58],
  iconAnchor: [22, 58],
  popupAnchor: [0, -60],
});

const userDotIcon = L.divIcon({
  html: `
    <div style="position:relative;width:22px;height:22px">
      <div style="position:absolute;inset:0;background:#3b82f6;border-radius:50%;border:3px solid white;
        box-shadow:0 2px 8px rgba(59,130,246,.5);z-index:1"></div>
      <div style="position:absolute;inset:-8px;background:rgba(59,130,246,.2);border-radius:50%;
        animation:userPulse 2s ease-out infinite"></div>
    </div>`,
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// ── Global CSS for animations ──────────────────────────────────────────────
const ANIM_CSS = `
  @keyframes pinPop  { from { opacity:0;transform:translateY(-16px) scale(.6) } to { opacity:1;transform:none } }
  @keyframes userPulse { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.6);opacity:0} }
`;

// ── FlyTo (stable: only fires when key string changes) ─────────────────────
function FlyTo({ lat, lng, zoom = 15 }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  const prev = useRef("");
  useEffect(() => {
    const key = `${lat.toFixed(5)},${lng.toFixed(5)},${zoom}`;
    if (key === prev.current) return;
    prev.current = key;
    map.flyTo([lat, lng], zoom, { duration: 0.9, easeLinearity: 0.4 });
  });
  return null;
}

// ── AutoCenter: fly to user the first time their position arrives ───────────
function AutoCenter({ userPosition }: { userPosition: LatLng | null }) {
  const map = useMap();
  const flown = useRef(false);
  useEffect(() => {
    if (!userPosition || flown.current) return;
    flown.current = true;
    map.flyTo([userPosition.lat, userPosition.lng], 15, { duration: 1.1, easeLinearity: 0.4 });
  }, [map, userPosition]);
  return null;
}

// ── ClickHandler: click empty map → drop pin ──────────────────────────────
function ClickHandler({ onPin }: { onPin: (ll: LatLng) => void }) {
  useMapEvents({
    click(e) { onPin({ lat: e.latlng.lat, lng: e.latlng.lng }); },
  });
  return null;
}

// ── Types ──────────────────────────────────────────────────────────────────
export interface CustomPin { lat: number; lng: number }

export interface Props {
  locations: SafeLocation[];
  selectedId: string | null;
  userPosition: LatLng | null;
  userAccuracy?: number;
  customPin: CustomPin | null;
  flyToUser?: boolean;              // trigger a one-time fly-to-user
  onSelect: (loc: SafeLocation) => void;
  onCustomPin: (pin: CustomPin) => void;
  height?: string;
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function MapView({
  locations, selectedId, userPosition, userAccuracy = 0,
  customPin, flyToUser = false,
  onSelect, onCustomPin, height = "460px",
}: Props) {
  // Centered over Ghaziabad/NCR to show all locations at a glance
  const DEFAULT_CENTER: [number, number] = [28.638, 77.408];
  const initialCenter: [number, number] = userPosition
    ? [userPosition.lat, userPosition.lng]
    : DEFAULT_CENTER;

  const selectedLoc = locations.find((l) => l.id === selectedId) ?? null;

  const handleMapClick = useCallback(
    (ll: LatLng) => onCustomPin(ll),
    [onCustomPin]
  );

  return (
    <>
      {/* Inject keyframe animations once */}
      <style>{ANIM_CSS}</style>

      <div
        className="w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm"
        style={{ height }}
      >
        <MapContainer
          center={initialCenter}
          zoom={userPosition ? 15 : 12}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
          zoomControl
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            keepBuffer={6}
          />

          {/* User location dot + accuracy ring */}
          {userPosition && (
            <>
              {userAccuracy > 0 && (
                <Circle
                  center={[userPosition.lat, userPosition.lng]}
                  radius={userAccuracy}
                  pathOptions={{ color: "#3b82f6", fillColor: "#93c5fd", fillOpacity: 0.15, weight: 1 }}
                />
              )}
              <Marker position={[userPosition.lat, userPosition.lng]} icon={userDotIcon}>
                <Popup closeButton={false}>
                  <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>📍 You are here</p>
                </Popup>
              </Marker>
            </>
          )}

          {/* Safe location markers */}
          {locations.map((loc) => (
            <Marker
              key={loc.id}
              position={[loc.lat, loc.lng]}
              icon={makeLocIcon(loc.type, loc.id === selectedId)}
              eventHandlers={{ click: () => onSelect(loc) }}
            >
              <Popup closeButton={false}>
                <div style={{ minWidth: 170 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, margin: "0 0 3px" }}>{loc.name}</p>
                  <p style={{ fontSize: 11, color: "#6b7280", textTransform: "capitalize", margin: 0 }}>
                    {loc.type} · {loc.neighborhood}
                  </p>
                  {loc.distanceKm !== undefined && (
                    <p style={{ fontSize: 11, color: "#2563eb", marginTop: 3 }}>
                      📍 {loc.distanceKm < 1
                        ? `${Math.round(loc.distanceKm * 1000)} m away`
                        : `${loc.distanceKm.toFixed(1)} km away`}
                    </p>
                  )}
                  <span style={{ display:"inline-block", marginTop:6, fontSize:10,
                    background:"#dcfce7",color:"#15803d",padding:"2px 8px",borderRadius:99,fontWeight:600 }}>
                    ✓ Verified safe place
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Custom draggable pin */}
          {customPin && (
            <Marker
              position={[customPin.lat, customPin.lng]}
              icon={customPinIcon}
              draggable
              eventHandlers={{
                dragend(e) {
                  const { lat, lng } = (e.target as L.Marker).getLatLng();
                  onCustomPin({ lat, lng });
                },
              }}
            >
              <Popup closeButton={false}>
                <p style={{ fontWeight: 700, fontSize: 13, margin: "0 0 2px" }}>📌 Meeting point</p>
                <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>Drag to fine-tune</p>
              </Popup>
            </Marker>
          )}

          {/* Auto-center when GPS first resolves */}
          <AutoCenter userPosition={userPosition} />

          {/* Fly targets */}
          {flyToUser && userPosition && (
            <FlyTo lat={userPosition.lat} lng={userPosition.lng} zoom={15} />
          )}
          {selectedLoc && !flyToUser && (
            <FlyTo lat={selectedLoc.lat} lng={selectedLoc.lng} zoom={16} />
          )}
          {customPin && !selectedLoc && !flyToUser && (
            <FlyTo lat={customPin.lat} lng={customPin.lng} zoom={16} />
          )}

          <ClickHandler onPin={handleMapClick} />
        </MapContainer>
      </div>
    </>
  );
}
