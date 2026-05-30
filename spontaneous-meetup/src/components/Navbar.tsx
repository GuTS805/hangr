"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useStore } from "@/lib/store";
import { LogoMark } from "@/components/Logo";
import NotificationsPanel from "@/components/NotificationsPanel";

// ── SVG icons ────────────────────────────────────────────────────────────────

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
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
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

function ChatsIcon({ active }: { active: boolean }) {
  return active ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function FollowIcon({ active }: { active: boolean }) {
  return active ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function FavouritesIcon({ active }: { active: boolean }) {
  return active ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const NAV_TABS = [
  { href: "/",           label: "Home",       Icon: HomeIcon       },
  { href: "/explore",    label: "Explore",    Icon: ExploreIcon    },
  { href: "/chats",      label: "Chats",      Icon: ChatsIcon      },
  { href: "/follow",     label: "People",     Icon: FollowIcon     },
  { href: "/favourites", label: "Favourites", Icon: FavouritesIcon },
  { href: "/profile",    label: "Profile",    Icon: ProfileIcon    },
];

function UserAvatar({ user, size = 28 }: { user: { avatar: string; name: string }; size?: number }) {
  if (user.avatar?.startsWith("http") || user.avatar?.startsWith("data:")) {
    return (
      <img src={user.avatar} alt={user.name} referrerPolicy="no-referrer"
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }} />
    );
  }
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38), background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
      {user.avatar?.length <= 2 ? user.avatar : user.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isFree, logout, darkMode, toggleDarkMode } = useStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleLogout() {
    setShowDropdown(false);
    logout();
    router.push("/auth");
  }

  return (
    <>
      {/* ─────────────────────────────────────────────────
          MOBILE: compact top bar
      ───────────────────────────────────────────────── */}
      <header
        className="mobile-top-bar sm:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4"
        style={{ background: "#111", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <Link href="/" className="flex items-center gap-2 active:opacity-70 transition-opacity">
          <div className="relative">
            <LogoMark size={30} />
            {isFree && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-[#111]" />
            )}
          </div>
          <span className="text-white font-bold text-base tracking-tight">hangr</span>
        </Link>

        <div className="flex items-center gap-1.5">
          {currentUser && <NotificationsPanel />}
          <button
            onClick={toggleDarkMode}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors active:opacity-70"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>
          {currentUser ? (
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setShowDropdown((v) => !v)}
                className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/20 active:opacity-70 transition-opacity flex-shrink-0"
              >
                <UserAvatar user={currentUser} size={32} />
              </button>
              {showDropdown && (
                <div className="absolute right-0 top-10 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100] min-w-[160px]">
                  <Link href="/profile" onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                    <ProfileIcon active={false} />
                    Profile
                  </Link>
                  <button onClick={handleLogout}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 w-full text-left border-t border-gray-100 transition-colors">
                    <LogoutIcon />
                    Log out
                  </button>
                </div>
              )}
            </div>
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
        style={{ background: "#111", borderTop: "1px solid rgba(255,255,255,0.08)" }}
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
          DESKTOP: fixed left sidebar
      ───────────────────────────────────────────────── */}
      <aside
        className="hidden sm:flex fixed top-0 left-0 bottom-0 z-50 flex-col"
        style={{ width: 240, background: "#111", borderRight: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Logo */}
        <div className="px-5 py-5 flex-shrink-0">
          <Link href="/" className="flex items-center gap-3 hover:opacity-85 transition-opacity">
            <div className="relative flex-shrink-0">
              <LogoMark size={34} />
              {isFree && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-[#111]" />
              )}
            </div>
            <span className="text-white font-bold text-xl tracking-tight">hangr</span>
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {NAV_TABS.map(({ href, label, Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-4 px-4 py-3 text-[15px] font-bold transition-all uppercase tracking-wide"
                style={active
                  ? { background: "#FFE500", color: "#0A0A0A", border: "2px solid #FFE500" }
                  : { color: "rgba(255,255,255,0.55)", border: "2px solid transparent" }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = "#FFE500"; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)"; }}
              >
                <Icon active={active} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: notifications + dark mode toggle */}
        <div className="px-3 pb-5 space-y-1 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {currentUser && (
            <div className="pt-3 flex items-center gap-4 px-4 py-1">
              <NotificationsPanel sidebarMode />
              <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.55)" }}>Pings</span>
            </div>
          )}
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-4 px-4 py-3 rounded-2xl text-[15px] font-semibold w-full text-left transition-all"
            style={{ color: "rgba(255,255,255,0.55)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.90)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)"; }}
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
            {darkMode ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────
          DESKTOP: top-right profile pill (fixed)
      ───────────────────────────────────────────────── */}
      <div className="hidden sm:block fixed top-4 right-4 z-[60]" ref={dropdownRef}>
        {currentUser ? (
          <>
            <button
              onClick={() => setShowDropdown((v) => !v)}
              className="flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 transition-all hover:opacity-90 active:scale-95"
              style={{ background: "#FFE500", border: "2px solid #0A0A0A", boxShadow: "3px 3px 0 #0A0A0A", borderRadius: 0 }}
            >
              <UserAvatar user={currentUser} size={30} />
              <span className="text-[13px] font-bold max-w-[90px] truncate uppercase tracking-wide" style={{ color: "#0A0A0A" }}>
                {currentUser.name.split(" ")[0]}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 z-[100] min-w-[190px]" style={{ background: "#FAFAF5", border: "2px solid #0A0A0A", boxShadow: "4px 4px 0 #0A0A0A" }}>
                <div className="px-4 py-3" style={{ borderBottom: "2px solid #0A0A0A" }}>
                  <p className="text-sm font-bold uppercase tracking-wide truncate" style={{ color: "#0A0A0A" }}>{currentUser.name}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "#555" }}>{currentUser.neighborhood || currentUser.city}</p>
                </div>
                <Link href="/profile" onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wide transition-colors w-full"
                  style={{ color: "#0A0A0A" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#FFE500"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                  <ProfileIcon active={false} />Profile
                </Link>
                <button onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wide w-full text-left transition-colors"
                  style={{ color: "#FF2D2D", borderTop: "2px solid #0A0A0A" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#FF2D2D22"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                  <LogoutIcon />Log out
                </button>
              </div>
            )}
          </>
        ) : (
          <Link
            href="/auth"
            className="px-5 py-2 rounded-full text-[13px] font-bold shadow-xl transition-all hover:opacity-90 active:scale-95"
            style={{ background: "#fff", color: "#111" }}
          >
            Sign in
          </Link>
        )}
      </div>
    </>
  );
}
