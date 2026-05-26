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

    // detectSessionInUrl:true handles the code/token exchange automatically.
    // We just listen for the result.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        finish("/");
      }
    });

    // In case SIGNED_IN already fired before this effect ran, check immediately.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) finish("/");
    });

    // Hard timeout: if nothing happens in 10s, send to login.
    const timeout = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      finish(session ? "/" : "/auth");
    }, 10000);

    return () => {
      done = true;
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
