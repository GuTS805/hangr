"use client";

import { useState } from "react";
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

/* ── Clay tokens ─────────────────────────────────────────────────────────── */
const C = {
  bg:        "linear-gradient(145deg,#ede0ff 0%,#ffd6f0 35%,#d0eaff 70%,#d0ffe8 100%)",
  card:      "rgba(255,255,255,0.72)",
  cardShadow:"0 32px 80px rgba(120,80,255,0.18), 0 8px 24px rgba(0,0,0,0.06), inset 0 1.5px 0 rgba(255,255,255,0.95)",
  inputBg:   "rgba(228,216,255,0.45)",
  inputShadow:"inset 3px 4px 10px rgba(100,60,200,0.14), inset -2px -3px 8px rgba(255,255,255,0.92)",
  inputFocus:"inset 3px 4px 10px rgba(100,60,200,0.22), inset -2px -3px 8px rgba(255,255,255,0.88)",
  btnPrimary:"linear-gradient(145deg,#b48cff,#7c3aed)",
  btnPrimaryShadow:"0 10px 28px rgba(124,58,237,0.42), 0 3px 8px rgba(0,0,0,0.08), inset 0 2px 4px rgba(255,255,255,0.3)",
  btnPrimaryActive:"0 4px 12px rgba(124,58,237,0.3), inset 0 2px 4px rgba(255,255,255,0.2)",
  btnGoogle: "linear-gradient(145deg,#ffffff,#f4f0ff)",
  btnGoogleShadow:"0 8px 24px rgba(0,0,0,0.09), 0 2px 6px rgba(0,0,0,0.04), inset 0 2px 0 rgba(255,255,255,0.95)",
  pill:      "rgba(255,255,255,0.6)",
  pillShadow:"0 4px 16px rgba(120,80,255,0.12), inset 0 1px 0 rgba(255,255,255,0.9)",
  txt:       "#3b1f72",
  txtMid:    "#7c5cac",
  txtLight:  "#b8a0d8",
};

/* ── Shared component styles ─────────────────────────────────────────────── */
function ClayInput({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
      style={{
        width: "100%", border: "none", outline: "none",
        padding: "15px 20px", fontSize: 15, fontWeight: 500,
        borderRadius: 18, color: C.txt, fontFamily: "inherit",
        background: C.inputBg,
        boxShadow: focused ? C.inputFocus : C.inputShadow,
        transition: "box-shadow 0.2s",
        ...style,
      }}
    />
  );
}

function ClayBtn({ children, variant = "primary", style, onClick, disabled, type = "button" }:
  { children: React.ReactNode; variant?: "primary"|"google"|"ghost"; style?: React.CSSProperties; onClick?: ()=>void; disabled?: boolean; type?: "button"|"submit" }) {
  const [pressed, setPressed] = useState(false);
  const base: React.CSSProperties = {
    width: "100%", border: "none", borderRadius: 22, padding: "16px 24px",
    fontSize: 15, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    fontFamily: "inherit", transition: "transform 0.12s, box-shadow 0.12s",
    transform: pressed ? "translateY(3px) scale(0.98)" : "translateY(0) scale(1)",
    opacity: disabled ? 0.5 : 1,
  };
  if (variant === "primary") return (
    <button type={type} onClick={onClick} disabled={disabled}
      onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)} onMouseLeave={() => setPressed(false)}
      style={{ ...base, background: C.btnPrimary, color: "#fff", boxShadow: pressed ? C.btnPrimaryActive : C.btnPrimaryShadow, ...style }}>
      {children}
    </button>
  );
  if (variant === "google") return (
    <button type={type} onClick={onClick} disabled={disabled}
      onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)} onMouseLeave={() => setPressed(false)}
      style={{ ...base, background: C.btnGoogle, color: C.txt, boxShadow: pressed ? "0 2px 8px rgba(0,0,0,0.08)" : C.btnGoogleShadow, ...style }}>
      {children}
    </button>
  );
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...base, background: "transparent", color: C.txtMid, boxShadow: "none", fontSize: 13, ...style }}>
      {children}
    </button>
  );
}

function ClayCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.card, borderRadius: 36, backdropFilter: "blur(24px)",
      boxShadow: C.cardShadow, padding: "44px 36px", ...style,
    }}>
      {children}
    </div>
  );
}

