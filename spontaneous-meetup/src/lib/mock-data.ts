import { User, Group, SafeLocation } from "@/types";

const now = Date.now();
const hour = 60 * 60 * 1000;

// Ghaziabad / NCR — verified coordinates
export const SAFE_LOCATIONS: SafeLocation[] = [

  // ── Crossing Republik ─────────────────────────────────────────────────────
  { id: "sl1",  name: "KFC, Paramount Golfforeste Mall", type: "cafe",    neighborhood: "Crossing Republik", lat: 28.6383, lng: 77.4524, distanceKm: 0.3 },
  { id: "sl2",  name: "McDonald's, Crossing Republik",   type: "cafe",    neighborhood: "Crossing Republik", lat: 28.6362, lng: 77.4508, distanceKm: 0.5 },
  { id: "sl3",  name: "Gaur City Mall, CR",              type: "mall",    neighborhood: "Crossing Republik", lat: 28.6340, lng: 77.4480, distanceKm: 0.6 },
  { id: "sl4",  name: "Cafe Coffee Day, CR",             type: "cafe",    neighborhood: "Crossing Republik", lat: 28.6370, lng: 77.4513, distanceKm: 0.4 },
  { id: "sl5",  name: "Domino's Pizza, CR",              type: "cafe",    neighborhood: "Crossing Republik", lat: 28.6355, lng: 77.4518, distanceKm: 0.5 },
  { id: "sl6",  name: "Subway, Crossing Republik",       type: "cafe",    neighborhood: "Crossing Republik", lat: 28.6360, lng: 77.4502, distanceKm: 0.5 },
  { id: "sl7",  name: "CR Central Park",                 type: "park",    neighborhood: "Crossing Republik", lat: 28.6375, lng: 77.4472, distanceKm: 0.7 },
  { id: "sl8",  name: "Paramount Sports Complex",        type: "sports",  neighborhood: "Crossing Republik", lat: 28.6348, lng: 77.4460, distanceKm: 0.8 },
  { id: "sl9",  name: "Pizza Hut, Crossing Republik",   type: "cafe",    neighborhood: "Crossing Republik", lat: 28.6367, lng: 77.4527, distanceKm: 0.4 },
  { id: "sl10", name: "Haldiram's, Crossing Republik",  type: "cafe",    neighborhood: "Crossing Republik", lat: 28.6351, lng: 77.4494, distanceKm: 0.6 },

  // ── Wave City / NH-9 ─────────────────────────────────────────────────────
  { id: "sl11", name: "Wave City Centre Mall",           type: "mall",    neighborhood: "NH-9, Ghaziabad",   lat: 28.6424, lng: 77.4615, distanceKm: 1.2 },
  { id: "sl12", name: "Burger King, NH-9",               type: "cafe",    neighborhood: "NH-9, Ghaziabad",   lat: 28.6418, lng: 77.4598, distanceKm: 1.1 },
  { id: "sl13", name: "Starbucks, Wave City",            type: "cafe",    neighborhood: "NH-9, Ghaziabad",   lat: 28.6430, lng: 77.4628, distanceKm: 1.3 },

  // ── Indirapuram ───────────────────────────────────────────────────────────
  { id: "sl14", name: "Shipra Mall, Indirapuram",        type: "mall",    neighborhood: "Indirapuram",       lat: 28.6413, lng: 77.3689, distanceKm: 4.8 },
  { id: "sl15", name: "Aditya Mall, Indirapuram",        type: "mall",    neighborhood: "Indirapuram",       lat: 28.6390, lng: 77.3645, distanceKm: 5.1 },
  { id: "sl16", name: "Blue Tokai Coffee, Indirapuram",  type: "cafe",    neighborhood: "Indirapuram",       lat: 28.6402, lng: 77.3670, distanceKm: 4.9 },
  { id: "sl17", name: "Indirapuram Habitat Centre",      type: "mall",    neighborhood: "Indirapuram",       lat: 28.6380, lng: 77.3660, distanceKm: 5.2 },
  { id: "sl18", name: "Sector 4 Park, Indirapuram",      type: "park",    neighborhood: "Indirapuram",       lat: 28.6395, lng: 77.3695, distanceKm: 4.7 },
  { id: "sl19", name: "Barista, Indirapuram",            type: "cafe",    neighborhood: "Indirapuram",       lat: 28.6408, lng: 77.3678, distanceKm: 4.8 },
  { id: "sl20", name: "GDA Library, Indirapuram",        type: "library", neighborhood: "Indirapuram",       lat: 28.6371, lng: 77.3640, distanceKm: 5.4 },

  // ── Raj Nagar Extension ───────────────────────────────────────────────────
  { id: "sl21", name: "Raj Nagar District Centre",       type: "mall",    neighborhood: "Raj Nagar Ext",     lat: 28.6489, lng: 77.4267, distanceKm: 2.1 },
  { id: "sl22", name: "D Mall, Raj Nagar",               type: "mall",    neighborhood: "Raj Nagar Ext",     lat: 28.6471, lng: 77.4243, distanceKm: 2.3 },
  { id: "sl23", name: "Costa Coffee, Raj Nagar",         type: "cafe",    neighborhood: "Raj Nagar Ext",     lat: 28.6495, lng: 77.4280, distanceKm: 2.0 },
  { id: "sl24", name: "Raj Nagar Green Park",            type: "park",    neighborhood: "Raj Nagar Ext",     lat: 28.6510, lng: 77.4255, distanceKm: 2.2 },

  // ── Vaishali ─────────────────────────────────────────────────────────────
  { id: "sl25", name: "V3S Mall, Vaishali",              type: "mall",    neighborhood: "Vaishali",          lat: 28.6450, lng: 77.3362, distanceKm: 7.2 },
  { id: "sl26", name: "Vaishali Metro Plaza Cafes",      type: "cafe",    neighborhood: "Vaishali",          lat: 28.6444, lng: 77.3348, distanceKm: 7.3 },
  { id: "sl27", name: "City Forest Park, Vaishali",      type: "park",    neighborhood: "Vaishali",          lat: 28.6438, lng: 77.3380, distanceKm: 7.1 },
  { id: "sl28", name: "McDonald's, Vaishali",            type: "cafe",    neighborhood: "Vaishali",          lat: 28.6455, lng: 77.3355, distanceKm: 7.2 },

  // ── Kaushambi ─────────────────────────────────────────────────────────────
  { id: "sl29", name: "Wave Mall, Kaushambi",            type: "mall",    neighborhood: "Kaushambi",         lat: 28.6480, lng: 77.3185, distanceKm: 8.1 },
  { id: "sl30", name: "Ansal Plaza, Kaushambi",          type: "mall",    neighborhood: "Kaushambi",         lat: 28.6471, lng: 77.3163, distanceKm: 8.3 },
  { id: "sl31", name: "Starbucks, Kaushambi",            type: "cafe",    neighborhood: "Kaushambi",         lat: 28.6488, lng: 77.3197, distanceKm: 8.0 },

  // ── Noida Sector 62 ───────────────────────────────────────────────────────
  { id: "sl32", name: "Pacific Mall, Sector 62 Noida",  type: "mall",    neighborhood: "Sector 62, Noida",  lat: 28.6175, lng: 77.3738, distanceKm: 6.1 },
  { id: "sl33", name: "Barista, Sector 62 Noida",       type: "cafe",    neighborhood: "Sector 62, Noida",  lat: 28.6188, lng: 77.3722, distanceKm: 6.0 },
  { id: "sl34", name: "Sector 62 Park, Noida",          type: "park",    neighborhood: "Sector 62, Noida",  lat: 28.6200, lng: 77.3710, distanceKm: 5.9 },

  // ── Parks & Sports ────────────────────────────────────────────────────────
  { id: "sl35", name: "Hindon Riverfront Park",          type: "park",    neighborhood: "Sahibabad, GZB",    lat: 28.6480, lng: 77.4380, distanceKm: 1.5 },
  { id: "sl36", name: "GDA Sports Complex, Vaibhav Khand",type: "sports", neighborhood: "Indirapuram",       lat: 28.6420, lng: 77.3658, distanceKm: 5.0 },
  { id: "sl37", name: "Vijay Nagar Sports Ground",       type: "sports",  neighborhood: "Vijay Nagar, GZB",  lat: 28.6592, lng: 77.4218, distanceKm: 2.8 },
  { id: "sl38", name: "ABES Engineering College Canteen",type: "cafe",    neighborhood: "NH-9, Ghaziabad",   lat: 28.6737, lng: 77.5003, distanceKm: 4.6 },
];

