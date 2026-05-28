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
      <div className="max-w-2xl mx-auto px-4 py-12 text-center text-gray-400">
        <p className="text-4xl mb-3">😕</p>
        <p>Group not found</p>
        <button onClick={() => router.push("/explore")} className="mt-4 text-blue-600 font-medium hover:underline">
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
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
        {/* Group header card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-lg font-bold text-gray-900">{group.name}</h1>
                {group.femaleOnly && (
                  <span className="px-2 py-0.5 bg-pink-50 border border-pink-200 text-pink-600 text-xs rounded-full font-medium">♀ Women only</span>
                )}
                <span className="px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 text-xs rounded-full font-medium">🌍 Public</span>
              </div>
              <p className="text-sm text-gray-500">{group.neighborhood}</p>
            </div>
            <div className="flex items-center gap-2">
              <InterestBadge interest={group.topic} size="md" />
              {currentUser && (
                <button onClick={() => setReportTarget({ id: group.id, name: group.name, type: "group" })}
                  title="Report group" className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                  🚩
                </button>
              )}
            </div>
          </div>

          {/* Safe location banner */}
          {safeLocation && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 mb-3">
              <span className="text-lg">{SAFE_LOCATION_ICONS[safeLocation.type]}</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-emerald-800">{safeLocation.name}</p>
                <p className="text-xs text-emerald-600 capitalize">{safeLocation.type} · Verified safe location ✓</p>
              </div>
            </div>
          )}

          {/* Low trust warning banner */}
          {badTrustMembers.length > 0 && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-3">
              <span className="text-base mt-0.5">⚠️</span>
              <div>
                <p className="text-xs font-semibold text-red-700 mb-0.5">Low trust score alert</p>
                <p className="text-xs text-red-600">
                  {badTrustMembers.map((m) => m.name).join(", ")} {badTrustMembers.length === 1 ? "has" : "have"} a low community trust score based on past reviews. Exercise caution.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-1.5"><span>🕐</span><span>{group.plannedTime}</span></div>
            <div className="flex items-center gap-1.5"><span>⏱</span><span className="text-amber-600 font-medium">{timeLeft(group.expiresAt)}</span></div>
            <div className="flex items-center gap-1.5"><span>👥</span><span>{group.members.length}/{group.maxMembers} members</span></div>
            <div className="flex items-center gap-1.5"><span>🔓</span><span className="text-green-600 font-medium">Public meetup</span></div>
          </div>

          {/* Members with trust info */}
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Members</p>
            <div className="space-y-2">
              {group.members.map((m) => (
                <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">{m.avatar.charAt(0)}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold text-gray-800">{m.name}</span>
                        {m.isVerified && <span className="text-blue-500 text-xs" title="Verified">✓</span>}
                        {m.collegeVerified && <span className="text-purple-500 text-xs" title="College Verified">🎓</span>}
                        {m.showGender && m.gender && <span className="text-xs text-gray-400">{m.gender === "Female" ? "♀" : m.gender === "Male" ? "♂" : "⚧"}</span>}
                        {m.trustScore > 0 && m.trustScore < 3.0 && m.reviewCount >= 3 && (
                          <span className="text-xs font-semibold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full" title="Low trust score">⚠️ Low trust</span>
                        )}
                      </div>
                      {m.trustScore > 0 && (
                        <p className={`text-xs font-medium ${m.trustScore < 3.0 && m.reviewCount >= 3 ? "text-red-500" : "text-amber-500"}`}>
                          ⭐ {m.trustScore.toFixed(1)} · {m.reviewCount} reviews
                        </p>
                      )}
                    </div>
                  </div>
                  {currentUser && m.id !== currentUser.id && (
                    <div className="flex gap-1.5">
                      {isMember && (
                        <button onClick={() => setReviewTarget({ id: m.id, name: m.name })}
                          className="text-xs px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors font-medium">
                          ⭐ Review
                        </button>
                      )}
                      <button onClick={() => setReportTarget({ id: m.id, name: m.name, type: "user" })}
                        className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors">
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
            <div className="mb-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <span className="text-base">⏱️</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-800">Safety timer: {fmtRemaining(timerRemaining)} remaining</p>
                <p className="text-xs text-amber-600">Tap &quot;I&apos;m Safe&quot; or send your check-in to cancel</p>
              </div>
              <button onClick={clearTimer} className="flex-shrink-0 text-xs text-amber-600 hover:text-amber-800 font-medium">Cancel</button>
            </div>
          )}

          {/* Timer expired — urgent SOS */}
          {isMember && timerFired && ec && !isSafeSent && (
            <div className="mb-3 flex items-start gap-2 bg-red-50 border-2 border-red-400 rounded-xl px-3 py-3 animate-pulse">
              <span className="text-lg mt-0.5">🚨</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-red-800 mb-0.5">Safety timer expired!</p>
                <p className="text-xs text-red-600 mb-2">You haven&apos;t checked in. Alert {ec.name} now.</p>
                <a
                  href={smsLink(ec.phone, sosBody)}
                  onClick={() => { setIsSafeSent(true); clearTimer(); }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors"
                >
                  🆘 Send SOS now
                </a>
              </div>
            </div>
          )}

          {/* "I'm Safe" check-in banner — shown after group expires */}
          {isMember && isExpired && ec && !isSafeSent && (
            <div className="mb-3 bg-green-50 border border-green-200 rounded-xl px-3 py-3 flex items-center gap-3">
              <span className="text-xl">✅</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-green-800">Meetup ended — let {ec.name} know you&apos;re safe</p>
                <p className="text-xs text-green-600 truncate">{ec.phone}</p>
              </div>
              <a
                href={smsLink(ec.phone, safeBody)}
                onClick={() => { setIsSafeSent(true); clearTimer(); }}
                className="flex-shrink-0 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                Send ✓
              </a>
            </div>
          )}
          {isSafeSent && (
            <div className="mb-3 bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="text-green-700 text-xs font-semibold">✓ &quot;I&apos;m safe&quot; message sent to {ec?.name}</span>
            </div>
          )}

          {/* Join / Leave + SOS */}
          {!currentUser && !isExpired && (
            <button onClick={() => router.push("/auth")} className="w-full bg-blue-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
              Sign in to join
            </button>
          )}
          {currentUser && (
            <div className="flex flex-col gap-2">

              {/* Pre-join share prompt */}
              {canJoin && joinStep === "share-prompt" && ec && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-3">
                  <p className="text-xs font-semibold text-blue-800 mb-2">
                    📱 Let {ec.name} know you&apos;re joining this meetup?
                  </p>
                  <div className="flex gap-2">
                    <a
                      href={smsLink(ec.phone, shareBody)}
                      onClick={() => { setJoinStep("idle"); setTimeout(() => doJoin(), 200); }}
                      className="flex-1 text-center py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Share &amp; Join
                    </a>
                    <button
                      onClick={() => { doJoin(); setJoinStep("idle"); }}
                      className="flex-1 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Skip &amp; Join
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {canJoin && joinStep === "idle" && (
                  <button onClick={handleJoin} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                    Join Group
                  </button>
                )}
                {!canJoin && !isMember && group.femaleOnly && currentUser.gender !== "Female" && (
                  <div className="flex-1 bg-pink-50 text-pink-500 py-2 rounded-xl text-sm font-medium text-center border border-pink-200">
                    ♀ Women-only group
                  </div>
                )}
                {!canJoin && !isMember && isFull && (
                  <div className="flex-1 bg-gray-100 text-gray-500 py-2 rounded-xl text-sm font-medium text-center">Group is full</div>
                )}
                {isMember && (
                  <>
                    {ec && !isExpired && (
                      <a
                        href={smsLink(ec.phone, sosBody)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600 transition-colors"
                        title={`SOS — alert ${ec.name}`}
                      >
                        🆘 SOS
                      </a>
                    )}
                    <button
                      onClick={() => { setShowFakeCall(true); setFakeCallAccepted(false); }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 text-white text-xs font-bold rounded-xl hover:bg-gray-900 transition-colors"
                      title="Fake incoming call to exit safely"
                    >
                      📞 Call
                    </button>
                    <button onClick={() => { leaveGroup(group.id); router.push("/explore"); }}
                      className="px-4 py-2 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors">
                      Leave
                    </button>
                  </>
                )}
              </div>

              {/* No emergency contact nudge */}
              {(canJoin || isMember) && !ec && (
                <p className="text-xs text-gray-400 text-center">
                  Add an <a href="/profile" className="text-blue-500 underline">emergency contact</a> in your profile to enable SOS and check-in features
                </p>
              )}
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="bg-white border border-gray-200 rounded-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Group chat</p>
            {!isMember && <p className="text-xs text-gray-400">Join to send messages</p>}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[240px] max-h-[360px]">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-2xl mb-1">💬</p>
                <p className="text-sm">No messages yet. Say something!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.userId === currentUser?.id;
                return (
                  <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                    <div className="w-7 h-7 flex-shrink-0 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      {msg.userAvatar.charAt(0)}
                    </div>
                    <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                      {!isMe && <span className="text-xs text-gray-400">{msg.userName}</span>}
                      <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? "bg-blue-600 text-white rounded-tr-sm" : "bg-gray-100 text-gray-900 rounded-tl-sm"}`}>
                        {msg.text}
                      </div>
                      <span className="text-xs text-gray-400">{timeAgo(msg.timestamp)}</span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {isMember && currentUser ? (
            <form onSubmit={handleSend} className="p-3 border-t border-gray-100 flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="submit" disabled={!text.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors">
                Send
              </button>
            </form>
          ) : (
            <div className="p-3 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">Join the group to chat</p>
            </div>
          )}
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
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ background: "linear-gradient(180deg,#0f0f1a 0%,#1a1a2e 100%)" }}>
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
