"use client";

import { create } from "zustand";
import { User, Group, Message, Interest, Review, Report, ReportReason, Gender, Post, PostComment, Ping } from "@/types";
import { supabase, ProfileRow, GroupRow, MessageRow, PostRow, CommentRow, PingRow } from "./supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ── Mappers ───────────────────────────────────────────────────────

function mapProfile(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.name,
    age: row.age ?? 18,
    avatar: row.avatar || row.name?.slice(0, 2).toUpperCase() || "U",
    city: row.city || "Ghaziabad",
    neighborhood: row.neighborhood || "",
    interests: (row.interests as Interest[]) ?? [],
    gender: row.gender as Gender | undefined,
    showGender: row.show_gender ?? true,
    isVerified: row.is_verified ?? false,
    collegeVerified: row.college_verified ?? false,
    trustScore: Number(row.trust_score ?? 0),
    reviewCount: row.review_count ?? 0,
    isFree: row.is_free ?? false,
    freeUntil: row.free_until ? new Date(row.free_until).getTime() : undefined,
    joinedAt: new Date(row.created_at).getTime(),
    statusText: row.status_text ?? undefined,
    streakDays: row.streak_days ?? 0,
    totalMeetups: row.total_meetups ?? 0,
    bio: row.bio ?? undefined,
  };
}

function mapGroup(row: GroupRow): Group {
  const members: User[] = (row.group_members ?? [])
    .map((gm) => (gm.profiles ? mapProfile(gm.profiles) : null))
    .filter(Boolean) as User[];

  const votes: Record<string, string> = {};
  (row.location_votes ?? []).forEach((v) => {
    votes[v.user_id] = v.location_id;
  });

  return {
    id: row.id,
    name: row.name,
    topic: row.topic as Interest,
    members,
    maxMembers: row.max_members ?? 10,
    location: row.location_name ?? "",
    neighborhood: row.neighborhood ?? "",
    expiresAt: new Date(row.expires_at).getTime(),
    createdAt: new Date(row.created_at).getTime(),
    plannedTime: row.planned_time ?? "",
    messages: [],
    safeLocationId: row.safe_location_id ?? "",
    femaleOnly: row.female_only ?? false,
    isPublic: row.is_public ?? true,
    createdBy: row.created_by ?? "",
    votes,
    finalLocationId: row.final_location_id ?? null,
    votingOpen: row.voting_open ?? true,
  };
}

function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userAvatar: row.user_avatar,
    text: row.text,
    timestamp: new Date(row.created_at).getTime(),
  };
}

function mapPost(row: PostRow): Post {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userAvatar: row.user_avatar,
    userNeighborhood: row.user_neighborhood,
    userIsVerified: row.user_is_verified,
    text: row.text,
    imageUrl: row.image_url ?? undefined,
    imageBase64: row.image_base64 ?? undefined,
    likes: row.likes ?? [],
    comments: (row.post_comments ?? []).map(mapComment),
    topic: row.topic as Interest | undefined,
    timestamp: new Date(row.created_at).getTime(),
  };
}

function mapComment(row: CommentRow): PostComment {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    userName: row.user_name,
    userAvatar: row.user_avatar,
    text: row.text,
    timestamp: new Date(row.created_at).getTime(),
  };
}

// ── API helper ───────────────────────────────────────────────────

