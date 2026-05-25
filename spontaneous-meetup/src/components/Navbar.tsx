"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { LogoMark } from "@/components/Logo";

const NAV_LINKS = [
  { href: "/",        label: "Home"    },
  { href: "/feed",    label: "Feed"    },
  { href: "/explore", label: "Explore" },
  { href: "/profile", label: "Profile" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { currentUser, isFree, logout } = useStore();

  function handleLogout() {
    logout();
    router.push("/auth");
  }

  return (
    <>
      {/* ── Floating pill navbar ── */}
      <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <nav
          className="pointer-events-auto flex items-center gap-1 px-2 py-2 shadow-2xl"
          style={{
            background: "#111",
            borderRadius: 999,
            boxShadow: "0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          {/* Logo */}
          <Link href="/" className="relative flex-shrink-0 mr-1 transition-all hover:opacity-85 active:scale-95">
            <LogoMark size={34} />
            {isFree && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-[#111]" />
            )}
          </Link>

          {/* Nav links */}
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all"
                style={
                  active
                    ? { background: "rgba(255,255,255,0.15)", color: "#fff" }
                    : { color: "rgba(255,255,255,0.55)" }
                }
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.9)";
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)";
                }}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Right: user pill or sign in */}
          {currentUser ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full ml-1 transition-all hover:opacity-90 active:scale-95"
              style={{ background: "#fff" }}
              title="Sign out"
            >
              {currentUser.avatar?.startsWith("http") || currentUser.avatar?.startsWith("data:") ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-full text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}
                >
                  {currentUser.avatar}
                </div>
              )}
              <span className="text-[13px] font-bold text-gray-900 max-w-[80px] truncate hidden sm:block">
                {currentUser.name.split(" ")[0]}
              </span>
            </button>
          ) : (
            <Link
              href="/auth"
              className="px-4 py-1.5 rounded-full text-[13px] font-bold ml-1 transition-all hover:opacity-90 active:scale-95"
              style={{ background: "#fff", color: "#111" }}
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>

      {/* spacer so content doesn't hide under the floating bar */}
      <div className="h-20" />

      {/* ── Mobile bottom tab bar ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 sm:hidden flex justify-center pb-3 px-4 pointer-events-none"
      >
        <nav
          className="pointer-events-auto flex items-center gap-0 px-2 py-2 shadow-2xl"
          style={{
            background: "#111",
            borderRadius: 999,
            boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
          }}
        >
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex flex-col items-center px-4 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-90"
                style={
                  active
                    ? { background: "rgba(255,255,255,0.15)", color: "#fff" }
                    : { color: "rgba(255,255,255,0.45)" }
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="h-16 sm:hidden" />
    </>
  );
}
