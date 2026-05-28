import { haversine } from "./geo";
import { SafeLocation } from "@/types";

// Race three mirrors — whichever responds first wins
const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
];

const AMENITY_TO_TYPE: Record<string, SafeLocation["type"]> = {
  cafe:           "cafe",
  restaurant:     "cafe",
  fast_food:      "cafe",
  bar:            "cafe",
  food_court:     "cafe",
  canteen:        "cafe",
  ice_cream:      "cafe",
  library:        "library",
  sports_centre:  "sports",
  stadium:        "sports",
  fitness_centre: "sports",
};

function buildQuery(lat: number, lng: number, radiusM: number): string {
  return `[out:json][timeout:30];
(
  node["amenity"~"^(cafe|restaurant|fast_food|bar|food_court|canteen|ice_cream)$"]["name"](around:${radiusM},${lat},${lng});
  way["amenity"~"^(cafe|restaurant|fast_food|bar|food_court|canteen)$"]["name"](around:${radiusM},${lat},${lng});
  node["amenity"="library"]["name"](around:${radiusM},${lat},${lng});
  node["amenity"~"^(sports_centre|stadium|fitness_centre)$"]["name"](around:${radiusM},${lat},${lng});
  way["amenity"~"^(sports_centre|stadium|fitness_centre)$"]["name"](around:${radiusM},${lat},${lng});
  node["leisure"~"^(park|sports_centre|stadium|pitch|golf_course)$"]["name"](around:${radiusM},${lat},${lng});
  way["leisure"~"^(park|sports_centre|stadium|pitch)$"]["name"](around:${radiusM},${lat},${lng});
  node["shop"~"^(mall|department_store|supermarket|convenience)$"]["name"](around:${radiusM},${lat},${lng});
  way["shop"~"^(mall|department_store|supermarket)$"]["name"](around:${radiusM},${lat},${lng});
  node["tourism"~"^(hotel|guest_house|attraction)$"]["name"](around:${radiusM},${lat},${lng});
);
out center 60;`;
}

function elementToType(el: OverpassElement): SafeLocation["type"] {
  const a = el.tags.amenity;
  const l = el.tags.leisure;
  const s = el.tags.shop;
  if (a) return AMENITY_TO_TYPE[a] ?? "cafe";
  if (l === "park") return "park";
  if (l === "sports_centre" || l === "stadium" || l === "pitch" || l === "golf_course") return "sports";
  if (s === "mall" || s === "department_store") return "mall";
  if (s === "supermarket" || s === "convenience") return "cafe";
  if (el.tags.tourism) return "cafe";
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
const CACHE_TTL_MS = 5 * 60 * 1000;

async function queryMirror(url: string, query: string): Promise<Response> {
  const res = await fetch(url, { method: "POST", body: query });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res;
}

function parseElements(json: { elements: OverpassElement[] }, lat: number, lng: number): SafeLocation[] {
  const seen = new Set<string>();
  const places: SafeLocation[] = [];

  for (const el of json.elements) {
    const name = el.tags.name?.trim();
    if (!name) continue;

    const elLat = el.lat ?? el.center?.lat;
    const elLng = el.lon ?? el.center?.lon;
    if (!elLat || !elLng) continue;

    const key = `${name}|${Math.round(elLat * 1000)}|${Math.round(elLng * 1000)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    places.push({
      id: `osm_${el.type}_${el.id}`,
      name,
      type: elementToType(el),
      neighborhood: el.tags["addr:suburb"] ?? el.tags["addr:city"] ?? el.tags["addr:district"] ?? "",
      lat: elLat,
      lng: elLng,
      distanceKm: Math.round(haversine({ lat, lng }, { lat: elLat, lng: elLng }) * 10) / 10,
    });
  }

  places.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
  return places.slice(0, 30);
}

export async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  radiusM = 10000
): Promise<SafeLocation[]> {
  if (
    cache &&
    Date.now() - cache.at < CACHE_TTL_MS &&
    Math.abs(cache.lat - lat) < 0.005 &&
    Math.abs(cache.lng - lng) < 0.005 &&
    cache.radius === radiusM
  ) {
    return cache.result;
  }

  const query = buildQuery(lat, lng, radiusM);

  try {
    // Race all mirrors — first successful response wins
    const res = await Promise.any(MIRRORS.map((url) => queryMirror(url, query)));
    const json = await res.json();
    const result = parseElements(json, lat, lng);
    cache = { lat, lng, radius: radiusM, result, at: Date.now() };
    return result;
  } catch {
    return [];
  }
}