async function apiCall(path: string, method: string, body?: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

// ── Profile loader with fallback creation ─────────────────────────

async function loadAndSetProfile(
  authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> },
  set: (partial: Partial<AppState>) => void,
  get: () => AppState,
) {
  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .single();

  // If trigger didn't fire yet, create the profile ourselves
  if (!profile) {
    const name =
      (authUser.user_metadata?.full_name as string) ||
      authUser.email?.split("@")[0] ||
      "User";
    const avatarUrl = (authUser.user_metadata?.avatar_url as string) || name.slice(0, 2).toUpperCase();
    const { data: created } = await supabase
      .from("profiles")
      .insert({
        id: authUser.id,
        name,
        avatar: avatarUrl,
        city: "Ghaziabad",
        neighborhood: "",
        interests: [],
        onboarded: false,
      })
      .select()
      .single();
    profile = created;
  } else {
    // Keep Google avatar in sync (fire-and-forget, don't block profile load)
    const freshAvatar = authUser.user_metadata?.avatar_url as string | undefined;
    if (freshAvatar && (profile as ProfileRow).avatar !== freshAvatar) {
      supabase.from("profiles").update({ avatar: freshAvatar }).eq("id", authUser.id);
      (profile as ProfileRow).avatar = freshAvatar;
    }
  }

  if (profile) {
    const p = profile as ProfileRow;

    // "Free" is session-only — always reset to offline on every fresh page load.
    // If they were left free in the DB (e.g. closed tab while free), clear it now.
    if (p.is_free) {
      supabase.from("profiles")
        .update({ is_free: false, free_until: null })
        .eq("id", authUser.id)
        .then(() => {});
    }

    set({
      currentUser: mapProfile({ ...p, is_free: false, free_until: null }),
      needsOnboarding: !p.onboarded,
      isFree: false,
      freeUntil: null,
      isAuthLoading: false,
    });
    get().loadGroups();
  } else {
    set({ isAuthLoading: false });
  }
}

// ── Store interface ───────────────────────────────────────────────

interface AppState {
  darkMode: boolean;
  toggleDarkMode: () => void;

  // Background-prefetched position (available before user explicitly opens map)
  cachedUserPos: { lat: number; lng: number } | null;
  setCachedUserPos: (pos: { lat: number; lng: number } | null) => void;

  currentUser: User | null;
  isFree: boolean;
  freeUntil: number | null;
  groups: Group[];
  nearbyUsers: User[];
  posts: Post[];
  blockedUserIds: string[];
  reports: Report[];
  reviews: Review[];
  receivedPings: Ping[];
  isAuthLoading: boolean;
  needsOnboarding: boolean;

  // Auth
  initAuth: () => Promise<void>;
  completeOnboarding: (details: { name: string; age: number; interests: Interest[]; gender?: Gender; neighborhood?: string; city?: string }) => Promise<void>;
  logout: () => Promise<void>;

  // Free status
  toggleFree: (lat?: number, lng?: number) => Promise<void>;

  // Groups
  loadGroups: () => Promise<void>;
  joinGroup: (groupId: string) => void;
  leaveGroup: (groupId: string) => void;
  createGroup: (name: string, topic: Interest, safeLocationId: string, location: string, plannedTime: string, femaleOnly: boolean, expiresInHours?: number) => void;
  sendMessage: (groupId: string, text: string) => void;

  // Voting
  voteForLocation: (groupId: string, safeLocationId: string) => void;
  finalizeLocation: (groupId: string) => void;
  reopenVoting: (groupId: string) => void;

  // Safety
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  reportUser: (userId: string, reason: ReportReason) => void;
  reportGroup: (groupId: string, reason: ReportReason) => void;
  submitReview: (toUserId: string, groupId: string, rating: number, comment: string) => void;
  pingUser: (toUserId: string) => Promise<void>;
  loadPings: () => Promise<void>;
  respondToPing: (pingId: string, status: "accepted" | "declined") => Promise<void>;

  // Presence — nearby free users
  subscribePresence: (lat: number, lng: number) => void;

  // Posts
  loadPosts: () => Promise<void>;
  createPost: (text: string, imageBase64?: string, topic?: Interest) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;

  // Profile
  updateGenderSettings: (gender: Gender | undefined, showGender: boolean) => void;
  updateProfile: (updates: { name?: string; age?: number; interests?: Interest[]; neighborhood?: string; bio?: string; avatar?: string }) => Promise<void>;
  verifyCollege: () => void;
  verifyPhoto: (selfieDataUrl: string) => Promise<void>;
  updateStatus: (text: string) => void;
  updateStreak: () => void;

  // Internal
  _presenceChannel: RealtimeChannel | null;
  _groupsChannel: RealtimeChannel | null;
}

// ── Store ─────────────────────────────────────────────────────────

