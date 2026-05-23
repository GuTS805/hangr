import { INTEREST_COLORS, INTEREST_EMOJI } from "@/lib/mock-data";

interface Props {
  interest: string;
  size?: "sm" | "md";
}

export default function InterestBadge({ interest, size = "sm" }: Props) {
  const color = INTEREST_COLORS[interest] ?? "bg-gray-100 text-gray-600";
  const emoji = INTEREST_EMOJI[interest] ?? "✨";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${color} ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      }`}
    >
      {emoji} {interest}
    </span>
  );
}
