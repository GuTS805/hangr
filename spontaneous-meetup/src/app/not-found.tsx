import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F2F1EB] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-[120px] font-black uppercase leading-none text-black">404</p>
        <div
          className="mb-6 px-6 py-4"
          style={{ border: "2px solid #0A0A0A", background: "#FFE500", boxShadow: "4px 4px 0 #0A0A0A" }}
        >
          <p className="text-xl font-black uppercase tracking-tight text-black">Page Not Found</p>
          <p className="text-xs font-mono text-black/50 mt-1 uppercase tracking-wider">
            This page doesn&apos;t exist or was moved.
          </p>
        </div>
        <Link
          href="/"
          className="inline-block px-6 py-3 text-sm font-black uppercase tracking-wide text-black transition-all"
          style={{
            border: "2px solid #0A0A0A",
            background: "#0A0A0A",
            color: "#FFE500",
            boxShadow: "4px 4px 0 #FFE500",
          }}
        >
          ← Go home
        </Link>
      </div>
    </div>
  );
}
