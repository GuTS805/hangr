"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Interest, Gender } from "@/types";
import { INTERESTS, INTEREST_EMOJI } from "@/lib/mock-data";

type LoginStep   = "idle" | "otp";

function isEmail(v: string) { return v.includes("@"); }
function isPhone(v: string) { return /^\d{10}$/.test(v.replace(/\s/g, "")); }
function formatPhone(v: string) { return `+91${v.replace(/\D/g, "").slice(-10)}`; }

/* ── Page component ──────────────────────────────────────────────────────── */
export default function AuthPage() {
  const router = useRouter();
  const { currentUser, needsOnboarding, completeOnboarding } = useStore();

  const [loginStep, setLoginStep]       = useState<LoginStep>("idle");
  const [loginInput, setLoginInput]     = useState("");
  const [loginOtp, setLoginOtp]         = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError]     = useState("");

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

  /* ── Onboarding: details (straight after login — no extra phone step) ── */
  if (currentUser && needsOnboarding) {
    return (
      <div className="min-h-screen bg-[#F2F1EB] flex items-center justify-center p-6">
        <div className="w-full max-w-md border-2 border-black bg-white shadow-[6px_6px_0_#0A0A0A] p-8">
          {/* Yellow header bar */}
          <div className="bg-[#FFE500] border-b-2 border-black px-6 py-4 -mx-8 -mt-8 mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tight text-black">Almost done!</h2>
            <p className="text-xs font-mono text-black/60 uppercase tracking-wider mt-1">
              Welcome, {currentUser.name.split(" ")[0]}!
            </p>
          </div>

          <form onSubmit={handleOnboarding} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1.5">Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  placeholder="22"
                  min={16}
                  max={60}
                  className="w-full border-2 border-black bg-white px-4 py-4 text-base font-medium focus:outline-none focus:shadow-[3px_3px_0_#0A0A0A] transition-shadow"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1.5">Area</label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={e => setNeighborhood(e.target.value)}
                  placeholder="Crossing Republik"
                  className="w-full border-2 border-black bg-white px-4 py-4 text-base font-medium focus:outline-none focus:shadow-[3px_3px_0_#0A0A0A] transition-shadow"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-black block mb-2">Gender (optional)</label>
              <div className="flex gap-2">
                {(["Male","Female","Other"] as Gender[]).map(g => (
                  <button key={g} type="button" onClick={() => setGender(gender === g ? "" : g)}
                    className={`flex-1 py-2.5 text-sm font-black uppercase border-2 border-black transition-all cursor-pointer ${
                      gender === g ? "bg-black text-[#FFE500]" : "bg-white text-black hover:bg-[#FFE500]"
                    }`}>
                    {g === "Female" ? "♀" : g === "Male" ? "♂" : "⚧"} {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-black block mb-2">Interests — pick at least 2</label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(i => {
                  const sel = selected.includes(i as Interest);
                  return (
                    <button key={i} type="button" onClick={() => toggleInterest(i as Interest)}
                      className={`border-2 border-black text-xs font-bold uppercase px-3 py-1.5 transition-all cursor-pointer ${
                        sel ? "bg-black text-[#FFE500]" : "bg-white text-black hover:bg-[#FFE500]"
                      }`}>
                      {INTEREST_EMOJI[i]} {i}
                    </button>
                  );
                })}
              </div>
            </div>

            {detailsError && (
              <div className="border-2 border-black bg-[#FF2D2D] text-white font-bold px-4 py-3 text-sm">
                {detailsError}
              </div>
            )}

            <button
              type="submit"
              disabled={detailsLoading}
              className="w-full bg-[#FFE500] border-2 border-black text-black font-black uppercase tracking-wide py-4 shadow-[4px_4px_0_#0A0A0A] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {detailsLoading ? "..." : "Let's Go!"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ── Main login ──────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#F2F1EB] flex items-center justify-center p-6">
      <div className="w-full max-w-md border-2 border-black bg-white shadow-[6px_6px_0_#0A0A0A] p-8">

        {/* Brand */}
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="w-16 h-16 border-2 border-black bg-[#FFE500] flex items-center justify-center text-3xl mb-4 shadow-[3px_3px_0_#0A0A0A] mx-auto">
            ⚡
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-black leading-none mb-1">hangr</h1>
          <p className="text-sm font-mono text-black/50 uppercase tracking-wider">meet people. right now.</p>

          {/* Badge pill */}
          <div className="mt-3 inline-flex items-center gap-1 border-2 border-black bg-black text-[#FFE500] text-xs font-black uppercase px-3 py-1">
            <span>🛡️</span> Verified spots only
          </div>
        </div>

        {loginError && (
          <div className="border-2 border-black bg-[#FF2D2D] text-white font-bold px-4 py-3 text-sm mb-4">
            {loginError}
          </div>
        )}

        {loginStep === "idle" ? (
          <div className="flex flex-col gap-3">
            <div>
              <input
                type="text"
                value={loginInput}
                onChange={e => setLoginInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendLoginOtp()}
                placeholder="Phone number or email"
                className="w-full border-2 border-black bg-white px-4 py-4 text-base font-medium focus:outline-none focus:shadow-[3px_3px_0_#0A0A0A] transition-shadow"
              />
              {loginInput && (
                <p className="text-xs font-mono text-black/40 mt-1 uppercase">
                  {isEmail(loginInput) ? "Email OTP" : isPhone(loginInput.replace(/\D/g, "")) ? "SMS OTP" : "Enter email or 10-digit number"}
                </p>
              )}
            </div>

            <button
              onClick={sendLoginOtp}
              disabled={loginLoading || (!isEmail(loginInput.trim()) && !isPhone(loginInput.trim().replace(/\D/g, "")))}
              className="w-full bg-[#FFE500] border-2 border-black text-black font-black uppercase tracking-wide py-4 shadow-[4px_4px_0_#0A0A0A] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {loginLoading ? "SENDING..." : "Let's Go →"}
            </button>

            {/* OR divider */}
            <div className="flex items-center gap-0 my-1">
              <div className="flex-1 border-t-2 border-black" />
              <span className="bg-white px-3 font-black text-xs uppercase -mt-[2px]">or</span>
              <div className="flex-1 border-t-2 border-black" />
            </div>

            <button
              onClick={signInWithGoogle}
              disabled={loginLoading}
              className="w-full bg-white border-2 border-black text-black font-black uppercase tracking-wide py-4 shadow-[4px_4px_0_#0A0A0A] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed">
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
          <div className="flex flex-col gap-3">
            <p className="text-center text-sm font-mono text-black/50 uppercase">
              Code sent to <span className="text-black font-black">{loginInput}</span>
            </p>

            <input
              type="number"
              value={loginOtp}
              onChange={e => setLoginOtp(e.target.value.slice(0, 6))}
              onKeyDown={e => e.key === "Enter" && verifyLoginOtp()}
              placeholder="• • • • • •"
              maxLength={6}
              className="w-full border-2 border-black bg-white px-4 py-4 text-center text-4xl font-black tracking-[0.5em] focus:outline-none focus:shadow-[3px_3px_0_#0A0A0A] transition-shadow"
            />

            <button
              onClick={verifyLoginOtp}
              disabled={loginLoading || loginOtp.length < 4}
              className="w-full bg-[#FFE500] border-2 border-black text-black font-black uppercase tracking-wide py-4 shadow-[4px_4px_0_#0A0A0A] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {loginLoading ? "VERIFYING..." : "Verify ✓"}
            </button>

            <button
              onClick={() => { setLoginStep("idle"); setLoginOtp(""); setLoginError(""); }}
              className="w-full border-2 border-black bg-transparent text-black font-bold uppercase py-3 hover:bg-black hover:text-[#FFE500] transition-colors">
              ← Go back
            </button>
          </div>
        )}

        <p className="text-xs text-center text-black/40 font-mono mt-4 uppercase">
          By continuing you agree to our{" "}
          <span className="font-black cursor-pointer underline">Terms & Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}
