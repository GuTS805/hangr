"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { INTEREST_EMOJI } from "@/lib/mock-data";
import { Interest, Post, PostComment } from "@/types";

// ── Mock users for demo (match IDs used in mock posts) ───────────────────────
interface PublicUser {
  id: string;
  name: string;
  avatar: string;
  neighborhood: string;
  city: string;
  age: number;
  interests: Interest[];
  isVerified: boolean;
  trustScore: number;
  totalMeetups: number;
  streakDays: number;
  statusText?: string;
  isFree: boolean;
  gender?: string;
  showGender: boolean;
  joinedAt: number;
}

const MOCK_USERS: PublicUser[] = [
  { id: "u_aryan",  name: "Aryan Sharma",  avatar: "AR", neighborhood: "Crossing Republik", city: "Noida", age: 22, interests: ["Cafes","Cricket","Gaming"],      isVerified: true,  trustScore: 4.8, totalMeetups: 12, streakDays: 5, statusText: "Always down for chai ☕", isFree: true,  showGender: true, gender: "Male",   joinedAt: Date.now() - 90 * 86400000 },
  { id: "u_priya",  name: "Priya Verma",   avatar: "PR", neighborhood: "Indirapuram",        city: "Noida", age: 21, interests: ["Gym","Music","Cafes"],           isVerified: false, trustScore: 4.5, totalMeetups: 7,  streakDays: 2, statusText: "Badminton anyone? 🏸",   isFree: true,  showGender: true, gender: "Female", joinedAt: Date.now() - 60 * 86400000 },
  { id: "u_sahil",  name: "Sahil Khan",    avatar: "SK", neighborhood: "Vaishali",           city: "Noida", age: 23, interests: ["Gaming","Football","Cricket"],   isVerified: true,  trustScore: 4.9, totalMeetups: 20, streakDays: 8, statusText: "FIFA champion 🎮🏆",       isFree: false, showGender: true, gender: "Male",   joinedAt: Date.now() - 120 * 86400000 },
  { id: "u_neha",   name: "Neha Gupta",    avatar: "NG", neighborhood: "Raj Nagar Ext.",     city: "Noida", age: 20, interests: ["Cricket","Movies","Food"],       isVerified: false, trustScore: 4.4, totalMeetups: 5,  streakDays: 0, statusText: undefined,                  isFree: false, showGender: true, gender: "Female", joinedAt: Date.now() - 30 * 86400000 },
  { id: "u_vishal", name: "Vishal Tyagi",  avatar: "VT", neighborhood: "Kaushambi",          city: "Noida", age: 24, interests: ["Coding","Cafes","Gaming"],       isVerified: false, trustScore: 4.2, totalMeetups: 3,  streakDays: 1, statusText: "Side project mode 💻",    isFree: true,  showGender: false, joinedAt: Date.now() - 45 * 86400000 },
  { id: "u1",       name: "Priya Verma",   avatar: "PR", neighborhood: "Indirapuram",        city: "Noida", age: 21, interests: ["Cafes","Music","Anime"],         isVerified: false, trustScore: 4.8, totalMeetups: 7,  streakDays: 2, isFree: true,  showGender: true, gender: "Female", joinedAt: Date.now() - 60 * 86400000 },
  { id: "u2",       name: "Arjun Sharma",  avatar: "AS", neighborhood: "Crossing Republik",  city: "Noida", age: 22, interests: ["Gaming","Coding"],              isVerified: true,  trustScore: 4.7, totalMeetups: 10, streakDays: 3, isFree: true,  showGender: true, gender: "Male",   joinedAt: Date.now() - 50 * 86400000 },
  { id: "u3",       name: "Sahil Khan",    avatar: "SK", neighborhood: "Vaishali",           city: "Noida", age: 23, interests: ["Gaming","Football","Cricket"],   isVerified: true,  trustScore: 4.9, totalMeetups: 20, streakDays: 8, isFree: false, showGender: true, gender: "Male",   joinedAt: Date.now() - 120 * 86400000 },
  { id: "u5",       name: "Rohit Mishra",  avatar: "RO", neighborhood: "Kaushambi",          city: "Noida", age: 25, interests: ["Cafes","Cricket"],              isVerified: false, trustScore: 4.3, totalMeetups: 4,  streakDays: 0, isFree: false, showGender: true, gender: "Male",   joinedAt: Date.now() - 70 * 86400000 },
  { id: "u6",       name: "Sneha Rawat",   avatar: "SR", neighborhood: "Sector 50",          city: "Noida", age: 21, interests: ["Movies","Music","Anime"],        isVerified: true,  trustScore: 5.0, totalMeetups: 15, streakDays: 6, isFree: false, showGender: true, gender: "Female", joinedAt: Date.now() - 80 * 86400000 },
  { id: "u7",       name: "Vishal Tyagi",  avatar: "VT", neighborhood: "Kaushambi",          city: "Noida", age: 24, interests: ["Coding","Gaming"],              isVerified: false, trustScore: 4.2, totalMeetups: 3,  streakDays: 1, isFree: false, showGender: false, joinedAt: Date.now() - 45 * 86400000 },
  { id: "u8",       name: "Kabir Tiwari",  avatar: "KT", neighborhood: "Indirapuram",        city: "Noida", age: 26, interests: ["Football","Cricket","Gym"],      isVerified: false, trustScore: 4.6, totalMeetups: 8,  streakDays: 4, isFree: true,  showGender: true, gender: "Male",   joinedAt: Date.now() - 55 * 86400000 },
  { id: "u9",       name: "Riya Mehta",    avatar: "RM", neighborhood: "Sector 62",          city: "Noida", age: 20, interests: ["Anime","Gaming","Music"],        isVerified: true,  trustScore: 4.9, totalMeetups: 11, streakDays: 7, isFree: false, showGender: true, gender: "Female", joinedAt: Date.now() - 35 * 86400000 },
  { id: "u10",      name: "Dev Agarwal",   avatar: "DA", neighborhood: "Vaishali",           city: "Noida", age: 23, interests: ["Coding","Cafes"],               isVerified: false, trustScore: 4.4, totalMeetups: 2,  streakDays: 0, isFree: false, showGender: true, gender: "Male",   joinedAt: Date.now() - 20 * 86400000 },
  { id: "u11",      name: "Tanya Singh",   avatar: "TS", neighborhood: "Crossing Republik",  city: "Noida", age: 22, interests: ["Movies","Food","Music"],         isVerified: true,  trustScore: 4.7, totalMeetups: 9,  streakDays: 3, isFree: false, showGender: true, gender: "Female", joinedAt: Date.now() - 65 * 86400000 },
];

