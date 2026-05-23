"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let done = false;
    const finish = (path: string) => {
      if (done) return;
      done = true;
      router.replace(path);
    };

    const search = window.location.search;
    const hash = window.location.hash;

    // Set up auth state listener first so we never miss SIGNED_IN
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        subscription.unsubscribe();
        clearTimeout(timeout);
        finish("/");
      }
    });

    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      finish("/auth");
    }, 10000);

    const handleCallback = async () => {
      // PKCE flow: ?code= in query string
      const code = new URLSearchParams(search).get("code");
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.session) {
          subscription.unsubscribe();
          clearTimeout(timeout);
          finish("/auth");
        } else {
          subscription.unsubscribe();
          clearTimeout(timeout);
          finish("/");
        }
        return;
      }

      // Implicit flow: parse access_token directly from hash (detectSessionInUrl race condition workaround)
      const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");

      if (access_token && refresh_token) {
        const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (data.session && !error) {
          subscription.unsubscribe();
          clearTimeout(timeout);
          finish("/");
        } else {
          subscription.unsubscribe();
          clearTimeout(timeout);
          finish("/auth");
        }
        return;
      }

      // Fallback: check storage
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        subscription.unsubscribe();
        clearTimeout(timeout);
        finish("/");
      }
    };

    handleCallback();

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-500 font-medium">Signing you in…</p>
      </div>
    </div>
  );
}