function ClayPage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, position: "relative", overflow: "hidden" }}>
      {/* Floating clay blobs */}
      <div style={{ position: "fixed", top: "-15%", left: "-10%", width: 500, height: 500, borderRadius: "50%", background: "rgba(180,140,255,0.25)", filter: "blur(60px)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-20%", right: "-10%", width: 600, height: 600, borderRadius: "50%", background: "rgba(255,180,220,0.2)", filter: "blur(70px)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", top: "40%", left: "35%", width: 350, height: 350, borderRadius: "50%", background: "rgba(160,220,255,0.18)", filter: "blur(50px)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 420 }}>
        {children}
      </div>
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div style={{
      background: "linear-gradient(145deg,#ffb4c8,#ff8fa3)",
      borderRadius: 16, padding: "12px 18px", marginBottom: 16, fontSize: 13,
      color: "#7a0020", fontWeight: 600,
      boxShadow: "0 6px 20px rgba(255,100,130,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
    }}>
      {msg}
    </div>
  );
}

/* ── Logo bubble ─────────────────────────────────────────────────────────── */
function LogoBubble() {
  return (
    <div style={{
      width: 72, height: 72, borderRadius: 24, margin: "0 auto 16px",
      background: "linear-gradient(145deg,#c4a0ff,#7c3aed)",
      boxShadow: "0 14px 36px rgba(124,58,237,0.45), inset 0 2px 6px rgba(255,255,255,0.35), inset 0 -2px 6px rgba(0,0,0,0.15)",
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32,
    }}>
      🫧
    </div>
  );
}