const MOCK_POSTS_BY_USER: Record<string, Post[]> = {
  u_aryan:  [{ id: "mock_1", userId: "u_aryan", userName: "Aryan Sharma", userAvatar: "AR", userNeighborhood: "Crossing Republik", userIsVerified: true, text: "Koi hai jo aaj shaam chai peene chale? Haldiram ke paas? 🍵", likes: ["u_priya","u_rohit","u_sahil"], comments: [{ id: "c1", postId: "mock_1", userId: "u_priya", userName: "Priya", userAvatar: "PR", text: "Haan yaar! 7 baje theek rahega?", timestamp: Date.now() - 18 * 60000 }], topic: "Cafes", timestamp: Date.now() - 35 * 60000 }],
  u_priya:  [{ id: "mock_2", userId: "u_priya", userName: "Priya Verma", userAvatar: "PR", userNeighborhood: "Indirapuram", userIsVerified: false, text: "ABES ke paas badminton court free hai abhi, koi aana chahta hai? 🏸 2-3 log aur chahiye", likes: ["u_aryan","u_sahil"], comments: [], topic: "Gym", timestamp: Date.now() - 52 * 60000 }],
  u_sahil:  [{ id: "mock_3", userId: "u_sahil", userName: "Sahil Khan", userAvatar: "SK", userNeighborhood: "Vaishali", userIsVerified: true, text: "Aaj raat FIFA tournament organize kar raha hoon — PS5 pe. Winner ko free chai! 🎮🏆\n\nMax 4 log. DM karo ya ping karo.", likes: ["u_aryan","u_priya","u_rohit","u_neha","u_vishal"], comments: [{ id: "c3", postId: "mock_3", userId: "u_neha", userName: "Neha", userAvatar: "NE", text: "Mujhe bhi add karo!!", timestamp: Date.now() - 3600000 }], topic: "Gaming", timestamp: Date.now() - 2 * 3600000 }],
  u_neha:   [{ id: "mock_4", userId: "u_neha", userName: "Neha Gupta", userAvatar: "NG", userNeighborhood: "Raj Nagar Extension", userIsVerified: false, text: "Kal ka cricket match total paisa vasool tha 🏏🔥 Thanks to everyone who came out! Next Sunday phir?", likes: ["u_aryan","u_sahil","u_rohit"], comments: [], topic: "Cricket", timestamp: Date.now() - 6 * 3600000 }],
  u_vishal: [{ id: "mock_5", userId: "u_vishal", userName: "Vishal Tyagi", userAvatar: "VT", userNeighborhood: "Kaushambi", userIsVerified: false, text: "Coding session at Crossings Starbucks, agar koi side project pe kaam kar raha hai toh aa jao! Laptop leke aana 💻", likes: ["u_priya"], comments: [], topic: "Coding", timestamp: Date.now() - 25 * 60000 }],
};

