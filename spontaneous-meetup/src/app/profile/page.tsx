"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Interest, Gender, Post } from "@/types";
import { INTERESTS, INTEREST_EMOJI } from "@/lib/mock-data";
import TrustBadge from "@/components/TrustBadge";
import { STATUS_PRESETS } from "@/components/UserCard";
import ImageCropModal from "@/components/ImageCropModal";

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
          className={`${dim} object-cover border-4 border-white shadow-md`} />
      ) : (
        <div className={`${dim} bg-gradient-to-br from-blue-500 to-violet-500 border-4 border-white shadow-md flex items-center justify-center font-bold text-white`}>
          {isEmoji ? src : (src?.slice(0, 2).toUpperCase() ?? "?")}
        </div>
      )}
      {isFree !== undefined && (
        <span className={`absolute ${dotSize} bg-green-500 border-2 border-white ${isFree ? "" : "opacity-0"}`} />
      )}
    </div>
  );
}

// ── Loading skeleton ─────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#F2F1EB] p-3 sm:p-5 lg:p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 sm:gap-5">
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_#0A0A0A] overflow-hidden">
          <div className="h-48 sm:h-56 bg-gradient-to-br from-blue-200 to-purple-200 animate-pulse" />
          <div className="pt-14 px-6 pb-6 space-y-4">
            <div className="h-4 w-24 bg-gray-200 animate-pulse" />
            <div className="h-8 w-48 bg-gray-200 animate-pulse" />
            <div className="h-4 w-32 bg-gray-100 animate-pulse" />
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 animate-pulse" />)}
            </div>
          </div>
        </div>
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_#0A0A0A] h-64 animate-pulse" />
      </div>
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
    nearbyUsers, updateStatus, posts, isAuthLoading,
  } = useStore();

  const [editing, setEditing]       = useState(false);
  const [name, setName]             = useState("");
  const [age, setAge]               = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [selected, setSelected]     = useState<Interest[]>([]);
  const [gender, setGender]         = useState<Gender | "">("");
  const [showGender, setShowGender] = useState(true);
  const [rightTab, setRightTab]     = useState<RightTab>("status");
  const [collegeEmail, setCollegeEmail] = useState("");
  const [collegeMsg, setCollegeMsg] = useState("");
  const [statusText, setStatusText] = useState("");
  const [statusSaved, setStatusSaved] = useState(false);
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencySaved, setEmergencySaved] = useState(false);
  const [safetyTimerMins, setSafetyTimerMins] = useState(0);
  const [verifiedPingsOnly, setVerifiedPingsOnly] = useState(false);

  // Avatar & cover pickers
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker]   = useState(false);
  const [pendingAvatar, setPendingAvatar]       = useState<string | null>(null);
  const [coverId, setCoverId]                   = useState<string>("");
  const [coverImage, setCoverImage]             = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [cropModal, setCropModal] = useState<{ file: File; type: "avatar" | "cover" } | null>(null);

  // Highlights
  const [highlightIds, setHighlightIds] = useState<string[]>([]);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  const avatarPickerRef  = useRef<HTMLDivElement>(null);
  const avatarFileRef    = useRef<HTMLInputElement>(null);
  const coverFileRef     = useRef<HTMLInputElement>(null);

  // ── ALL useMemo calls MUST be before any conditional return ──────────────
  const myGroups = useMemo(
    () => groups.filter((g) => currentUser && g.members.some((m) => m.id === currentUser.id)),
    [groups, currentUser]
  );
  const blockedUsers = useMemo(
    () => nearbyUsers.filter((u) => blockedUserIds.includes(u.id)),
    [nearbyUsers, blockedUserIds]
  );
  const myPosts = useMemo(
    () => posts.filter((p) => currentUser && p.userId === currentUser.id),
    [posts, currentUser]
  );
  const highlightedPosts = useMemo(
    () => myPosts.filter((p) => highlightIds.includes(p.id)),
    [myPosts, highlightIds]
  );

  // Initialise localStorage-backed state once
  useEffect(() => {
    if (typeof window === "undefined") return;
    setEmergencyName(localStorage.getItem("hangr_ec_name") ?? "");
    setEmergencyPhone(localStorage.getItem("hangr_ec_phone") ?? "");
    setSafetyTimerMins(parseInt(localStorage.getItem("hangr_safety_timer_mins") ?? "0"));
    setVerifiedPingsOnly(localStorage.getItem("hangr_verified_pings_only") === "true");
  }, []);

  // Load persisted cover from localStorage
  useEffect(() => {
    if (!currentUser) return;
    const img = localStorage.getItem(`hangr_cover_img_${currentUser.id}`);
    if (img) { setCoverImage(img); return; }
    const saved = localStorage.getItem(`hangr_cover_${currentUser.id}`);
    setCoverId(saved ?? pickDefaultCover(currentUser.name));
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load highlights from localStorage
  useEffect(() => {
    if (!currentUser) return;
    const saved = localStorage.getItem(`hangr_highlights_${currentUser.id}`);
    if (saved) setHighlightIds(JSON.parse(saved));
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync edit form state when user loads
  useEffect(() => {
    if (!currentUser) return;
    setStatusText(currentUser.statusText ?? "");
  }, [currentUser?.statusText]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Guard: redirect unauthenticated users ────────────────────────────────
  useEffect(() => {
    if (!isAuthLoading && !currentUser) router.replace("/auth");
  }, [isAuthLoading, currentUser, router]);

  if (isAuthLoading) return <ProfileSkeleton />;
  if (!currentUser) return <ProfileSkeleton />;

  const displayAvatar = pendingAvatar ?? currentUser.avatar;
  const coverCls      = getCoverCls(coverId);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function toggleHighlight(postId: string) {
    const next = highlightIds.includes(postId)
      ? highlightIds.filter((id) => id !== postId)
      : [...highlightIds, postId];
    setHighlightIds(next);
    localStorage.setItem(`hangr_highlights_${currentUser!.id}`, JSON.stringify(next));
  }

  function toggleInterest(i: Interest) {
    setSelected((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
  }

  function chooseCover(id: string) {
    setCoverId(id);
    setCoverImage(null);
    localStorage.setItem(`hangr_cover_${currentUser.id}`, id);
    localStorage.removeItem(`hangr_cover_img_${currentUser.id}`);
    setShowCoverPicker(false);
  }

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowAvatarPicker(false);
    setCropModal({ file, type: "avatar" });
    e.target.value = "";
  }

  function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowCoverPicker(false);
    setCropModal({ file, type: "cover" });
    e.target.value = "";
  }

  function onCropConfirm(dataUrl: string) {
    if (!cropModal) return;
    if (cropModal.type === "avatar") {
      setPendingAvatar(dataUrl);
    } else {
      setCoverImage(dataUrl);
      localStorage.setItem(`hangr_cover_img_${currentUser.id}`, dataUrl);
      localStorage.removeItem(`hangr_cover_${currentUser.id}`);
    }
    setCropModal(null);
  }

  async function saveChanges() {
    if (!name.trim() || !age) return;
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
    setName(currentUser.name);
    setAge(currentUser.age?.toString() ?? "");
    setNeighborhood(currentUser.neighborhood ?? "");
    setSelected(currentUser.interests);
    setGender(currentUser.gender ?? "");
    setShowGender(currentUser.showGender);
    setPendingAvatar(null);
    setEditing(true);
  }

  async function handleSignOut() {
    setLoggingOut(true);
    await logout();
    router.replace("/auth");
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#F2F1EB] p-3 sm:p-5 lg:p-8">
      <div className="h-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 sm:gap-5">

        {/* ── LEFT: Profile Card ── */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_#0A0A0A] overflow-hidden flex flex-col">

          {/* Hidden file inputs */}
          <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
          <input ref={coverFileRef}  type="file" accept="image/*" className="hidden" onChange={handleCoverFile} />

          {/* Cover */}
          <div
            className={`relative h-48 sm:h-56 flex-shrink-0 transition-all duration-500 ${coverImage ? "" : `bg-gradient-to-br ${coverCls}`}`}
            style={coverImage ? { backgroundImage: `url(${coverImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          >
            {/* Nav buttons */}
            <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-4">
              <button onClick={() => router.back()}
                className="border-2 border-black bg-white text-black font-bold w-9 h-9 flex items-center justify-center hover:bg-[#FFE500] transition-colors">
                ←
              </button>
              {editing && (
                <button onClick={() => setShowCoverPicker(!showCoverPicker)}
                  className="flex items-center gap-1.5 border-2 border-black bg-white px-3 py-1.5 text-xs font-black uppercase text-black hover:bg-[#FFE500] transition-colors shadow-[2px_2px_0_#0A0A0A]">
                  🖼️ Change background
                </button>
              )}
            </div>

            {/* Cover picker */}
            {showCoverPicker && (
              <div className="absolute top-14 right-4 bg-white border-2 border-black shadow-[4px_4px_0_#0A0A0A] p-3 z-20">
                <button onClick={() => coverFileRef.current?.click()}
                  className="w-full flex items-center gap-2 px-3 py-2 border-2 border-black bg-[#F2F1EB] hover:bg-[#FFE500] text-black text-xs font-black uppercase transition-colors mb-2">
                  <span className="text-base">📤</span> Upload from device
                </button>
                <p className="text-xs font-mono text-black/40 uppercase mb-1.5 px-1">Or choose a gradient</p>
                <div className="flex gap-2">
                  {COVERS.map((c) => (
                    <button key={c.id} onClick={() => chooseCover(c.id)}
                      className={`w-9 h-9 bg-gradient-to-br ${c.cls} transition-all border-2 ${!coverImage && coverId === c.id ? "border-black scale-110" : "border-transparent hover:border-black hover:scale-105"}`} />
                  ))}
                </div>
              </div>
            )}

            {/* Avatar row */}
            <div className="absolute -bottom-10 left-0 right-0 px-5 sm:px-6 flex items-end justify-between">
              <div className="relative" ref={avatarPickerRef}>
                <Avatar src={displayAvatar} size="lg" isFree={isFree} />

                {editing && (
                  <button onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    className="absolute -bottom-1 -right-1 w-7 h-7 border-2 border-black border-white bg-black text-white flex items-center justify-center text-xs hover:bg-[#FFE500] hover:text-black transition-colors"
                    title="Change photo">
                    📷
                  </button>
                )}

                {showAvatarPicker && (
                  <div className="absolute top-24 left-0 z-20 bg-white border-2 border-black shadow-[4px_4px_0_#0A0A0A] p-3 w-64">
                    <p className="text-xs font-black uppercase text-black mb-2 px-1">Choose photo</p>
                    <button onClick={() => avatarFileRef.current?.click()}
                      className="w-full flex items-center gap-2 px-3 py-2 border-2 border-black bg-[#F2F1EB] hover:bg-[#FFE500] text-black text-xs font-black uppercase transition-colors mb-2">
                      <span className="text-base">📤</span>
                      Upload from device
                    </button>
                    {currentUser.avatar?.startsWith("http") && (
                      <button onClick={() => { setPendingAvatar(currentUser.avatar); setShowAvatarPicker(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 border-2 border-black hover:bg-[#FFE500] transition-colors mb-2">
                        <img src={currentUser.avatar} referrerPolicy="no-referrer" className="w-8 h-8 object-cover" alt="" />
                        <span className="text-xs font-black uppercase text-black">Use Google photo</span>
                      </button>
                    )}
                    <p className="text-xs font-mono text-black/40 uppercase mb-1.5 px-1">Or pick an avatar</p>
                    <div className="grid grid-cols-6 gap-1">
                      {AVATAR_EMOJIS.map((emoji) => (
                        <button key={emoji} onClick={() => { setPendingAvatar(emoji); setShowAvatarPicker(false); }}
                          className={`w-9 h-9 flex items-center justify-center text-xl hover:bg-[#FFE500] transition-colors border-2 ${displayAvatar === emoji ? "border-black bg-[#FFE500]" : "border-transparent"}`}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button onClick={editing ? () => setEditing(false) : startEditing}
                className="border-2 border-black bg-white font-black uppercase px-4 py-1.5 text-sm hover:bg-[#FFE500] transition-colors mb-1">
                {editing ? "✕ Cancel" : "✏️ Edit"}
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col pt-14 px-5 sm:px-6 pb-6">
            <p className="text-sm text-black/40 font-mono uppercase mb-1">
              <span className="font-black text-black">{myGroups.length}</span> groups&nbsp;·&nbsp;
              <span className="font-black text-black">{currentUser.interests.length}</span> interests
            </p>

            <h1 className="font-black uppercase text-3xl text-black leading-tight">{currentUser.name}</h1>
            <p className="font-mono text-sm text-black/50 uppercase mt-0.5 mb-2">
              @{currentUser.name.toLowerCase().replace(/\s+/g, "")}
            </p>

            <div className="mb-3">
              <TrustBadge score={currentUser.trustScore} reviewCount={currentUser.reviewCount}
                isVerified={currentUser.isVerified} collegeVerified={currentUser.collegeVerified} size="md" />
            </div>

            <p className="text-sm text-black/60 mb-4 leading-relaxed font-mono">
              {currentUser.age} y/o · {currentUser.city}
              {currentUser.neighborhood && ` · ${currentUser.neighborhood}`}
              {currentUser.showGender && currentUser.gender && ` · ${currentUser.gender}`}
              {" · "}Down to hang out anytime 🙌
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 border-2 border-black overflow-hidden mb-5">
              {[
                { icon: isFree ? "🟢" : "⚫", value: isFree ? "Free" : "Busy", label: "right now" },
                { icon: "📍", value: currentUser.neighborhood || "—", label: "area" },
                { icon: "👥", value: myGroups.length, label: "sessions" },
              ].map(({ icon, value, label }, idx) => (
                <div key={label} className={`flex flex-col items-center py-3 px-2 ${idx < 2 ? "border-r-2 border-black" : ""}`}>
                  <span className="text-lg mb-1">{icon}</span>
                  <span className="text-sm font-black text-black truncate max-w-full text-center uppercase">{value}</span>
                  <span className="text-xs font-mono text-black/40 uppercase mt-0.5">{label}</span>
                </div>
              ))}
            </div>

            {/* Edit form */}
            {editing && (
              <div className="mb-5 p-4 border-2 border-black bg-[#F2F1EB] space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase text-black mb-1">Display name</label>
                    <input value={name} onChange={(e) => setName(e.target.value)}
                      className="w-full border-2 border-black bg-white px-3 py-2 text-sm focus:outline-none focus:shadow-[2px_2px_0_#0A0A0A] transition-shadow" />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-black mb-1">Age</label>
                    <input type="number" value={age} onChange={(e) => setAge(e.target.value)}
                      className="w-full border-2 border-black bg-white px-3 py-2 text-sm focus:outline-none focus:shadow-[2px_2px_0_#0A0A0A] transition-shadow" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-black mb-1">Neighborhood</label>
                  <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="e.g. Crossing Republik"
                    className="w-full border-2 border-black bg-white px-3 py-2 text-sm focus:outline-none focus:shadow-[2px_2px_0_#0A0A0A] transition-shadow" />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-black uppercase text-black mb-1.5">Gender</label>
                  <div className="flex gap-2 mb-2">
                    {(["Male", "Female", "Other"] as Gender[]).map((g) => (
                      <button key={g} type="button" onClick={() => setGender(gender === g ? "" : g)}
                        className={`flex-1 py-1.5 text-xs font-black uppercase border-2 border-black transition-all ${gender === g ? "bg-black text-[#FFE500]" : "bg-white text-black hover:bg-[#FFE500]"}`}>
                        {g}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={showGender} onChange={(e) => setShowGender(e.target.checked)} className="w-3.5 h-3.5 accent-black" />
                    <span className="text-xs font-mono text-black/60 uppercase">Show gender on profile</span>
                  </label>
                </div>

                {/* Interests */}
                <div>
                  <label className="block text-xs font-black uppercase text-black mb-1.5">Interests</label>
                  <div className="flex flex-wrap gap-1.5">
                    {INTERESTS.map((i) => (
                      <button key={i} onClick={() => toggleInterest(i as Interest)}
                        className={`border-2 border-black text-xs font-bold uppercase px-3 py-1.5 transition-all ${selected.includes(i as Interest) ? "bg-black text-[#FFE500]" : "bg-white text-black hover:bg-[#FFE500]"}`}>
                        {INTEREST_EMOJI[i]} {i}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={saveChanges} disabled={saving}
                  className="w-full bg-[#FFE500] border-2 border-black text-black font-black uppercase py-2.5 hover:shadow-[2px_2px_0_#0A0A0A] transition-shadow text-sm disabled:opacity-50">
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            )}

            <div className="flex-1" />

            {/* I'm Free CTA */}
            <button onClick={() => toggleFree()}
              className={`w-full flex items-center justify-between border-2 border-black px-5 py-4 font-black text-white text-base transition-all active:scale-[0.98] ${
                isFree ? "bg-green-500 hover:bg-green-600" : "bg-black hover:bg-black/80"
              }`}>
              <span className="flex items-center gap-3">
                <span className="w-7 h-7 border-2 border-white/40 flex items-center justify-center text-sm">{isFree ? "🟢" : "😴"}</span>
                <span className="uppercase tracking-wide">{isFree ? "I'm Free!" : "Go Free"}</span>
              </span>
              <span className="border-2 border-white/40 px-4 py-1.5 text-sm font-black uppercase">
                {isFree && freeUntil ? `${formatFreeUntil(freeUntil)} left` : "2h window"}
              </span>
            </button>
          </div>
        </div>

        {/* ── RIGHT: Status / Safety Card ── */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_#0A0A0A] flex flex-col overflow-hidden">
          <div className="flex border-b-2 border-black px-2 pt-2">
            {(["status", "safety"] as RightTab[]).map((t) => (
              <button key={t} onClick={() => setRightTab(t)}
                className={`flex-1 py-3 text-sm font-black uppercase transition-colors ${
                  rightTab === t ? "border-b-4 border-black text-black" : "text-black/40 hover:text-black border-b-4 border-transparent"
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
                  <p className="text-xs font-black uppercase tracking-wide text-black mb-2">Your vibe right now</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {STATUS_PRESETS.map((p) => (
                      <button key={p} onClick={() => setStatusText(p)}
                        className={`text-xs px-3 py-1.5 border-2 border-black font-bold uppercase transition-all ${statusText === p ? "bg-black text-[#FFE500]" : "bg-white text-black hover:bg-[#FFE500]"}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={statusText} onChange={(e) => setStatusText(e.target.value)}
                      placeholder="Set a custom status…"
                      className="flex-1 border-2 border-black bg-white px-3 py-2 text-sm focus:outline-none focus:shadow-[2px_2px_0_#0A0A0A] transition-shadow" />
                    <button onClick={saveStatus}
                      className={`px-3 py-2 text-xs font-black uppercase border-2 border-black transition-colors ${statusSaved ? "bg-[#00C44A] text-black" : "bg-black text-[#FFE500] hover:bg-[#FFE500] hover:text-black"}`}>
                      {statusSaved ? "✓" : "Save"}
                    </button>
                  </div>
                  {currentUser.statusText && (
                    <p className="text-xs font-mono text-black/40 uppercase mt-1.5">Current: &quot;{currentUser.statusText}&quot;</p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-black mb-2">Current mode</p>
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`w-10 h-10 border-2 border-black flex items-center justify-center text-lg ${isFree ? "bg-green-100" : "bg-[#F2F1EB]"}`}>
                      {isFree ? "🟢" : "⚫"}
                    </span>
                    <span className="text-4xl font-black uppercase text-black">{isFree ? "Visible" : "Hidden"}</span>
                  </div>
                  <button onClick={() => toggleFree()}
                    className={`w-full flex items-center justify-center gap-2 border-2 border-black py-3.5 font-black uppercase text-white transition-colors ${
                      isFree ? "bg-black hover:bg-black/80" : "bg-black hover:bg-black/80"
                    }`}>
                    <span className="text-lg">+</span>
                    {isFree ? "Go offline" : "I'm Free now"}
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-black uppercase text-black">Interests</p>
                    <button onClick={startEditing} className="text-xs font-black uppercase border-2 border-black px-2 py-0.5 hover:bg-[#FFE500] transition-colors">+ Edit</button>
                  </div>
                  {currentUser.interests.length === 0 ? (
                    <button onClick={startEditing} className="w-full text-center text-sm text-black/40 py-4 border-2 border-dashed border-black hover:bg-[#FFE500] hover:text-black transition-colors font-mono uppercase text-xs">
                      + Add interests
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {currentUser.interests.map((interest) => (
                        <div key={interest} className="flex items-center justify-between border-2 border-black bg-[#F2F1EB] px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center text-xl">{INTEREST_EMOJI[interest]}</span>
                            <span className="text-sm font-black uppercase text-black">{interest}</span>
                          </div>
                          <span className="text-black/30 text-xl">›</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {myGroups.length > 0 && (
                  <div>
                    <p className="text-sm font-black uppercase text-black mb-3">My Groups</p>
                    <div className="space-y-2">
                      {myGroups.map((g) => (
                        <div key={g.id} onClick={() => router.push(`/groups/${g.id}`)}
                          className="flex items-center justify-between border-2 border-black bg-[#F2F1EB] px-4 py-3 hover:bg-[#FFE500] transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            <span className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center text-xl">{INTEREST_EMOJI[g.topic] ?? "✨"}</span>
                            <div>
                              <p className="text-sm font-black uppercase text-black">{g.name}</p>
                              <p className="text-xs font-mono text-black/40 uppercase">{g.members.length}/{g.maxMembers} · {g.plannedTime}</p>
                            </div>
                          </div>
                          <span className="text-black/30 text-xl">›</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-black uppercase text-black mb-3">Verification</p>
                  <div className="space-y-2">
                    <div className={`flex items-center justify-between border-2 border-black px-4 py-3 ${currentUser.isVerified ? "bg-[#F2F1EB]" : "bg-white"}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🔵</span>
                        <div>
                          <p className="text-sm font-black uppercase text-black">Google Account</p>
                          <p className="text-xs font-mono text-black/40 uppercase">Sign in with Google to verify</p>
                        </div>
                      </div>
                      {currentUser.isVerified
                        ? <span className="border-2 border-black bg-black text-[#FFE500] text-xs font-black uppercase px-2 py-0.5">✓ Verified</span>
                        : <button className="border-2 border-black bg-black text-[#FFE500] text-xs font-black uppercase px-2 py-0.5 hover:bg-[#FFE500] hover:text-black transition-colors">Verify</button>
                      }
                    </div>

                    <div className={`border-2 border-black px-4 py-3 ${currentUser.collegeVerified ? "bg-[#F2F1EB]" : "bg-white"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🎓</span>
                          <div>
                            <p className="text-sm font-black uppercase text-black">College Email</p>
                            <p className="text-xs font-mono text-black/40 uppercase">.edu or .ac.in email</p>
                          </div>
                        </div>
                        {currentUser.collegeVerified && (
                          <span className="border-2 border-black bg-black text-[#FFE500] text-xs font-black uppercase px-2 py-0.5">✓ Verified</span>
                        )}
                      </div>
                      {!currentUser.collegeVerified && (
                        <form onSubmit={submitCollegeVerify} className="flex gap-2 mt-2">
                          <input value={collegeEmail} onChange={(e) => setCollegeEmail(e.target.value)}
                            placeholder="you@college.ac.in" type="email"
                            className="flex-1 border-2 border-black bg-white px-3 py-2 text-xs focus:outline-none focus:shadow-[2px_2px_0_#0A0A0A] transition-shadow" />
                          <button type="submit" className="border-2 border-black bg-black text-[#FFE500] text-xs font-black uppercase px-3 py-2 hover:bg-[#FFE500] hover:text-black transition-colors">Verify</button>
                        </form>
                      )}
                      {collegeMsg && <p className={`text-xs font-mono uppercase mt-1.5 ${collegeMsg.startsWith("✓") ? "text-green-700" : "text-[#FF2D2D]"}`}>{collegeMsg}</p>}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-black uppercase text-black mb-3">Trust Score</p>
                  <div className="border-2 border-black bg-[#F2F1EB] px-4 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <TrustBadge score={currentUser.trustScore} reviewCount={currentUser.reviewCount} isVerified={false} collegeVerified={false} size="md" />
                      <span className="text-xs font-mono text-black/40 uppercase">{currentUser.reviewCount} reviews</span>
                    </div>
                    {currentUser.trustScore === 0 ? (
                      <p className="text-xs font-mono text-black/40 uppercase mt-2">Join groups and meet people to build your trust score.</p>
                    ) : (
                      <div className="mt-2 h-2 border-2 border-black overflow-hidden">
                        <div className="h-full bg-black transition-all" style={{ width: `${(currentUser.trustScore / 5) * 100}%` }} />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-black uppercase text-black mb-3">Gender Privacy</p>
                  <div className="border-2 border-black bg-[#F2F1EB] px-4 py-3 space-y-3">
                    <div className="flex gap-2">
                      {(["Male", "Female", "Other"] as Gender[]).map((g) => (
                        <button key={g} type="button"
                          onClick={() => { const ng = currentUser.gender === g ? undefined : g; updateGenderSettings(ng, currentUser.showGender); }}
                          className={`flex-1 py-1.5 text-xs font-black uppercase border-2 border-black transition-all ${currentUser.gender === g ? "bg-black text-[#FFE500]" : "bg-white text-black hover:bg-[#FFE500]"}`}>
                          {g}
                        </button>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={currentUser.showGender} onChange={(e) => updateGenderSettings(currentUser.gender, e.target.checked)} className="w-4 h-4 accent-black" />
                      <span className="text-sm font-mono text-black/60 uppercase text-xs">Show gender on my profile</span>
                    </label>
                    {currentUser.gender === "Female" && <p className="text-xs font-mono text-black/60 uppercase">♀ You can create women-only groups</p>}
                  </div>
                </div>

                {blockedUsers.length > 0 && (
                  <div>
                    <p className="text-sm font-black uppercase text-black mb-3">Blocked Users</p>
                    <div className="space-y-2">
                      {blockedUsers.map((u) => (
                        <div key={u.id} className="flex items-center justify-between border-2 border-black bg-[#F2F1EB] px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <Avatar src={u.avatar} size="sm" />
                            <span className="text-sm font-bold text-black uppercase">{u.name}</span>
                          </div>
                          <button onClick={() => unblockUser(u.id)} className="text-xs font-black uppercase border-2 border-black px-2 py-0.5 hover:bg-[#FFE500] transition-colors">Unblock</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emergency Contact */}
                <div>
                  <p className="text-sm font-black uppercase text-black mb-1">Emergency Contact</p>
                  <p className="text-xs font-mono text-black/40 uppercase mb-3">Saved on your device only. Share your location before a meetup.</p>
                  <div className="border-2 border-black bg-[#F2F1EB] px-4 py-3 space-y-2">
                    <input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="Contact name (e.g. Mom)"
                      className="w-full border-2 border-black bg-white px-3 py-2 text-sm focus:outline-none focus:shadow-[2px_2px_0_#0A0A0A] transition-shadow" />
                    <input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="Phone number" type="tel"
                      className="w-full border-2 border-black bg-white px-3 py-2 text-sm focus:outline-none focus:shadow-[2px_2px_0_#0A0A0A] transition-shadow" />
                    <button onClick={saveEmergencyContact}
                      className={`w-full py-2 text-xs font-black uppercase border-2 border-black transition-colors ${emergencySaved ? "bg-[#00C44A] text-black" : "bg-black text-[#FFE500] hover:bg-[#FFE500] hover:text-black"}`}>
                      {emergencySaved ? "✓ Saved" : "Save contact"}
                    </button>
                    {emergencyName && emergencyPhone && (
                      <a href={`sms:${emergencyPhone}&body=Hey, I'm heading to a hangout on hangr. Check in with me!`}
                        className="flex items-center justify-center gap-2 w-full py-2 border-2 border-black bg-white text-black text-xs font-black uppercase hover:bg-[#FFE500] transition-colors">
                        📍 Alert {emergencyName} before meetup
                      </a>
                    )}
                  </div>
                </div>

                {/* Auto-SOS Timer */}
                <div>
                  <p className="text-sm font-black uppercase text-black mb-1">Auto-SOS Timer</p>
                  <p className="text-xs font-mono text-black/40 uppercase mb-3">
                    Starts when you join a meetup. If you don&apos;t tap &quot;I&apos;m Safe&quot; before it ends, an urgent SOS alert fires automatically.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {([{ label: "Off", value: 0 }, { label: "30 min", value: 30 }, { label: "1 hr", value: 60 }, { label: "2 hrs", value: 120 }, { label: "3 hrs", value: 180 }]).map(({ label, value }) => (
                      <button key={value}
                        onClick={() => { setSafetyTimerMins(value); localStorage.setItem("hangr_safety_timer_mins", String(value)); }}
                        className={`px-3 py-1.5 border-2 border-black text-xs font-black uppercase transition-colors ${safetyTimerMins === value ? "bg-[#FF2D2D] border-black text-white" : "border-black bg-white hover:bg-[#FFE500] text-black"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {safetyTimerMins > 0 && !emergencyName && (
                    <p className="text-xs font-mono text-black/60 uppercase mt-2">⚠️ Add an emergency contact above to activate this timer</p>
                  )}
                  {safetyTimerMins > 0 && emergencyName && (
                    <p className="text-xs font-mono text-green-700 uppercase mt-2">✓ Timer active — will auto-fire SOS to {emergencyName} if you don&apos;t check in</p>
                  )}
                </div>

                {/* Women's safety section */}
                {currentUser.gender === "Female" && (
                  <div className="border-2 border-black bg-[#F2F1EB] px-4 py-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-black">♀</span>
                      <p className="text-sm font-black uppercase text-black">Women&apos;s Safety Settings</p>
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={verifiedPingsOnly}
                        onChange={(e) => {
                          setVerifiedPingsOnly(e.target.checked);
                          localStorage.setItem("hangr_verified_pings_only", String(e.target.checked));
                        }}
                        className="w-4 h-4 mt-0.5 accent-black flex-shrink-0" />
                      <div>
                        <p className="text-xs font-black uppercase text-black">Only show pings from verified users</p>
                        <p className="text-xs font-mono text-black/40 uppercase mt-0.5">Pings from unverified accounts are hidden from your inbox</p>
                      </div>
                    </label>
                    <div className="space-y-1.5 pt-1 border-t-2 border-black">
                      <p className="text-xs font-black uppercase text-black">Before every meetup</p>
                      {[
                        "Join only women-only or verified groups",
                        "Tell your emergency contact where you're going",
                        "Use the SOS button inside any group if you feel unsafe",
                        "The fake safety call feature can help you exit politely",
                      ].map((tip) => (
                        <div key={tip} className="flex items-start gap-1.5">
                          <span className="text-black/40 text-xs mt-0.5">•</span>
                          <p className="text-xs font-mono text-black/60 uppercase">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex items-start gap-3 border-2 border-black bg-[#00C44A] text-black px-4 py-3">
              <span className="text-black mt-0.5">✓</span>
              <p className="text-xs font-mono text-black/80 uppercase leading-relaxed">You&apos;re only visible to people within your city. Your exact location is never shared.</p>
            </div>

            <button
              onClick={handleSignOut}
              disabled={loggingOut}
              className="border-2 border-black bg-white text-[#FF2D2D] font-black uppercase py-3 w-full hover:bg-[#FF2D2D] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>

      </div>

      {/* ── Highlights manager ── */}
      <div className="max-w-2xl mx-auto px-3 sm:px-4 pb-8 mt-2">
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_#0A0A0A] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-4 border-b-2 border-black">
            <div>
              <p className="text-sm font-black uppercase text-black">✨ Highlights</p>
              <p className="text-xs font-mono text-black/40 uppercase mt-0.5">Pin posts to your public profile</p>
            </div>
            {myPosts.length > 0 && (
              <button onClick={() => setShowHighlightPicker(v => !v)}
                className="border-2 border-black font-black uppercase text-xs px-3 py-1 hover:bg-[#FFE500] transition-colors"
                style={{ background: showHighlightPicker ? "#0A0A0A" : "transparent", color: showHighlightPicker ? "#FFE500" : "#0A0A0A" }}>
                {showHighlightPicker ? "Done" : "+ Manage"}
              </button>
            )}
          </div>

          {!showHighlightPicker && (
            highlightedPosts.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-3xl mb-2">📌</p>
                <p className="text-sm font-black uppercase text-black">No highlights yet</p>
                <p className="text-xs font-mono text-black/40 uppercase mt-1">
                  {myPosts.length === 0 ? "Post something first, then pin it here" : "Tap '+ Manage' to pin your best posts"}
                </p>
              </div>
            ) : (
              <div className="divide-y-2 divide-black">
                {highlightedPosts.map(post => (
                  <div key={post.id} className="flex items-start gap-3 px-4 py-3.5">
                    <div className="w-9 h-9 border-2 border-black flex items-center justify-center text-lg flex-shrink-0 bg-[#F2F1EB]">
                      {post.topic ? INTEREST_EMOJI[post.topic as Interest] : "📝"}
                    </div>
                    <div className="flex-1 min-w-0">
                      {post.topic && <span className="text-[11px] font-black uppercase px-2 py-0.5 mb-1 inline-block border-2 border-black bg-[#F2F1EB] text-black">{post.topic}</span>}
                      <p className="text-sm text-black leading-relaxed line-clamp-2 font-medium">{post.text}</p>
                    </div>
                    <button onClick={() => toggleHighlight(post.id)}
                      className="w-7 h-7 flex items-center justify-center border-2 border-black hover:bg-[#FF2D2D] hover:text-white text-black/30 transition-colors flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {showHighlightPicker && (
            <div>
              {myPosts.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-3xl mb-2">✍️</p>
                  <p className="text-sm font-mono text-black/40 uppercase">You haven't posted anything yet</p>
                </div>
              ) : (
                <div className="divide-y-2 divide-black">
                  {myPosts.map(post => {
                    const isPinned = highlightIds.includes(post.id);
                    return (
                      <button key={post.id} onClick={() => toggleHighlight(post.id)}
                        className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors ${isPinned ? "bg-[#FFE500]" : "hover:bg-[#F2F1EB]"}`}>
                        <div className={`w-9 h-9 border-2 border-black flex items-center justify-center text-lg flex-shrink-0 ${isPinned ? "bg-black" : "bg-[#F2F1EB]"}`}>
                          <span className={isPinned ? "grayscale-0" : ""}>{post.topic ? INTEREST_EMOJI[post.topic as Interest] : "📝"}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          {post.topic && <span className="text-[11px] font-black uppercase px-2 py-0.5 mb-1 inline-block border-2 border-black bg-white text-black">{post.topic}</span>}
                          <p className="text-sm text-black leading-relaxed line-clamp-2 font-medium">{post.text}</p>
                        </div>
                        <div className={`w-6 h-6 border-2 border-black flex items-center justify-center flex-shrink-0 transition-all ${isPinned ? "bg-black" : "bg-white"}`}>
                          {isPinned && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFE500" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {cropModal && (
        <ImageCropModal
          file={cropModal.file}
          aspectRatio={cropModal.type === "avatar" ? 1 : 1200 / 480}
          shape={cropModal.type === "avatar" ? "circle" : "rect"}
          onConfirm={onCropConfirm}
          onCancel={() => setCropModal(null)}
        />
      )}
    </div>
  );
}
