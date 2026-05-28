"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Interest, Gender } from "@/types";
import { INTERESTS, INTEREST_EMOJI } from "@/lib/mock-data";

type LoginStep   = "idle" | "otp";
type OnboardStep = "phone" | "otp" | "details";

function isEmail(v: string) { return v.includes("@"); }
function isPhone(v: string) { return /^\d{10}$/.test(v.replace(/\s/g, "")); }
function formatPhone(v: string) { return `+91${v.replace(/\D/g, "").slice(-10)}`; }

// ── Particle canvas ────────────────────────────────────────────────────────
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf: number;

    function resize() {
      canvas!.width  = window.innerWidth;
      canvas!.height = window.innerHeight;
    }

    class Particle {
      x = Math.random() * canvas!.width;
      y = Math.random() * canvas!.height;
      size = Math.random() * 2 + 0.5;
      vy = -(Math.random() * 0.25 + 0.08);
      vx = (Math.random() - 0.5) * 0.15;
      op = Math.random() * 0.25 + 0.05;
      reset() {
        this.x = Math.random() * canvas!.width;
        this.y = canvas!.height + 5;
      }
      update() {
        this.y += this.vy; this.x += this.vx;
        if (this.y < -5) this.reset();
      }
      draw() {
        ctx.fillStyle = `rgba(201,209,255,${this.op})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    resize();
    const particles = Array.from({ length: 45 }, () => new Particle());

    function animate() {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      particles.forEach(p => { p.update(); p.draw(); });
      raf = requestAnimationFrame(animate);
    }
    animate();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="fixed inset-0 w-full h-full pointer-events-none z-0" />;
}

// ── Dark glass onboarding wrapper ──────────────────────────────────────────
function DarkPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg,#0a0538 0%,#0f0b3c 50%,#110d45 100%)" }}>
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: "#c9d1ff", top: "-10%", left: "-10%", filter: "blur(80px)", animation: "blob1 30s infinite alternate ease-in-out" }} />
        <div className="absolute w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: "#ffc994", bottom: "-20%", right: "-10%", filter: "blur(80px)", animation: "blob2 35s infinite alternate ease-in-out" }} />
        <div className="absolute w-[400px] h-[400px] rounded-full opacity-15"
          style={{ background: "#9ccaff", top: "40%", left: "30%", filter: "blur(80px)", animation: "blob3 25s infinite alternate ease-in-out" }} />
      </div>
      <ParticleCanvas />
      <div className="w-full max-w-sm relative z-10">
        {children}
      </div>
      <style>{`
        @keyframes blob1 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(15%,10%) scale(1.1)} 100%{transform:translate(-5%,20%) scale(0.9)} }
        @keyframes blob2 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(-10%,-10%) scale(1.05)} 100%{transform:translate(5%,-20%) scale(0.95)} }
        @keyframes blob3 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(-15%,10%) scale(1.1)} 100%{transform:translate(10%,-10%) scale(0.9)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes reveal { to{opacity:1;transform:translateY(0)} }
        .glass{backdrop-filter:blur(32px);background:rgba(28,25,73,0.45);border:1px solid rgba(255,255,255,0.1)}
        .reveal{opacity:0;transform:translateY(18px);animation:reveal 0.75s cubic-bezier(0.22,1,0.36,1) forwards}
        .r1{animation-delay:.1s} .r2{animation-delay:.2s} .r3{animation-delay:.3s} .r4{animation-delay:.4s} .r5{animation-delay:.5s}
        .glow-btn{box-shadow:0 0 20px rgba(184,196,255,0.18)}
        .shimmer{position:relative;overflow:hidden}
        .shimmer::after{content:"";position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:linear-gradient(45deg,transparent,rgba(255,255,255,0.1),transparent);transform:rotate(45deg);animation:shimmer 4s infinite linear}
        @keyframes shimmer{0%{transform:translateX(-150%) rotate(45deg)}100%{transform:translateX(150%) rotate(45deg)}}
        .inp{background:rgba(10,5,56,0.35);border:1px solid rgba(143,144,155,0.25);border-radius:9999px;color:#e3dfff;transition:all .25s}
        .inp:focus{outline:none;border-color:rgba(201,209,255,0.6);box-shadow:0 0 0 3px rgba(201,209,255,0.08)}
        .inp::placeholder{color:#c6c5d2}
      `}</style>
    </div>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass rounded-2xl p-7 ${className}`} style={{ boxShadow: "0 0 40px rgba(184,196,255,0.08)" }}>
      {children}
    </div>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const { currentUser, needsOnboarding, completeOnboarding } = useStore();

  const [loginStep, setLoginStep]     = useState<LoginStep>("idle");
  const [loginInput, setLoginInput]   = useState("");
  const [loginOtp, setLoginOtp]       = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError]   = useState("");

  const [onboardStep, setOnboardStep] = useState<OnboardStep>("phone");
  const [phone, setPhone]             = useState("");
  const [phoneOtp, setPhoneOtp]       = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [age, setAge]                 = useState("");
  const [gender, setGender]           = useState<Gender | "">("");
  const [selected, setSelected]       = useState<Interest[]>([]);
  const [neighborhood, setNeighborhood] = useState("");
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError]     = useState("");

  if (currentUser && !needsOnboarding) { router.replace("/"); return null; }

  async function sendLoginOtp() {
    setLoginError("");
    const val = loginInput.trim();
    if (!isEmail(val) && !isPhone(val)) { setLoginError("Valid email ya 10-digit phone number daalo"); return; }
    setLoginLoading(true);
    let error;
    if (isPhone(val)) { ({ error } = await supabase.auth.signInWithOtp({ phone: formatPhone(val) })); }
    else              { ({ error } = await supabase.auth.signInWithOtp({ email: val })); }
    setLoginLoading(false);
    if (error) { setLoginError(error.message); return; }
    setLoginStep("otp");
  }

  async function verifyLoginOtp() {
    setLoginError("");
    if (loginOtp.length < 4) { setLoginError("OTP daalo"); return; }
    setLoginLoading(true);
    const val = loginInput.trim();
    let error;
    if (isPhone(val)) { ({ error } = await supabase.auth.verifyOtp({ phone: formatPhone(val), token: loginOtp, type: "sms" })); }
    else              { ({ error } = await supabase.auth.verifyOtp({ email: val, token: loginOtp, type: "email" })); }
    if (error) { setLoginError("Wrong OTP"); setLoginLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (user && isPhone(val)) {
      await supabase.from("profiles").update({ phone: formatPhone(val), is_verified: true }).eq("id", user.id);
    } else if (user) {
      await supabase.from("profiles").update({ is_verified: true }).eq("id", user.id);
    }
    setLoginLoading(false);
    setOnboardStep("details");
  }

  async function signInWithGoogle() {
    setLoginLoading(true); setLoginError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: "select_account" } },
    });
    if (error) { setLoginError(error.message); setLoginLoading(false); }
  }

  async function sendPhoneOtp() {
    setDetailsError("");
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) { setDetailsError("Valid 10-digit number daalo"); return; }
    const formatted = formatPhone(phone);
    setDetailsLoading(true);
    const { error } = await supabase.auth.updateUser({ phone: formatted });
    setDetailsLoading(false);
    if (error) { setDetailsError(error.message); return; }
    setVerifiedPhone(formatted);
    setOnboardStep("otp");
  }

  async function verifyPhoneOtp() {
    setDetailsError("");
    if (phoneOtp.length !== 6) { setDetailsError("6-digit OTP daalo"); return; }
    setDetailsLoading(true);
    const { error } = await supabase.auth.verifyOtp({ phone: verifiedPhone, token: phoneOtp, type: "phone_change" });
    if (error) { setDetailsError("Wrong OTP"); setDetailsLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ phone: verifiedPhone, is_verified: true }).eq("id", user.id);
    setDetailsLoading(false);
    setOnboardStep("details");
  }

  async function handleOnboarding(e: React.FormEvent) {
    e.preventDefault();
    if (!age || parseInt(age) < 16 || parseInt(age) > 60) return setDetailsError("Valid age daalo (16–60)");
    if (selected.length < 2) return setDetailsError("Kam se kam 2 interests choose karo");
    setDetailsLoading(true);
    await completeOnboarding(parseInt(age), selected, gender as Gender || undefined, neighborhood.trim() || undefined);
    router.push("/");
  }

  function toggleInterest(i: Interest) {
    setSelected((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
  }

  // ── Onboarding screens ─────────────────────────────────────────────────────
  if (currentUser && needsOnboarding) {
    if (onboardStep === "phone") {
      return (
        <DarkPage>
          <GlassCard className="reveal r1">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: "rgba(201,209,255,0.12)", border: "1px solid rgba(201,209,255,0.2)" }}>
                <span className="text-2xl">📱</span>
              </div>
              <h1 className="text-xl font-bold mb-1" style={{ color: "#e3dfff", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Phone verify karo</h1>
              <p className="text-sm" style={{ color: "#8f909b" }}>Ek OTP aayega verify karne ke liye</p>
            </div>
            <div className="flex items-center overflow-hidden mb-4"
              style={{ background: "rgba(10,5,56,0.35)", border: "1px solid rgba(143,144,155,0.25)", borderRadius: "9999px" }}>
              <span className="px-4 py-3 text-sm font-medium" style={{ color: "#9ccaff", borderRight: "1px solid rgba(143,144,155,0.2)" }}>🇮🇳 +91</span>
              <input type="tel" value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit number"
                className="flex-1 px-4 py-3 text-sm outline-none bg-transparent"
                style={{ color: "#e3dfff" }} maxLength={10} />
            </div>
            {detailsError && <p className="text-sm mb-3" style={{ color: "#ffb4ab" }}>{detailsError}</p>}
            <button onClick={sendPhoneOtp} disabled={detailsLoading || phone.replace(/\D/g, "").length < 10}
              className="w-full py-3.5 rounded-full font-semibold text-sm glow-btn shimmer transition-all disabled:opacity-40"
              style={{ background: "#c9d1ff", color: "#1a2b6a" }}>
              {detailsLoading ? "Sending…" : "OTP Bhejo →"}
            </button>
            <div className="flex items-center gap-2 mt-4 px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(252,185,115,0.08)", border: "1px solid rgba(252,185,115,0.15)" }}>
              <span className="text-sm">🔒</span>
              <p className="text-xs" style={{ color: "#ffc994" }}>Tera number sirf verification ke liye hai</p>
            </div>
          </GlassCard>
        </DarkPage>
      );
    }

    if (onboardStep === "otp") {
      return (
        <DarkPage>
          <GlassCard className="reveal r1">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: "rgba(156,202,255,0.1)", border: "1px solid rgba(156,202,255,0.2)" }}>
                <span className="text-2xl">🔢</span>
              </div>
              <h1 className="text-xl font-bold mb-1" style={{ color: "#e3dfff", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>OTP enter karo</h1>
              <p className="text-sm" style={{ color: "#8f909b" }}>
                <span style={{ color: "#9ccaff" }}>{verifiedPhone}</span> pe bheja gaya
              </p>
            </div>
            <input type="number" value={phoneOtp}
              onChange={(e) => setPhoneOtp(e.target.value.slice(0, 6))}
              placeholder="• • • • • •"
              className="inp w-full px-6 py-3.5 text-center text-2xl font-bold tracking-[0.4em] mb-4"
              maxLength={6} />
            {detailsError && <p className="text-sm mb-3 text-center" style={{ color: "#ffb4ab" }}>{detailsError}</p>}
            <button onClick={verifyPhoneOtp} disabled={detailsLoading || phoneOtp.length !== 6}
              className="w-full py-3.5 rounded-full font-semibold text-sm glow-btn shimmer transition-all disabled:opacity-40 mb-3"
              style={{ background: "#c9d1ff", color: "#1a2b6a" }}>
              {detailsLoading ? "Verifying…" : "Verify karo ✓"}
            </button>
            <button onClick={() => { setOnboardStep("phone"); setPhoneOtp(""); setDetailsError(""); }}
              className="w-full text-sm py-2 transition-colors"
              style={{ color: "#8f909b" }}>← Number change karo</button>
          </GlassCard>
        </DarkPage>
      );
    }

    return (
      <DarkPage>
        <GlassCard className="reveal r1">
          <div className="text-center mb-5">
            <div className="text-3xl mb-2">✅</div>
            <h1 className="text-xl font-bold mb-1" style={{ color: "#e3dfff", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Almost done!</h1>
            <p className="text-sm" style={{ color: "#8f909b" }}>Welcome, {currentUser.name}!</p>
          </div>
          <form onSubmit={handleOnboarding} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#c6c5d2", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Age</label>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)}
                  placeholder="22" min={16} max={60}
                  className="inp w-full px-4 py-2.5 text-sm" style={{ borderRadius: "1rem" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#c6c5d2", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                  Area <span style={{ color: "#454650" }}>(optional)</span>
                </label>
                <input type="text" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Crossing Republik"
                  className="inp w-full px-4 py-2.5 text-sm" style={{ borderRadius: "1rem" }} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: "#c6c5d2", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                Gender <span style={{ color: "#454650" }}>(optional)</span>
              </label>
              <div className="flex gap-2">
                {(["Male", "Female", "Other"] as Gender[]).map((g) => (
                  <button key={g} type="button" onClick={() => setGender(gender === g ? "" : g)}
                    className="flex-1 py-2 rounded-full text-xs font-semibold transition-all"
                    style={{
                      background: gender === g ? "#c9d1ff" : "rgba(49,47,95,0.5)",
                      color: gender === g ? "#1a2b6a" : "#c6c5d2",
                      border: gender === g ? "1px solid transparent" : "1px solid rgba(69,70,80,0.5)",
                    }}>
                    {g === "Female" ? "♀ " : g === "Male" ? "♂ " : "⚧ "}{g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: "#c6c5d2", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                Interests <span style={{ color: "#454650" }}>(min 2)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {INTERESTS.map((i) => (
                  <button key={i} type="button" onClick={() => toggleInterest(i as Interest)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{
                      background: selected.includes(i as Interest) ? "#c9d1ff" : "rgba(49,47,95,0.5)",
                      color: selected.includes(i as Interest) ? "#1a2b6a" : "#c6c5d2",
                      border: selected.includes(i as Interest) ? "1px solid transparent" : "1px solid rgba(69,70,80,0.5)",
                    }}>
                    {INTEREST_EMOJI[i]} {i}
                  </button>
                ))}
              </div>
            </div>
            {detailsError && <p className="text-sm" style={{ color: "#ffb4ab" }}>{detailsError}</p>}
            <button type="submit" disabled={detailsLoading}
              className="w-full py-3.5 rounded-full font-semibold text-sm glow-btn shimmer transition-all disabled:opacity-40"
              style={{ background: "#c9d1ff", color: "#1a2b6a" }}>
              {detailsLoading ? "Saving…" : "Chal shuru karte hain →"}
            </button>
          </form>
        </GlassCard>
      </DarkPage>
    );
  }

  // ── Main login screen ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-between py-12 px-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg,#0a0538 0%,#0f0b3c 50%,#110d45 100%)" }}>

      {/* Aurora blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: "#c9d1ff", top: "-10%", left: "-10%", filter: "blur(80px)", animation: "blob1 30s infinite alternate ease-in-out" }} />
        <div className="absolute w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: "#ffc994", bottom: "-20%", right: "-10%", filter: "blur(80px)", animation: "blob2 35s infinite alternate ease-in-out" }} />
        <div className="absolute w-[400px] h-[400px] rounded-full opacity-15"
          style={{ background: "#9ccaff", top: "40%", left: "30%", filter: "blur(80px)", animation: "blob3 25s infinite alternate ease-in-out" }} />
      </div>
      <ParticleCanvas />

      <div className="w-full max-w-sm flex flex-col items-center relative z-10 gap-8">

        {/* Brand */}
        <header className="text-center space-y-3 reveal r1 mt-4">
          <div className="text-5xl" style={{ animation: "float 6s ease-in-out infinite" }}>🫧</div>
          <h1 className="font-black tracking-tighter"
            style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "clamp(42px,10vw,56px)", color: "#c9d1ff", textShadow: "0 0 40px rgba(201,209,255,0.35)" }}>
            hangr
          </h1>
          <p className="text-base" style={{ color: "#8f909b", fontFamily: "'DM Sans',sans-serif" }}>
            meet people. right now. ✨
          </p>
        </header>

        {/* Auth card */}
        <section className="glass rounded-2xl p-7 w-full reveal r2"
          style={{ boxShadow: "0 0 60px rgba(184,196,255,0.07)" }}>

          {/* Badge */}
          <div className="flex justify-center -mt-12 mb-5">
            <div className="px-4 py-1.5 rounded-full flex items-center gap-2"
              style={{ background: "rgba(38,36,84,0.85)", border: "1px solid rgba(201,209,255,0.15)", backdropFilter: "blur(12px)" }}>
              <span style={{ color: "#ffc994", fontSize: 13 }}>🛡️</span>
              <span className="text-xs font-semibold" style={{ color: "#e3dfff", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Verified spots only</span>
            </div>
          </div>

          {loginError && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm"
              style={{ background: "rgba(147,0,10,0.25)", border: "1px solid rgba(255,180,171,0.3)", color: "#ffb4ab" }}>
              {loginError}
            </div>
          )}

          {loginStep === "idle" ? (
            <div className="space-y-3 reveal r3">
              <input
                type="text"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendLoginOtp()}
                placeholder="Phone number or email"
                className="inp w-full px-5 py-3.5 text-sm"
              />
              {loginInput && (
                <p className="text-xs pl-4" style={{ color: "#8f909b" }}>
                  {isEmail(loginInput) ? "📧 Email OTP bheja jayega" : isPhone(loginInput.replace(/\D/g, "")) ? "📱 SMS OTP bheja jayega" : "10-digit number ya email@example.com"}
                </p>
              )}
              <button
                onClick={sendLoginOtp}
                disabled={loginLoading || (!isEmail(loginInput.trim()) && !isPhone(loginInput.trim().replace(/\D/g, "")))}
                className="w-full py-3.5 rounded-full font-semibold text-sm glow-btn shimmer transition-all disabled:opacity-40 flex items-center justify-center gap-2 reveal r4"
                style={{ background: "#c9d1ff", color: "#1a2b6a", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                {loginLoading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-[#1a2b6a]/30 border-t-[#1a2b6a] animate-spin" />
                ) : "Let's Go →"}
              </button>
            </div>
          ) : (
            <div className="space-y-3 reveal r3">
              <p className="text-sm text-center" style={{ color: "#8f909b" }}>
                OTP bheja gaya: <span style={{ color: "#9ccaff" }}>{loginInput}</span>
              </p>
              <input
                type="number"
                value={loginOtp}
                onChange={(e) => setLoginOtp(e.target.value.slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && verifyLoginOtp()}
                placeholder="• • • • • •"
                className="inp w-full px-6 py-3.5 text-center text-2xl font-bold tracking-[0.4em]"
              />
              <button
                onClick={verifyLoginOtp}
                disabled={loginLoading || loginOtp.length < 4}
                className="w-full py-3.5 rounded-full font-semibold text-sm glow-btn shimmer transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: "#c9d1ff", color: "#1a2b6a", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                {loginLoading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-[#1a2b6a]/30 border-t-[#1a2b6a] animate-spin" />
                ) : "Verify karo ✓"}
              </button>
              <button onClick={() => { setLoginStep("idle"); setLoginOtp(""); setLoginError(""); }}
                className="w-full text-sm py-1 transition-colors" style={{ color: "#8f909b" }}>
                ← Wapas jao
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 my-5 reveal r4">
            <div className="flex-1 h-px" style={{ background: "rgba(69,70,80,0.4)" }} />
            <span className="text-xs font-semibold" style={{ color: "#8f909b", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>or chill with</span>
            <div className="flex-1 h-px" style={{ background: "rgba(69,70,80,0.4)" }} />
          </div>

          {/* Google */}
          <button
            onClick={signInWithGoogle}
            disabled={loginLoading}
            className="w-full py-3.5 rounded-full flex items-center justify-center gap-3 font-semibold text-sm transition-all disabled:opacity-40 reveal r5"
            style={{ background: "rgba(49,47,95,0.5)", border: "1px solid rgba(255,255,255,0.1)", color: "#e3dfff", fontFamily: "'Plus Jakarta Sans',sans-serif" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(49,47,95,0.75)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(49,47,95,0.5)")}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3c-1.6 4.4-5.8 7.5-11.3 7.5a12.5 12.5 0 010-25c3.2 0 6.1 1.2 8.3 3.2l5.7-5.7A21 21 0 0024 3C12.4 3 3 12.4 3 24s9.4 21 21 21c12.2 0 20.4-8.5 20.4-20.5 0-1.4-.1-2.4-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12.4 12.4 0 0124 11.5c3.2 0 6.1 1.2 8.3 3.2l5.7-5.7A21 21 0 006.3 14.7z"/>
              <path fill="#4CAF50" d="M24 45c5.5 0 10.5-2 14.3-5.2l-6.6-5.4A12.4 12.4 0 0124 35.5c-5.4 0-9.6-3-11.3-7.4l-6.6 5c3.7 5.9 10.2 9.9 17.9 9.9z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3a12.5 12.5 0 01-4.7 5.8l6.6 5.4c-.4.3 6.2-4.5 6.2-15.2 0-1.4-.1-2.4-.4-3.5z"/>
            </svg>
            Continue with Google
          </button>
        </section>

        {/* Footer */}
        <footer className="text-center reveal r5 pb-4">
          <p className="text-xs" style={{ color: "#454650" }}>
            By continuing you agree to our{" "}
            <span style={{ color: "#8f909b", cursor: "pointer" }}>Terms &amp; Privacy Policy</span>
          </p>
        </footer>
      </div>

      <style>{`
        @keyframes blob1 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(15%,10%) scale(1.1)} 100%{transform:translate(-5%,20%) scale(0.9)} }
        @keyframes blob2 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(-10%,-10%) scale(1.05)} 100%{transform:translate(5%,-20%) scale(0.95)} }
        @keyframes blob3 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(-15%,10%) scale(1.1)} 100%{transform:translate(10%,-10%) scale(0.9)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes reveal { to{opacity:1;transform:translateY(0)} }
        .glass{backdrop-filter:blur(32px);background:rgba(28,25,73,0.45);border:1px solid rgba(255,255,255,0.1)}
        .reveal{opacity:0;transform:translateY(18px);animation:reveal 0.75s cubic-bezier(0.22,1,0.36,1) forwards}
        .r1{animation-delay:.1s} .r2{animation-delay:.2s} .r3{animation-delay:.3s} .r4{animation-delay:.4s} .r5{animation-delay:.5s}
        .glow-btn{box-shadow:0 0 24px rgba(201,209,255,0.2)}
        .shimmer{position:relative;overflow:hidden}
        .shimmer::after{content:"";position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:linear-gradient(45deg,transparent,rgba(255,255,255,0.12),transparent);transform:rotate(45deg);animation:shimmer 4s infinite linear}
        @keyframes shimmer{0%{transform:translateX(-150%) rotate(45deg)}100%{transform:translateX(150%) rotate(45deg)}}
        .inp{background:rgba(10,5,56,0.35);border:1px solid rgba(143,144,155,0.25);border-radius:9999px;color:#e3dfff;transition:all .25s}
        .inp:focus{outline:none;border-color:rgba(201,209,255,0.6);box-shadow:0 0 0 3px rgba(201,209,255,0.08)}
        .inp::placeholder{color:#454650}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
      `}</style>
    </div>
  );
}
