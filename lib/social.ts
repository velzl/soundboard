import type { AppSession } from "@/lib/session";
import { createSupabaseAdminClient, supabaseServerConfigIsReady } from "@/lib/supabase/admin";

const FOLLOWS_TABLE = "follows";

type FollowEdge = {
  followerSpotifyUserId: string;
  followedSpotifyUserId: string;
};

type FollowStore = Set<string>;

declare global {
  var __soundboardFollowStore: FollowStore | undefined;
}

const followStore = globalThis.__soundboardFollowStore ?? new Set<string>();

if (!globalThis.__soundboardFollowStore) {
  globalThis.__soundboardFollowStore = followStore;
}

function followKey(followerSpotifyUserId: string, followedSpotifyUserId: string) {
  return `${followerSpotifyUserId}::${followedSpotifyUserId}`;
}

function normalizeEdges(rows: Array<{ follower_spotify_user_id: string; followed_spotify_user_id: string }>) {
  return rows.map((row) => ({
    followerSpotifyUserId: row.follower_spotify_user_id,
    followedSpotifyUserId: row.followed_spotify_user_id
  }));
}

export async function followUser(session: AppSession, followedSpotifyUserId: string) {
  if (session.spotifyUserId === followedSpotifyUserId) {
    throw new Error("You cannot follow yourself.");
  }

  if (!supabaseServerConfigIsReady()) {
    followStore.add(followKey(session.spotifyUserId, followedSpotifyUserId));
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from(FOLLOWS_TABLE).upsert(
    {
      follower_spotify_user_id: session.spotifyUserId,
      followed_spotify_user_id: followedSpotifyUserId
    },
    { onConflict: "follower_spotify_user_id,followed_spotify_user_id" }
  );

  if (error) {
    throw new Error(`Failed to follow user: ${error.message}`);
  }
}

export async function unfollowUser(session: AppSession, followedSpotifyUserId: string) {
  if (!supabaseServerConfigIsReady()) {
    followStore.delete(followKey(session.spotifyUserId, followedSpotifyUserId));
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from(FOLLOWS_TABLE)
    .delete()
    .eq("follower_spotify_user_id", session.spotifyUserId)
    .eq("followed_spotify_user_id", followedSpotifyUserId);

  if (error) {
    throw new Error(`Failed to unfollow user: ${error.message}`);
  }
}

export async function isFollowingUser(session: AppSession, followedSpotifyUserId: string) {
  if (session.spotifyUserId === followedSpotifyUserId) {
    return false;
  }

  if (!supabaseServerConfigIsReady()) {
    return followStore.has(followKey(session.spotifyUserId, followedSpotifyUserId));
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from(FOLLOWS_TABLE)
    .select("follower_spotify_user_id")
    .eq("follower_spotify_user_id", session.spotifyUserId)
    .eq("followed_spotify_user_id", followedSpotifyUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load follow status: ${error.message}`);
  }

  return Boolean(data);
}

export async function getFollowingSpotifyUserIdsForSession(session: AppSession) {
  if (!supabaseServerConfigIsReady()) {
    return [...followStore]
      .map((value) => value.split("::"))
      .filter(([followerSpotifyUserId]) => followerSpotifyUserId === session.spotifyUserId)
      .map(([, followedSpotifyUserId]) => followedSpotifyUserId);
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from(FOLLOWS_TABLE)
    .select("followed_spotify_user_id")
    .eq("follower_spotify_user_id", session.spotifyUserId);

  if (error) {
    throw new Error(`Failed to load following list: ${error.message}`);
  }

  return (data ?? []).map((row) => row.followed_spotify_user_id as string);
}

export async function getFollowCountsForUsers(spotifyUserIds: string[]) {
  const ids = [...new Set(spotifyUserIds.filter(Boolean))];
  const counts = new Map<string, { followers: number; following: number }>();

  ids.forEach((id) => {
    counts.set(id, { followers: 0, following: 0 });
  });

  if (!ids.length) {
    return counts;
  }

  if (!supabaseServerConfigIsReady()) {
    [...followStore]
      .map((value) => value.split("::"))
      .forEach(([followerSpotifyUserId, followedSpotifyUserId]) => {
        if (counts.has(followerSpotifyUserId)) {
          counts.get(followerSpotifyUserId)!.following += 1;
        }

        if (counts.has(followedSpotifyUserId)) {
          counts.get(followedSpotifyUserId)!.followers += 1;
        }
      });

    return counts;
  }

  const supabase = createSupabaseAdminClient();
  const [{ data: followerRows, error: followerError }, { data: followingRows, error: followingError }] =
    await Promise.all([
      supabase
        .from(FOLLOWS_TABLE)
        .select("followed_spotify_user_id")
        .in("followed_spotify_user_id", ids),
      supabase
        .from(FOLLOWS_TABLE)
        .select("follower_spotify_user_id")
        .in("follower_spotify_user_id", ids)
    ]);

  if (followerError) {
    throw new Error(`Failed to load follower counts: ${followerError.message}`);
  }

  if (followingError) {
    throw new Error(`Failed to load following counts: ${followingError.message}`);
  }

  (followerRows ?? []).forEach((row) => {
    const followedSpotifyUserId = row.followed_spotify_user_id as string;
    const existing = counts.get(followedSpotifyUserId);

    if (existing) {
      existing.followers += 1;
    }
  });

  (followingRows ?? []).forEach((row) => {
    const followerSpotifyUserId = row.follower_spotify_user_id as string;
    const existing = counts.get(followerSpotifyUserId);

    if (existing) {
      existing.following += 1;
    }
  });

  return counts;
}

export async function getFollowEdgesForUserIds(spotifyUserIds: string[]) {
  const ids = [...new Set(spotifyUserIds.filter(Boolean))];

  if (!ids.length) {
    return [] as FollowEdge[];
  }

  if (!supabaseServerConfigIsReady()) {
    return [...followStore]
      .map((value) => value.split("::"))
      .filter(
        ([followerSpotifyUserId, followedSpotifyUserId]) =>
          ids.includes(followerSpotifyUserId) || ids.includes(followedSpotifyUserId)
      )
      .map(([followerSpotifyUserId, followedSpotifyUserId]) => ({
        followerSpotifyUserId,
        followedSpotifyUserId
      }));
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from(FOLLOWS_TABLE)
    .select("follower_spotify_user_id, followed_spotify_user_id")
    .or(
      `follower_spotify_user_id.in.(${ids.join(",")}),followed_spotify_user_id.in.(${ids.join(",")})`
    );

  if (error) {
    throw new Error(`Failed to load follow edges: ${error.message}`);
  }

  return normalizeEdges(
    (data ?? []) as Array<{
      follower_spotify_user_id: string;
      followed_spotify_user_id: string;
    }>
  );
}

