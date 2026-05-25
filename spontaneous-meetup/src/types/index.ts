export type Interest =
  | "Gaming" | "Cricket" | "Coding" | "Cafes"
  | "Anime"  | "Music"   | "Gym"    | "Football"
  | "Movies" | "Food";

export type Gender = "Male" | "Female" | "Other";

export interface Review {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  rating: number;
  comment: string;
  groupId: string;
  timestamp: number;
}

export interface Report {
  id: string;
  reporterId: string;
  targetId: string;
  targetType: "user" | "group";
  reason: ReportReason;
  timestamp: number;
}

export type ReportReason =
  | "Inappropriate behavior" | "Fake profile" | "Harassment"
  | "Spam" | "Safety concern" | "Other";

export interface User {
  id: string;
  name: string;
  age: number;
  interests: Interest[];
  city: string;
  avatar: string;
  isFree: boolean;
  freeUntil?: number;
  neighborhood: string;
  distanceKm?: number;
  gender?: Gender;
  showGender: boolean;
  isVerified: boolean;
  collegeVerified: boolean;
  trustScore: number;
  reviewCount: number;
  joinedAt: number;
  statusText?: string;   // story-style status
  streakDays?: number;   // daily hangout streak
  totalMeetups?: number; // lifetime group count
}

export interface SafeLocation {
  id: string;
  name: string;
  type: "cafe" | "mall" | "park" | "library" | "sports";
  neighborhood: string;
  lat: number;
  lng: number;
  distanceKm?: number; // mock distance from user
}

export interface Group {
  id: string;
  name: string;
  topic: Interest;
  members: User[];
  maxMembers: number;
  location: string;
  neighborhood: string;
  expiresAt: number;
  createdAt: number;
  plannedTime: string;
  messages: Message[];
  safeLocationId: string;
  femaleOnly: boolean;
  isPublic: boolean;
  createdBy: string; // userId of creator

  // Voting
  votes: Record<string, string>; // userId → safeLocationId
  finalLocationId: string | null; // set when creator finalizes
  votingOpen: boolean;
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: number;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: number;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userNeighborhood: string;
  userIsVerified: boolean;
  text: string;
  imageUrl?: string;     // Supabase Storage URL (new posts)
  imageBase64?: string;  // legacy: old posts stored as base64
  likes: string[];
  comments: PostComment[];
  topic?: Interest;
  timestamp: number;
}
