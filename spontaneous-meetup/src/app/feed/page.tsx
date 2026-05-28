"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Interest, Post, PostComment } from "@/types";
import { INTEREST_EMOJI } from "@/lib/mock-data";

// ── helpers ────────────────────────────────────────────────────────────────

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

// ── Mock posts shown before DB loads ──────────────────────────────────────

const MOCK_POSTS: Post[] = [
  {
    id: "mock_1",
    userId: "u_aryan",
    userName: "Aryan Sharma",
    userAvatar: "AR",
    userNeighborhood: "Crossing Republik",
    userIsVerified: true,
    text: "Koi hai jo aaj shaam chai peene chale? Haldiram ke paas? 🍵",
    likes: ["u_priya", "u_rohit", "u_sahil"],
    comments: [
      { id: "c1", postId: "mock_1", userId: "u_priya", userName: "Priya", userAvatar: "PR", text: "Haan yaar! 7 baje theek rahega?", timestamp: Date.now() - 18 * 60000 },
      { id: "c2", postId: "mock_1", userId: "u_rohit", userName: "Rohit", userAvatar: "RO", text: "Count me in bhai 🙌", timestamp: Date.now() - 10 * 60000 },
    ],
    topic: "Cafes",
    timestamp: Date.now() - 35 * 60000,
  },
  {
    id: "mock_2",
    userId: "u_priya",
    userName: "Priya Verma",
    userAvatar: "PR",
    userNeighborhood: "Indirapuram",
    userIsVerified: false,
    text: "ABES ke paas badminton court free hai abhi, koi aana chahta hai? 🏸 2-3 log aur chahiye",
    likes: ["u_aryan", "u_sahil"],
    comments: [],
    topic: "Gym",
    timestamp: Date.now() - 52 * 60000,
  },
  {
    id: "mock_3",
    userId: "u_sahil",
    userName: "Sahil Khan",
    userAvatar: "SK",
    userNeighborhood: "Vaishali",
    userIsVerified: true,
    text: "Aaj raat FIFA tournament organize kar raha hoon — PS5 pe. Winner ko free chai! 🎮🏆\n\nMax 4 log. DM karo ya ping karo.",
    likes: ["u_aryan", "u_priya", "u_rohit", "u_neha", "u_vishal"],
    comments: [
      { id: "c3", postId: "mock_3", userId: "u_neha", userName: "Neha", userAvatar: "NE", text: "Mujhe bhi add karo!!", timestamp: Date.now() - 1 * 3600000 },
    ],
    topic: "Gaming",
    timestamp: Date.now() - 2 * 3600000,
  },
  {
    id: "mock_4",
    userId: "u_neha",
    userName: "Neha Gupta",
    userAvatar: "NG",
    userNeighborhood: "Raj Nagar Extension",
    userIsVerified: false,
    text: "Kal ka cricket match total paisa vasool tha 🏏🔥 Thanks to everyone who came out! Next Sunday phir?",
    likes: ["u_aryan", "u_sahil", "u_rohit"],
    comments: [
      { id: "c4", postId: "mock_4", userId: "u_aryan", userName: "Aryan", userAvatar: "AR", text: "Bhai next Sunday pakka!", timestamp: Date.now() - 5 * 3600000 },
      { id: "c5", postId: "mock_4", userId: "u_rohit", userName: "Rohit", userAvatar: "RO", text: "Woh last over 🤯🤯🤯", timestamp: Date.now() - 4 * 3600000 },
    ],
    topic: "Cricket",
    timestamp: Date.now() - 6 * 3600000,
  },
  {
    id: "mock_5",
    userId: "u_vishal",
    userName: "Vishal Tyagi",
    userAvatar: "VT",
    userNeighborhood: "Kaushambi",
    userIsVerified: false,
    text: "Coding session at Crossings Starbucks, agar koi side project pe kaam kar raha hai toh aa jao! Laptop leke aana 💻 Abhi wahan hoon, 2 ghante aur baithne wala hoon",
    likes: ["u_priya"],
    comments: [],
    topic: "Coding",
    timestamp: Date.now() - 25 * 60000,
  },
];

