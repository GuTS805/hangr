import { haversine } from "./geo";
import { SafeLocation } from "@/types";

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

const AMENITY_TO_TYPE: Record<string, SafeLocation["type"]> = {
  cafe:        "cafe",
  restaurant:  "cafe",
  fast_food:   "cafe",
  bar:         "cafe",
  food_court:  "cafe",
  library:     "library",
};

function buildQuery(lat: number, lng: number, radiusM: number): string {
  return `[out:json][timeout:15];
(
  node["amenity"~"^(cafe|restaurant|fast_food|bar|food_court)$"]["name"](around:${radiusM},${lat},${lng});
  node["amenity"="library"]["name"](around:${radiusM},${lat},${lng});
  node["leisure"="park"]["name"](around:${radiusM},${lat},${lng});
  way["leisure"="park"]["name"](around:${radiusM},${lat},${lng});
  node["shop"~"^(mall|department_store)$"]["name"](around:${radiusM},${lat},${lng});
  way["shop"~"^(mall|department_store)$"]["name"](around:${radiusM},${lat},${lng});
);
out center 40;`;
}

function elementToType(el: OverpassElement): SafeLocation["type"] {
  if (el.tags.amenity) return AMENITY_TO_TYPE[el.tags.amenity] ?? "cafe";
  if (el.tags.leisure === "park") return "park";
  if (el.tags.shop === "mall" || el.tags.shop === "department_store") return "mall";
  return "cafe";
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags: Record<string, string>;
}

let cache: { lat: number; lng: number; radius: number; result: SafeLocation[]; at: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

export async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  radiusM = 2000
): Promise<SafeLocation[]> {
  // Return cached result if same position and fresh
  if (
    cache &&
    Date.now() - cache.at < CACHE_TTL_MS &&
    Math.abs(cache.lat - lat) < 0.002 &&
    Math.abs(cache.lng - lng) < 0.002 &&
    cache.radius === radiusM
  ) {
    return cache.result;
  }

  try {
    const res = await fetch(OVERPASS_ENDPOINT, {
      method: "POST",
      body: buildQuery(lat, lng, radiusM),
    });
    if (!res.ok) throw new Error(`Overpass ${res.status}`);
    const json = await res.json();

    const seen = new Set<string>();
    const places: SafeLocation[] = [];

    for (const el of json.elements as OverpassElement[]) {
      const name = el.tags.name?.trim();
      if (!name) continue;

      const elLat = el.lat ?? el.center?.lat;
      const elLng = el.lon ?? el.center?.lon;
      if (!elLat || !elLng) continue;

      const key = `${name}|${Math.round(elLat * 1000)}|${Math.round(elLng * 1000)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const distanceKm = Math.round(haversine({ lat, lng }, { lat: elLat, lng: elLng }) * 10) / 10;

      places.push({
        id: `osm_${el.type}_${el.id}`,
        name,
        type: elementToType(el),
        neighborhood: el.tags["addr:suburb"] ?? el.tags["addr:city"] ?? "",
        lat: elLat,
        lng: elLng,
        distanceKm,
      });
    }

    // Sort by distance and take top 20
    places.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
    const result = places.slice(0, 20);

    cache = { lat, lng, radius: radiusM, result, at: Date.now() };
    return result;
  } catch (err) {
    console.error("Overpass error:", err);
    return [];
  }
}
