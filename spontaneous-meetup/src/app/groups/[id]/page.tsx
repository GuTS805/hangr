"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useGroupMessages } from "@/hooks/useGroupMessages";
import InterestBadge from "@/components/InterestBadge";
import TrustBadge from "@/components/TrustBadge";
import ReportModal from "@/components/ReportModal";
import ReviewModal from "@/components/ReviewModal";
import { SAFE_LOCATIONS, SAFE_LOCATION_ICONS } from "@/lib/mock-data";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function timeLeft(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser, groups, joinGroup, leaveGroup, sendMessage } = useStore();
  const [text, setText] = useState("");
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string; type: "user" | "group" } | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ id: string; name: string } | null>(null);
  const [ec, setEc] = useState<{ name: string; phone: string } | null>(null);
  const [joinStep, setJoinStep] = useState<"idle" | "share-prompt">("idle");
  const [isSafeSent, setIsSafeSent] = useState(false);
  const [timerEnd, setTimerEnd] = useState<number | null>(null);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [timerFired, setTimerFired] = useState(false);
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [fakeCallAccepted, setFakeCallAccepted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const group = groups.find((g) => g.id === params.id);
  const realtimeMessages = useGroupMessages(params.id as string);

  // Use real-time messages if available, fall back to store messages
  const messages = realtimeMessages.length > 0 ? realtimeMessages : (group?.messages ?? []);

  const safeLocation = group ? SAFE_LOCATIONS.find((l) => l.id === group.safeLocationId) : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const name = localStorage.getItem("hangr_ec_name");
    const phone = localStorage.getItem("hangr_ec_phone");
    if (name && phone) setEc({ name, phone });
  }, []);

  // Load saved timer for this group
  useEffect(() => {
    const stored = localStorage.getItem(`hangr_timer_end_${params.id}`);
    if (!stored) return;
    const end = parseInt(stored);
    if (end > Date.now()) {
      setTimerEnd(end);
      setTimerRemaining(end - Date.now());
    } else {
      localStorage.removeItem(`hangr_timer_end_${params.id as string}`);
      setTimerFired(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Tick timer
  useEffect(() => {
    if (!timerEnd) return;
    const id = setInterval(() => {
      const remaining = timerEnd - Date.now();
      if (remaining <= 0) {
        setTimerFired(true);
        setTimerEnd(null);
        setTimerRemaining(0);
        localStorage.removeItem(`hangr_timer_end_${params.id as string}`);
      } else {
        setTimerRemaining(remaining);
      }
    }, 15000);
    return () => clearInterval(id);
  }, [timerEnd, params.id]);

  if (!group) {
    return (
      <div className="min-h-screen bg-[#F2F1EB] flex flex-col items-center justify-center px-4">
        <p className="text-6xl font-black uppercase mb-4 text-black">404</p>
        <p className="text-xl font-black uppercase mb-6 text-black">Group Not Found</p>
        <button
          onClick={() => router.push("/explore")}
          className="bg-[#FFE500] border-2 border-black text-black font-black uppercase tracking-wide shadow-[3px_3px_0_#0A0A0A] px-4 py-2 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
        >
          Back to Explore
        </button>
      </div>
    );
  }

  const isMember = currentUser ? group.members.some((m) => m.id === currentUser.id) : false;
  const badTrustMembers = group.members.filter((m) => m.trustScore > 0 && m.trustScore < 3.0 && m.reviewCount >= 3);
  const isFull = group.members.length >= group.maxMembers;
  const canJoin = !isMember && !isFull && !!currentUser &&
    (!group.femaleOnly || currentUser.gender === "Female");

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !currentUser) return;
    sendMessage(group!.id, text.trim());
    setText("");
  }

  const isExpired = group.expiresAt <= Date.now();
  const locationName = safeLocation?.name ?? group.location;

  function smsLink(phone: string, body: string) {
    return `sms:${phone}?body=${encodeURIComponent(body)}`;
  }

  const sosBody = `I need help. I'm at ${locationName} for "${group.name}" meetup on hangr. Please check on me.`;
  const shareBody = `Hey, I'm joining a meetup on hangr:\n📍 ${locationName}\n🕐 ${group.plannedTime}\nGroup: "${group.name}"\nI'll check in when it's done.`;
  const safeBody = `Hey ${ec?.name ?? ""}, I'm safe! Just finished the "${group.name}" meetup at ${locationName} on hangr. 👍`;

  function fmtRemaining(ms: number): string {
    const h = Math.floor(ms / (1000 * 60 * 60));
    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function doJoin() {
    joinGroup(group!.id);
    const timerMins = parseInt(localStorage.getItem("hangr_safety_timer_mins") ?? "0");
    if (timerMins > 0 && ec) {
      const end = Date.now() + timerMins * 60 * 1000;
      localStorage.setItem(`hangr_timer_end_${group!.id}`, String(end));
      setTimerEnd(end);
      setTimerRemaining(timerMins * 60 * 1000);
    }
  }

  function clearTimer() {
    setTimerEnd(null);
    setTimerRemaining(0);
    setTimerFired(false);
    localStorage.removeItem(`hangr_timer_end_${group!.id}`);
  }

  function handleJoin() {
    if (ec) {
      setJoinStep("share-prompt");
    } else {
      doJoin();
    }
  }

  return (
    <>
      <div className="min-h-screen bg-[#F2F1EB]">
        <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">

          {/* Group header card */}
          <div className="border-2 border-black bg-white shadow-[4px_4px_0_#0A0A0A]">
            {/* Yellow header strip */}
            <div className="bg-[#FFE500] border-b-2 border-black px-4 py-3 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-2xl font-black uppercase">{group.name}</h1>
                  {group.femaleOnly && (
                    <span className="border-2 border-black bg-black text-[#FFE500] text-xs font-black uppercase px-2 py-0.5">♀ WOMEN ONLY</span>
                  )}
                  <span className="border-2 border-black bg-black text-[#FFE500] text-xs font-black uppercase px-2 py-0.5">PUBLIC</span>
                </div>
                <p className="text-sm font-black uppercase text-black/60">{group.neighborhood}</p>
              </div>
              <div className="flex items-center gap-2">
                <InterestBadge interest={group.topic} size="md" />
                {currentUser && (
                  <button
                    onClick={() => setReportTarget({ id: group.id, name: group.name, type: "group" })}
                    title="Report group"
                    className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center text-sm shadow-[2px_2px_0_#0A0A0A] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                  >
                    🚩
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 flex flex-col gap-3">
              {/* Safe location banner */}
              {safeLocation && (
                <div className="border-2 border-black bg-[#00C44A] text-black px-3 py-2.5 flex items-center gap-2">
                  <span className="text-lg">{SAFE_LOCATION_ICONS[safeLocation.type]}</span>
                  <div className="flex-1">
                    <p className="text-xs font-black uppercase">{safeLocation.name}</p>
                    <p className="text-xs font-bold capitalize">{safeLocation.type} · VERIFIED SAFE LOCATION ✓</p>
                  </div>
                </div>
              )}

              {/* Low trust warning banner */}
              {badTrustMembers.length > 0 && (
                <div className="border-2 border-black bg-[#FF2D2D] text-white px-3 py-2.5 flex items-start gap-2">
                  <span className="text-base mt-0.5">⚠️</span>
                  <div>
                    <p className="text-xs font-black uppercase mb-0.5">LOW TRUST SCORE ALERT</p>
                    <p className="text-xs font-bold">
                      {badTrustMembers.map((m) => m.name).join(", ")} {badTrustMembers.length === 1 ? "has" : "have"} a low community trust score based on past reviews. Exercise caution.
                    </p>
                  </div>
                </div>
              )}

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="border-2 border-black bg-white px-3 py-2 flex items-center gap-1.5">
                  <span>🕐</span>
                  <span className="text-sm font-black">{group.plannedTime}</span>
                </div>
                <div className="border-2 border-black bg-[#FFE500] px-3 py-2 flex items-center gap-1.5">
                  <span>⏱</span>
                  <span className="text-sm font-black uppercase">{timeLeft(group.expiresAt)}</span>
                </div>
                <div className="border-2 border-black bg-white px-3 py-2 flex items-center gap-1.5">
                  <span>👥</span>
                  <span className="text-sm font-black">{group.members.length}/{group.maxMembers} MEMBERS</span>
                </div>
                <div className="border-2 border-black bg-white px-3 py-2 flex items-center gap-1.5">
                  <span>🔓</span>
                  <span className="text-sm font-black uppercase text-[#00C44A]">Public</span>
                </div>
              </div>

              {/* Members section */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50 mb-2">Members</p>
                <div className="space-y-2">
                  {group.members.map((m) => (
                    <div key={m.id} className="border-2 border-black bg-white px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-[#FFE500] text-black border-2 border-black text-xs font-black flex items-center justify-center">
                            {m.avatar.charAt(0)}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-sm font-black uppercase">{m.name}</span>
                            {m.isVerified && <span className="text-black text-xs font-black" title="Verified">✓</span>}
                            {m.collegeVerified && <span className="text-xs" title="College Verified">🎓</span>}
                            {m.showGender && m.gender && (
                              <span className="text-xs font-bold text-black/50">
                                {m.gender === "Female" ? "♀" : m.gender === "Male" ? "♂" : "⚧"}
                              </span>
                            )}
                            {m.trustScore > 0 && m.trustScore < 3.0 && m.reviewCount >= 3 && (
                              <span className="text-xs font-black border-2 border-black bg-[#FF2D2D] text-white px-1.5 py-0.5 uppercase" title="Low trust score">
                                ⚠️ LOW TRUST
                              </span>
                            )}
                          </div>
                          {m.trustScore > 0 && (
                            <p className={`text-xs font-black ${m.trustScore < 3.0 && m.reviewCount >= 3 ? "text-[#FF2D2D]" : "text-black"}`}>
                              ⭐ {m.trustScore.toFixed(1)} · {m.reviewCount} REVIEWS
                            </p>
                          )}
                        </div>
                      </div>
                      {currentUser && m.id !== currentUser.id && (
                        <div className="flex gap-1.5">
                          {isMember && (
                            <button
                              onClick={() => setReviewTarget({ id: m.id, name: m.name })}
                              className="text-xs px-2.5 py-1 bg-[#FFE500] border-2 border-black text-black font-black uppercase shadow-[2px_2px_0_#0A0A0A] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                            >
                              ⭐ REVIEW
                            </button>
                          )}
                          <button
                            onClick={() => setReportTarget({ id: m.id, name: m.name, type: "user" })}
                            className="text-xs px-2.5 py-1 border-2 border-black bg-white font-black shadow-[2px_2px_0_#0A0A0A] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                          >
                            🚩
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Auto-SOS timer countdown */}
              {isMember && timerEnd && !timerFired && (
                <div className="border-2 border-black bg-[#FFE500] text-black px-3 py-2.5 flex items-center gap-2">
                  <span className="text-base">⏱️</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black uppercase">SAFETY TIMER: {fmtRemaining(timerRemaining)} REMAINING</p>
                    <p className="text-xs font-bold">Tap &quot;I&apos;m Safe&quot; or send your check-in to cancel</p>
                  </div>
                  <button
                    onClick={clearTimer}
                    className="flex-shrink-0 text-xs font-black uppercase border-2 border-black bg-black text-[#FFE500] px-2 py-1"
                  >
                    CANCEL
                  </button>
                </div>
              )}

              {/* Timer expired — urgent SOS */}
              {isMember && timerFired && ec && !isSafeSent && (
                <div className="border-2 border-black bg-[#FF2D2D] text-white px-3 py-3 flex items-start gap-2 animate-pulse">
                  <span className="text-lg mt-0.5">🚨</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black uppercase mb-0.5">SAFETY TIMER EXPIRED!</p>
                    <p className="text-xs font-bold mb-2">You haven&apos;t checked in. Alert {ec.name} now.</p>
                    <a
                      href={smsLink(ec.phone, sosBody)}
                      onClick={() => { setIsSafeSent(true); clearTimer(); }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-black border-2 border-white text-[#FFE500] text-xs font-black uppercase shadow-[3px_3px_0_rgba(255,255,255,0.3)] active:shadow-none transition-all"
                    >
                      🆘 SEND SOS NOW
                    </a>
                  </div>
                </div>
              )}

              {/* "I'm Safe" check-in banner — shown after group expires */}
              {isMember && isExpired && ec && !isSafeSent && (
                <div className="border-2 border-black bg-[#00C44A] text-black px-3 py-3 flex items-center gap-3">
                  <span className="text-xl">✅</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black uppercase">MEETUP ENDED — LET {ec.name.toUpperCase()} KNOW YOU&apos;RE SAFE</p>
                    <p className="text-xs font-bold truncate">{ec.phone}</p>
                  </div>
                  <a
                    href={smsLink(ec.phone, safeBody)}
                    onClick={() => { setIsSafeSent(true); clearTimer(); }}
                    className="flex-shrink-0 bg-black border-2 border-black text-[#FFE500] font-black uppercase px-4 py-2 text-xs shadow-[3px_3px_0_#0A0A0A] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
                  >
                    SEND ✓
                  </a>
                </div>
              )}

              {isSafeSent && (
                <div className="border-2 border-black bg-[#00C44A] text-black px-3 py-2 flex items-center gap-2">
                  <span className="text-xs font-black uppercase">✓ &quot;I&apos;M SAFE&quot; MESSAGE SENT TO {ec?.name?.toUpperCase()}</span>
                </div>
              )}

              {/* Divider */}
              <div className="border-t-2 border-black" />

              {/* Join / Leave + SOS */}
              {!currentUser && !isExpired && (
                <button
                  onClick={() => router.push("/auth")}
                  className="w-full bg-[#FFE500] border-2 border-black text-black font-black uppercase tracking-wide shadow-[3px_3px_0_#0A0A0A] px-4 py-2 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
                >
                  SIGN IN TO JOIN
                </button>
              )}

              {currentUser && (
                <div className="flex flex-col gap-2">

                  {/* Pre-join share prompt */}
                  {canJoin && joinStep === "share-prompt" && ec && (
                    <div className="border-2 border-black bg-white px-3 py-3 shadow-[4px_4px_0_#0A0A0A]">
                      <p className="text-xs font-black uppercase mb-2">
                        📱 LET {ec.name.toUpperCase()} KNOW YOU&apos;RE JOINING THIS MEETUP?
                      </p>
                      <div className="flex gap-2">
                        <a
                          href={smsLink(ec.phone, shareBody)}
                          onClick={() => { setJoinStep("idle"); setTimeout(() => doJoin(), 200); }}
                          className="flex-1 text-center py-2 bg-[#FFE500] border-2 border-black text-black text-xs font-black uppercase shadow-[3px_3px_0_#0A0A0A] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
                        >
                          SHARE &amp; JOIN
                        </a>
                        <button
                          onClick={() => { doJoin(); setJoinStep("idle"); }}
                          className="flex-1 py-2 border-2 border-black bg-white text-black text-xs font-black uppercase shadow-[3px_3px_0_#0A0A0A] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
                        >
                          SKIP &amp; JOIN
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {canJoin && joinStep === "idle" && (
                      <button
                        onClick={handleJoin}
                        className="flex-1 bg-[#00C44A] border-2 border-black text-black font-black uppercase px-4 py-2 shadow-[3px_3px_0_#0A0A0A] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
                      >
                        JOIN GROUP
                      </button>
                    )}
                    {!canJoin && !isMember && group.femaleOnly && currentUser.gender !== "Female" && (
                      <div className="flex-1 border-2 border-black bg-black text-[#FFE500] py-2 text-sm font-black uppercase text-center">
                        ♀ WOMEN-ONLY GROUP
                      </div>
                    )}
                    {!canJoin && !isMember && isFull && (
                      <div className="flex-1 border-2 border-black bg-white text-black py-2 text-sm font-black uppercase text-center">
                        GROUP IS FULL
                      </div>
                    )}
                    {isMember && (
                      <>
                        {ec && !isExpired && (
                          <a
                            href={smsLink(ec.phone, sosBody)}
                            className="flex items-center gap-1.5 bg-[#FF2D2D] border-2 border-black text-white font-black uppercase px-4 py-2 shadow-[3px_3px_0_#0A0A0A] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all text-xs"
                            title={`SOS — alert ${ec.name}`}
                          >
                            🆘 SOS
                          </a>
                        )}
                        <button
                          onClick={() => { setShowFakeCall(true); setFakeCallAccepted(false); }}
                          className="flex items-center gap-1.5 bg-black border-2 border-black text-[#FFE500] font-black uppercase px-4 py-2 text-xs active:opacity-80 transition-all"
                          title="Fake incoming call to exit safely"
                        >
                          📞 CALL
                        </button>
                        <button
                          onClick={() => { leaveGroup(group.id); router.push("/explore"); }}
                          className="px-4 py-2 bg-[#FF2D2D] border-2 border-black text-white font-black uppercase shadow-[3px_3px_0_#0A0A0A] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all text-sm"
                        >
                          LEAVE
                        </button>
                      </>
                    )}
                  </div>

                  {/* No emergency contact nudge */}
                  {(canJoin || isMember) && !ec && (
                    <p className="text-xs font-bold uppercase text-black/50 text-center">
                      Add an{" "}
                      <a href="/profile" className="text-black underline font-black">
                        emergency contact
                      </a>{" "}
                      in your profile to enable SOS and check-in features
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chat */}
          <div className="border-2 border-black bg-white shadow-[4px_4px_0_#0A0A0A] flex flex-col overflow-hidden">
            <div className="bg-[#FFE500] border-b-2 border-black px-4 py-3">
              <p className="text-sm font-black uppercase">Group Chat</p>
              {!isMember && <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50">Join to send messages</p>}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[240px] max-h-[360px] bg-[#F2F1EB]">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-2xl mb-1">💬</p>
                  <p className="text-sm font-black uppercase text-black/50">No messages yet. Say something!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.userId === currentUser?.id;
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                      <div className="w-7 h-7 flex-shrink-0 rounded-full bg-[#FFE500] text-black border-2 border-black text-xs font-black flex items-center justify-center">
                        {msg.userAvatar.charAt(0)}
                      </div>
                      <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                        {!isMe && <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50">{msg.userName}</span>}
                        <div className={`px-4 py-2 text-sm font-medium ${isMe ? "bg-black text-[#FFE500] border-2 border-black" : "bg-white border-2 border-black text-black"}`}>
                          {msg.text}
                        </div>
                        <span className="text-[10px] font-black uppercase text-black/40">{timeAgo(msg.timestamp)}</span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {isMember && currentUser ? (
              <form onSubmit={handleSend} className="p-3 border-t-2 border-black flex gap-2 bg-white">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="TYPE A MESSAGE..."
                  className="flex-1 border-2 border-black bg-white px-4 py-3 font-medium focus:outline-none focus:shadow-[3px_3px_0_#0A0A0A] text-sm uppercase placeholder:font-black placeholder:text-black/30"
                />
                <button
                  type="submit"
                  disabled={!text.trim()}
                  className="bg-[#FFE500] border-2 border-black text-black font-black uppercase tracking-wide shadow-[3px_3px_0_#0A0A0A] px-4 py-2 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  SEND
                </button>
              </form>
            ) : (
              <div className="p-3 border-t-2 border-black text-center bg-white">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50">Join the group to chat</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Modals */}
      {reportTarget && (
        <ReportModal targetId={reportTarget.id} targetName={reportTarget.name} targetType={reportTarget.type} onClose={() => setReportTarget(null)} />
      )}
      {reviewTarget && group && (
        <ReviewModal toUserId={reviewTarget.id} toUserName={reviewTarget.name} groupId={group.id} onClose={() => setReviewTarget(null)} />
      )}

      {/* Fake safety call overlay */}
      {showFakeCall && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ background: "linear-gradient(180deg,#0f0f1a 0%,#1a1a2e 100%)" }}
        >
          {!fakeCallAccepted ? (
            <div className="text-center px-8 w-full max-w-xs">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-4xl font-bold text-white mx-auto mb-5 shadow-2xl shadow-blue-500/40 animate-pulse">
                {ec?.name?.charAt(0)?.toUpperCase() ?? "M"}
              </div>
              <p className="text-white/50 text-sm mb-1">Incoming call</p>
              <p className="text-white text-2xl font-bold mb-1">{ec?.name ?? "Mom"}</p>
              <p className="text-white/30 text-xs mb-20">hangr safety call</p>
              <div className="flex justify-center gap-20">
                <button onClick={() => setShowFakeCall(false)} className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-2xl shadow-lg shadow-red-500/30">📵</div>
                  <span className="text-white/50 text-xs">Decline</span>
                </button>
                <button onClick={() => setFakeCallAccepted(true)} className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-2xl shadow-lg shadow-green-500/30">📞</div>
                  <span className="text-white/50 text-xs">Accept</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center px-8 w-full max-w-xs">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-4xl font-bold text-white mx-auto mb-5 shadow-2xl shadow-blue-500/40">
                {ec?.name?.charAt(0)?.toUpperCase() ?? "M"}
              </div>
              <p className="text-white text-xl font-bold mb-1">{ec?.name ?? "Mom"}</p>
              <p className="text-white/40 text-sm mb-1">On call...</p>
              <p className="text-white/20 text-xs mb-20">Ongoing call</p>
              <button
                onClick={() => { setShowFakeCall(false); setFakeCallAccepted(false); }}
                className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-2xl mx-auto shadow-lg shadow-red-500/30"
              >
                📵
              </button>
              <p className="text-white/40 text-xs mt-3">End call</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