// ── SVG icons ──────────────────────────────────────────────────────────────

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? "#ef4444" : "none"}
      stroke={filled ? "#ef4444" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function PingIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? "#22c55e" : "none"}
      stroke={filled ? "#22c55e" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.58 3.47 2 2 0 0 1 3.55 1.3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.84a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z"/>
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  "from-blue-500 to-violet-600",
  "from-rose-500 to-orange-400",
  "from-green-500 to-teal-400",
  "from-amber-500 to-yellow-400",
  "from-pink-500 to-purple-600",
  "from-cyan-500 to-blue-400",
];

function Avatar({ src, name, size = 36 }: { src: string; name: string; size?: number }) {
  const isUrl = src.startsWith("http") || src.startsWith("data:");
  const grad = AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
  return isUrl ? (
    <img src={src} alt={name} referrerPolicy="no-referrer"
      className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }} />
  ) : (
    <div className={`rounded-full bg-gradient-to-br ${grad} text-white font-bold flex items-center justify-center flex-shrink-0`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}>
      {src}
    </div>
  );
}

// ── Composer ───────────────────────────────────────────────────────────────

function PostComposer() {
  const { currentUser, createPost } = useStore();
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [topic, setTopic] = useState<Interest | null>(null);
  const [posting, setPosting] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const [loadingImg, setLoadingImg] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;

  const canPost = (text.trim().length > 0 || !!image) && !posting;

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLoadingImg(true);
    const compressed = await compressImage(f);
    setImage(compressed);
    setLoadingImg(false);
    e.target.value = "";
  };

  const handlePost = async () => {
    if (!canPost) return;
    setPosting(true);
    try {
      await createPost(text.trim(), image ?? undefined, topic ?? undefined);
      setText(""); setImage(null); setTopic(null); setShowTopics(false);
    } finally {
      setPosting(false);
    }
  };

  const topics: Interest[] = ["Cafes", "Gaming", "Cricket", "Coding", "Anime", "Music", "Gym", "Football", "Movies", "Food"];

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="px-4 pt-4 pb-3">
        <div className="flex gap-3">
          <Avatar src={currentUser.avatar} name={currentUser.name} size={40} />
          <div className="flex-1 min-w-0">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Kya chal raha hai, ${currentUser.name.split(" ")[0]}?`}
              className="w-full resize-none text-[15px] text-gray-900 placeholder-gray-400 outline-none leading-relaxed bg-transparent"
              style={{ minHeight: 64 }}
              maxLength={500}
            />

            {/* Image preview */}
            {image && (
              <div className="relative mt-2 rounded-2xl overflow-hidden bg-gray-100">
                {loadingImg ? (
                  <div className="h-40 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                  </div>
                ) : (
                  <>
                    <img src={image} alt="preview" className="w-full max-h-72 object-cover" />
                    <button onClick={() => setImage(null)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white text-xs flex items-center justify-center hover:bg-black/70 transition-colors">
                      ✕
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Topic picker */}
            {showTopics && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {topics.map((t) => (
                  <button key={t}
                    onClick={() => { setTopic(topic === t ? null : t); setShowTopics(false); }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      topic === t
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300"
                    }`}>
                    {INTEREST_EMOJI[t]} {t}
                  </button>
                ))}
              </div>
            )}

            {topic && !showTopics && (
              <div className="mt-2">
                <button onClick={() => setTopic(null)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {INTEREST_EMOJI[topic]} {topic} <span className="opacity-50">✕</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 ml-[52px]">
          <div className="flex gap-1">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors text-sm font-medium">
              <ImageIcon />
              <span>Photo</span>
            </button>
            <button onClick={() => setShowTopics((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                showTopics || topic ? "text-blue-600 bg-blue-50" : "text-gray-500 hover:text-blue-600 hover:bg-blue-50"
              }`}>
              <TagIcon />
              <span>{topic ? INTEREST_EMOJI[topic] : "Vibe"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {text.length > 400 && (
              <span className={`text-xs tabular-nums ${text.length > 480 ? "text-red-500" : "text-gray-400"}`}>
                {500 - text.length}
              </span>
            )}
            <button
              onClick={handlePost}
              disabled={!canPost}
              className="px-5 py-2 text-sm font-bold rounded-full text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
              {posting ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin inline-block" />
                  Posting…
                </span>
              ) : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PostCard ───────────────────────────────────────────────────────────────

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
  }, [currentUser, mockLikes, myId, isMock, likePost, post.id]);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300 && !liked) triggerLike();
    lastTap.current = now;
  };

  const handleComment = async () => {
    if (!commentText.trim() || !currentUser) return;
    setSubmitting(true);
    const newComment: PostComment = {
      id: `mc_${Date.now()}`,
      postId: post.id,
      userId: myId,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      text: commentText.trim(),
      timestamp: Date.now(),
    };
    setMockComments((prev) => [...prev, newComment]);
    setCommentText("");
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
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="relative">
          <Avatar src={post.userAvatar} name={post.userName} size={42} />
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[14px] text-gray-900">{post.userName}</span>
            {post.userIsVerified && (
              <svg width="14" height="14" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="#3b82f6"/>
                <polyline points="8 12 11 15 16 9" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {post.userNeighborhood && (
              <span className="text-gray-400 text-[12px]">· {post.userNeighborhood}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[12px] text-gray-400">{timeAgo(post.timestamp)}</span>
            {post.topic && (
              <>
                <span className="text-gray-300">·</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                  style={{ background: "#f5f3ff", color: "#7c3aed" }}>
                  {INTEREST_EMOJI[post.topic]} {post.topic}
                </span>
              </>
            )}
          </div>
        </div>

        {/* 3-dot menu */}
        <div className="relative">
          <button onClick={() => setShowMenu((v) => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-10 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-20 min-w-[150px]">
              {isOwnPost && !isMock ? (
                <button onClick={() => { deletePost(post.id); setShowMenu(false); }}
                  className="w-full px-4 py-3 text-left text-sm text-red-500 font-semibold hover:bg-red-50 flex items-center gap-2 transition-colors">
                  🗑️ Delete post
                </button>
              ) : (
                <button onClick={() => setShowMenu(false)}
                  className="w-full px-4 py-3 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition-colors">
                  🚩 Report
                </button>
              )}
              <button onClick={() => setShowMenu(false)}
                className="w-full px-4 py-3 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition-colors border-t border-gray-50">
                🔗 Copy link
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Text */}
      {post.text && (
        <p className="px-4 pb-3 text-[15px] text-gray-900 leading-relaxed whitespace-pre-wrap">{post.text}</p>
      )}

      {/* Image with double-tap like */}
      {(post.imageUrl ?? post.imageBase64) && (
        <div className="relative cursor-pointer select-none" onClick={handleDoubleTap}>
          <img src={post.imageUrl ?? post.imageBase64} alt="post" className="w-full object-cover" style={{ maxHeight: 520 }} />
          {post.text && (
            <div className="absolute bottom-0 left-0 right-0 px-4 py-3"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,.75), transparent)" }}>
              <p className="text-white text-sm leading-relaxed">{post.text}</p>
            </div>
          )}
          {heartAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span style={{ fontSize: 72, animation: "heartBurst .75s ease-out forwards" }}>❤️</span>
            </div>
          )}
        </div>
      )}

      {/* Likes + comments count */}
      {(mockLikes.length > 0 || mockComments.length > 0) && (
        <div className="flex items-center gap-3 px-4 pt-2 pb-1">
          {mockLikes.length > 0 && (
            <button onClick={triggerLike} className="flex items-center gap-1 hover:opacity-70 transition-opacity">
              <div className="flex -space-x-1">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                  style={{ background: "linear-gradient(135deg,#f43f5e,#ec4899)" }}>❤</div>
              </div>
              <span className="text-[13px] text-gray-600 font-medium ml-1">{mockLikes.length}</span>
            </button>
          )}
          {mockComments.length > 0 && (
            <button onClick={() => setShowComments((v) => !v)}
              className="text-[13px] text-gray-500 hover:text-gray-700 ml-auto transition-colors">
              {mockComments.length} {mockComments.length === 1 ? "comment" : "comments"}
            </button>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="flex border-t border-gray-100 mx-2">
        <button onClick={triggerLike}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all active:scale-95 ${
            liked ? "text-red-500" : "text-gray-500 hover:text-red-400 hover:bg-red-50/50"
          }`}>
          <HeartIcon filled={liked} />
          Like
        </button>
        <button
          onClick={() => { setShowComments(true); setTimeout(() => commentInputRef.current?.focus(), 80); }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-gray-500 hover:text-blue-500 hover:bg-blue-50/50 transition-all active:scale-95">
          <CommentIcon />
          Comment
        </button>
        {!isOwnPost && (
          <button onClick={handlePing} disabled={pinged}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all active:scale-95 ${
              pinged ? "text-green-500" : "text-gray-500 hover:text-green-500 hover:bg-green-50/50"
            }`}>
            <PingIcon filled={pinged} />
            {pinged ? "Pinged!" : "Ping"}
          </button>
        )}
      </div>

      {/* Comments section */}
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
                <input ref={commentInputRef} value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); }}}
                  placeholder="Kuch likho…"
                  className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-400 min-w-0"
                  maxLength={300} />
                {commentText.trim() && (
                  <button onClick={handleComment} disabled={submitting}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0 transition-all active:scale-95"
                    style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
                    <SendIcon />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes heartBurst {
          0%   { opacity:0; transform:scale(.2) }
          35%  { opacity:1; transform:scale(1.35) }
          65%  { transform:scale(.95) }
          100% { opacity:0; transform:scale(1.1) }
        }
      `}</style>
    </article>
  );
}

// ── Filter bar ─────────────────────────────────────────────────────────────

type FeedFilter = "all" | Interest;
const FILTER_TOPICS: Interest[] = ["Cafes", "Gaming", "Cricket", "Coding", "Food", "Music", "Anime"];

function FilterBar({ filter, setFilter }: { filter: FeedFilter; setFilter: (f: FeedFilter) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto py-2.5 px-4 bg-white border-b border-gray-100" style={{ scrollbarWidth: "none" }}>
      {(["all", ...FILTER_TOPICS] as FeedFilter[]).map((t) => (
        <button key={t} onClick={() => setFilter(t)}
          className={`px-3.5 py-1.5 rounded-full text-[13px] font-bold flex-shrink-0 transition-all active:scale-95 ${
            filter === t ? "text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
          style={filter === t ? { background: "linear-gradient(135deg,#2563eb,#7c3aed)" } : {}}>
          {t === "all" ? "✦ All" : `${INTEREST_EMOJI[t]} ${t}`}
        </button>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const { currentUser, posts, loadPosts } = useStore();
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  }, [loadPosts]);

  // Merge DB posts with mock posts; DB posts take priority
  const allPosts = useMemo(() => {
    const dbIds = new Set(posts.map((p) => p.id));
    const merged = [...posts, ...MOCK_POSTS.filter((m) => !dbIds.has(m.id))];
    return merged.sort((a, b) => b.timestamp - a.timestamp);
  }, [posts]);

  const filtered = filter === "all" ? allPosts : allPosts.filter((p) => p.topic === filter);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-xl mx-auto flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Crew Feed</h1>
            <p className="text-xs text-gray-400">{allPosts.length} posts from your area</p>
          </div>
          <button onClick={handleRefresh} disabled={refreshing}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" className={refreshing ? "animate-spin" : ""}>
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto">
        <PostComposer />
        <FilterBar filter={filter} setFilter={setFilter} />

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 text-4xl"
              style={{ background: "linear-gradient(135deg,#eff6ff,#f5f3ff)" }}>
              {filter === "all" ? "✨" : INTEREST_EMOJI[filter]}
            </div>
            <p className="font-bold text-gray-800 text-lg">No posts yet</p>
            <p className="text-gray-400 text-sm mt-1">
              {filter === "all" ? "Pehli post tum karo!" : `No ${filter} posts yet — drop one!`}
            </p>
          </div>
        ) : (
          <>
            {filtered.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isMock={post.id.startsWith("mock_")}
              />
            ))}
            <div className="h-16" />
          </>
        )}
      </div>
    </div>
  );
}