export const SAFE_LOCATION_ICONS: Record<string, string> = {
  cafe: "☕", mall: "🏬", park: "🌳", library: "📚", sports: "⚽",
};

export const SAFE_LOCATION_COLORS: Record<string, string> = {
  cafe:    "bg-amber-100 text-amber-700 border-amber-200",
  mall:    "bg-blue-100 text-blue-700 border-blue-200",
  park:    "bg-green-100 text-green-700 border-green-200",
  library: "bg-purple-100 text-purple-700 border-purple-200",
  sports:  "bg-red-100 text-red-700 border-red-200",
};

// Map marker colors for Leaflet
export const MARKER_COLORS: Record<string, string> = {
  cafe: "#f59e0b", mall: "#3b82f6", park: "#22c55e", library: "#a855f7", sports: "#ef4444",
};

export const MOCK_USERS: User[] = [
  { id: "u1", name: "Rahul K",  age: 22, interests: ["Gaming","Coding","Anime"],    city: "Ghaziabad", avatar: "RK", isFree: true,  freeUntil: now+2*hour,   neighborhood: "Crossing Republik", distanceKm: 0.32, gender: "Male",   showGender: true,  isVerified: true,  collegeVerified: true,  trustScore: 4.8, reviewCount: 12, joinedAt: now-90*24*hour },
  { id: "u2", name: "Priya S",  age: 21, interests: ["Cafes","Music","Movies"],     city: "Ghaziabad", avatar: "PS", isFree: true,  freeUntil: now+1.5*hour, neighborhood: "Crossing Republik", distanceKm: 0.18, gender: "Female", showGender: true,  isVerified: true,  collegeVerified: false, trustScore: 4.6, reviewCount: 8,  joinedAt: now-45*24*hour },
  { id: "u3", name: "Arjun M",  age: 23, interests: ["Cricket","Football","Gym"],   city: "Ghaziabad", avatar: "AM", isFree: true,  freeUntil: now+3*hour,   neighborhood: "Raj Nagar",         distanceKm: 0.75, gender: "Male",   showGender: true,  isVerified: true,  collegeVerified: false, trustScore: 4.2, reviewCount: 5,  joinedAt: now-30*24*hour },
  { id: "u4", name: "Neha T",   age: 20, interests: ["Food","Cafes","Music"],       city: "Ghaziabad", avatar: "NT", isFree: false,                            neighborhood: "Wave City",         distanceKm: 1.1,  gender: "Female", showGender: false, isVerified: true,  collegeVerified: true,  trustScore: 4.9, reviewCount: 21, joinedAt: now-120*24*hour },
  { id: "u5", name: "Dev P",    age: 24, interests: ["Coding","Gaming"],            city: "Ghaziabad", avatar: "DP", isFree: true,  freeUntil: now+hour,     neighborhood: "Crossing Republik", distanceKm: 0.45, gender: "Male",   showGender: true,  isVerified: false, collegeVerified: false, trustScore: 3.7, reviewCount: 3,  joinedAt: now-10*24*hour },
];

