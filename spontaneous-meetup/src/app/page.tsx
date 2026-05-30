"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Interest, Post, PostComment, SafeLocation } from "@/types";
import {
  SAFE_LOCATIONS, SAFE_LOCATION_ICONS, SAFE_LOCATION_COLORS,
  INTEREST_EMOJI,
} from "@/lib/mock-data";
import InterestBadge from "@/components/InterestBadge";
import CreateGroupModal from "@/components/CreateGroupModal";
import QuickRoomModal from "@/components/QuickRoomModal";
import GroupCard from "@/components/GroupCard";

// ─────────────────────────────────────────────────────────────────────────────
// Feed helpers
// ─────────────────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function compressImage(file: File, maxW = 1080, maxH = 1350, q = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxW) { height = Math.round(height * maxW / width); width = maxW; }
      if (height > maxH) { width = Math.round(width * maxH / height); height = maxH; }
      const c = document.createElement("canvas");
      c.width = width; c.height = height;
      c.getContext("2d")!.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", q));
    };
    img.onerror = reject;
    img.src = url;
  });
}

const MOCK_POSTS: Post[] = [
  { id: "mock_1", userId: "u_aryan", userName: "Aryan Sharma", userAvatar: "AR", userNeighborhood: "Crossing Republik", userIsVerified: true, text: "Koi hai jo aaj shaam chai peene chale? Haldiram ke paas? 🍵", likes: ["u_priya", "u_rohit", "u_sahil"], comments: [{ id: "c1", postId: "mock_1", userId: "u_priya", userName: "Priya", userAvatar: "PR", text: "Haan yaar! 7 baje theek rahega?", timestamp: Date.now() - 18 * 60000 }, { id: "c2", postId: "mock_1", userId: "u_rohit", userName: "Rohit", userAvatar: "RO", text: "Count me in bhai 🙌", timestamp: Date.now() - 10 * 60000 }], topic: "Cafes", timestamp: Date.now() - 35 * 60000 },
  { id: "mock_2", userId: "u_priya", userName: "Priya Verma", userAvatar: "PR", userNeighborhood: "Indirapuram", userIsVerified: false, text: "ABES ke paas badminton court free hai abhi, koi aana chahta hai? 🏸 2-3 log aur chahiye", likes: ["u_aryan", "u_sahil"], comments: [], topic: "Gym", timestamp: Date.now() - 52 * 60000 },
  { id: "mock_3", userId: "u_sahil", userName: "Sahil Khan", userAvatar: "SK", userNeighborhood: "Vaishali", userIsVerified: true, text: "Aaj raat FIFA tournament organize kar raha hoon — PS5 pe. Winner ko free chai! 🎮🏆\n\nMax 4 log. DM karo ya ping karo.", likes: ["u_aryan", "u_priya", "u_rohit", "u_neha", "u_vishal"], comments: [{ id: "c3", postId: "mock_3", userId: "u_neha", userName: "Neha", userAvatar: "NE", text: "Mujhe bhi add karo!!", timestamp: Date.now() - 1 * 3600000 }], topic: "Gaming", timestamp: Date.now() - 2 * 3600000 },
  { id: "mock_4", userId: "u_neha", userName: "Neha Gupta", userAvatar: "NG", userNeighborhood: "Raj Nagar Extension", userIsVerified: false, text: "Kal ka cricket match total paisa vasool tha 🏏🔥 Thanks to everyone who came out! Next Sunday phir?", likes: ["u_aryan", "u_sahil", "u_rohit"], comments: [{ id: "c4", postId: "mock_4", userId: "u_aryan", userName: "Aryan", userAvatar: "AR", text: "Bhai next Sunday pakka!", timestamp: Date.now() - 5 * 3600000 }], topic: "Cricket", timestamp: Date.now() - 6 * 3600000 },
  { id: "mock_5", userId: "u_vishal", userName: "Vishal Tyagi", userAvatar: "VT", userNeighborhood: "Kaushambi", userIsVerified: false, text: "Coding session at Crossings Starbucks, agar koi side project pe kaam kar raha hai toh aa jao! Laptop leke aana 💻 Abhi wahan hoon, 2 ghante aur baithne wala hoon", likes: ["u_priya"], comments: [], topic: "Coding", timestamp: Date.now() - 25 * 60000 },
];

