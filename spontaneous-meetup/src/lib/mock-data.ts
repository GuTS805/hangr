import { User, Group, SafeLocation } from "@/types";

const now = Date.now();
const hour = 60 * 60 * 1000;

// Crossing Republik / Ghaziabad area — real coordinates
export const SAFE_LOCATIONS: SafeLocation[] = [
  { id: "sl1",  name: "KFC, Paramount Golfforeste",   type: "cafe",    neighborhood: "Crossing Republik", lat: 28.6382, lng: 77.4524, distanceKm: 0.3 },
  { id: "sl2",  name: "McDonald's, Crossing Republik",type: "cafe",    neighborhood: "Crossing Republik", lat: 28.6358, lng: 77.4501, distanceKm: 0.5 },
  { id: "sl3",  name: "Orbit Plaza Food Court",       type: "mall",    neighborhood: "Crossing Republik", lat: 28.6347, lng: 77.4493, distanceKm: 0.6 },
  { id: "sl4",  name: "Cafe Coffee Day, CR",          type: "cafe",    neighborhood: "Crossing Republik", lat: 28.6365, lng: 77.4510, distanceKm: 0.4 },
  { id: "sl5",  name: "ABES Engineering College Gate",type: "park",    neighborhood: "Ghaziabad",         lat: 28.6737, lng: 77.5003, distanceKm: 1.8 },
  { id: "sl6",  name: "Crossing Republik Central Park",type: "park",   neighborhood: "Crossing Republik", lat: 28.6370, lng: 77.4480, distanceKm: 0.7 },
  { id: "sl7",  name: "Domino's, Crossing Republik",  type: "cafe",    neighborhood: "Crossing Republik", lat: 28.6355, lng: 77.4515, distanceKm: 0.5 },
  { id: "sl8",  name: "Wave City Centre",             type: "mall",    neighborhood: "NH-9, Ghaziabad",   lat: 28.6421, lng: 77.4612, distanceKm: 1.2 },
  { id: "sl9",  name: "Hindon Riverfront Park",       type: "park",    neighborhood: "Ghaziabad",         lat: 28.6480, lng: 77.4380, distanceKm: 1.5 },
  { id: "sl10", name: "Raj Nagar District Centre",    type: "mall",    neighborhood: "Raj Nagar, GZB",    lat: 28.6489, lng: 77.4267, distanceKm: 2.1 },
];

export const SAFE_LOCATION_ICONS: Record<string, string> = {
  cafe: "☕", mall: "🏬", park: "🌳", library: "📚",
};

export const SAFE_LOCATION_COLORS: Record<string, string> = {
  cafe:    "bg-amber-100 text-amber-700 border-amber-200",
  mall:    "bg-blue-100 text-blue-700 border-blue-200",
  park:    "bg-green-100 text-green-700 border-green-200",
  library: "bg-purple-100 text-purple-700 border-purple-200",
};

// Map marker colors for Leaflet
export const MARKER_COLORS: Record<string, string> = {
  cafe: "#f59e0b", mall: "#3b82f6", park: "#22c55e", library: "#a855f7",
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
