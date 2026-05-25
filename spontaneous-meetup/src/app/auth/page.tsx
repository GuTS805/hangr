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

export default function AuthPage() {
  const router = useRouter();
  const { currentUser, needsOnboarding, completeOnboarding } = useStore();

  // ── Login section ──────────────────────────────────────────────
  const [loginStep, setLoginStep]   = useState<LoginStep>("idle");
  const [loginInput, setLoginInput] = useState("");
  const [loginOtp, setLoginOtp]     = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // ── Onboarding section ─────────────────────────────────────────
  // If user logged in via phone/email OTP, phone is already verified → skip to details
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

  // Already signed in + onboarded → home
  if (currentUser && !needsOnboarding) {
    router.replace("/");
    return null;
  }

  // ── Login: send OTP ────────────────────────────────────────────
  async function sendLoginOtp() {
    setLoginError("");
    const val = loginInput.trim();
    if (!isEmail(val) && !isPhone(val)) {
      setLoginError("Valid email ya 10-digit phone number daalo");
      return;
    }
    setLoginLoading(true);
    let error;
    if (isPhone(val)) {
      ({ error } = await supabase.auth.signInWithOtp({ phone: formatPhone(val) }));
    } else {
      ({ error } = await supabase.auth.signInWithOtp({ email: val }));
    }
    setLoginLoading(false);
    if (error) { setLoginError(error.message); return; }
    setLoginStep("otp");
  }

  // ── Login: verify OTP ──────────────────────────────────────────
  async function verifyLoginOtp() {
    setLoginError("");
    if (loginOtp.length < 4) { setLoginError("OTP daalo"); return; }
    setLoginLoading(true);
    const val = loginInput.trim();
    let error;
    if (isPhone(val)) {
      ({ error } = await supabase.auth.verifyOtp({
        phone: formatPhone(val), token: loginOtp, type: "sms",
      }));
    } else {
      ({ error } = await supabase.auth.verifyOtp({
        email: val, token: loginOtp, type: "email",
      }));
    }
    if (error) { setLoginError("Wrong OTP"); setLoginLoading(false); return; }

    // Mark phone verified in profile (if phone login) + set is_verified
    const { data: { user } } = await supabase.auth.getUser();
    if (user && isPhone(val)) {
      await supabase.from("profiles").update({
        phone: formatPhone(val),
        is_verified: true,
      }).eq("id", user.id);
    } else if (user) {
      await supabase.from("profiles").update({ is_verified: true }).eq("id", user.id);
    }
    setLoginLoading(false);
    // Skip phone step in onboarding since already verified here
    setOnboardStep("details");
  }

  // ── Google sign-in ─────────────────────────────────────────────
  async function signInWithGoogle() {
    setLoginLoading(true);
    setLoginError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) { setLoginError(error.message); setLoginLoading(false); }
  }

  // ── Onboarding: send phone OTP ────────────────────────────────
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

  // ── Onboarding: verify phone OTP ─────────────────────────────
  async function verifyPhoneOtp() {
    setDetailsError("");
    if (phoneOtp.length !== 6) { setDetailsError("6-digit OTP daalo"); return; }
    setDetailsLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: verifiedPhone, token: phoneOtp, type: "phone_change",
    });
    if (error) { setDetailsError("Wrong OTP"); setDetailsLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ phone: verifiedPhone, is_verified: true }).eq("id", user.id);
    }
    setDetailsLoading(false);
    setOnboardStep("details");
  }

  // ── Onboarding: save details ──────────────────────────────────
  async function handleOnboarding(e: React.FormEvent) {
    e.preventDefault();
    if (!age || parseInt(age) < 16 || parseInt(age) > 60)
      return setDetailsError("Valid age daalo (16–60)");
    if (selected.length < 2)
      return setDetailsError("Kam se kam 2 interests choose karo");
    setDetailsLoading(true);
    await completeOnboarding(parseInt(age), selected, gender as Gender || undefined, neighborhood.trim() || undefined);
    router.push("/");
  }

  function toggleInterest(i: Interest) {
    setSelected((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  }

  // ── Onboarding screens ─────────────────────────────────────────
  if (currentUser && needsOnboarding) {
    if (onboardStep === "phone") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-sm shadow-sm">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📱</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Phone verify karo</h1>
              <p className="text-sm text-gray-500 mt-1">Ek OTP aayega verify karne ke liye</p>
            </div>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden mb-4 focus-within:ring-2 focus-within:ring-blue-500">
              <span className="px-3 py-3 bg-gray-50 text-gray-500 text-sm font-medium border-r border-gray-200">🇮🇳 +91</span>
              <input type="tel" value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit number"
                className="flex-1 px-3 py-3 text-sm outline-none" maxLength={10} />
            </div>
            {detailsError && <p className="text-red-500 text-sm mb-3">{detailsError}</p>}
            <button onClick={sendPhoneOtp} disabled={detailsLoading || phone.replace(/\D/g, "").length < 10}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm disabled:opacity-50">
              {detailsLoading ? "Sending…" : "OTP Bhejo"}
            </button>
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 mt-4">
              <span className="text-amber-500 text-sm">🔒</span>
              <p className="text-xs text-amber-700">Tera number sirf verification ke liye hai</p>
            </div>
          </div>
        </div>
      );
    }

    if (onboardStep === "otp") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-sm shadow-sm">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🔢</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">OTP enter karo</h1>
              <p className="text-sm text-gray-500 mt-1"><span className="font-medium text-gray-700">{verifiedPhone}</span> pe bheja gaya</p>
            </div>
            <input type="number" value={phoneOtp}
              onChange={(e) => setPhoneOtp(e.target.value.slice(0, 6))}
              placeholder="6-digit OTP"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              maxLength={6} />
            {detailsError && <p className="text-red-500 text-sm mb-3 text-center">{detailsError}</p>}
            <button onClick={verifyPhoneOtp} disabled={detailsLoading || phoneOtp.length !== 6}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 mb-3">
              {detailsLoading ? "Verifying…" : "Verify karo ✓"}
            </button>
            <button onClick={() => { setOnboardStep("phone"); setPhoneOtp(""); setDetailsError(""); }}
              className="w-full text-gray-500 text-sm py-2 hover:text-gray-700">← Number change karo</button>
          </div>
        </div>
      );
    }

    // Details step
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-md shadow-sm">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">✅</div>
            <h1 className="text-xl font-bold text-gray-900">Almost done!</h1>
            <p className="text-sm text-gray-500 mt-1">Welcome, {currentUser.name}!</p>
          </div>
          <form onSubmit={handleOnboarding} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Age</label>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)}
                  placeholder="22" min={16} max={60}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Neighborhood <span className="text-gray-400 font-normal text-xs">(optional)</span>
                </label>
                <input type="text" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Crossing Republik"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender <span className="text-gray-400 font-normal text-xs">(optional)</span>
              </label>
              <div className="flex gap-2">
                {(["Male", "Female", "Other"] as Gender[]).map((g) => (
                  <button key={g} type="button" onClick={() => setGender(gender === g ? "" : g)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                      gender === g ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                    }`}>
                    {g === "Female" ? "♀ " : g === "Male" ? "♂ " : "⚧ "}{g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interests <span className="text-gray-400 font-normal">(kam se kam 2)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((i) => (
                  <button key={i} type="button" onClick={() => toggleInterest(i as Interest)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                      selected.includes(i as Interest)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                    }`}>
                    {INTEREST_EMOJI[i]} {i}
                  </button>
                ))}
              </div>
            </div>
            {detailsError && <p className="text-red-500 text-sm">{detailsError}</p>}
            <button type="submit" disabled={detailsLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm disabled:opacity-50">
              {detailsLoading ? "Saving…" : "Chal shuru karte hain →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main login screen ──────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-sm shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-black text-gray-900 mb-2">hangr</h1>
          <p className="text-gray-500 text-sm">Find people who are free right now</p>
        </div>

        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 mb-6">
          <span className="text-blue-400 mt-0.5 text-sm">🛡️</span>
          <p className="text-xs text-blue-700 leading-relaxed">
            All meetups happen at <strong>verified public places</strong> only.
          </p>
        </div>

        {loginError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
            {loginError}
          </div>
        )}

        {/* Phone / Email OTP */}
        {loginStep === "idle" ? (
          <>
            <div className="mb-3">
              <input
                type="text"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                placeholder="Phone number ya email daalo"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1.5 pl-1">
                {isEmail(loginInput) ? "📧 Email OTP bheja jayega" : isPhone(loginInput.replace(/\D/g, "")) ? "📱 SMS OTP bheja jayega" : "10-digit number ya email@example.com"}
              </p>
            </div>
            <button
              onClick={sendLoginOtp}
              disabled={loginLoading || (!isEmail(loginInput.trim()) && !isPhone(loginInput.trim().replace(/\D/g, "")))}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 mb-5"
            >
              {loginLoading ? "Sending…" : "OTP Bhejo →"}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-2">
              OTP bheja gaya: <span className="font-medium text-gray-800">{loginInput}</span>
            </p>
            <input
              type="number"
              value={loginOtp}
              onChange={(e) => setLoginOtp(e.target.value.slice(0, 6))}
              placeholder="OTP enter karo"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            />
            <button
              onClick={verifyLoginOtp}
              disabled={loginLoading || loginOtp.length < 4}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 mb-2"
            >
              {loginLoading ? "Verifying…" : "Verify karo ✓"}
            </button>
            <button
              onClick={() => { setLoginStep("idle"); setLoginOtp(""); setLoginError(""); }}
              className="w-full text-gray-400 text-sm py-1.5 hover:text-gray-600"
            >
              ← Wapas jao
            </button>
          </>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">ya</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Google */}
        <button
          onClick={signInWithGoogle}
          disabled={loginLoading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm disabled:opacity-50 mt-2"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3c-1.6 4.4-5.8 7.5-11.3 7.5a12.5 12.5 0 010-25c3.2 0 6.1 1.2 8.3 3.2l5.7-5.7A21 21 0 0024 3C12.4 3 3 12.4 3 24s9.4 21 21 21c12.2 0 20.4-8.5 20.4-20.5 0-1.4-.1-2.4-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12.4 12.4 0 0124 11.5c3.2 0 6.1 1.2 8.3 3.2l5.7-5.7A21 21 0 006.3 14.7z"/>
            <path fill="#4CAF50" d="M24 45c5.5 0 10.5-2 14.3-5.2l-6.6-5.4A12.4 12.4 0 0124 35.5c-5.4 0-9.6-3-11.3-7.4l-6.6 5c3.7 5.9 10.2 9.9 17.9 9.9z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3a12.5 12.5 0 01-4.7 5.8l6.6 5.4c-.4.3 6.2-4.5 6.2-15.2 0-1.4-.1-2.4-.4-3.5z"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          One tap · Phone verified · Safe meetups
        </p>
      </div>
    </div>
  );
}