export const MOCK_GROUPS: Group[] = [
  {
    id: "g1", name: "Valorant Squad", topic: "Gaming",
    members: [MOCK_USERS[0], MOCK_USERS[4]], maxMembers: 5,
    location: "Orbit Plaza Food Court", neighborhood: "Crossing Republik",
    expiresAt: now+3*hour, createdAt: now-20*60*1000, plannedTime: "Tonight 8 PM",
    safeLocationId: "sl3", femaleOnly: false, isPublic: true, createdBy: "u1",
    votes: { u1: "sl3", u5: "sl1" }, finalLocationId: null, votingOpen: true,
    messages: [
      { id: "m1", userId: "u1", userName: "Rahul K",  userAvatar: "RK", text: "Anyone up for Valorant? Got a 4-stack slot", timestamp: now-15*60*1000 },
      { id: "m2", userId: "u5", userName: "Dev P",    userAvatar: "DP", text: "I'm in! Orbit Plaza has good seating",        timestamp: now-10*60*1000 },
      { id: "m3", userId: "u1", userName: "Rahul K",  userAvatar: "RK", text: "Vote for where we meet 👆",                   timestamp: now-5*60*1000 },
    ],
  },
  {
    id: "g2", name: "Late Night KFC Run", topic: "Food",
    members: [MOCK_USERS[1], MOCK_USERS[3]], maxMembers: 6,
    location: "KFC, Paramount Golfforeste", neighborhood: "Crossing Republik",
    expiresAt: now+2*hour, createdAt: now-30*60*1000, plannedTime: "In 1 hour",
    safeLocationId: "sl1", femaleOnly: true, isPublic: true, createdBy: "u2",
    votes: { u2: "sl1", u4: "sl7" }, finalLocationId: null, votingOpen: true,
    messages: [],
  },
  {
    id: "g3", name: "Evening Football", topic: "Football",
    members: [MOCK_USERS[2]], maxMembers: 10,
    location: "Crossing Republik Central Park", neighborhood: "Crossing Republik",
    expiresAt: now+4*hour, createdAt: now-10*60*1000, plannedTime: "6 PM today",
    safeLocationId: "sl6", femaleOnly: false, isPublic: true, createdBy: "u3",
    votes: { u3: "sl6" }, finalLocationId: "sl6", votingOpen: false,
    messages: [],
  },
  {
    id: "g4", name: "Anime Watch Party", topic: "Anime",
    members: [MOCK_USERS[0], MOCK_USERS[1]], maxMembers: 4,
    location: "Orbit Plaza Food Court", neighborhood: "Crossing Republik",
    expiresAt: now+5*hour, createdAt: now-45*60*1000, plannedTime: "9 PM tonight",
    safeLocationId: "sl3", femaleOnly: false, isPublic: true, createdBy: "u1",
    votes: {}, finalLocationId: null, votingOpen: true,
    messages: [],
  },
];

export const INTERESTS = ["Gaming","Cricket","Coding","Cafes","Anime","Music","Gym","Football","Movies","Food"] as const;

export const INTEREST_COLORS: Record<string,string> = {
  Gaming:"bg-purple-100 text-purple-700", Cricket:"bg-green-100 text-green-700",
  Coding:"bg-blue-100 text-blue-700",    Cafes:"bg-amber-100 text-amber-700",
  Anime:"bg-pink-100 text-pink-700",     Music:"bg-indigo-100 text-indigo-700",
  Gym:"bg-red-100 text-red-700",         Football:"bg-emerald-100 text-emerald-700",
  Movies:"bg-orange-100 text-orange-700",Food:"bg-yellow-100 text-yellow-700",
};

export const INTEREST_EMOJI: Record<string,string> = {
  Gaming:"🎮", Cricket:"🏏", Coding:"💻", Cafes:"☕", Anime:"⛩️",
  Music:"🎵",  Gym:"💪",     Football:"⚽", Movies:"🎬", Food:"🍕",
};

export const REPORT_REASONS = [
  "Inappropriate behavior","Fake profile","Harassment","Spam","Safety concern","Other",
] as const;
