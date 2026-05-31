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

  const scoreBg =
    score >= 4.5 ? "#00C44A" : score >= 3.5 ? "#FFE500" : "#F2F1EB";
  const scoreColor = "#0A0A0A";

  const px = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs";

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Score badge */}
      <span
        className={`inline-flex items-center gap-1 font-black uppercase ${px}`}
        style={{ border: "2px solid #0A0A0A", background: scoreBg, color: scoreColor }}
      >
        ⭐ {score > 0 ? score.toFixed(1) : "—"} {label}
        {reviewCount > 0 && (
          <span className="opacity-50 font-normal">· {reviewCount}</span>
        )}
      </span>

      {/* Verified badges */}
      {isVerified && (
        <span
          title="Google Verified"
          className={`inline-flex items-center gap-1 font-black uppercase ${px}`}
          style={{ border: "2px solid #0038FF", background: "#0038FF", color: "#fff" }}
        >
          ✓ Verified
        </span>
      )}
      {collegeVerified && (
        <span
          title="College Email Verified"
          className={`inline-flex items-center gap-1 font-black uppercase ${px}`}
          style={{ border: "2px solid #0A0A0A", background: "#0A0A0A", color: "#FFE500" }}
        >
          🎓 College
        </span>
      )}
    </div>
  );
}
