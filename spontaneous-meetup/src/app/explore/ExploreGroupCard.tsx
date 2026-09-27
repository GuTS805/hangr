"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import type { Group } from "@/types";
import { INTEREST_EMOJI } from "@/lib/mock-data";

interface Props { group: Group; showRepost?: boolean; onRepost?: (group: Group) => void }

export default function ExploreGroupCard({ group, showRepost, onRepost }: Props) {
  const router = useRouter();
  const { currentUser, joinGroup } = useStore();
  const [now] = useState(() => Date.now());
  const joined = group.members.some(member => member.id === currentUser?.id);
  const full = group.members.length >= group.maxMembers;
  const expired = group.expiresAt <= now;

  return <article className="explore-group-card">
    <div className="explore-group-icon">{INTEREST_EMOJI[group.topic]}</div>
    <div className="explore-group-info">
      <div className="explore-group-title"><h2>{group.name}</h2><span>{group.topic}</span></div>
      <p className="explore-group-place">📍 {group.location} · {group.neighborhood}</p>
      <div className="explore-group-meta"><span>🕒 {group.plannedTime}</span><span>👥 {group.members.length}/{group.maxMembers} going</span><span className="explore-group-safe">✓ Public meetup</span></div>
    </div>
    <div className="explore-group-actions">
      <Link href={`/groups/${group.id}`}>View group →</Link>
      {expired && showRepost && onRepost ? <button onClick={() => onRepost(group)}>Repost</button> : joined ? <span>Joined ✓</span> : <button disabled={full} onClick={() => { if (!currentUser) router.push("/auth"); else joinGroup(group.id); }}>{full ? "Full" : "Join"}</button>}
    </div>
  </article>;
}