export const useStore = create<AppState>()((set, get) => ({
  darkMode: false,
  toggleDarkMode: () => {
    const next = !get().darkMode;
    set({ darkMode: next });
    if (typeof window !== "undefined") localStorage.setItem("hangr_dark", String(next));
  },

  cachedUserPos: null,
  setCachedUserPos: (pos) => set({ cachedUserPos: pos }),

  currentUser: null,
  isFree: false,
  freeUntil: null,
  groups: [],
  nearbyUsers: [],
  posts: [],
  blockedUserIds: [],
  reports: [],
  reviews: [],
  receivedPings: [],
  isAuthLoading: true,
  needsOnboarding: false,
  _presenceChannel: null,
  _groupsChannel: null,

  // ── Auth ──────────────────────────────────────────────────────

  initAuth: async () => {
    set({ isAuthLoading: true });

    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      await loadAndSetProfile(session.user, set, get);
      get().loadPings();
    } else {
      set({ isAuthLoading: false });
    }

    // Subscribe to auth changes for the rest of the session
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await loadAndSetProfile(session.user, set, get);
      } else if (event === "SIGNED_OUT") {
        const { _presenceChannel, _groupsChannel } = get();
        _presenceChannel?.unsubscribe();
        _groupsChannel?.unsubscribe();
        set({
          currentUser: null,
          isFree: false,
          freeUntil: null,
          nearbyUsers: [],
          _presenceChannel: null,
          _groupsChannel: null,
        });
      }
    });

    // Load groups + posts in parallel regardless of auth state
    Promise.all([get().loadGroups(), get().loadPosts()]);

    // Subscribe to group table changes (unique name per mount to avoid already-subscribed error)
    const groupsChannel = supabase
      .channel(`groups_realtime_${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "groups" }, () => {
        get().loadGroups();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members" }, () => {
        get().loadGroups();
      })
      .subscribe();

    // Clean up old channel if reinitializing
    const existing = get()._groupsChannel;
    if (existing) supabase.removeChannel(existing);

    set({ _groupsChannel: groupsChannel });
  },

  completeOnboarding: async ({ name, age, interests, gender, neighborhood, city }) => {
    const { currentUser } = get();
    if (!currentUser) return;

    await supabase
      .from("profiles")
      .update({
        name,
        age,
        interests,
        gender: gender ?? null,
        neighborhood: neighborhood ?? "",
        city: city ?? currentUser.city,
        onboarded: true,
      })
      .eq("id", currentUser.id);

    set({
      currentUser: {
        ...currentUser,
        name,
        age,
        interests,
        gender,
        neighborhood: neighborhood ?? "",
        city: city ?? currentUser.city,
      },
      needsOnboarding: false,
    });
  },

  logout: async () => {
    const { _presenceChannel, _groupsChannel } = get();
    _presenceChannel?.unsubscribe();
    _groupsChannel?.unsubscribe();
    await supabase.auth.signOut();
    set({
      currentUser: null,
      isFree: false,
      freeUntil: null,
      nearbyUsers: [],
      _presenceChannel: null,
      _groupsChannel: null,
    });
  },

  // ── Free status ───────────────────────────────────────────────

  toggleFree: async (lat, lng) => {
    const { isFree, currentUser, _presenceChannel } = get();
    if (!currentUser) return;

    const newFree = !isFree;
    const freeUntil = newFree ? Date.now() + 2 * 60 * 60 * 1000 : null;

    set({
      isFree: newFree,
      freeUntil,
      currentUser: { ...currentUser, isFree: newFree, freeUntil: freeUntil ?? undefined },
    });

    await supabase.from("profiles").update({
      is_free: newFree,
      free_until: freeUntil ? new Date(freeUntil).toISOString() : null,
      last_lat: lat ?? null,
      last_lng: lng ?? null,
    }).eq("id", currentUser.id);

    if (newFree && lat && lng) {
      get().subscribePresence(lat, lng);
    } else if (!newFree && _presenceChannel) {
      _presenceChannel.untrack();
    }
  },

  // ── Presence (nearby free users) ─────────────────────────────

  subscribePresence: (lat, lng) => {
    const { currentUser, _presenceChannel: existing } = get();
    if (!currentUser) return;

    existing?.unsubscribe();

    const channel = supabase.channel("free_users_presence", {
      config: { presence: { key: currentUser.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<Record<string, unknown>>();
        const nearby: User[] = [];

        for (const [userId, presences] of Object.entries(state)) {
          if (userId === currentUser.id) continue;
          const p = (presences as unknown[])[0] as Record<string, unknown>;
          if (!p) continue;

          const uLat = p.lat as number;
          const uLng = p.lng as number;
          if (!uLat || !uLng) continue;

          const { haversine } = require("./geo");
          const dist = haversine({ lat, lng }, { lat: uLat, lng: uLng });

          nearby.push({
            id: userId,
            name: p.name as string,
            age: (p.age as number) ?? 18,
            avatar: (p.avatar as string) || (p.name as string)?.slice(0, 2).toUpperCase() || "U",
            city: "Ghaziabad",
            neighborhood: (p.neighborhood as string) || "",
            interests: (p.interests as Interest[]) ?? [],
            gender: p.gender as Gender | undefined,
            showGender: (p.show_gender as boolean) ?? true,
            isVerified: (p.is_verified as boolean) ?? false,
            collegeVerified: (p.college_verified as boolean) ?? false,
            trustScore: (p.trust_score as number) ?? 0,
            reviewCount: (p.review_count as number) ?? 0,
            isFree: true,
            freeUntil: (p.free_until as number) ?? undefined,
            distanceKm: Math.round(dist * 100) / 100,
            joinedAt: (p.joined_at as number) ?? Date.now(),
          });
        }

        nearby.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
        set({ nearbyUsers: nearby });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            id: currentUser.id,
            name: currentUser.name,
            age: currentUser.age,
            avatar: currentUser.avatar,
            neighborhood: currentUser.neighborhood,
            interests: currentUser.interests,
            gender: currentUser.gender,
            show_gender: currentUser.showGender,
            is_verified: currentUser.isVerified,
            college_verified: currentUser.collegeVerified,
            trust_score: currentUser.trustScore,
            review_count: currentUser.reviewCount,
            free_until: currentUser.freeUntil,
            joined_at: currentUser.joinedAt,
            lat,
            lng,
          });
        }
      });

    set({ _presenceChannel: channel });
  },

  // ── Groups ────────────────────────────────────────────────────

  loadGroups: async () => {
    const { data, error } = await supabase
      .from("groups")
      .select(`
        *,
        group_members ( profiles(*) ),
        location_votes ( user_id, location_id )
      `)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (!error && data) {
      set({ groups: (data as GroupRow[]).map(mapGroup) });
    }
  },

  joinGroup: (groupId) => {
    const { currentUser, groups } = get();
    if (!currentUser) return;

    set({
      groups: groups.map((g) =>
        g.id === groupId && !g.members.find((m) => m.id === currentUser.id)
          ? { ...g, members: [...g.members, currentUser] }
          : g
      ),
    });

    apiCall(`/api/groups/${groupId}/join`, "POST")
      .then((res) => { if (!res.ok) get().loadGroups(); })
      .catch(() => get().loadGroups());
  },

  leaveGroup: (groupId) => {
    const { currentUser, groups } = get();
    if (!currentUser) return;

    set({
      groups: groups.map((g) =>
        g.id === groupId
          ? { ...g, members: g.members.filter((m) => m.id !== currentUser.id) }
          : g
      ),
    });

    apiCall(`/api/groups/${groupId}/leave`, "POST")
      .then((res) => { if (!res.ok) get().loadGroups(); })
      .catch(() => get().loadGroups());
  },

  createGroup: (name, topic, safeLocationId, location, plannedTime, femaleOnly, expiresInHours = 4) => {
    const { currentUser, groups } = get();
    if (!currentUser) return;

    const tempId = `temp_${Date.now()}`;
    const newGroup: Group = {
      id: tempId, name, topic,
      members: [currentUser], maxMembers: 8,
      location, neighborhood: currentUser.neighborhood,
      expiresAt: Date.now() + expiresInHours * 60 * 60 * 1000,
      createdAt: Date.now(), plannedTime, messages: [],
      safeLocationId, femaleOnly, isPublic: true,
      createdBy: currentUser.id,
      votes: { [currentUser.id]: safeLocationId },
      finalLocationId: null, votingOpen: true,
    };

    set({ groups: [newGroup, ...groups] });

    apiCall("/api/groups", "POST", { name, topic, safeLocationId, location, plannedTime, femaleOnly, expiresInHours })
      .then((res) => {
        if (!res.ok) { get().loadGroups(); return; }
        get().loadGroups();
      })
      .catch(() => get().loadGroups());
  },

  sendMessage: (groupId, text) => {
    const { currentUser, groups } = get();
    if (!currentUser) return;

    const message: Message = {
      id: `msg_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      text,
      timestamp: Date.now(),
    };

    set({
      groups: groups.map((g) =>
        g.id === groupId ? { ...g, messages: [...g.messages, message] } : g
      ),
    });

    supabase.from("messages").insert({
      group_id: groupId,
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_avatar: currentUser.avatar,
      text,
    });
  },

  // ── Voting ────────────────────────────────────────────────────

  voteForLocation: (groupId, safeLocationId) => {
    const { currentUser, groups } = get();
    if (!currentUser) return;

    set({
      groups: groups.map((g) =>
        g.id === groupId && g.votingOpen
          ? { ...g, votes: { ...g.votes, [currentUser.id]: safeLocationId } }
          : g
      ),
    });

    supabase.from("location_votes")
      .upsert({ group_id: groupId, user_id: currentUser.id, location_id: safeLocationId })
      .then(({ error }) => { if (error) get().loadGroups(); });
  },

  finalizeLocation: (groupId) => {
    const { groups } = get();
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const tally: Record<string, number> = {};
    Object.values(group.votes).forEach((locId) => {
      tally[locId] = (tally[locId] ?? 0) + 1;
    });
    const winner = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? group.safeLocationId;

    set({
      groups: groups.map((g) =>
        g.id === groupId
          ? { ...g, finalLocationId: winner, votingOpen: false, safeLocationId: winner }
          : g
      ),
    });

    supabase.from("groups")
      .update({ final_location_id: winner, voting_open: false })
      .eq("id", groupId);
  },

  reopenVoting: (groupId) => {
    set({
      groups: get().groups.map((g) =>
        g.id === groupId ? { ...g, votingOpen: true, finalLocationId: null } : g
      ),
    });
    supabase.from("groups")
      .update({ voting_open: true, final_location_id: null })
      .eq("id", groupId);
  },

  // ── Safety ────────────────────────────────────────────────────

  blockUser: (userId) => {
    const { currentUser } = get();
    if (!currentUser) return;
    set((s) => ({ blockedUserIds: [...s.blockedUserIds, userId] }));
    supabase.from("blocked_users")
      .insert({ blocker_id: currentUser.id, blocked_id: userId });
  },

  unblockUser: (userId) => {
    const { currentUser } = get();
    if (!currentUser) return;
    set((s) => ({ blockedUserIds: s.blockedUserIds.filter((id) => id !== userId) }));
    supabase.from("blocked_users")
      .delete()
      .eq("blocker_id", currentUser.id)
      .eq("blocked_id", userId);
  },

  reportUser: (userId, reason) => {
    const { currentUser, reports } = get();
    if (!currentUser) return;
    const report: Report = {
      id: `rpt_${Date.now()}`, reporterId: currentUser.id,
      targetId: userId, targetType: "user", reason, timestamp: Date.now(),
    };
    set({ reports: [...reports, report] });
    apiCall("/api/reports", "POST", { targetId: userId, targetType: "user", reason });
  },

  reportGroup: (groupId, reason) => {
    const { currentUser, reports } = get();
    if (!currentUser) return;
    const report: Report = {
      id: `rpt_${Date.now()}`, reporterId: currentUser.id,
      targetId: groupId, targetType: "group", reason, timestamp: Date.now(),
    };
    set({ reports: [...reports, report] });
    apiCall("/api/reports", "POST", { targetId: groupId, targetType: "group", reason });
  },

  submitReview: (toUserId, groupId, rating, comment) => {
    const { currentUser, reviews, nearbyUsers } = get();
    if (!currentUser) return;

    const review: Review = {
      id: `rev_${Date.now()}`, fromUserId: currentUser.id,
      fromUserName: currentUser.name, toUserId, rating, comment, groupId, timestamp: Date.now(),
    };
    const allToUser = [...reviews.filter((r) => r.toUserId === toUserId), review];
    const avg = allToUser.reduce((s, r) => s + r.rating, 0) / allToUser.length;

    set({
      reviews: [...reviews, review],
      nearbyUsers: nearbyUsers.map((u) =>
        u.id === toUserId
          ? { ...u, trustScore: Math.round(avg * 10) / 10, reviewCount: allToUser.length }
          : u
      ),
    });

    supabase.from("reviews")
      .insert({ from_user_id: currentUser.id, to_user_id: toUserId, group_id: groupId, rating, comment })
      .then(async () => {
        // Recalculate trust score from all DB reviews
        const { data } = await supabase
          .from("reviews")
          .select("rating")
          .eq("to_user_id", toUserId);
        if (data && data.length > 0) {
          const dbAvg = data.reduce((s, r) => s + r.rating, 0) / data.length;
          await supabase.from("profiles").update({
            trust_score: Math.round(dbAvg * 10) / 10,
            review_count: data.length,
          }).eq("id", toUserId);
        }
      });
  },

  pingUser: async (toUserId) => {
    const { currentUser } = get();
    if (!currentUser) return;
    await supabase.from("pings").insert({
      from_user_id: currentUser.id,
      to_user_id: toUserId,
    });
  },

  loadPings: async () => {
    const { currentUser } = get();
    if (!currentUser) return;
    const { data } = await supabase
      .from("pings")
      .select("*, profiles:from_user_id(name, avatar, is_verified)")
      .eq("to_user_id", currentUser.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) {
      const pings: Ping[] = (data as PingRow[]).map((r) => ({
        id: r.id,
        fromUserId: r.from_user_id,
        fromUserName: (r.profiles as { name: string; avatar: string; is_verified: boolean } | null)?.name ?? "Someone",
        fromUserAvatar: (r.profiles as { name: string; avatar: string; is_verified: boolean } | null)?.avatar ?? "??",
        fromUserIsVerified: (r.profiles as { name: string; avatar: string; is_verified: boolean } | null)?.is_verified ?? false,
        toUserId: r.to_user_id,
        status: r.status,
        timestamp: new Date(r.created_at).getTime(),
      }));
      set({ receivedPings: pings });
    }
  },

  respondToPing: async (pingId, status) => {
    set((s) => ({
      receivedPings: s.receivedPings.filter((p) => p.id !== pingId),
    }));
    await supabase.from("pings").update({ status }).eq("id", pingId);
  },

  // ── Posts ─────────────────────────────────────────────────────

  loadPosts: async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("*, post_comments(*)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data) {
      set({ posts: (data as PostRow[]).map(mapPost) });
    }
  },

  createPost: async (text, imageBase64, topic) => {
    const { currentUser, posts } = get();
    if (!currentUser) return;

    // Upload image to Supabase Storage before saving to DB
    let imageUrl: string | undefined;
    if (imageBase64) {
      try {
        const blob = await fetch(imageBase64).then((r) => r.blob());
        const ext = blob.type === "image/png" ? "png" : "jpg";
        const path = `${currentUser.id}/${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("post-images")
          .upload(path, blob, { contentType: blob.type, upsert: false });
        if (!uploadErr && uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from("post-images")
            .getPublicUrl(uploadData.path);
          imageUrl = publicUrl;
        }
      } catch {
        // upload failed — post without image rather than blocking
      }
    }

    const tempId = `temp_${Date.now()}`;
    const tempPost: Post = {
      id: tempId,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      userNeighborhood: currentUser.neighborhood,
      userIsVerified: currentUser.isVerified,
      text,
      imageUrl,
      likes: [],
      comments: [],
      topic,
      timestamp: Date.now(),
    };
    set({ posts: [tempPost, ...posts] });

    try {
      const res = await apiCall("/api/posts", "POST", { text, imageUrl, topic });
      if (res.ok) {
        const json = await res.json() as { post: PostRow };
        set({ posts: [mapPost(json.post), ...get().posts.filter((p) => p.id !== tempId)] });
      }
    } catch {
      // keep temp post visible
    }
  },

  likePost: async (postId) => {
    const { currentUser, posts } = get();
    if (!currentUser) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const alreadyLiked = post.likes.includes(currentUser.id);
    const newLikes = alreadyLiked
      ? post.likes.filter((id) => id !== currentUser.id)
      : [...post.likes, currentUser.id];

    set({ posts: posts.map((p) => p.id === postId ? { ...p, likes: newLikes } : p) });

    supabase.rpc("toggle_post_like", { p_post_id: postId }).then(() => {});
  },

  addComment: async (postId, text) => {
    const { currentUser, posts } = get();
    if (!currentUser) return;

    const tempComment: PostComment = {
      id: `tc_${Date.now()}`,
      postId,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      text,
      timestamp: Date.now(),
    };

    set({
      posts: posts.map((p) =>
        p.id === postId ? { ...p, comments: [...p.comments, tempComment] } : p
      ),
    });

    try {
      const { data, error } = await supabase.from("post_comments").insert({
        post_id: postId,
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_avatar: currentUser.avatar,
        text,
      }).select().single();

      if (!error && data) {
        const realComment = mapComment(data as CommentRow);
        set({
          posts: get().posts.map((p) =>
            p.id === postId
              ? { ...p, comments: p.comments.map((c) => c.id === tempComment.id ? realComment : c) }
              : p
          ),
        });
      }
    } catch {
      // keep temp comment visible
    }
  },

  deletePost: async (postId) => {
    const { currentUser } = get();
    if (!currentUser) return;
    set({ posts: get().posts.filter((p) => p.id !== postId) });
    await apiCall(`/api/posts/${postId}`, "DELETE");
  },

  // ── Profile ───────────────────────────────────────────────────

  updateGenderSettings: (gender, showGender) => {
    const { currentUser } = get();
    if (!currentUser) return;
    set((s) => ({
      currentUser: s.currentUser ? { ...s.currentUser, gender, showGender } : null,
    }));
    supabase.from("profiles")
      .update({ gender: gender ?? null, show_gender: showGender })
      .eq("id", currentUser.id);
  },

  updateProfile: async (updates) => {
    const { currentUser } = get();
    if (!currentUser) return;

    set({ currentUser: { ...currentUser, ...updates } });

    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.age !== undefined) dbUpdates.age = updates.age;
    if (updates.interests !== undefined) dbUpdates.interests = updates.interests;
    if (updates.neighborhood !== undefined) dbUpdates.neighborhood = updates.neighborhood;
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
    if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;

    await supabase.from("profiles").update(dbUpdates).eq("id", currentUser.id);
  },

  verifyCollege: () => {
    const { currentUser } = get();
    if (!currentUser) return;
    set((s) => ({
      currentUser: s.currentUser ? { ...s.currentUser, collegeVerified: true } : null,
    }));
    supabase.from("profiles")
      .update({ college_verified: true })
      .eq("id", currentUser.id);
  },

  // Called only after the caller has already run a live face-match against
  // the profile photo (see faceVerify.ts) — this just persists the result.
  verifyPhoto: async (selfieDataUrl) => {
    const { currentUser } = get();
    if (!currentUser) return;

    const path = `${currentUser.id}/${Date.now()}.jpg`;
    let selfiePath: string | null = null;
    try {
      const blob = await fetch(selfieDataUrl).then((r) => r.blob());
      const { error } = await supabase.storage
        .from("verification-selfies")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (!error) selfiePath = path;
    } catch {
      // selfie upload is best-effort audit trail — don't block verification on it
    }

    set((s) => ({
      currentUser: s.currentUser ? { ...s.currentUser, isVerified: true } : null,
    }));

    await supabase.from("profiles").update({
      is_verified: true,
      photo_verified_at: new Date().toISOString(),
      verification_selfie_url: selfiePath,
    }).eq("id", currentUser.id);
  },

  updateStatus: (text) => {
    const { currentUser } = get();
    if (!currentUser) return;
    set((s) => ({ currentUser: s.currentUser ? { ...s.currentUser, statusText: text || undefined } : null }));
    supabase.from("profiles").update({ status_text: text || null }).eq("id", currentUser.id);
  },

  updateStreak: () => {
    const { currentUser } = get();
    if (!currentUser) return;
    const today = new Date().toISOString().slice(0, 10);
    const lastActive = currentUser.joinedAt
      ? new Date(currentUser.joinedAt).toISOString().slice(0, 10)
      : null;
    const isConsecutive = lastActive === new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const newStreak = isConsecutive ? (currentUser.streakDays ?? 0) + 1 : 1;
    set((s) => ({ currentUser: s.currentUser ? { ...s.currentUser, streakDays: newStreak } : null }));
    supabase.from("profiles").update({ streak_days: newStreak, last_active_date: today }).eq("id", currentUser.id);
  },

  // Legacy no-op kept so old callers don't crash if any exist
  login: () => {},
} as AppState));
