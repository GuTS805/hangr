import { haversine } from "./geo";
import { SafeLocation } from "@/types";

const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

const AMENITY_TO_TYPE: Record<string, SafeLocation["type"]> = {
  cafe:           "cafe",
  restaurant:     "cafe",
  fast_food:      "cafe",
  bar:            "cafe",
  food_court:     "cafe",
  canteen:        "cafe",
  ice_cream:      "cafe",
  bakery:         "cafe",
  library:        "library",
  sports_centre:  "sports",
  stadium:        "sports",
  fitness_centre: "sports",
  cinema:         "cafe",
  theatre:        "cafe",
};

function buildQuery(lat: number, lng: number, radiusM: number): string {
  // ql — amenity names required, leisure/shop names optional (many parks lack names)
  return `[out:json][timeout:25];
(
  node["amenity"~"^(cafe|restaurant|fast_food|bar|food_court|canteen|ice_cream|bakery|cinema|theatre)$"]["name"](around:${radiusM},${lat},${lng});
  way["amenity"~"^(cafe|restaurant|fast_food|bar|food_court|canteen|bakery)$"]["name"](around:${radiusM},${lat},${lng});
  node["amenity"="library"]["name"](around:${radiusM},${lat},${lng});
  node["amenity"~"^(sports_centre|stadium|fitness_centre)$"]["name"](around:${radiusM},${lat},${lng});
  way["amenity"~"^(sports_centre|stadium|fitness_centre)$"]["name"](around:${radiusM},${lat},${lng});
  node["leisure"~"^(park|sports_centre|stadium|pitch)$"]["name"](around:${radiusM},${lat},${lng});
  way["leisure"~"^(park|sports_centre|stadium|pitch)$"]["name"](around:${radiusM},${lat},${lng});
  node["shop"~"^(mall|department_store|supermarket)$"]["name"](around:${radiusM},${lat},${lng});
  way["shop"~"^(mall|department_store|supermarket)$"]["name"](around:${radiusM},${lat},${lng});
);
out center 60;`;
}

function buildQueryNoNameFilter(lat: number, lng: number, radiusM: number): string {
  // Looser query — no ["name"] requirement, catches more Indian venues
  return `[out:json][timeout:25];
(
  node["amenity"~"^(cafe|restaurant|fast_food|bar|food_court)$"](around:${radiusM},${lat},${lng});
  way["amenity"~"^(cafe|restaurant|fast_food)$"](around:${radiusM},${lat},${lng});
  node["leisure"="park"](around:${radiusM},${lat},${lng});
  way["leisure"="park"](around:${radiusM},${lat},${lng});
  node["shop"~"^(mall|department_store|supermarket)$"](around:${radiusM},${lat},${lng});
  way["shop"~"^(mall|department_store|supermarket)$"](around:${radiusM},${lat},${lng});
);
out center 80;`;
}

function elementToType(el: OverpassElement): SafeLocation["type"] {
  const a = el.tags.amenity;
  const l = el.tags.leisure;
  const s = el.tags.shop;
  if (a) return AMENITY_TO_TYPE[a] ?? "cafe";
  if (l === "park") return "park";
  if (l === "sports_centre" || l === "stadium" || l === "pitch") return "sports";
  if (s === "mall" || s === "department_store") return "mall";
  if (s === "supermarket") return "cafe";
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

// POST with proper form encoding — Overpass requires this
async function queryMirror(url: string, query: string): Promise<Response> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res;
}

function parseElements(json: { elements: OverpassElement[] }, lat: number, lng: number): SafeLocation[] {
  const seen = new Set<string>();
  const places: SafeLocation[] = [];

  for (const el of json.elements) {
    const name = (el.tags.name ?? el.tags["name:en"] ?? el.tags["name:hi"] ?? "").trim();
    if (!name) continue;

    const elLat = el.lat ?? el.center?.lat;
    const elLng = el.lon ?? el.center?.lon;
    if (!elLat || !elLng) continue;

    // Deduplicate by name + rough position bucket
    const key = `${name.toLowerCase()}|${Math.round(elLat * 100)}|${Math.round(elLng * 100)}`;
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
  return places.slice(0, 40);
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

  // Try 1: named places at requested radius
  const query1 = buildQuery(lat, lng, radiusM);
  try {
    const res = await Promise.any(MIRRORS.map((url) => queryMirror(url, query1)));
    const json = await res.json() as { elements: OverpassElement[] };
    const result = parseElements(json, lat, lng);
    if (result.length > 0) {
      cache = { lat, lng, radius: radiusM, result, at: Date.now() };
      return result;
    }
  } catch { /* all mirrors failed — fall through */ }

  // Try 2: looser query (no name filter) at same radius — catches unnamed Indian venues
  const query2 = buildQueryNoNameFilter(lat, lng, radiusM);
  try {
    const res = await Promise.any(MIRRORS.map((url) => queryMirror(url, query2)));
    const json = await res.json() as { elements: OverpassElement[] };
    const result = parseElements(json, lat, lng);
    if (result.length > 0) {
      cache = { lat, lng, radius: radiusM, result, at: Date.now() };
      return result;
    }
  } catch { /* fall through */ }

  // Try 3: double the radius with named filter
  if (radiusM < 25000) {
    const query3 = buildQuery(lat, lng, 25000);
    try {
      const res = await Promise.any(MIRRORS.map((url) => queryMirror(url, query3)));
      const json = await res.json() as { elements: OverpassElement[] };
      const result = parseElements(json, lat, lng);
      if (result.length > 0) {
        cache = { lat, lng, radius: 25000, result, at: Date.now() };
        return result;
      }
    } catch { /* give up */ }
  }

  return [];
}