const COVER_GRADIENTS = [
  "from-blue-500 via-indigo-500 to-violet-600",
  "from-rose-500 via-pink-500 to-fuchsia-600",
  "from-emerald-500 via-teal-500 to-cyan-600",
  "from-amber-500 via-orange-500 to-red-600",
  "from-violet-500 via-purple-500 to-indigo-600",
  "from-sky-500 via-blue-500 to-indigo-600",
];

function getCover(name: string) {
  return COVER_GRADIENTS[name.charCodeAt(0) % COVER_GRADIENTS.length];
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function UserAvatar({ avatar, name, size = 80 }: { avatar: string; name: string; size?: number }) {
  const isUrl = avatar?.startsWith("http") || avatar?.startsWith("data:");
  return isUrl ? (
    <img src={avatar} alt={name} referrerPolicy="no-referrer"
      className="rounded-full object-cover border-4 border-white shadow-lg"
      style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full flex items-center justify-center text-white font-extrabold border-4 border-white shadow-lg"
      style={{ width: size, height: size, fontSize: size * 0.34, background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
      {avatar?.length <= 2 ? avatar : name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function MiniPostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes.length);
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4">
      <div className="flex items-start gap-1 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-400">{timeAgo(post.timestamp)}</span>
            {post.topic && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
                {INTEREST_EMOJI[post.topic as Interest]} {post.topic}
              </span>
            )}
          </div>
          {post.text && <p className="text-[15px] text-gray-900 leading-relaxed whitespace-pre-wrap">{post.text}</p>}
        </div>
      </div>
      <div className="flex items-center gap-4 pt-3 border-t border-gray-50">
        <button onClick={() => { setLiked(v => !v); setLikes(l => liked ? l - 1 : l + 1); }}
          className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${liked ? "text-red-500" : "text-gray-400 hover:text-red-400"}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? "#ef4444" : "none"} stroke={liked ? "#ef4444" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          {likes > 0 ? likes : "Like"}
        </button>
        {post.comments.length > 0 && (
          <span className="text-sm text-gray-400">{post.comments.length} comment{post.comments.length > 1 ? "s" : ""}</span>
        )}
      </div>
    </div>
  );
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const { currentUser, nearbyUsers, posts, pingUser } = useStore();

  const [following, setFollowing] = useState(false);
  const [pinged, setPinged] = useState(false);
  const [highlights, setHighlights] = useState<Post[]>([]);

  // Load highlights this user pinned (stored in localStorage by that user's browser)
  // Falls back to showing nothing — only what the user chose to share
  useEffect(() => {
    const saved = localStorage.getItem(`hangr_highlights_${userId}`);
    if (!saved) return;
    const ids: string[] = JSON.parse(saved);
    // Find matching posts from store + mock
    const allPosts = [
      ...posts,
      ...Object.values(MOCK_POSTS_BY_USER).flat(),
    ].filter(p => p.userId === userId);
    setHighlights(allPosts.filter(p => ids.includes(p.id)));
  }, [userId, posts]);

  // Find user: try nearbyUsers first (real DB), then mock fallback
  const user: PublicUser | null = useMemo(() => {
    const live = nearbyUsers.find(u => u.id === userId);
    if (live) return {
      id: live.id, name: live.name, avatar: live.avatar,
      neighborhood: live.neighborhood, city: live.city ?? "Noida",
      age: live.age, interests: live.interests,
      isVerified: live.isVerified, trustScore: live.trustScore,
      totalMeetups: live.totalMeetups ?? 0, streakDays: live.streakDays ?? 0,
      statusText: live.statusText, isFree: live.isFree,
      gender: live.gender, showGender: live.showGender,
      joinedAt: live.joinedAt,
    } as PublicUser;
    return MOCK_USERS.find(u => u.id === userId) ?? null;
  }, [userId, nearbyUsers]);


  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-400">
        <p className="text-5xl">👤</p>
        <p className="text-lg font-semibold text-gray-600">User not found</p>
        <button onClick={() => router.back()} className="text-sm font-bold text-blue-600 hover:underline">← Go back</button>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === userId;
  const isLoggedIn = !!currentUser;

  function handlePing() {
    if (!isLoggedIn) { router.push("/auth"); return; }
    setPinged(true);
    pingUser(userId);
  }

  function handleFollow() {
    if (!isLoggedIn) { router.push("/auth"); return; }
    setFollowing(v => !v);
  }

  function handleMessage() {
    if (!isLoggedIn) { router.push("/auth"); return; }
    router.push("/chats");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover */}
      <div className={`h-44 sm:h-56 bg-gradient-to-r ${getCover(user.name)} relative`}>
        <button onClick={() => router.back()}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* Avatar row */}
        <div className="flex items-end justify-between -mt-12 mb-4">
          <div className="relative">
            <UserAvatar avatar={user.avatar} name={user.name} size={88} />
            {user.isFree && (
              <span className="absolute bottom-1 right-1 w-5 h-5 bg-green-400 rounded-full border-3 border-white shadow" />
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pb-1">
            {isOwnProfile ? (
              <button onClick={() => router.push("/profile")}
                className="px-5 py-2 rounded-full text-sm font-bold border-2 border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors">
                Edit profile
              </button>
            ) : (
              <>
                <button onClick={handleMessage}
                  className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Message">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </button>
                <button onClick={handlePing} disabled={pinged}
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all"
                  style={pinged
                    ? { borderColor: "rgba(34,197,94,0.4)", color: "#16a34a", background: "rgba(34,197,94,0.08)" }
                    : { borderColor: "#d1d5db", color: "#6b7280" }}
                  title={pinged ? "Pinged!" : "Ping"}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={pinged ? "#16a34a" : "none"} stroke={pinged ? "#16a34a" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.58 3.47 2 2 0 0 1 3.55 1.3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.84a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z"/></svg>
                </button>
                <button onClick={handleFollow}
                  className="px-5 py-2 rounded-full text-sm font-bold transition-all active:scale-95"
                  style={following
                    ? { border: "2px solid #d1d5db", color: "#374151", background: "#fff" }
                    : { background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "#fff" }}>
                  {following ? "Following" : "Follow"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Name + meta */}
        <div className="mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-extrabold text-gray-900">{user.name}</h1>
            {user.isVerified && (
              <svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#3b82f6"/><polyline points="8 12 11 15 16 9" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            )}
            {user.isFree && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">🟢 Free now</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-sm text-gray-500">
            <span>📍 {user.neighborhood}, {user.city}</span>
            {user.showGender && user.gender && <><span>·</span><span>{user.gender}</span></>}
            <span>·</span><span>{user.age} yrs</span>
          </div>
          {user.statusText && (
            <p className="mt-2 text-sm text-gray-600 italic">"{user.statusText}"</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Meetups", value: user.totalMeetups },
            { label: "Trust score", value: user.trustScore > 0 ? `⭐ ${user.trustScore.toFixed(1)}` : "New" },
            { label: "Streak", value: user.streakDays > 0 ? `🔥 ${user.streakDays}d` : "—" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-xl font-extrabold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Interests */}
        {user.interests.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5">
            <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-3">Interests</p>
            <div className="flex flex-wrap gap-2">
              {user.interests.map(i => (
                <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold" style={{ background: "rgba(124,58,237,0.08)", color: "#7c3aed" }}>
                  {INTEREST_EMOJI[i as Interest]} {i}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Highlights */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-sm font-extrabold text-gray-700">✨ Highlights</p>
            {highlights.length > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{highlights.length}</span>
            )}
          </div>

          {highlights.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <p className="text-4xl mb-3">📌</p>
              <p className="text-gray-500 font-semibold">No highlights yet</p>
              <p className="text-xs text-gray-400 mt-1">{user.name.split(" ")[0]} hasn't pinned anything to their profile</p>
            </div>
          ) : (
            <div className="space-y-3">
              {highlights.map(post => <MiniPostCard key={post.id} post={post} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
