"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isFree, logout } = useStore();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/feed", label: "Feed" },
    { href: "/explore", label: "Explore" },
    { href: "/profile", label: "Profile" },
  ];

  function handleLogout() {
    logout();
    router.push("/auth");
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">hangr</span>
          {isFree && (
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          )}
        </Link>

        <div className="flex items-center gap-0.5 sm:gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {currentUser ? (
            <div className="flex items-center gap-2 ml-2">
              {currentUser.avatar?.startsWith("http") ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover border border-gray-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  {currentUser.avatar}
                </div>
              )}
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-900"
              >
                Out
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="ml-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