// ── Feed icons ────────────────────────────────────────────────────────────────
function HeartIcon({ filled }: { filled: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "#ef4444" : "none"} stroke={filled ? "#ef4444" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
}
function CommentIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}
function PingIcon({ filled }: { filled: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "#22c55e" : "none"} stroke={filled ? "#22c55e" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.58 3.47 2 2 0 0 1 3.55 1.3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.84a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z"/></svg>;
}
function SendIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
}
function ImageIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
}
function TagIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
const AVATAR_GRADIENTS = ["from-blue-500 to-violet-600","from-rose-500 to-orange-400","from-green-500 to-teal-400","from-amber-500 to-yellow-400","from-pink-500 to-purple-600","from-cyan-500 to-blue-400"];
function Avatar({ src, name, size = 36 }: { src: string; name: string; size?: number }) {
  const isUrl = src.startsWith("http") || src.startsWith("data:");
  const grad = AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
  return isUrl ? (
    <img src={src} alt={name} referrerPolicy="no-referrer" className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
  ) : (
    <div className={`rounded-full bg-gradient-to-br ${grad} text-white font-bold flex items-center justify-center flex-shrink-0`} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}>{src}</div>
  );
}

// ── PostComposer ──────────────────────────────────────────────────────────────
function PostComposer() {
  const { currentUser, createPost } = useStore();
  const router = useRouter();
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [topic, setTopic] = useState<Interest | null>(null);
  const [posting, setPosting] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const [loadingImg, setLoadingImg] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!currentUser) {
    return (
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <button onClick={() => router.push("/auth")} className="flex-1 text-left text-sm text-gray-400 bg-gray-100 rounded-full px-4 py-2.5 hover:bg-gray-200 transition-colors">
          Sign in to post something…
        </button>
      </div>
    );
  }

  const canPost = (text.trim().length > 0 || !!image) && !posting;
  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setLoadingImg(true);
    setImage(await compressImage(f));
    setLoadingImg(false); e.target.value = "";
  };
  const handlePost = async () => {
    if (!canPost) return; setPosting(true);
    try { await createPost(text.trim(), image ?? undefined, topic ?? undefined); setText(""); setImage(null); setTopic(null); setShowTopics(false); }
    finally { setPosting(false); }
  };
  const topics: Interest[] = ["Cafes","Gaming","Cricket","Coding","Anime","Music","Gym","Football","Movies","Food"];

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="px-4 pt-4 pb-3">
        <div className="flex gap-3">
          <Avatar src={currentUser.avatar} name={currentUser.name} size={40} />
          <div className="flex-1 min-w-0">
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={`Kya chal raha hai, ${currentUser.name.split(" ")[0]}?`} className="w-full resize-none text-[15px] text-gray-900 placeholder-gray-400 outline-none leading-relaxed bg-transparent" style={{ minHeight: 60 }} maxLength={500} />
            {image && (
              <div className="relative mt-2 rounded-2xl overflow-hidden bg-gray-100">
                {loadingImg ? <div className="h-32 flex items-center justify-center"><div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" /></div>
                : <><img src={image} alt="preview" className="w-full max-h-60 object-cover" /><button onClick={() => setImage(null)} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center">✕</button></>}
              </div>
            )}
            {showTopics && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {topics.map((t) => <button key={t} onClick={() => { setTopic(topic === t ? null : t); setShowTopics(false); }} className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${topic === t ? "bg-blue-600 text-white border-blue-600" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300"}`}>{INTEREST_EMOJI[t]} {t}</button>)}
              </div>
            )}
            {topic && !showTopics && <div className="mt-2"><button onClick={() => setTopic(null)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">{INTEREST_EMOJI[topic]} {topic} <span className="opacity-50">✕</span></button></div>}
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 ml-[52px]">
          <div className="flex gap-1">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors text-xs font-medium"><ImageIcon /><span>Photo</span></button>
            <button onClick={() => setShowTopics((v) => !v)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-medium ${showTopics || topic ? "text-blue-600 bg-blue-50" : "text-gray-500 hover:text-blue-600 hover:bg-blue-50"}`}><TagIcon /><span>{topic ? INTEREST_EMOJI[topic] : "Vibe"}</span></button>
          </div>
          <div className="flex items-center gap-2">
            {text.length > 400 && <span className={`text-xs tabular-nums ${text.length > 480 ? "text-red-500" : "text-gray-400"}`}>{500 - text.length}</span>}
            <button onClick={handlePost} disabled={!canPost} className="px-4 py-1.5 text-sm font-bold rounded-full text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
              {posting ? <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin inline-block" />Posting…</span> : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PostCard ──────────────────────────────────────────────────────────────────
function PostCard({ post, isMock = false }: { post: Post; isMock?: boolean }) {
  const { currentUser, likePost, addComment, deletePost, pingUser } = useStore();
  const router = useRouter();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pinged, setPinged] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [mockLikes, setMockLikes] = useState(post.likes);
  const [mockComments, setMockComments] = useState(post.comments);
  const lastTap = useRef(0);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const isOwnPost = currentUser?.id === post.userId;
  const myId = currentUser?.id ?? "";
  const liked = mockLikes.includes(myId);

  const triggerLike = useCallback(() => {
    if (!currentUser) { router.push("/auth"); return; }
    const wasLiked = mockLikes.includes(myId);
    setMockLikes(wasLiked ? mockLikes.filter((id) => id !== myId) : [...mockLikes, myId]);
    if (!wasLiked) { setHeartAnim(true); setTimeout(() => setHeartAnim(false), 800); }
    if (!isMock) likePost(post.id);
  }, [currentUser, mockLikes, myId, isMock, likePost, post.id, router]);

  const handleComment = async () => {
    if (!commentText.trim() || !currentUser) return;
    setSubmitting(true);
    const nc: PostComment = { id: `mc_${Date.now()}`, postId: post.id, userId: myId, userName: currentUser.name, userAvatar: currentUser.avatar, text: commentText.trim(), timestamp: Date.now() };
    setMockComments((p) => [...p, nc]); setCommentText("");
    if (!isMock) await addComment(post.id, commentText.trim());
    setSubmitting(false);
  };

  const handlePing = async () => {
    if (!currentUser) { router.push("/auth"); return; }
    if (isOwnPost || pinged) return;
    setPinged(true);
    if (!isMock) await pingUser(post.userId);
  };

  return (
    <article className="bg-white border-b border-gray-100">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="relative">
          <Avatar src={post.userAvatar} name={post.userName} size={42} />
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[14px] text-gray-900">{post.userName}</span>
            {post.userIsVerified && <svg width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#3b82f6"/><polyline points="8 12 11 15 16 9" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            {post.userNeighborhood && <span className="text-gray-400 text-[12px]">· {post.userNeighborhood}</span>}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[12px] text-gray-400">{timeAgo(post.timestamp)}</span>
            {post.topic && <><span className="text-gray-300">·</span><span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: "#f5f3ff", color: "#7c3aed" }}>{INTEREST_EMOJI[post.topic]} {post.topic}</span></>}
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu((v) => !v)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-10 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-20 min-w-[150px]">
              {isOwnPost && !isMock ? <button onClick={() => { deletePost(post.id); setShowMenu(false); }} className="w-full px-4 py-3 text-left text-sm text-red-500 font-semibold hover:bg-red-50 flex items-center gap-2">🗑️ Delete</button>
                : <button onClick={() => setShowMenu(false)} className="w-full px-4 py-3 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2">🚩 Report</button>}
              <button onClick={() => setShowMenu(false)} className="w-full px-4 py-3 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-50">🔗 Copy link</button>
            </div>
          )}
        </div>
      </div>

      {post.text && <p className="px-4 pb-3 text-[15px] text-gray-900 leading-relaxed whitespace-pre-wrap">{post.text}</p>}

      {(post.imageUrl ?? post.imageBase64) && (
        <div className="relative cursor-pointer select-none" onClick={() => { const now = Date.now(); if (now - lastTap.current < 300 && !liked) triggerLike(); lastTap.current = now; }}>
          <img src={post.imageUrl ?? post.imageBase64} alt="post" className="w-full object-cover" style={{ maxHeight: 480 }} />
          {heartAnim && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span style={{ fontSize: 72, animation: "heartBurst .75s ease-out forwards" }}>❤️</span></div>}
        </div>
      )}

      {(mockLikes.length > 0 || mockComments.length > 0) && (
        <div className="flex items-center gap-3 px-4 pt-2 pb-1">
          {mockLikes.length > 0 && <button onClick={triggerLike} className="flex items-center gap-1 hover:opacity-70"><div className="w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ background: "linear-gradient(135deg,#f43f5e,#ec4899)" }}>❤</div><span className="text-[13px] text-gray-600 font-medium ml-1">{mockLikes.length}</span></button>}
          {mockComments.length > 0 && <button onClick={() => setShowComments((v) => !v)} className="text-[13px] text-gray-500 hover:text-gray-700 ml-auto">{mockComments.length} {mockComments.length === 1 ? "comment" : "comments"}</button>}
        </div>
      )}

      <div className="flex border-t border-gray-100 mx-2">
        <button onClick={triggerLike} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all active:scale-95 ${liked ? "text-red-500" : "text-gray-500 hover:text-red-400 hover:bg-red-50/50"}`}><HeartIcon filled={liked} />Like</button>
        <button onClick={() => { setShowComments(true); setTimeout(() => commentInputRef.current?.focus(), 80); }} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-gray-500 hover:text-blue-500 hover:bg-blue-50/50 transition-all active:scale-95"><CommentIcon />Comment</button>
        {!isOwnPost && <button onClick={handlePing} disabled={pinged} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all active:scale-95 ${pinged ? "text-green-500" : "text-gray-500 hover:text-green-500 hover:bg-green-50/50"}`}><PingIcon filled={pinged} />{pinged ? "Pinged!" : "Ping"}</button>}
      </div>

      {showComments && (
        <div className="border-t border-gray-50 bg-gray-50/50 pb-2">
          {mockComments.length > 0 && (
            <div className="px-4 pt-3 space-y-3">
              {mockComments.map((c: PostComment) => (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar src={c.userAvatar} name={c.userName} size={30} />
                  <div className="flex-1 min-w-0">
                    <div className="inline-block bg-white rounded-2xl rounded-tl-sm px-3.5 py-2 shadow-sm border border-gray-100 max-w-full">
                      <span className="text-[13px] font-bold text-gray-900 mr-1.5">{c.userName}</span>
                      <span className="text-[13px] text-gray-700 break-words">{c.text}</span>
                    </div>
                    <span className="text-[11px] text-gray-400 ml-3 mt-1 block">{timeAgo(c.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {currentUser && (
            <div className="flex gap-2.5 px-4 pt-3">
              <Avatar src={currentUser.avatar} name={currentUser.name} size={30} />
              <div className="flex-1 flex items-center bg-white rounded-full border border-gray-200 px-4 py-2 gap-2 focus-within:border-blue-300 transition-colors shadow-sm">
                <input ref={commentInputRef} value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); }}} placeholder="Kuch likho…" className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-400 min-w-0" maxLength={300} />
                {commentText.trim() && <button onClick={handleComment} disabled={submitting} className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0 active:scale-95" style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}><SendIcon /></button>}
              </div>
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes heartBurst { 0%{opacity:0;transform:scale(.2)} 35%{opacity:1;transform:scale(1.35)} 65%{transform:scale(.95)} 100%{opacity:0;transform:scale(1.1)} }`}</style>
    </article>
  );
}

// ── FilterBar ─────────────────────────────────────────────────────────────────
type FeedFilter = "all" | Interest;
const FILTER_TOPICS: Interest[] = ["Cafes","Gaming","Cricket","Coding","Food","Music","Anime"];
function FilterBar({ filter, setFilter }: { filter: FeedFilter; setFilter: (f: FeedFilter) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto py-2.5 px-4 bg-white border-b border-gray-100" style={{ scrollbarWidth: "none" }}>
      {(["all", ...FILTER_TOPICS] as FeedFilter[]).map((t) => (
        <button key={t} onClick={() => setFilter(t)} className={`px-3.5 py-1.5 rounded-full text-[13px] font-bold flex-shrink-0 transition-all active:scale-95 ${filter === t ? "text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`} style={filter === t ? { background: "linear-gradient(135deg,#2563eb,#7c3aed)" } : {}}>
          {t === "all" ? "✦ All" : `${INTEREST_EMOJI[t]} ${t}`}
        </button>
      ))}
    </div>
  );
}

// ── Feed column ───────────────────────────────────────────────────────────────
function FeedColumn() {
  const { posts, loadPosts } = useStore();
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => { loadPosts(); }, [loadPosts]);

  const allPosts = useMemo(() => {
    const dbIds = new Set(posts.map((p) => p.id));
    return [...posts, ...MOCK_POSTS.filter((m) => !dbIds.has(m.id))].sort((a, b) => b.timestamp - a.timestamp);
  }, [posts]);

  const filtered = filter === "all" ? allPosts : allPosts.filter((p) => p.topic === filter);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true); await loadPosts(); setRefreshing(false);
  }, [loadPosts]);

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Home</h1>
            <p className="text-xs text-gray-400">{allPosts.length} posts from your area</p>
          </div>
          <button onClick={handleRefresh} disabled={refreshing} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-500">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? "animate-spin" : ""}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>
        </div>
      </div>

      <PostComposer />
      <FilterBar filter={filter} setFilter={setFilter} />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 text-4xl" style={{ background: "linear-gradient(135deg,#eff6ff,#f5f3ff)" }}>{filter === "all" ? "✨" : INTEREST_EMOJI[filter]}</div>
          <p className="font-bold text-gray-800 text-lg">No posts yet</p>
          <p className="text-gray-400 text-sm mt-1">{filter === "all" ? "Pehli post tum karo!" : `No ${filter} posts yet — drop one!`}</p>
        </div>
      ) : (
        <>{filtered.map((post) => <PostCard key={post.id} post={post} isMock={post.id.startsWith("mock_")} />)}<div className="h-16" /></>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard sidebar helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatFreeUntil(ts: number): string {
  const diff = ts - Date.now();
  if (diff <= 0) return "expired";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function useGeoToggleFree() {
  const { toggleFree, updateStreak } = useStore();
  return () => {
    const doToggle = (lat?: number, lng?: number) => { toggleFree(lat, lng); updateStreak(); };
    if (typeof navigator === "undefined" || !navigator.geolocation) { doToggle(); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => doToggle(pos.coords.latitude, pos.coords.longitude),
      () => doToggle(),
      { timeout: 6000, maximumAge: 60000 },
    );
  };
}

// ── Logged-in right sidebar ───────────────────────────────────────────────────
function DashboardSidebar() {
  const router = useRouter();
  const { currentUser, isFree, freeUntil, groups, nearbyUsers, pingUser } = useStore();
  const handleToggleFree = useGeoToggleFree();
  const [showCreate, setShowCreate] = useState(false);
  const [showQuickRoom, setShowQuickRoom] = useState(false);
  const [prefilledLoc, setPrefilledLoc] = useState<SafeLocation | null>(null);
  const [pingedUsers, setPingedUsers] = useState<string[]>([]);

  if (!currentUser) return null;

  const nearbyFree = nearbyUsers.filter((u) => u.isFree && u.id !== currentUser.id).slice(0, 3);
  const spots = SAFE_LOCATIONS.slice(0, 4).map((loc) => ({
    ...loc,
    activeGroups: groups.filter((g) => g.safeLocationId === loc.id && g.expiresAt > Date.now()).length,
  }));
  const activeGroups = groups.filter((g) => g.members.some((m) => m.id === currentUser.id) && g.expiresAt > Date.now()).slice(0, 3);
  const QUICK_ACTS = [
    { emoji: "☕", label: "Chai run" }, { emoji: "🎮", label: "Gaming" },
    { emoji: "🍕", label: "Food trip" }, { emoji: "🏏", label: "Cricket" },
    { emoji: "💻", label: "Study" }, { emoji: "🎬", label: "Movie" },
  ];

  return (
    <div className="space-y-4">
      {/* ── I'm Free status card ── */}
      <div className="relative overflow-hidden rounded-2xl" style={{ background: isFree ? "linear-gradient(135deg,#52A862,#3da000)" : "linear-gradient(135deg,#1E1B3A,#2A2550)" }}>
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }} />
        <div className="relative p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                {isFree && <span className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/60">
                  {isFree ? "Live · Visible nearby" : "Offline · Hidden"}
                </span>
              </div>
              <p className="text-base font-extrabold text-white leading-tight">
                {isFree ? "You're free! 🎉" : "Ready to hang out?"}
              </p>
              {isFree && freeUntil && <p className="text-[11px] text-white/60 mt-0.5">{formatFreeUntil(freeUntil)} remaining</p>}
            </div>
            <div className="w-10 h-10 rounded-xl border-2 flex items-center justify-center text-lg font-extrabold text-white flex-shrink-0" style={{ background: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.3)" }}>
              {currentUser.avatar?.startsWith("http") ? <img src={currentUser.avatar} referrerPolicy="no-referrer" alt="" className="w-full h-full object-cover rounded-lg" /> : currentUser.avatar?.slice(0, 2)}
            </div>
          </div>

          <button onClick={handleToggleFree} className="w-full py-2.5 rounded-xl font-extrabold text-sm transition-all active:scale-95 mb-3" style={isFree ? { background: "#fff", color: "#448C50", boxShadow: "0 3px 0 rgba(0,0,0,0.15)" } : { background: "#52A862", color: "#fff", boxShadow: "0 3px 0 #3D7D47" }}>
            {isFree ? "🟢 Tap to go offline" : "😴 Go Free now"}
          </button>

          <div className="grid grid-cols-3 gap-1.5">
            {[
              { icon: "🔥", value: (currentUser.streakDays ?? 0) > 0 ? `${currentUser.streakDays}d` : "—", label: "Streak" },
              { icon: "👥", value: currentUser.totalMeetups ?? 0, label: "Meetups" },
              { icon: "⭐", value: currentUser.trustScore > 0 ? currentUser.trustScore.toFixed(1) : "New", label: "Trust" },
            ].map(({ icon, value, label }) => (
              <div key={label} className="rounded-xl px-2 py-2 text-center" style={{ background: "rgba(255,255,255,0.10)" }}>
                <p className="text-sm font-extrabold text-white">{icon} {value}</p>
                <p className="text-[10px] font-semibold text-white/60 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick start ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">⚡ Quick start</p>
          <button onClick={() => setShowCreate(true)} className="text-xs font-bold text-blue-600 hover:underline">+ Custom</button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {QUICK_ACTS.map((a) => (
            <button key={a.label} onClick={() => setShowQuickRoom(true)} className="flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 transition-all text-center">
              <span className="text-xl">{a.emoji}</span>
              <span className="text-[10px] font-bold text-gray-600 leading-tight">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Who's free nearby ── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full animate-pulse bg-green-400" />
            <p className="text-xs font-extrabold text-gray-600">Free right now</p>
          </div>
          <button onClick={() => router.push("/explore")} className="text-xs font-bold text-blue-600 hover:underline">See all →</button>
        </div>
        {nearbyFree.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="text-2xl mb-1">👀</p>
            <p className="text-xs text-gray-400">Nobody free nearby yet</p>
            <button onClick={handleToggleFree} className="mt-2 text-xs font-bold text-green-600 hover:underline">Go free to get discovered →</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {nearbyFree.map((u) => (
              <div key={u.id} className="flex items-center gap-2.5 px-3 py-2.5">
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
                    {u.avatar?.startsWith("http") ? <img src={u.avatar} referrerPolicy="no-referrer" alt="" className="w-full h-full object-cover rounded-full" /> : u.avatar?.slice(0, 2)}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{u.name}</p>
                  <p className="text-[10px] text-gray-400">{u.distanceKm !== undefined ? `${u.distanceKm < 1 ? `${Math.round(u.distanceKm * 1000)}m` : `${u.distanceKm.toFixed(1)}km`} away` : u.neighborhood}</p>
                </div>
                <button onClick={() => { setPingedUsers((p) => [...p, u.id]); pingUser(u.id); }} disabled={pingedUsers.includes(u.id)} className="text-[10px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0 transition-all" style={pingedUsers.includes(u.id) ? { background: "rgba(34,197,94,0.1)", color: "#16a34a" } : { background: "#2563eb", color: "#fff" }}>
                  {pingedUsers.includes(u.id) ? "✓ Sent" : "Ping"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Meetup spots ── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
          <p className="text-xs font-extrabold text-gray-600">📍 Pick a spot</p>
          <button onClick={() => router.push("/explore")} className="text-xs font-bold text-blue-600 hover:underline">Map →</button>
        </div>
        <div className="divide-y divide-gray-50">
          {spots.map((loc) => (
            <button key={loc.id} onClick={() => { setPrefilledLoc(loc); setShowCreate(true); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left">
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-base border flex-shrink-0 ${SAFE_LOCATION_COLORS[loc.type]}`}>{SAFE_LOCATION_ICONS[loc.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{loc.name}</p>
                <p className="text-[10px] text-gray-400 capitalize">{loc.type} · {loc.activeGroups > 0 ? <span className="text-orange-500 font-semibold">{loc.activeGroups} active</span> : "Safe ✓"}</p>
              </div>
              <span className="text-gray-300 text-sm flex-shrink-0">›</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Your interests ── */}
      {currentUser.interests.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Your vibe</p>
            <button onClick={() => router.push("/profile")} className="text-xs font-bold text-blue-600 hover:underline">Edit</button>
          </div>
          <div className="flex flex-wrap gap-1">
            {currentUser.interests.map((i) => <InterestBadge key={i} interest={i} size="sm" />)}
          </div>
        </div>
      )}

      {/* ── Active groups ── */}
      {activeGroups.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wider px-1">Your groups</p>
          {activeGroups.map((g) => <GroupCard key={g.id} group={g} />)}
        </div>
      )}

      {showCreate && <CreateGroupModal onClose={() => { setShowCreate(false); setPrefilledLoc(null); }} prefilledLocation={prefilledLoc} />}
      {showQuickRoom && <QuickRoomModal onClose={() => setShowQuickRoom(false)} />}
    </div>
  );
}

// ── Guest right sidebar ───────────────────────────────────────────────────────
function GuestSidebar() {
  const router = useRouter();
  return (
    <div className="space-y-4">
      {/* Join card */}
      <div className="rounded-2xl p-5 text-center" style={{ background: "linear-gradient(135deg,#1E1B3A,#2A2550)" }}>
        <p className="text-2xl mb-2">🎉</p>
        <p className="text-white font-extrabold text-base mb-1">Join hangr</p>
        <p className="text-white/60 text-xs mb-4 leading-relaxed">Find people to hang out with right now — cafes, cricket, gaming and more</p>
        <button onClick={() => router.push("/auth")} className="w-full py-2.5 rounded-xl font-bold text-sm text-white mb-2" style={{ background: "#52A862", boxShadow: "0 3px 0 #3D7D47" }}>
          🟢 Get started free
        </button>
        <button onClick={() => router.push("/auth")} className="w-full py-2 rounded-xl font-bold text-xs border border-white/20 text-white/70 hover:text-white transition-colors">
          Sign in
        </button>
      </div>

      {/* Features */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-3">Why hangr?</p>
        {[
          { icon: "📍", title: "Real-time meetups", desc: "See who's free near you right now" },
          { icon: "🛡️", title: "Safe locations only", desc: "Every meetup at a verified café, park, or mall" },
          { icon: "⭐", title: "Trust scores", desc: "Verified profiles + community ratings" },
          { icon: "⚡", title: "Instant groups", desc: "Create or join a group in under 30 seconds" },
        ].map((f) => (
          <div key={f.title} className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">{f.icon}</span>
            <div>
              <p className="text-sm font-bold text-gray-800">{f.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { currentUser, needsOnboarding } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (currentUser && needsOnboarding) router.replace("/auth");
  }, [currentUser, needsOnboarding, router]);

  if (currentUser && needsOnboarding) return null;

  return (
    <div className="flex min-h-screen items-start">
      {/* ── Center: Feed ── */}
      <div className="flex-1 min-w-0 max-w-[640px] border-r border-gray-100">
        <FeedColumn />
      </div>

      {/* ── Right: Dashboard sidebar (desktop only) ── */}
      <div className="hidden lg:block w-[320px] xl:w-[360px] shrink-0 sticky top-0 max-h-screen overflow-y-auto p-4">
        {currentUser ? <DashboardSidebar /> : <GuestSidebar />}
      </div>
    </div>
  );
}
