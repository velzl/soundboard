import type { AppSession } from "@/lib/session";
import { createSupabaseAdminClient, supabaseServerConfigIsReady } from "@/lib/supabase/admin";
import type { SocialRelationship } from "@/types";

const FOLLOWS_TABLE = "follows";

type FollowEdge = {
  followerSpotifyUserId: string;
  followedSpotifyUserId: string;
};

export type FollowEvent = FollowEdge & {
  createdAt: string;
};

type FollowStore = Set<string>;
type FollowEventStore = FollowEvent[];

declare global {
  var __soundboardFollowStore: FollowStore | undefined;
  var __soundboardFollowEventStore: FollowEventStore | undefined;
}

const followStore = globalThis.__soundboardFollowStore ?? new Set<string>();
const followEventStore = globalThis.__soundboardFollowEventStore ?? [];

if (!globalThis.__soundboardFollowStore) {
  globalThis.__soundboardFollowStore = followStore;
}

if (!globalThis.__soundboardFollowEventStore) {
  globalThis.__soundboardFollowEventStore = followEventStore;
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

function normalizeEvents(
  rows: Array<{
    follower_spotify_user_id: string;
    followed_spotify_user_id: string;
    created_at: string;
  }>
) {
  return rows.map((row) => ({
    followerSpotifyUserId: row.follower_spotify_user_id,
    followedSpotifyUserId: row.followed_spotify_user_id,
    createdAt: row.created_at
  }));
}

export async function followUser(session: AppSession, followedSpotifyUserId: string) {
  if (session.spotifyUserId === followedSpotifyUserId) {
    throw new Error("You cannot follow yourself.");
  }

  if (!supabaseServerConfigIsReady()) {
    const alreadyFollowing = followStore.has(
      followKey(session.spotifyUserId, followedSpotifyUserId)
    );
    followStore.add(followKey(session.spotifyUserId, followedSpotifyUserId));

    if (!alreadyFollowing) {
      followEventStore.unshift({
        followerSpotifyUserId: session.spotifyUserId,
        followedSpotifyUserId,
        createdAt: new Date().toISOString()
      });
    }

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

export async function getFollowRelationshipMapForViewer(
  viewerSpotifyUserId: string,
  targetSpotifyUserIds: string[]
) {
  const targetIds = [...new Set(targetSpotifyUserIds.filter(Boolean))].filter(
    (targetSpotifyUserId) => targetSpotifyUserId !== viewerSpotifyUserId
  );
  const relationshipMap = new Map<string, SocialRelationship>();

  targetIds.forEach((targetSpotifyUserId) => {
    relationshipMap.set(targetSpotifyUserId, {
      isFollowing: false,
      followsViewer: false,
      isMutual: false
    });
  });

  if (!targetIds.length) {
    return relationshipMap;
  }

  if (!supabaseServerConfigIsReady()) {
    targetIds.forEach((targetSpotifyUserId) => {
      const isFollowing = followStore.has(
        followKey(viewerSpotifyUserId, targetSpotifyUserId)
      );
      const followsViewer = followStore.has(
        followKey(targetSpotifyUserId, viewerSpotifyUserId)
      );

      relationshipMap.set(targetSpotifyUserId, {
        isFollowing,
        followsViewer,
        isMutual: isFollowing && followsViewer
      });
    });

    return relationshipMap;
  }

  const supabase = createSupabaseAdminClient();
  const targetList = targetIds.join(",");
  const { data, error } = await supabase
    .from(FOLLOWS_TABLE)
    .select("follower_spotify_user_id, followed_spotify_user_id")
    .or(
      `and(follower_spotify_user_id.eq.${viewerSpotifyUserId},followed_spotify_user_id.in.(${targetList})),and(followed_spotify_user_id.eq.${viewerSpotifyUserId},follower_spotify_user_id.in.(${targetList}))`
    );

  if (error) {
    throw new Error(`Failed to load follow relationship state: ${error.message}`);
  }

  normalizeEdges(
    (data ?? []) as Array<{
      follower_spotify_user_id: string;
      followed_spotify_user_id: string;
    }>
  ).forEach((edge) => {
    if (edge.followerSpotifyUserId === viewerSpotifyUserId) {
      const current = relationshipMap.get(edge.followedSpotifyUserId);

      if (current) {
        relationshipMap.set(edge.followedSpotifyUserId, {
          ...current,
          isFollowing: true,
          isMutual: true && current.followsViewer
        });
      }
    }

    if (edge.followedSpotifyUserId === viewerSpotifyUserId) {
      const current = relationshipMap.get(edge.followerSpotifyUserId);

      if (current) {
        relationshipMap.set(edge.followerSpotifyUserId, {
          ...current,
          followsViewer: true,
          isMutual: true && current.isFollowing
        });
      }
    }
  });

  relationshipMap.forEach((relationship, spotifyUserId) => {
    relationshipMap.set(spotifyUserId, {
      ...relationship,
      isMutual: relationship.isFollowing && relationship.followsViewer
    });
  });

  return relationshipMap;
}

export async function getRecentFollowEvents(limit = 12, participantSpotifyUserIds?: string[]) {
  const participantIds = participantSpotifyUserIds
    ? [...new Set(participantSpotifyUserIds.filter(Boolean))]
    : [];

  if (!supabaseServerConfigIsReady()) {
    const relevantEvents = followEventStore.filter((event) => {
      if (!participantIds.length) {
        return true;
      }

      return (
        participantIds.includes(event.followerSpotifyUserId) ||
        participantIds.includes(event.followedSpotifyUserId)
      );
    });

    return relevantEvents
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit);
  }

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from(FOLLOWS_TABLE)
    .select("follower_spotify_user_id, followed_spotify_user_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (participantIds.length) {
    query = query.or(
      `follower_spotify_user_id.in.(${participantIds.join(",")}),followed_spotify_user_id.in.(${participantIds.join(",")})`
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load follow activity: ${error.message}`);
  }

  return normalizeEvents(
    (data ?? []) as Array<{
      follower_spotify_user_id: string;
      followed_spotify_user_id: string;
      created_at: string;
    }>
  );
}
