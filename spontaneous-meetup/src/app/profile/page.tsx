"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Interest, Gender } from "@/types";
import { INTERESTS, INTEREST_EMOJI } from "@/lib/mock-data";
import TrustBadge from "@/components/TrustBadge";
import { STATUS_PRESETS } from "@/components/UserCard";

// ── Cover options ────────────────────────────────────────────────────────────

const COVERS = [
  { id: "a", cls: "from-blue-400 via-indigo-400 to-purple-500" },
  { id: "b", cls: "from-orange-400 via-pink-400 to-rose-500" },
  { id: "c", cls: "from-emerald-400 via-teal-400 to-cyan-500" },
  { id: "d", cls: "from-violet-400 via-purple-400 to-fuchsia-500" },
  { id: "e", cls: "from-yellow-400 via-orange-400 to-red-500" },
  { id: "f", cls: "from-sky-400 via-blue-500 to-indigo-600" },
];

const AVATAR_EMOJIS = ["🦁","🐯","🐻","🦊","🐼","🦋","🦄","🐲","🦅","😎","🤖","👾","🎮","⚡","🔥","🌊","🎯","🚀"];

function pickDefaultCover(name: string) {
  return COVERS[name.charCodeAt(0) % COVERS.length].id;
}

function getCoverCls(id: string) {
  return COVERS.find((c) => c.id === id)?.cls ?? COVERS[0].cls;
}

// Resize + compress an image file to a base64 JPEG
function compressImage(file: File, maxW: number, maxH: number, quality = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxW) { height = Math.round(height * maxW / width); width = maxW; }
      if (height > maxH) { width = Math.round(width * maxH / height); height = maxH; }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ── Avatar component ─────────────────────────────────────────────────────────

function Avatar({ src, size = "lg", isFree }: { src: string; size?: "sm" | "md" | "lg"; isFree?: boolean }) {
  const dim = size === "lg" ? "w-20 h-20 text-3xl" : size === "md" ? "w-12 h-12 text-xl" : "w-8 h-8 text-sm";
  const dotSize = size === "lg" ? "w-4 h-4 bottom-1.5 right-1" : "w-2.5 h-2.5 bottom-0.5 right-0.5";
  const isUrl = src?.startsWith("http");
  const isEmoji = src && !isUrl && src.length <= 2;

  return (
    <div className={`relative flex-shrink-0 ${dim}`}>
      {isUrl ? (
        <img src={src} alt="avatar" referrerPolicy="no-referrer"
          className={`${dim} rounded-full object-cover border-4 border-white shadow-md`} />
      ) : (
        <div className={`${dim} rounded-full bg-gradient-to-br from-blue-500 to-violet-500 border-4 border-white shadow-md flex items-center justify-center font-bold text-white`}>
          {isEmoji ? src : (src?.slice(0, 2).toUpperCase() ?? "?")}
        </div>
      )}
      {isFree !== undefined && (
        <span className={`absolute ${dotSize} bg-green-500 rounded-full border-2 border-white ${isFree ? "" : "opacity-0"}`} />
      )}
    </div>
  );
}

// ── Format helpers ───────────────────────────────────────────────────────────

