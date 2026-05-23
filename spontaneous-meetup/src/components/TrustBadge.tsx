interface Props {
  score: number;
  reviewCount: number;
  isVerified: boolean;
  collegeVerified: boolean;
  size?: "sm" | "md";
}

export default function TrustBadge({
  score,
  reviewCount,
  isVerified,
  collegeVerified,
  size = "sm",
}: Props) {
  const label =
    score >= 4.5 ? "Trusted" : score >= 3.5 ? "Good" : score > 0 ? "New" : "Unrated";

  const color =
    score >= 4.5
      ? "text-emerald-600 bg-emerald-50 border-emerald-200"
      : score >= 3.5
      ? "text-blue-600 bg-blue-50 border-blue-200"
      : "text-gray-500 bg-gray-50 border-gray-200";

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Score pill */}
      <span
        className={`inline-flex items-center gap-1 border rounded-full font-semibold ${color} ${
          size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
        }`}
      >
        ⭐ {score > 0 ? score.toFixed(1) : "—"} {label}
        {reviewCount > 0 && (
          <span className="opacity-60 font-normal">· {reviewCount}</span>
        )}
      </span>

      {/* Verified badges */}
      {isVerified && (
        <span
          title="Google Verified"
          className={`inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full font-medium ${
            size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
          }`}
        >
          ✓ Verified
        </span>
      )}
      {collegeVerified && (
        <span
          title="College Email Verified"
          className={`inline-flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 rounded-full font-medium ${
            size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
          }`}
        >
          🎓 College
        </span>
      )}
    </div>
  );
}
