"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Interest, Gender } from "@/types";
import { INTERESTS, INTEREST_EMOJI } from "@/lib/mock-data";
import PhotoVerificationModal from "@/components/PhotoVerificationModal";

type LoginStep    = "idle" | "otp";
type PostAuthStep = "interests" | "verify";
type AuthMode     = "signup" | "login";

const PENDING_KEY = "hangr_pending_onboarding";

type PendingDetails = {
  name: string;
  age: number;
  gender?: Gender;
  neighborhood?: string;
  city?: string;
};

function isEmail(v: string) { return v.includes("@"); }
function isPhone(v: string) { return /^\d{10}$/.test(v.replace(/\s/g, "")); }
function formatPhone(v: string) { return `+91${v.replace(/\D/g, "").slice(-10)}`; }

/* ── Page component ──────────────────────────────────────────────────────── */
export default function AuthPage() {
  const router = useRouter();
  const { currentUser, needsOnboarding, completeOnboarding } = useStore();

  // Details, collected up front on the single sign-up screen
  const [name, setName]                 = useState("");
  const [age, setAge]                   = useState("");
  const [gender, setGender]             = useState<Gender | "">("");
  const [city, setCity]                 = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [detailsError, setDetailsError] = useState("");

  const [authMode, setAuthMode]         = useState<AuthMode>("signup");
  const [loginStep, setLoginStep]       = useState<LoginStep>("idle");
  const [loginInput, setLoginInput]     = useState("");
  const [loginOtp, setLoginOtp]         = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError]     = useState("");

  // Post-auth: interests, then an optional verification prompt
  const [postAuthStep, setPostAuthStep]         = useState<PostAuthStep | null>(null);
  const [needsBasicDetails, setNeedsBasicDetails] = useState(false);
  const [selected, setSelected]                 = useState<Interest[]>([]);
  const [interestsError, setInterestsError]     = useState("");
  const [savingInterests, setSavingInterests]   = useState(false);
  const [showVerifyModal, setShowVerifyModal]   = useState(false);
  const [autoStarting, setAutoStarting]         = useState(false);

  // Once auth succeeds, move into the post-auth steps (interests → verification)
  useEffect(() => {
    if (!currentUser || !needsOnboarding || postAuthStep || autoStarting) return;
    setAutoStarting(true);
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (raw) {
      const details = JSON.parse(raw) as PendingDetails;
      setName(details.name);
      setAge(String(details.age));
      setGender(details.gender ?? "");
      setCity(details.city ?? "");
      setNeighborhood(details.neighborhood ?? "");
    } else {
      setNeedsBasicDetails(true); // pending details were lost (e.g. storage cleared) — collect them here instead
    }
    setPostAuthStep("interests");
  }, [currentUser, needsOnboarding, postAuthStep, autoStarting]);

  if (currentUser && !needsOnboarding && !postAuthStep) { router.replace("/"); return null; }

  function validateDetails(): PendingDetails | null {
    if (!name.trim()) { setDetailsError("Please enter your name."); return null; }
    if (!age || parseInt(age) < 16 || parseInt(age) > 60) { setDetailsError("Please enter a valid age (16–60)."); return null; }
    return {
      name: name.trim(),
      age: parseInt(age),
      gender: (gender as Gender) || undefined,
      city: city.trim() || undefined,
      neighborhood: neighborhood.trim() || undefined,
    };
  }

  // Holds the details across the redirect to Google / the OTP round trip
  function stashDetails(): boolean {
    setDetailsError("");
    const details = validateDetails();
    if (!details) return false;
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(details));
    return true;
  }

  function toggleInterest(i: Interest) {
    setSelected(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  }

  async function submitInterests(e: React.FormEvent) {
    e.preventDefault();
    setInterestsError("");
    if (needsBasicDetails) {
      const details = validateDetails();
      if (!details) { setInterestsError(detailsError || "Please fill in your details."); return; }
    }
    if (selected.length < 2) { setInterestsError("Please select at least 2 interests."); return; }

    setSavingInterests(true);
    await completeOnboarding({
      name: name.trim(),
      age: parseInt(age),
      interests: selected,
      gender: (gender as Gender) || undefined,
      neighborhood: neighborhood.trim() || undefined,
      city: city.trim() || undefined,
    });
    sessionStorage.removeItem(PENDING_KEY);
    setSavingInterests(false);
    setPostAuthStep("verify");
  }

  /* ── Auth actions ── */
  async function sendLoginOtp() {
    setLoginError("");
    if (authMode === "signup" && !stashDetails()) return;
    const val = loginInput.trim();
    if (!isEmail(val) && !isPhone(val)) { setLoginError("Please enter a valid email address or 10-digit phone number."); return; }
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
    if (loginOtp.length < 4) { setLoginError("Please enter the OTP."); return; }
    setLoginLoading(true);
    const val = loginInput.trim();
    let error;
    if (isPhone(val)) ({ error } = await supabase.auth.verifyOtp({ phone: formatPhone(val), token: loginOtp, type: "sms" }));
    else              ({ error } = await supabase.auth.verifyOtp({ email: val, token: loginOtp, type: "email" }));
    if (error) { setLoginError("Incorrect OTP. Please try again."); setLoginLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (user && isPhone(val)) await supabase.from("profiles").update({ phone: formatPhone(val) }).eq("id", user.id);
    setLoginLoading(false);
  }

  async function signInWithGoogle() {
    setLoginError("");
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: "select_account" } },
    });
    if (error) { setLoginError(error.message); setLoginLoading(false); }
  }

  const basicFieldsJsx = (
    <>
      <div>
        <label className="text-xs font-black uppercase tracking-wider text-black block mb-1.5">Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          className="w-full border-2 border-black bg-white px-4 py-4 text-base font-medium focus:outline-none focus:shadow-[3px_3px_0_#0A0A0A] transition-shadow"
        />
      </div>

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
          <label className="text-xs font-black uppercase tracking-wider text-black block mb-1.5">City</label>
          <input
            type="text"
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="Ghaziabad"
            className="w-full border-2 border-black bg-white px-4 py-4 text-base font-medium focus:outline-none focus:shadow-[3px_3px_0_#0A0A0A] transition-shadow"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-black uppercase tracking-wider text-black block mb-1.5">Area / Neighborhood</label>
        <input
          type="text"
          value={neighborhood}
          onChange={e => setNeighborhood(e.target.value)}
          placeholder="Crossing Republik"
          className="w-full border-2 border-black bg-white px-4 py-4 text-base font-medium focus:outline-none focus:shadow-[3px_3px_0_#0A0A0A] transition-shadow"
        />
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
    </>
  );

  /* ── Brief transition while we move into the post-auth steps ── */
  if (currentUser && needsOnboarding && !postAuthStep) {
    return (
      <div className="min-h-screen bg-[#F2F1EB] flex items-center justify-center p-6">
        <div className="w-full max-w-md border-2 border-black bg-white shadow-[6px_6px_0_#0A0A0A] p-8 text-center">
          <p className="text-sm font-mono text-black/50 uppercase tracking-wider">Setting things up…</p>
        </div>
      </div>
    );
  }

  /* ── Post-auth step 1: interests ── */
  if (currentUser && postAuthStep === "interests") {
    return (
      <div className="min-h-screen bg-[#F2F1EB] flex items-center justify-center p-6">
        <div className="w-full max-w-md border-2 border-black bg-white shadow-[6px_6px_0_#0A0A0A] p-8">
          <div className="bg-[#FFE500] border-b-2 border-black px-6 py-4 -mx-8 -mt-8 mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tight text-black">
              {needsBasicDetails ? "Almost done!" : `Hey ${name.split(" ")[0] || "there"} 👋`}
            </h2>
            <p className="text-xs font-mono text-black/60 uppercase tracking-wider mt-1">
              What are you into?
            </p>
          </div>

          <form onSubmit={submitInterests} className="flex flex-col gap-4">
            {needsBasicDetails && basicFieldsJsx}

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

            {interestsError && (
              <div className="border-2 border-black bg-[#FF2D2D] text-white font-bold px-4 py-3 text-sm">
                {interestsError}
              </div>
            )}

            <button
              type="submit"
              disabled={savingInterests}
              className="w-full bg-[#FFE500] border-2 border-black text-black font-black uppercase tracking-wide py-4 shadow-[4px_4px_0_#0A0A0A] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {savingInterests ? "..." : "Continue →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ── Post-auth step 2: optional photo verification ── */
  if (currentUser && postAuthStep === "verify") {
    return (
      <div className="min-h-screen bg-[#F2F1EB] flex items-center justify-center p-6">
        <div className="w-full max-w-md border-2 border-black bg-white shadow-[6px_6px_0_#0A0A0A] p-8 text-center">
          <p className="text-5xl mb-3">📸</p>
          <h2 className="text-2xl font-black uppercase tracking-tight text-black mb-2">Get verified</h2>
          <p className="text-sm font-mono text-black/50 mb-6">
            A quick live selfie matched to your profile photo earns you a Verified badge — people trust verified profiles more.
          </p>
          <button
            onClick={() => setShowVerifyModal(true)}
            className="w-full bg-[#FFE500] border-2 border-black text-black font-black uppercase tracking-wide py-4 shadow-[4px_4px_0_#0A0A0A] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all mb-3">
            Verify Now
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full border-2 border-black bg-transparent text-black font-bold uppercase py-3 hover:bg-black hover:text-[#FFE500] transition-colors">
            Skip for now
          </button>
        </div>

        {showVerifyModal && (
          <PhotoVerificationModal onClose={() => { setShowVerifyModal(false); router.push("/"); }} />
        )}
      </div>
    );
  }

  /* ── Pre-auth: single sign-up screen ── */
  return (
    <div className="min-h-screen bg-[#F2F1EB] flex items-center justify-center p-6">
      <div className="w-full max-w-md border-2 border-black bg-white shadow-[6px_6px_0_#0A0A0A] p-8">

        <div className="text-center mb-6">
          <div className="w-16 h-16 border-2 border-black bg-[#FFE500] flex items-center justify-center text-3xl mb-4 shadow-[3px_3px_0_#0A0A0A] mx-auto">
            ⚡
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-black leading-none mb-1">hangr</h1>
          <p className="text-sm font-mono text-black/50 uppercase tracking-wider">meet people. right now.</p>
        </div>

        <div className="flex flex-col gap-4">
          {authMode === "signup" && (
            <>
              {basicFieldsJsx}
              {detailsError && (
                <div className="border-2 border-black bg-[#FF2D2D] text-white font-bold px-4 py-3 text-sm">
                  {detailsError}
                </div>
              )}
            </>
          )}

          <div className="flex items-center gap-0 my-1">
            <div className="flex-1 border-t-2 border-black" />
            <span className="bg-white px-3 font-black text-xs uppercase -mt-[2px]">
              {authMode === "signup" ? "how should we reach you?" : "log in"}
            </span>
            <div className="flex-1 border-t-2 border-black" />
          </div>

          {loginError && (
            <div className="border-2 border-black bg-[#FF2D2D] text-white font-bold px-4 py-3 text-sm">
              {loginError}
            </div>
          )}

          {loginStep === "idle" ? (
            <>
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
                {loginLoading ? "SENDING..." : "Continue →"}
              </button>

              {authMode === "login" && (
                <>
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
                </>
              )}

              <button
                onClick={() => { setAuthMode(authMode === "signup" ? "login" : "signup"); setLoginError(""); }}
                className="w-full text-center text-xs font-bold uppercase text-black/50 hover:text-black transition-colors py-1">
                {authMode === "signup" ? "Already have an account? Log in" : "New here? Sign up"}
              </button>
            </>
          ) : (
            <>
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
            </>
          )}

          <p className="text-xs text-center text-black/40 font-mono mt-1 uppercase">
            By continuing you agree to our{" "}
            <span className="font-black cursor-pointer underline">Terms & Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
}
