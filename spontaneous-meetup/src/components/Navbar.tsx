"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { LogoMark } from "@/components/Logo";
import NotificationsPanel from "@/components/NotificationsPanel";

// ── SVG icons: filled when active, outline when inactive ──────────────────

function HomeIcon({ active }: { active: boolean }) {
  return active ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function FeedIcon({ active }: { active: boolean }) {
  return active ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}

function ExploreIcon({ active }: { active: boolean }) {
  return active ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 16.93V17h2v1.93c-3.06-.45-5.48-2.87-5.93-5.93H9v-2H7.07C7.52 7.94 9.94 5.52 13 5.07V7h-2V5.07C7.39 5.56 5 8.47 5 12s2.39 6.44 6 6.93zM15 7v2h2v2h-2v2h2v2h-2v1.93C17.61 16.44 19 14.39 19 12s-1.39-4.44-4-4.93V7z" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return active ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

const NAV_TABS = [
  { href: "/",        label: "Home",    Icon: HomeIcon },
  { href: "/feed",    label: "Feed",    Icon: FeedIcon },
  { href: "/explore", label: "Explore", Icon: ExploreIcon },
  { href: "/profile", label: "Profile", Icon: ProfileIcon },
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
      {/* ─────────────────────────────────────────────────
          MOBILE: compact top bar (logo + bell + avatar)
      ───────────────────────────────────────────────── */}
      <header
        className="mobile-top-bar sm:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4"
        style={{
          background: "#111",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 active:opacity-70 transition-opacity">
          <div className="relative">
            <LogoMark size={30} />
            {isFree && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-[#111]" />
            )}
          </div>
          <span className="text-white font-bold text-base tracking-tight">hangr</span>
        </Link>

        {/* Right: bell + avatar */}
        <div className="flex items-center gap-2">
          {currentUser && <NotificationsPanel />}
          {currentUser ? (
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/20 active:opacity-70 transition-opacity"
              title="Sign out"
            >
              {currentUser.avatar?.startsWith("http") || currentUser.avatar?.startsWith("data:") ? (
                <img src={currentUser.avatar} alt={currentUser.name} referrerPolicy="no-referrer"
                  className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
                  {currentUser.avatar?.slice(0, 2)}
                </div>
              )}
            </button>
          ) : (
            <Link href="/auth"
              className="px-3 py-1.5 rounded-full text-xs font-bold text-gray-900 bg-white active:opacity-70 transition-opacity">
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* Mobile top spacer */}
      <div className="mobile-top-spacer sm:hidden" />

      {/* ─────────────────────────────────────────────────
          MOBILE: icon bottom tab bar
      ───────────────────────────────────────────────── */}
      <nav
        className="mobile-bottom-nav sm:hidden fixed bottom-0 left-0 right-0 z-50 flex"
        style={{
          background: "#111",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {NAV_TABS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors active:opacity-60"
              style={{ color: active ? "#fff" : "rgba(255,255,255,0.38)" }}
            >
              <div className="relative">
                <Icon active={active} />
                {active && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
                )}
              </div>
              <span className={`text-[10px] font-bold tracking-wide ${active ? "text-white" : "text-white/40"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile bottom spacer */}
      <div className="mobile-bottom-spacer sm:hidden" />

      {/* ─────────────────────────────────────────────────
          DESKTOP: floating pill navbar (unchanged)
      ───────────────────────────────────────────────── */}
      <div className="hidden sm:flex fixed top-4 left-0 right-0 z-50 justify-center px-4 pointer-events-none">
        <nav
          className="pointer-events-auto flex items-center gap-1 px-2 py-2 shadow-2xl"
          style={{
            background: "#111",
            borderRadius: 999,
            boxShadow: "0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          <Link href="/" className="relative flex-shrink-0 mr-1 transition-all hover:opacity-85 active:scale-95">
            <LogoMark size={34} />
            {isFree && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-[#111]" />
            )}
          </Link>

          {NAV_TABS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className="px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all"
                style={active ? { background: "rgba(255,255,255,0.15)", color: "#fff" } : { color: "rgba(255,255,255,0.55)" }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.9)"; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)"; }}
              >
                {label}
              </Link>
            );
          })}

          {currentUser && <NotificationsPanel />}

          {currentUser ? (
            <button onClick={handleLogout}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full ml-1 transition-all hover:opacity-90 active:scale-95"
              style={{ background: "#fff" }} title="Sign out">
              {currentUser.avatar?.startsWith("http") || currentUser.avatar?.startsWith("data:") ? (
                <img src={currentUser.avatar} alt={currentUser.name} referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
                  {currentUser.avatar}
                </div>
              )}
              <span className="text-[13px] font-bold text-gray-900 max-w-[80px] truncate">{currentUser.name.split(" ")[0]}</span>
            </button>
          ) : (
            <Link href="/auth"
              className="px-4 py-1.5 rounded-full text-[13px] font-bold ml-1 transition-all hover:opacity-90 active:scale-95"
              style={{ background: "#fff", color: "#111" }}>
              Sign in
            </Link>
          )}
        </nav>
      </div>

      {/* Desktop top spacer */}
      <div className="hidden sm:block h-20" />
    </>
  );
}