/* ── Page component ──────────────────────────────────────────────────────── */
export default function AuthPage() {
  const router = useRouter();
  const { currentUser, needsOnboarding, completeOnboarding } = useStore();

  const [loginStep, setLoginStep]       = useState<LoginStep>("idle");
  const [loginInput, setLoginInput]     = useState("");
  const [loginOtp, setLoginOtp]         = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError]     = useState("");

  const [onboardStep, setOnboardStep]   = useState<OnboardStep>("phone");
  const [phone, setPhone]               = useState("");
  const [phoneOtp, setPhoneOtp]         = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [age, setAge]                   = useState("");
  const [gender, setGender]             = useState<Gender | "">("");
  const [selected, setSelected]         = useState<Interest[]>([]);
  const [neighborhood, setNeighborhood] = useState("");
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError]     = useState("");

  if (currentUser && !needsOnboarding) { router.replace("/"); return null; }

  /* ── Auth actions ── */
  async function sendLoginOtp() {
    setLoginError("");
    const val = loginInput.trim();
    if (!isEmail(val) && !isPhone(val)) { setLoginError("Valid email ya 10-digit phone daalo"); return; }
    setLoginLoading(true);
    let error;
    if (isPhone(val)) ({ error } = await supabase.auth.signInWithOtp({ phone: formatPhone(val) }));
    else              ({ error } = await supabase.auth.signInWithOtp({ email: val }));
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
    if (isPhone(val)) ({ error } = await supabase.auth.verifyOtp({ phone: formatPhone(val), token: loginOtp, type: "sms" }));
    else              ({ error } = await supabase.auth.verifyOtp({ email: val, token: loginOtp, type: "email" }));
    if (error) { setLoginError("Wrong OTP — try again"); setLoginLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (user && isPhone(val)) await supabase.from("profiles").update({ phone: formatPhone(val), is_verified: true }).eq("id", user.id);
    else if (user) await supabase.from("profiles").update({ is_verified: true }).eq("id", user.id);
    setLoginLoading(false);
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
    setSelected(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  }

  /* ── Onboarding: phone ── */
  if (currentUser && needsOnboarding && onboardStep === "phone") {
    return (
      <ClayPage>
        <ClayCard>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>📱</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: C.txt, margin: 0 }}>Verify your phone</h2>
            <p style={{ color: C.txtLight, fontSize: 14, marginTop: 6 }}>We'll send a one-time code</p>
          </div>
          <div style={{ display: "flex", borderRadius: 18, overflow: "hidden", background: C.inputBg, boxShadow: C.inputShadow, marginBottom: 14 }}>
            <div style={{ padding: "15px 16px", fontSize: 14, fontWeight: 700, color: C.txtMid, flexShrink: 0, borderRight: "1px solid rgba(140,100,220,0.15)" }}>🇮🇳 +91</div>
            <input type="tel" value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit number"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", padding: "15px 16px", fontSize: 15, color: C.txt, fontFamily: "inherit", fontWeight: 500 }} maxLength={10} />
          </div>
          {detailsError && <ErrorBanner msg={detailsError} />}
          <ClayBtn variant="primary" onClick={sendPhoneOtp} disabled={detailsLoading || phone.replace(/\D/g, "").length < 10}>
            {detailsLoading ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : "Send OTP →"}
          </ClayBtn>
          <p style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: C.txtLight }}>🔒 Number only used for verification</p>
        </ClayCard>
      </ClayPage>
    );
  }

  /* ── Onboarding: OTP ── */
  if (currentUser && needsOnboarding && onboardStep === "otp") {
    return (
      <ClayPage>
        <ClayCard>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🔢</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: C.txt, margin: 0 }}>Enter the code</h2>
            <p style={{ color: C.txtLight, fontSize: 14, marginTop: 6 }}>Sent to <span style={{ color: C.txtMid, fontWeight: 600 }}>{verifiedPhone}</span></p>
          </div>
          <ClayInput type="number" value={phoneOtp}
            onChange={e => setPhoneOtp(e.target.value.slice(0, 6))}
            placeholder="• • • • • •"
            style={{ textAlign: "center", fontSize: 28, fontWeight: 900, letterSpacing: "0.45em", marginBottom: 14 }}
            maxLength={6} />
          {detailsError && <ErrorBanner msg={detailsError} />}
          <ClayBtn variant="primary" onClick={verifyPhoneOtp} disabled={detailsLoading || phoneOtp.length !== 6} style={{ marginBottom: 10 }}>
            {detailsLoading ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : "Verify ✓"}
          </ClayBtn>
          <ClayBtn variant="ghost" onClick={() => { setOnboardStep("phone"); setPhoneOtp(""); setDetailsError(""); }}>
            ← Change number
          </ClayBtn>
        </ClayCard>
      </ClayPage>
    );
  }

  /* ── Onboarding: details ── */
  if (currentUser && needsOnboarding) {
    return (
      <ClayPage>
        <ClayCard style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: C.txt, margin: 0 }}>Almost done!</h2>
            <p style={{ color: C.txtLight, fontSize: 14, marginTop: 6 }}>Welcome, {currentUser.name.split(" ")[0]}!</p>
          </div>
          <form onSubmit={handleOnboarding} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.txtMid, display: "block", marginBottom: 6, letterSpacing: "0.06em" }}>AGE</label>
                <ClayInput type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="22" min={16} max={60} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.txtMid, display: "block", marginBottom: 6, letterSpacing: "0.06em" }}>AREA</label>
                <ClayInput type="text" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} placeholder="Crossing Republik" />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.txtMid, display: "block", marginBottom: 8, letterSpacing: "0.06em" }}>GENDER (optional)</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["Male","Female","Other"] as Gender[]).map(g => (
                  <button key={g} type="button" onClick={() => setGender(gender === g ? "" : g)}
                    style={{
                      flex: 1, padding: "10px 8px", border: "none", borderRadius: 14, fontSize: 13,
                      fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      background: gender === g ? "linear-gradient(145deg,#c4a0ff,#7c3aed)" : C.inputBg,
                      color: gender === g ? "#fff" : C.txtMid,
                      boxShadow: gender === g ? C.btnPrimaryShadow : C.inputShadow,
                      transition: "all 0.15s",
                    }}>
                    {g === "Female" ? "♀" : g === "Male" ? "♂" : "⚧"} {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.txtMid, display: "block", marginBottom: 8, letterSpacing: "0.06em" }}>INTERESTS — pick at least 2</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {INTERESTS.map(i => {
                  const sel = selected.includes(i as Interest);
                  return (
                    <button key={i} type="button" onClick={() => toggleInterest(i as Interest)}
                      style={{
                        padding: "7px 14px", border: "none", borderRadius: 12, fontSize: 12,
                        fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        background: sel ? "linear-gradient(145deg,#c4a0ff,#7c3aed)" : C.inputBg,
                        color: sel ? "#fff" : C.txtMid,
                        boxShadow: sel ? "0 6px 18px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.25)" : C.inputShadow,
                        transition: "all 0.15s",
                      }}>
                      {INTEREST_EMOJI[i]} {i}
                    </button>
                  );
                })}
              </div>
            </div>

            {detailsError && <ErrorBanner msg={detailsError} />}
            <ClayBtn type="submit" variant="primary" disabled={detailsLoading}>
              {detailsLoading ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : "Let's go! 🚀"}
            </ClayBtn>
          </form>
        </ClayCard>
      </ClayPage>
    );
  }

  /* ── Main login ──────────────────────────────────────────────────────────── */
  return (
    <ClayPage>
      <ClayCard>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <LogoBubble />
          <h1 style={{ fontSize: 38, fontWeight: 900, color: C.txt, margin: "0 0 6px", letterSpacing: "-0.02em", lineHeight: 1 }}>hangr</h1>
          <p style={{ color: C.txtLight, fontSize: 15 }}>meet people. right now. ✨</p>

          {/* Pill badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, padding: "7px 16px", borderRadius: 999, background: C.pill, boxShadow: C.pillShadow, fontSize: 12, fontWeight: 600, color: C.txtMid }}>
            <span>🛡️</span> Verified spots only
          </div>
        </div>

        {loginError && <ErrorBanner msg={loginError} />}

        {loginStep === "idle" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <ClayInput
              type="text"
              value={loginInput}
              onChange={e => setLoginInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendLoginOtp()}
              placeholder="Phone number or email"
            />
            {loginInput && (
              <p style={{ fontSize: 12, color: C.txtLight, paddingLeft: 4, marginTop: -4 }}>
                {isEmail(loginInput) ? "📧 Email OTP" : isPhone(loginInput.replace(/\D/g, "")) ? "📱 SMS OTP" : "Enter email or 10-digit number"}
              </p>
            )}
            <ClayBtn variant="primary" onClick={sendLoginOtp}
              disabled={loginLoading || (!isEmail(loginInput.trim()) && !isPhone(loginInput.trim().replace(/\D/g, "")))}>
              {loginLoading
                ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : "Let's Go →"}
            </ClayBtn>

            {/* OR divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(140,100,220,0.2)" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: C.txtLight }}>or chill with</span>
              <div style={{ flex: 1, height: 1, background: "rgba(140,100,220,0.2)" }} />
            </div>

            <ClayBtn variant="google" onClick={signInWithGoogle} disabled={loginLoading}>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20H24v8h11.3c-1.6 4.4-5.8 7.5-11.3 7.5a12.5 12.5 0 010-25c3.2 0 6.1 1.2 8.3 3.2l5.7-5.7A21 21 0 0024 3C12.4 3 3 12.4 3 24s9.4 21 21 21c12.2 0 20.4-8.5 20.4-20.5 0-1.4-.1-2.4-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12.4 12.4 0 0124 11.5c3.2 0 6.1 1.2 8.3 3.2l5.7-5.7A21 21 0 006.3 14.7z"/>
                <path fill="#4CAF50" d="M24 45c5.5 0 10.5-2 14.3-5.2l-6.6-5.4A12.4 12.4 0 0124 35.5c-5.4 0-9.6-3-11.3-7.4l-6.6 5c3.7 5.9 10.2 9.9 17.9 9.9z"/>
                <path fill="#1976D2" d="M43.6 20H24v8h11.3a12.5 12.5 0 01-4.7 5.8l6.6 5.4c-.4.3 6.2-4.5 6.2-15.2 0-1.4-.1-2.4-.4-3.5z"/>
              </svg>
              Continue with Google
            </ClayBtn>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ textAlign: "center", fontSize: 13, color: C.txtLight }}>
              Code sent to <span style={{ color: C.txtMid, fontWeight: 700 }}>{loginInput}</span>
            </p>
            <ClayInput
              type="number" value={loginOtp}
              onChange={e => setLoginOtp(e.target.value.slice(0, 6))}
              onKeyDown={e => e.key === "Enter" && verifyLoginOtp()}
              placeholder="• • • • • •"
              style={{ textAlign: "center", fontSize: 28, fontWeight: 900, letterSpacing: "0.45em" }}
              maxLength={6}
            />
            <ClayBtn variant="primary" onClick={verifyLoginOtp} disabled={loginLoading || loginOtp.length < 4}>
              {loginLoading ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : "Verify ✓"}
            </ClayBtn>
            <ClayBtn variant="ghost" onClick={() => { setLoginStep("idle"); setLoginOtp(""); setLoginError(""); }}>
              ← Go back
            </ClayBtn>
          </div>
        )}

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: C.txtLight }}>
          By continuing you agree to our <span style={{ fontWeight: 700, cursor: "pointer" }}>Terms & Privacy Policy</span>
        </p>
      </ClayCard>
    </ClayPage>
  );
}
