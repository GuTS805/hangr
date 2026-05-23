"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Interest, Gender } from "@/types";
import { INTERESTS, INTEREST_EMOJI } from "@/lib/mock-data";

export default function AuthPage() {
  const router = useRouter();
  const { currentUser, needsOnboarding, completeOnboarding } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Onboarding fields (shown after first Google sign-in)
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [selected, setSelected] = useState<Interest[]>([]);
  const [neighborhood, setNeighborhood] = useState("");

  // Already signed in + onboarded → go home
  if (currentUser && !needsOnboarding) {
    router.replace("/");
    return null;
  }

  async function signInWithGoogle() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  function toggleInterest(i: Interest) {
    setSelected((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  }

  async function handleOnboarding(e: React.FormEvent) {
    e.preventDefault();
    if (!age || parseInt(age) < 16 || parseInt(age) > 60)
      return setError("Enter a valid age (16–60)");
    if (selected.length < 2)
      return setError("Pick at least 2 interests");

    setLoading(true);
    await completeOnboarding(parseInt(age), selected, gender as Gender || undefined, neighborhood.trim() || undefined);
    router.push("/");
  }

  // ── Onboarding screen (after first Google sign-in) ─────────────
  if (currentUser && needsOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-md shadow-sm">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">👋</div>
            <h1 className="text-xl font-bold text-gray-900">Welcome, {currentUser.name}!</h1>
            <p className="text-sm text-gray-500 mt-1">Just a couple more things</p>
          </div>

          <form onSubmit={handleOnboarding} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="22"
                  min={16} max={60}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Neighborhood <span className="text-gray-400 font-normal text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Crossing Republik"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender <span className="text-gray-400 font-normal text-xs">(optional)</span>
              </label>
              <div className="flex gap-2">
                {(["Male", "Female", "Other"] as Gender[]).map((g) => (
                  <button key={g} type="button"
                    onClick={() => setGender(gender === g ? "" : g)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                      gender === g
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                    }`}>
                    {g === "Female" ? "♀ " : g === "Male" ? "♂ " : "⚧ "}{g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interests <span className="text-gray-400 font-normal">(pick at least 2)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((i) => (
                  <button key={i} type="button"
                    onClick={() => toggleInterest(i as Interest)}
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

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm disabled:opacity-50">
              {loading ? "Saving…" : "Let's go →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Sign-in screen ─────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-sm shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2">hangr</h1>
          <p className="text-gray-500 text-sm">Find people who are free right now</p>
        </div>

        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 mb-8">
          <span className="text-blue-400 mt-0.5 text-sm">🛡️</span>
          <p className="text-xs text-blue-700 leading-relaxed">
            All meetups happen at <strong>verified public places</strong> only. Your exact location is never shared.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm disabled:opacity-50 mb-3"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3c-1.6 4.4-5.8 7.5-11.3 7.5a12.5 12.5 0 010-25c3.2 0 6.1 1.2 8.3 3.2l5.7-5.7A21 21 0 0024 3C12.4 3 3 12.4 3 24s9.4 21 21 21c12.2 0 20.4-8.5 20.4-20.5 0-1.4-.1-2.4-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12.4 12.4 0 0124 11.5c3.2 0 6.1 1.2 8.3 3.2l5.7-5.7A21 21 0 006.3 14.7z"/>
              <path fill="#4CAF50" d="M24 45c5.5 0 10.5-2 14.3-5.2l-6.6-5.4A12.4 12.4 0 0124 35.5c-5.4 0-9.6-3-11.3-7.4l-6.6 5c3.7 5.9 10.2 9.9 17.9 9.9z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3a12.5 12.5 0 01-4.7 5.8l6.6 5.4c-.4.3 6.2-4.5 6.2-15.2 0-1.4-.1-2.4-.4-3.5z"/>
            </svg>
          )}
          {loading ? "Redirecting…" : "Continue with Google"}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          One tap · No password · Google verified profile
        </p>
      </div>
    </div>
  );
}
