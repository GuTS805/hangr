export interface LatLng {
  lat: number;
  lng: number;
}

/** Haversine great-circle distance in km */
export function haversine(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function fmtDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export type GeoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; position: LatLng; accuracy: number }
  | { status: "error"; message: string };

export function requestGeolocation(
  onUpdate: (state: GeoState) => void,
  timeout = 10_000
) {
  if (!navigator?.geolocation) {
    onUpdate({ status: "error", message: "Geolocation not supported" });
    return;
  }
  onUpdate({ status: "loading" });
  navigator.geolocation.getCurrentPosition(
    (pos) =>
      onUpdate({
        status: "ok",
        position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        accuracy: pos.coords.accuracy,
      }),
    (err) => onUpdate({ status: "error", message: err.message }),
    { enableHighAccuracy: true, timeout, maximumAge: 30_000 }
  );
}
