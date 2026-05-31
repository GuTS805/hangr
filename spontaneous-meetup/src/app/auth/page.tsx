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

/* ── Shared styles ──────────────────────────────────────────────────────────── */
const S = {
  page:     { background: "#F2F1EB", minHeight: "100vh", fontFamily: "'Space Grotesk', 'Nunito', sans-serif" } as React.CSSProperties,
  input:    { border: "2px solid #0A0A0A", borderRadius: 0, background: "#fff", color: "#0A0A0A", fontFamily: "inherit", fontSize: 15, width: "100%", padding: "14px 18px", outline: "none", fontWeight: 500 } as React.CSSProperties,
  btnY:     { background: "#FFE500", border: "2px solid #0A0A0A", boxShadow: "4px 4px 0 #0A0A0A", borderRadius: 0, color: "#0A0A0A", fontWeight: 800, fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase" as const, padding: "14px 24px", width: "100%", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 } as React.CSSProperties,
  btnK:     { background: "#0A0A0A", border: "2px solid #0A0A0A", boxShadow: "4px 4px 0 #555", borderRadius: 0, color: "#FFE500", fontWeight: 800, fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase" as const, padding: "14px 24px", width: "100%", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 } as React.CSSProperties,
  btnW:     { background: "#fff", border: "2px solid #0A0A0A", boxShadow: "4px 4px 0 #0A0A0A", borderRadius: 0, color: "#0A0A0A", fontWeight: 700, fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase" as const, padding: "14px 24px", width: "100%", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 } as React.CSSProperties,
  chip:     { border: "2px solid #0A0A0A", borderRadius: 0, padding: "6px 14px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, cursor: "pointer", fontFamily: "inherit" } as React.CSSProperties,
  error:    { background: "#FF2D2D", border: "2px solid #0A0A0A", color: "#fff", padding: "10px 16px", fontSize: 13, fontWeight: 600, borderRadius: 0, marginBottom: 16 } as React.CSSProperties,
  label:    { fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#0A0A0A", opacity: 0.5, marginBottom: 6, display: "block" } as React.CSSProperties,
};

/* ── Onboarding wrapper ─────────────────────────────────────────────────────── */
function BrutalPage({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={S.page} className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel */}
      <div className="lg:w-80 xl:w-96 flex-shrink-0 flex flex-col justify-between p-8 lg:p-10" style={{ background: "#FFE500", borderRight: "2px solid #0A0A0A" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>hangr</div>
          <div style={{ height: 2, background: "#0A0A0A", margin: "12px 0 24px" }} />
          <p style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1, textTransform: "uppercase", letterSpacing: "-0.02em" }}>{title}</p>
          {sub && <p style={{ fontSize: 12, fontWeight: 600, marginTop: 12, opacity: 0.65, letterSpacing: "0.04em" }}>{sub}</p>}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.55, letterSpacing: "0.08em", textTransform: "uppercase" }}>STEP BY STEP →</div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12" style={{ background: "#F2F1EB" }}>
        <div className="w-full max-w-md" style={{ background: "#fff", border: "2px solid #0A0A0A", boxShadow: "6px 6px 0 #0A0A0A", padding: "36px 32px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────────── */
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

  async function sendLoginOtp() {
    setLoginError("");
    const val = loginInput.trim();
    if (!isEmail(val) && !isPhone(val)) { setLoginError("Valid email ya 10-digit phone daalo"); return; }
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
    if (user && isPhone(val)) await supabase.from("profiles").update({ phone: formatPhone(val), is_verified: true }).eq("id", user.id);
    else if (user) await supabase.from("profiles").update({ is_verified: true }).eq("id", user.id);
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
    setSelected(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  }

  /* ── Onboarding: phone ── */
  if (currentUser && needsOnboarding && onboardStep === "phone") {
    return (
      <BrutalPage title="Verify your phone" sub="We'll send a one-time code">
        <p style={S.label}>Phone Number</p>
        <div style={{ display: "flex", border: "2px solid #0A0A0A", marginBottom: 16 }}>
          <div style={{ background: "#FFE500", padding: "14px 16px", fontSize: 13, fontWeight: 800, borderRight: "2px solid #0A0A0A", whiteSpace: "nowrap" }}>🇮🇳 +91</div>
          <input type="tel" value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit number"
            style={{ ...S.input, border: "none", flex: 1 }} maxLength={10} />
        </div>
        {detailsError && <div style={S.error}>{detailsError}</div>}
        <button style={{ ...S.btnY, opacity: detailsLoading || phone.replace(/\D/g, "").length < 10 ? 0.4 : 1 }}
          onClick={sendPhoneOtp} disabled={detailsLoading || phone.replace(/\D/g, "").length < 10}>
          {detailsLoading ? "Sending…" : "Send OTP →"}
        </button>
        <p style={{ fontSize: 11, marginTop: 12, opacity: 0.5, fontWeight: 600 }}>🔒 Sirf verification ke liye</p>
      </BrutalPage>
    );
  }

  /* ── Onboarding: OTP ── */
  if (currentUser && needsOnboarding && onboardStep === "otp") {
    return (
      <BrutalPage title="Enter the code" sub={`Sent to ${verifiedPhone}`}>
        <p style={S.label}>6-Digit OTP</p>
        <input type="number" value={phoneOtp}
          onChange={e => setPhoneOtp(e.target.value.slice(0, 6))}
          placeholder="• • • • • •"
          style={{ ...S.input, textAlign: "center", fontSize: 28, fontWeight: 900, letterSpacing: "0.4em", marginBottom: 16 }}
          maxLength={6} />
        {detailsError && <div style={S.error}>{detailsError}</div>}
        <button style={{ ...S.btnY, opacity: detailsLoading || phoneOtp.length !== 6 ? 0.4 : 1, marginBottom: 12 }}
          onClick={verifyPhoneOtp} disabled={detailsLoading || phoneOtp.length !== 6}>
          {detailsLoading ? "Verifying…" : "Verify ✓"}
        </button>
        <button onClick={() => { setOnboardStep("phone"); setPhoneOtp(""); setDetailsError(""); }}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, textDecoration: "underline", fontFamily: "inherit" }}>
          ← Change number
        </button>
      </BrutalPage>
    );
  }

  /* ── Onboarding: details ── */
  if (currentUser && needsOnboarding) {
    return (
      <BrutalPage title="Almost done!" sub={`Welcome, ${currentUser.name.split(" ")[0]}!`}>
        <form onSubmit={handleOnboarding}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={S.label}>Age</label>
              <input type="number" value={age} onChange={e => setAge(e.target.value)}
                placeholder="22" min={16} max={60} style={S.input} />
            </div>
            <div>
              <label style={S.label}>Area (optional)</label>
              <input type="text" value={neighborhood} onChange={e => setNeighborhood(e.target.value)}
                placeholder="Crossing Republik" style={S.input} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Gender (optional)</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["Male", "Female", "Other"] as Gender[]).map(g => (
                <button key={g} type="button" onClick={() => setGender(gender === g ? "" : g)}
                  style={{ ...S.chip, flex: 1, background: gender === g ? "#FFE500" : "#fff" }}>
                  {g === "Female" ? "♀" : g === "Male" ? "♂" : "⚧"} {g}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={S.label}>Interests — pick min 2</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {INTERESTS.map(i => (
                <button key={i} type="button" onClick={() => toggleInterest(i as Interest)}
                  style={{ ...S.chip, background: selected.includes(i as Interest) ? "#FFE500" : "#fff",
                    boxShadow: selected.includes(i as Interest) ? "2px 2px 0 #0A0A0A" : "none" }}>
                  {INTEREST_EMOJI[i]} {i}
                </button>
              ))}
            </div>
          </div>

          {detailsError && <div style={S.error}>{detailsError}</div>}
          <button type="submit" style={{ ...S.btnY, opacity: detailsLoading ? 0.5 : 1 }} disabled={detailsLoading}>
            {detailsLoading ? "Saving…" : "Let's Go →"}
          </button>
        </form>
      </BrutalPage>
    );
  }

  /* ── Main login screen ─────────────────────────────────────────────────────── */
  return (
    <div style={S.page} className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Left: Brand panel ── */}
      <div className="lg:w-1/2 flex flex-col justify-between p-10 lg:p-14 relative overflow-hidden"
        style={{ background: "#FFE500", borderRight: "2px solid #0A0A0A", minHeight: "40vh" }}>

        {/* Decorative blocks */}
        <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: "#0A0A0A" }} />
        <div style={{ position: "absolute", bottom: 60, left: 40, width: 32, height: 32, border: "2px solid #0A0A0A" }} />
        <div style={{ position: "absolute", bottom: 20, left: 80, width: 16, height: 16, background: "#0A0A0A" }} />

        {/* Logo */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.55 }}>HANGR ·</p>
        </div>

        {/* Headline */}
        <div>
          <h1 style={{ fontSize: "clamp(52px, 8vw, 88px)", fontWeight: 900, lineHeight: 0.9, textTransform: "uppercase", letterSpacing: "-0.03em", color: "#0A0A0A", marginBottom: 24 }}>
            MEET<br />PEOPLE.<br />RIGHT<br />NOW.
          </h1>
          <div style={{ height: 3, background: "#0A0A0A", width: 60, marginBottom: 24 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {["Verified spots only", "Safe meetups", "Free · No spam"].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, background: "#0A0A0A", flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", opacity: 0.4 }}>NOIDA · INDIA</p>
      </div>

      {/* ── Right: Auth form ── */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-14" style={{ background: "#F2F1EB" }}>
        <div className="w-full max-w-md" style={{ background: "#fff", border: "2px solid #0A0A0A", boxShadow: "6px 6px 0 #0A0A0A", padding: "40px 36px" }}>

          <h2 style={{ fontSize: 22, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
            {loginStep === "otp" ? "ENTER CODE" : "SIGN IN"}
          </h2>
          <div style={{ height: 2, background: "#0A0A0A", marginBottom: 28 }} />

          {loginError && <div style={S.error}>{loginError}</div>}

          {loginStep === "idle" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={S.label}>Phone or Email</label>
                <input type="text" value={loginInput}
                  onChange={e => setLoginInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendLoginOtp()}
                  placeholder="9876543210 or name@email.com"
                  style={S.input} />
                {loginInput && (
                  <p style={{ fontSize: 11, marginTop: 6, fontWeight: 600, opacity: 0.5 }}>
                    {isEmail(loginInput) ? "→ Email OTP" : isPhone(loginInput.replace(/\D/g, "")) ? "→ SMS OTP" : "→ Enter email or 10-digit number"}
                  </p>
                )}
              </div>
              <button style={{ ...S.btnY, opacity: loginLoading || (!isEmail(loginInput.trim()) && !isPhone(loginInput.trim().replace(/\D/g, ""))) ? 0.4 : 1 }}
                onClick={sendLoginOtp} disabled={loginLoading || (!isEmail(loginInput.trim()) && !isPhone(loginInput.trim().replace(/\D/g, "")))}>
                {loginLoading ? "Sending…" : "LET'S GO →"}
              </button>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0" }}>
                <div style={{ flex: 1, height: 2, background: "#0A0A0A" }} />
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase" }}>OR</span>
                <div style={{ flex: 1, height: 2, background: "#0A0A0A" }} />
              </div>

              <button style={S.btnW} onClick={signInWithGoogle} disabled={loginLoading}>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.6 20H24v8h11.3c-1.6 4.4-5.8 7.5-11.3 7.5a12.5 12.5 0 010-25c3.2 0 6.1 1.2 8.3 3.2l5.7-5.7A21 21 0 0024 3C12.4 3 3 12.4 3 24s9.4 21 21 21c12.2 0 20.4-8.5 20.4-20.5 0-1.4-.1-2.4-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12.4 12.4 0 0124 11.5c3.2 0 6.1 1.2 8.3 3.2l5.7-5.7A21 21 0 006.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 45c5.5 0 10.5-2 14.3-5.2l-6.6-5.4A12.4 12.4 0 0124 35.5c-5.4 0-9.6-3-11.3-7.4l-6.6 5c3.7 5.9 10.2 9.9 17.9 9.9z"/>
                  <path fill="#1976D2" d="M43.6 20H24v8h11.3a12.5 12.5 0 01-4.7 5.8l6.6 5.4c-.4.3 6.2-4.5 6.2-15.2 0-1.4-.1-2.4-.4-3.5z"/>
                </svg>
                Continue with Google
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 600, opacity: 0.55 }}>Code sent to: <strong>{loginInput}</strong></p>
              <div>
                <label style={S.label}>OTP Code</label>
                <input type="number" value={loginOtp}
                  onChange={e => setLoginOtp(e.target.value.slice(0, 6))}
                  onKeyDown={e => e.key === "Enter" && verifyLoginOtp()}
                  placeholder="• • • • • •"
                  style={{ ...S.input, textAlign: "center", fontSize: 28, fontWeight: 900, letterSpacing: "0.4em" }}
                  maxLength={6} />
              </div>
              <button style={{ ...S.btnY, opacity: loginLoading || loginOtp.length < 4 ? 0.4 : 1 }}
                onClick={verifyLoginOtp} disabled={loginLoading || loginOtp.length < 4}>
                {loginLoading ? "Verifying…" : "VERIFY ✓"}
              </button>
              <button onClick={() => { setLoginStep("idle"); setLoginOtp(""); setLoginError(""); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, textDecoration: "underline", fontFamily: "inherit", textAlign: "left" as const }}>
                ← Go back
              </button>
            </div>
          )}

          <p style={{ fontSize: 10, marginTop: 24, opacity: 0.35, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            By continuing you agree to our Terms & Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
