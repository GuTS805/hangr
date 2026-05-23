"use client";

import { useState, useRef, useCallback } from "react";
import { useStore } from "@/lib/store";
import { Interest, Post } from "@/types";
import { INTEREST_EMOJI } from "@/lib/mock-data";

// ── helpers ────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function compressImage(file: File, maxW = 1080, maxH = 1080, q = 0.82): Promise<string> {
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

function Avatar({ src, name, size = 36 }: { src: string; name: string; size?: number }) {
  const isUrl = src.startsWith("http") || src.startsWith("data:");
  return isUrl ? (
    <img
      src={src} alt={name}
      className="rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0"
      style={{ width: size, height: size }}
      referrerPolicy="no-referrer"
    />
  ) : (
    <div
      className="rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-white font-bold flex items-center justify-center flex-shrink-0 border-2 border-white shadow-sm"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.35) }}
    >
      {src}
    </div>
  );
}

// ── Composer ───────────────────────────────────────────────────────────────

function PostComposer() {
  const { currentUser, createPost, pingUser } = useStore();
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [topic, setTopic] = useState<Interest | null>(null);
  const [posting, setPosting] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const compressed = await compressImage(f);
    setImage(compressed);
    e.target.value = "";
  };

  const handlePost = async () => {
    if (!text.trim() && !image) return;
    setPosting(true);
    await createPost(text.trim(), image ?? undefined, topic ?? undefined);
    setText(""); setImage(null); setTopic(null);
    setPosting(false);
  };

  const topics: Interest[] = ["Cafes", "Gaming", "Cricket", "Coding", "Anime", "Music", "Gym", "Football", "Movies", "Food"];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex gap-3">
        <Avatar src={currentUser.avatar} name={currentUser.name} size={40} />
        <div className="flex-1 min-w-0">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`What's on your mind, ${currentUser.name.split(" ")[0]}?`}
            className="w-full resize-none text-sm text-gray-800 placeholder-gray-400 outline-none min-h-[72px] leading-relaxed"
            maxLength={500}
          />

          {/* Image preview */}
          {image && (
            <div className="relative mt-2 rounded-xl overflow-hidden">
              <img src={image} alt="preview" className="w-full max-h-64 object-cover rounded-xl" />
              <button
                onClick={() => setImage(null)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80"
              >
                ✕
              </button>
            </div>
          )}

          {/* Topic chips */}
          {showTopics && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {topics.map((t) => (
                <button
                  key={t}
                  onClick={() => { setTopic(topic === t ? null : t); setShowTopics(false); }}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    topic === t
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300"
                  }`}
                >
                  {INTEREST_EMOJI[t]} {t}
                </button>
              ))}
            </div>
          )}

          {topic && !showTopics && (
            <button
              onClick={() => setTopic(null)}
              className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
            >
              {INTEREST_EMOJI[topic]} {topic} ✕
            </button>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
              <button
                onClick={() => fileRef.current?.click()}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors text-base"
                title="Add photo"
              >
                🖼️
              </button>
              <button
                onClick={() => setShowTopics((v) => !v)}
                className={`p-2 rounded-lg text-base transition-colors ${
                  showTopics ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                }`}
                title="Tag vibe"
              >
                🏷️
              </button>
            </div>

            <div className="flex items-center gap-2">
              {text.length > 400 && (
                <span className="text-xs text-gray-400">{500 - text.length}</span>
              )}
              <button
                onClick={handlePost}
                disabled={(!text.trim() && !image) || posting}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-full hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {posting ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PostCard ───────────────────────────────────────────────────────────────

function PostCard({ post }: { post: Post }) {
  const { currentUser, likePost, addComment, deletePost, pingUser } = useStore();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [pinged, setPinged] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);

  const isOwnPost = currentUser?.id === post.userId;
  const liked = currentUser ? post.likes.includes(currentUser.id) : false;

  const handleLike = () => {
    if (!currentUser) return;
    likePost(post.id);
  };

  const handleComment = async () => {
    if (!commentText.trim() || !currentUser) return;
    setSubmitting(true);
    await addComment(post.id, commentText.trim());
    setCommentText("");
    setSubmitting(false);
  };

  const handlePing = async () => {
    if (!currentUser || isOwnPost || pinging || pinged) return;
    setPinging(true);
    await pingUser(post.userId);
    setPinging(false);
    setPinged(true);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <Avatar src={post.userAvatar} name={post.userName} size={42} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{post.userName}</span>
            {post.userIsVerified && (
              <span className="text-blue-500 text-xs" title="Verified">✓</span>
            )}
            {post.userNeighborhood && (
              <span className="text-gray-400 text-xs">· {post.userNeighborhood}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400">{timeAgo(post.timestamp)}</span>
            {post.topic && (
              <span className="px-2 py-0.5 bg-violet-50 text-violet-700 text-xs font-medium rounded-full border border-violet-100">
                {INTEREST_EMOJI[post.topic]} {post.topic}
              </span>
            )}
          </div>
        </div>
        {isOwnPost && (
          <button
            onClick={() => deletePost(post.id)}
            className="text-gray-300 hover:text-red-400 text-xs transition-colors p-1"
            title="Delete post"
          >
            🗑️
          </button>
        )}
      </div>

      {/* Text */}
      {post.text && (
        <p className="px-4 pb-3 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{post.text}</p>
      )}

      {/* Image */}
      {post.imageBase64 && (
        <div
          className="cursor-pointer"
          onClick={() => setImageExpanded((v) => !v)}
        >
          <img
            src={post.imageBase64}
            alt="post"
            className={`w-full object-cover transition-all ${imageExpanded ? "max-h-[600px]" : "max-h-72"}`}
          />
        </div>
      )}

      {/* Stats row */}
      <div className="px-4 py-2 flex items-center gap-4 text-xs text-gray-400 border-t border-gray-50">
        {post.likes.length > 0 && (
          <span>{post.likes.length} {post.likes.length === 1 ? "like" : "likes"}</span>
        )}
        {post.comments.length > 0 && (
          <button
            onClick={() => setShowComments((v) => !v)}
            className="hover:text-gray-600 transition-colors"
          >
            {post.comments.length} {post.comments.length === 1 ? "comment" : "comments"}
          </button>
        )}
      </div>

      {/* Action bar */}
      <div className="px-2 py-1 flex border-t border-gray-100">
        <button
          onClick={handleLike}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${
            liked
              ? "text-red-500 bg-red-50"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          }`}
        >
          <span className="text-base">{liked ? "❤️" : "🤍"}</span>
          Like
        </button>

        <button
          onClick={() => setShowComments((v) => !v)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          <span className="text-base">💬</span>
          Comment
        </button>

        {!isOwnPost && (
          <button
            onClick={handlePing}
            disabled={pinging || pinged || !currentUser}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${
              pinged
                ? "text-green-600 bg-green-50"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            }`}
          >
            <span className="text-base">{pinged ? "✅" : "👋"}</span>
            {pinged ? "Pinged!" : pinging ? "…" : "Ping"}
          </button>
        )}
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="border-t border-gray-100 bg-gray-50/50">
          {post.comments.length > 0 && (
            <div className="px-4 pt-3 space-y-3">
              {post.comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar src={c.userAvatar} name={c.userName} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm border border-gray-100">
                      <span className="text-xs font-semibold text-gray-800 mr-1.5">{c.userName}</span>
                      <span className="text-sm text-gray-700">{c.text}</span>
                    </div>
                    <span className="text-xs text-gray-400 ml-2 mt-0.5 block">{timeAgo(c.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comment input */}
          {currentUser && (
            <div className="flex gap-2.5 px-4 py-3">
              <Avatar src={currentUser.avatar} name={currentUser.name} size={28} />
              <div className="flex-1 flex gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                  placeholder="Write a comment…"
                  className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-blue-300 transition-colors"
                  maxLength={300}
                />
                <button
                  onClick={handleComment}
                  disabled={!commentText.trim() || submitting}
                  className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 transition-colors text-sm flex-shrink-0 self-center"
                >
                  ➤
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

type FeedFilter = "all" | Interest;

export default function FeedPage() {
  const { currentUser, posts, loadPosts } = useStore();
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  }, [loadPosts]);

  const filtered = filter === "all" ? posts : posts.filter((p) => p.topic === filter);

  const trendingTopics: Interest[] = ["Cafes", "Gaming", "Cricket", "Coding", "Food"];

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Sign in to see the feed</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Feed</h1>
            <p className="text-xs text-gray-500 mt-0.5">What&apos;s happening in the crew</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors shadow-sm"
            title="Refresh"
          >
            <span className={`text-base ${refreshing ? "animate-spin" : ""}`}>↻</span>
          </button>
        </div>

        {/* Composer */}
        <PostComposer />

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium flex-shrink-0 transition-all ${
              filter === "all"
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
            }`}
          >
            All
          </button>
          {trendingTopics.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(filter === t ? "all" : t)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium flex-shrink-0 transition-all ${
                filter === t
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {INTEREST_EMOJI[t]} {t}
            </button>
          ))}
        </div>

        {/* Feed */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <div className="text-4xl mb-3">✨</div>
            <p className="font-semibold text-gray-700">Nothing here yet</p>
            <p className="text-sm text-gray-400 mt-1">
              {filter === "all" ? "Be the first to post something!" : `No ${filter} posts yet — add one!`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {/* Bottom padding for mobile nav */}
        <div className="h-8" />
      </div>
    </div>
  );
}