function formatFreeUntil(ts: number): string {
  const diff = ts - Date.now();
  if (diff <= 0) return "expired";
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

type RightTab = "status" | "safety";

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const {
    currentUser, isFree, freeUntil, toggleFree, logout,
    groups, blockedUserIds, unblockUser, updateGenderSettings, verifyCollege,
    nearbyUsers, updateStatus,
  } = useStore();

  const [editing, setEditing]       = useState(false);
  const [name, setName]             = useState(currentUser?.name ?? "");
  const [age, setAge]               = useState(currentUser?.age?.toString() ?? "");
  const [neighborhood, setNeighborhood] = useState(currentUser?.neighborhood ?? "");
  const [selected, setSelected]     = useState<Interest[]>(currentUser?.interests ?? []);
  const [gender, setGender]         = useState<Gender | "">(currentUser?.gender ?? "");
  const [showGender, setShowGender] = useState(currentUser?.showGender ?? true);
  const [rightTab, setRightTab]     = useState<RightTab>("status");
  const [collegeEmail, setCollegeEmail] = useState("");
  const [collegeMsg, setCollegeMsg] = useState("");
  const [statusText, setStatusText] = useState(currentUser?.statusText ?? "");
  const [statusSaved, setStatusSaved] = useState(false);
  const [emergencyName, setEmergencyName] = useState(() => typeof window !== "undefined" ? (localStorage.getItem("hangr_ec_name") ?? "") : "");
  const [emergencyPhone, setEmergencyPhone] = useState(() => typeof window !== "undefined" ? (localStorage.getItem("hangr_ec_phone") ?? "") : "");
  const [emergencySaved, setEmergencySaved] = useState(false);

  // Avatar & cover pickers
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker]   = useState(false);
  const [pendingAvatar, setPendingAvatar]       = useState<string | null>(null);
  const [coverId, setCoverId]                   = useState<string>("");
  const [coverImage, setCoverImage]             = useState<string | null>(null); // uploaded bg
  const [saving, setSaving]                     = useState(false);
  const [uploadingAvatar, setUploadingAvatar]   = useState(false);
  const [uploadingCover, setUploadingCover]     = useState(false);

  const avatarPickerRef  = useRef<HTMLDivElement>(null);
  const avatarFileRef    = useRef<HTMLInputElement>(null);
  const coverFileRef     = useRef<HTMLInputElement>(null);

  // Load persisted cover (gradient id or uploaded image) from localStorage
  useEffect(() => {
    if (!currentUser) return;
    const id = currentUser.id;
    const img = localStorage.getItem(`hangr_cover_img_${id}`);
    if (img) { setCoverImage(img); return; }
    const saved = localStorage.getItem(`hangr_cover_${id}`);
    setCoverId(saved ?? pickDefaultCover(currentUser.name));
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!currentUser) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center bg-gray-100 p-4 text-center">
        <p className="text-gray-500 mb-4">You&apos;re not signed in</p>
        <button onClick={() => router.push("/auth")} className="px-5 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">Sign in</button>
      </div>
    );
  }

  const displayAvatar = pendingAvatar ?? currentUser.avatar;
  const myGroups      = groups.filter((g) => g.members.some((m) => m.id === currentUser.id));
  const blockedUsers  = nearbyUsers.filter((u) => blockedUserIds.includes(u.id));
  const coverCls      = getCoverCls(coverId);

  function toggleInterest(i: Interest) {
    setSelected((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
  }

  function chooseCover(id: string) {
    if (!currentUser) return;
    setCoverId(id);
    setCoverImage(null);
    localStorage.setItem(`hangr_cover_${currentUser.id}`, id);
    localStorage.removeItem(`hangr_cover_img_${currentUser.id}`);
    setShowCoverPicker(false);
  }

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setShowAvatarPicker(false);
    try {
      const compressed = await compressImage(file, 400, 400, 0.9);
      setPendingAvatar(compressed);
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  }

  async function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!currentUser || !file) return;
    setUploadingCover(true);
    setShowCoverPicker(false);
    try {
      const compressed = await compressImage(file, 1200, 480, 0.88);
      setCoverImage(compressed);
      localStorage.setItem(`hangr_cover_img_${currentUser.id}`, compressed);
      localStorage.removeItem(`hangr_cover_${currentUser.id}`);
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  }

  async function saveChanges() {
    if (!currentUser || !name.trim() || !age) return;
    setSaving(true);

    const updates: Record<string, unknown> = {
      name: name.trim(),
      age: parseInt(age),
      interests: selected,
      gender: gender || null,
      show_gender: showGender,
      neighborhood: neighborhood.trim(),
    };
    if (pendingAvatar) updates.avatar = pendingAvatar;

    await supabase.from("profiles").update(updates).eq("id", currentUser.id);

    updateGenderSettings(gender as Gender || undefined, showGender);
    if (pendingAvatar) setPendingAvatar(null);
    setSaving(false);
    setEditing(false);
  }

  function saveStatus() {
    updateStatus(statusText);
    setStatusSaved(true);
    setTimeout(() => setStatusSaved(false), 2000);
  }

  function saveEmergencyContact() {
    localStorage.setItem("hangr_ec_name", emergencyName);
    localStorage.setItem("hangr_ec_phone", emergencyPhone);
    setEmergencySaved(true);
    setTimeout(() => setEmergencySaved(false), 2000);
  }

  function submitCollegeVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!collegeEmail.endsWith(".edu") && !collegeEmail.includes("ac.in")) {
      setCollegeMsg("Use a .edu or .ac.in email address");
      return;
    }
    verifyCollege();
    setCollegeMsg("✓ College email verified!");
    setCollegeEmail("");
  }

  function startEditing() {
    if (!currentUser) return;
    setName(currentUser.name);
    setAge(currentUser.age?.toString() ?? "");
    setNeighborhood(currentUser.neighborhood ?? "");
    setSelected(currentUser.interests);
    setGender(currentUser.gender ?? "");
    setShowGender(currentUser.showGender);
    setPendingAvatar(null);
    setEditing(true);
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#e8eaf0] p-3 sm:p-5 lg:p-8">
      <div className="h-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 sm:gap-5">

        {/* ── LEFT: Profile Card ── */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden flex flex-col">

          {/* Hidden file inputs */}
          <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
          <input ref={coverFileRef}  type="file" accept="image/*" className="hidden" onChange={handleCoverFile} />

          {/* Cover */}
          <div
            className={`relative h-48 sm:h-56 flex-shrink-0 transition-all duration-500 ${coverImage ? "" : `bg-gradient-to-br ${coverCls}`}`}
            style={coverImage ? { backgroundImage: `url(${coverImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          >
            {/* Loading overlay for cover upload */}
            {uploadingCover && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Nav buttons */}
            <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-4">
              <button onClick={() => router.back()}
                className="w-9 h-9 rounded-full bg-white/80 backdrop-blur flex items-center justify-center text-gray-700 hover:bg-white transition-colors shadow-sm font-medium text-sm">
                ←
              </button>
              {editing && (
                <button onClick={() => setShowCoverPicker(!showCoverPicker)}
                  className="flex items-center gap-1.5 bg-white/80 backdrop-blur rounded-full px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white shadow-sm transition-colors">
                  🖼️ Change background
                </button>
              )}
            </div>

            {/* Cover picker */}
            {showCoverPicker && (
              <div className="absolute top-14 right-4 bg-white rounded-2xl shadow-xl p-3 z-20 border border-gray-100">
                {/* Upload from device */}
                <button onClick={() => coverFileRef.current?.click()}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold transition-colors mb-2">
                  <span className="text-base">📤</span> Upload from device
                </button>
                {/* Gradient swatches */}
                <p className="text-xs text-gray-400 mb-1.5 px-1">Or choose a gradient</p>
                <div className="flex gap-2">
                  {COVERS.map((c) => (
                    <button key={c.id} onClick={() => chooseCover(c.id)}
                      className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.cls} transition-all ${!coverImage && coverId === c.id ? "ring-2 ring-offset-1 ring-gray-800 scale-110" : "hover:scale-105"}`} />
                  ))}
                </div>
              </div>
            )}

            {/* Avatar row */}
            <div className="absolute -bottom-10 left-0 right-0 px-5 sm:px-6 flex items-end justify-between">
              <div className="relative" ref={avatarPickerRef}>
                <Avatar src={displayAvatar} size="lg" isFree={isFree} />

                {/* Change photo button */}
                {editing && (
                  <button onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs shadow-lg hover:bg-gray-700 transition-colors border-2 border-white"
                    title="Change photo">
                    📷
                  </button>
                )}

                {/* Avatar picker dropdown */}
                {showAvatarPicker && (
                  <div className="absolute top-24 left-0 z-20 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 w-64">
                    <p className="text-xs font-semibold text-gray-500 mb-2 px-1">Choose photo</p>

                    {/* Upload from device */}
                    <button onClick={() => avatarFileRef.current?.click()}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold transition-colors mb-2">
                      <span className="text-base">📤</span>
                      {uploadingAvatar ? "Uploading…" : "Upload from device"}
                    </button>

                    {/* Google photo option */}
                    {currentUser.avatar?.startsWith("http") && (
                      <button onClick={() => { setPendingAvatar(currentUser.avatar); setShowAvatarPicker(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors mb-2">
                        <img src={currentUser.avatar} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover" alt="" />
                        <span className="text-xs font-medium text-gray-700">Use Google photo</span>
                      </button>
                    )}

                    {/* Emoji grid */}
                    <p className="text-xs text-gray-400 mb-1.5 px-1">Or pick an avatar</p>
                    <div className="grid grid-cols-6 gap-1">
                      {AVATAR_EMOJIS.map((emoji) => (
                        <button key={emoji} onClick={() => { setPendingAvatar(emoji); setShowAvatarPicker(false); }}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl hover:bg-gray-100 transition-colors ${displayAvatar === emoji ? "bg-blue-50 ring-2 ring-blue-400" : ""}`}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button onClick={editing ? () => setEditing(false) : startEditing}
                className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors mb-1">
                {editing ? "✕ Cancel" : "✏️ Edit"}
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col pt-14 px-5 sm:px-6 pb-6">
            <p className="text-sm text-gray-400 mb-1">
              <span className="font-semibold text-gray-800">{myGroups.length}</span> groups&nbsp;·&nbsp;
              <span className="font-semibold text-gray-800">{currentUser.interests.length}</span> interests
            </p>

            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{currentUser.name}</h1>
            <p className="text-sm text-blue-500 font-medium mt-0.5 mb-2">
              @{currentUser.name.toLowerCase().replace(/\s+/g, "")}
            </p>

            <div className="mb-3">
              <TrustBadge score={currentUser.trustScore} reviewCount={currentUser.reviewCount}
                isVerified={currentUser.isVerified} collegeVerified={currentUser.collegeVerified} size="md" />
            </div>

            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              {currentUser.age} y/o · {currentUser.city}
              {currentUser.neighborhood && ` · ${currentUser.neighborhood}`}
              {currentUser.showGender && currentUser.gender && ` · ${currentUser.gender}`}
              {" · "}Down to hang out anytime 🙌
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 bg-gray-50 rounded-2xl overflow-hidden divide-x divide-gray-100 mb-5">
              {[
                { icon: isFree ? "🟢" : "⚫", value: isFree ? "Free" : "Busy", label: "right now" },
                { icon: "📍", value: currentUser.neighborhood || "—", label: "area" },
                { icon: "👥", value: myGroups.length, label: "sessions" },
              ].map(({ icon, value, label }) => (
                <div key={label} className="flex flex-col items-center py-3 px-2">
                  <span className="text-lg mb-1">{icon}</span>
                  <span className="text-sm font-bold text-gray-900 truncate max-w-full text-center">{value}</span>
                  <span className="text-xs text-gray-400 mt-0.5">{label}</span>
                </div>
              ))}
            </div>

            {/* Edit form */}
            {editing && (
              <div className="mb-5 p-4 bg-gray-50 rounded-2xl space-y-4 border border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Display name</label>
                    <input value={name} onChange={(e) => setName(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Age</label>
                    <input type="number" value={age} onChange={(e) => setAge(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Neighborhood</label>
                  <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="e.g. Crossing Republik"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Gender</label>
                  <div className="flex gap-2 mb-2">
                    {(["Male", "Female", "Other"] as Gender[]).map((g) => (
                      <button key={g} type="button" onClick={() => setGender(gender === g ? "" : g)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${gender === g ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"}`}>
                        {g}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={showGender} onChange={(e) => setShowGender(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" />
                    <span className="text-xs text-gray-600">Show gender on profile</span>
                  </label>
                </div>

                {/* Interests */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Interests</label>
                  <div className="flex flex-wrap gap-1.5">
                    {INTERESTS.map((i) => (
                      <button key={i} onClick={() => toggleInterest(i as Interest)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selected.includes(i as Interest) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
                        {INTEREST_EMOJI[i]} {i}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={saveChanges} disabled={saving}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm disabled:opacity-50">
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            )}

            <div className="flex-1" />

            {/* I'm Free CTA */}
            <button onClick={() => toggleFree()}
              className={`w-full flex items-center justify-between rounded-2xl px-5 py-4 font-bold text-white text-base transition-all active:scale-[0.98] ${
                isFree ? "bg-green-500 hover:bg-green-600 shadow-lg shadow-green-200" : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
              }`}>
              <span className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm">{isFree ? "🟢" : "😴"}</span>
                {isFree ? "I'm Free!" : "Go Free"}
              </span>
              <span className="bg-white/25 rounded-xl px-4 py-1.5 text-sm font-semibold">
                {isFree && freeUntil ? `${formatFreeUntil(freeUntil)} left` : "2h window"}
              </span>
            </button>
          </div>
        </div>

        {/* ── RIGHT: Status / Safety Card ── */}
        <div className="bg-white rounded-3xl shadow-lg flex flex-col overflow-hidden">
          <div className="flex border-b border-gray-100 px-2 pt-2">
            {(["status", "safety"] as RightTab[]).map((t) => (
              <button key={t} onClick={() => setRightTab(t)}
                className={`flex-1 py-3 text-sm font-semibold capitalize rounded-t-xl transition-colors ${
                  rightTab === t ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400 hover:text-gray-600"
                }`}>
                {t === "status" ? "📊 Status" : "🛡️ Safety"}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
            {rightTab === "status" ? (
              <>
                {/* Status text editor */}
                <div>
                  <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Your vibe right now</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {STATUS_PRESETS.map((p) => (
                      <button key={p} onClick={() => setStatusText(p)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${statusText === p ? "bg-blue-600 text-white border-blue-600" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300"}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={statusText} onChange={(e) => setStatusText(e.target.value)}
                      placeholder="Set a custom status…"
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button onClick={saveStatus}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors ${statusSaved ? "bg-green-100 text-green-700" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
                      {statusSaved ? "✓" : "Save"}
                    </button>
                  </div>
                  {currentUser.statusText && (
                    <p className="text-xs text-gray-400 mt-1.5 italic">Current: &quot;{currentUser.statusText}&quot;</p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Current mode</p>
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isFree ? "bg-green-100" : "bg-gray-100"}`}>
                      {isFree ? "🟢" : "⚫"}
                    </span>
                    <span className="text-4xl font-bold text-gray-900">{isFree ? "Visible" : "Hidden"}</span>
                  </div>
                  <button onClick={() => toggleFree()}
                    className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white transition-colors ${
                      isFree ? "bg-gray-900 hover:bg-gray-800" : "bg-blue-600 hover:bg-blue-700"
                    }`}>
                    <span className="text-lg">+</span>
                    {isFree ? "Go offline" : "I'm Free now"}
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-800">Interests</p>
                    <button onClick={startEditing} className="text-xs text-blue-600 font-semibold hover:underline">+ Edit</button>
                  </div>
                  {currentUser.interests.length === 0 ? (
                    <button onClick={startEditing} className="w-full text-center text-sm text-gray-400 py-4 border border-dashed border-gray-200 rounded-2xl hover:border-gray-300 hover:text-gray-500 transition-colors">
                      + Add interests
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {currentUser.interests.map((interest) => (
                        <div key={interest} className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl border border-gray-100">{INTEREST_EMOJI[interest]}</span>
                            <span className="text-sm font-semibold text-gray-800">{interest}</span>
                          </div>
                          <span className="text-gray-300 text-xl">›</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {myGroups.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-800 mb-3">My Groups</p>
                    <div className="space-y-2">
                      {myGroups.map((g) => (
                        <div key={g.id} onClick={() => router.push(`/groups/${g.id}`)}
                          className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3 hover:bg-gray-100 transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl border border-gray-100">{INTEREST_EMOJI[g.topic] ?? "✨"}</span>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{g.name}</p>
                              <p className="text-xs text-gray-400">{g.members.length}/{g.maxMembers} · {g.plannedTime}</p>
                            </div>
                          </div>
                          <span className="text-gray-300 text-xl">›</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-3">Verification</p>
                  <div className="space-y-2">
                    <div className={`flex items-center justify-between rounded-2xl px-4 py-3 ${currentUser.isVerified ? "bg-blue-50 border border-blue-100" : "bg-gray-50 border border-gray-200"}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🔵</span>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">Google Account</p>
                          <p className="text-xs text-gray-400">Sign in with Google to verify</p>
                        </div>
                      </div>
                      {currentUser.isVerified
                        ? <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full">✓ Verified</span>
                        : <button className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-full transition-colors">Verify</button>
                      }
                    </div>

                    <div className={`rounded-2xl px-4 py-3 ${currentUser.collegeVerified ? "bg-purple-50 border border-purple-100" : "bg-gray-50 border border-gray-200"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🎓</span>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">College Email</p>
                            <p className="text-xs text-gray-400">.edu or .ac.in email</p>
                          </div>
                        </div>
                        {currentUser.collegeVerified && (
                          <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2.5 py-1 rounded-full">✓ Verified</span>
                        )}
                      </div>
                      {!currentUser.collegeVerified && (
                        <form onSubmit={submitCollegeVerify} className="flex gap-2 mt-2">
                          <input value={collegeEmail} onChange={(e) => setCollegeEmail(e.target.value)}
                            placeholder="you@college.ac.in" type="email"
                            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-400" />
                          <button type="submit" className="px-3 py-2 bg-purple-600 text-white text-xs font-semibold rounded-xl hover:bg-purple-700 transition-colors">Verify</button>
                        </form>
                      )}
                      {collegeMsg && <p className={`text-xs mt-1.5 ${collegeMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{collegeMsg}</p>}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-3">Trust Score</p>
                  <div className="bg-gray-50 rounded-2xl px-4 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <TrustBadge score={currentUser.trustScore} reviewCount={currentUser.reviewCount} isVerified={false} collegeVerified={false} size="md" />
                      <span className="text-xs text-gray-400">{currentUser.reviewCount} reviews</span>
                    </div>
                    {currentUser.trustScore === 0 ? (
                      <p className="text-xs text-gray-400 mt-2">Join groups and meet people to build your trust score.</p>
                    ) : (
                      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${(currentUser.trustScore / 5) * 100}%` }} />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-3">Gender Privacy</p>
                  <div className="bg-gray-50 rounded-2xl px-4 py-3 space-y-3">
                    <div className="flex gap-2">
                      {(["Male", "Female", "Other"] as Gender[]).map((g) => (
                        <button key={g} type="button"
                          onClick={() => { const ng = currentUser.gender === g ? undefined : g; updateGenderSettings(ng, currentUser.showGender); }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${currentUser.gender === g ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200"}`}>
                          {g}
                        </button>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={currentUser.showGender} onChange={(e) => updateGenderSettings(currentUser.gender, e.target.checked)} className="w-4 h-4 accent-blue-600 rounded" />
                      <span className="text-sm text-gray-700">Show gender on my profile</span>
                    </label>
                    {currentUser.gender === "Female" && <p className="text-xs text-pink-600">♀ You can create women-only groups</p>}
                  </div>
                </div>

                {blockedUsers.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-800 mb-3">Blocked Users</p>
                    <div className="space-y-2">
                      {blockedUsers.map((u) => (
                        <div key={u.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <Avatar src={u.avatar} size="sm" />
                            <span className="text-sm text-gray-700">{u.name}</span>
                          </div>
                          <button onClick={() => unblockUser(u.id)} className="text-xs text-blue-600 font-medium hover:underline">Unblock</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Emergency contact — shown outside tab so it's always accessible */}
            {rightTab === "safety" && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-1">Emergency Contact</p>
                <p className="text-xs text-gray-400 mb-3">Saved on your device only. Share your location before a meetup.</p>
                <div className="bg-gray-50 rounded-2xl px-4 py-3 space-y-2">
                  <input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="Contact name (e.g. Mom)"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="Phone number" type="tel"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={saveEmergencyContact}
                    className={`w-full py-2 text-xs font-semibold rounded-xl transition-colors ${emergencySaved ? "bg-green-100 text-green-700" : "bg-gray-900 text-white hover:bg-gray-800"}`}>
                    {emergencySaved ? "✓ Saved" : "Save contact"}
                  </button>
                  {emergencyName && emergencyPhone && (
                    <a href={`sms:${emergencyPhone}&body=Hey, I'm heading to a hangout on hangr. Check in with me!`}
                      className="flex items-center justify-center gap-2 w-full py-2 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold rounded-xl hover:bg-orange-100 transition-colors">
                      📍 Alert {emergencyName} before meetup
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
              <span className="text-green-500 mt-0.5">✓</span>
              <p className="text-xs text-gray-500 leading-relaxed">You&apos;re only visible to people within your city. Your exact location is never shared.</p>
            </div>

            <button onClick={() => { logout(); router.push("/auth"); }}
              className="w-full py-3 border border-red-100 text-red-400 rounded-2xl text-sm font-medium hover:bg-red-50 transition-colors">
              Sign out
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
