import { cache } from "react";
import { buildComparisonBreakdown } from "@/lib/compatibility";
import {
  getLeaderboard as getMockLeaderboard,
  getProfileById,
  getProfileByUsername,
  getStatsByUserId,
  getSuggestedProfiles as getMockSuggestedProfiles
} from "@/lib/mock-data";
import { buildProfileBadges } from "@/lib/profile-badges";
import { getLeadGenre, getStoredMusicStatsBySpotifyUserId, getStoredMusicStatsMapBySpotifyUserIds } from "@/lib/music-stats";
import { buildAvatarSeed, getPublicProfileBySpotifyUserId, getPublicProfileByUsername } from "@/lib/profiles";
import {
  getFollowCountsForUsers,
  getFollowEdgesForUserIds,
  getFollowingSpotifyUserIdsForSession
} from "@/lib/social";
import { createSupabaseAdminClient, supabaseServerConfigIsReady } from "@/lib/supabase/admin";
import { calculateMusicActivityScore } from "@/lib/scoring";
import type { LeaderboardEntry, MusicStats, PersistedProfile, Profile } from "@/types";
import type { AppSession } from "@/lib/session";

type ProfileRow = {
  spotify_user_id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
};

type PublicSnapshot = {
  profile: Profile;
  stats: MusicStats | null;
  score: number | null;
  source: "supabase" | "mock";
};

type SuggestedProfileMatch = {
  profile: Profile;
  comparison: ReturnType<typeof buildComparisonBreakdown>;
  socialLabel?: string;
  badges: string[];
  source: "supabase" | "mock";
};

type PublicProfileSearchResult = {
  profile: Profile;
  stats: MusicStats | null;
  score: number | null;
  source: "supabase" | "mock";
};

function toProfileShape(
  profile: PersistedProfile,
  counts?: { followers: number; following: number }
): Profile {
  return {
    id: profile.spotifyUserId,
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarSeed: buildAvatarSeed(profile.username || profile.displayName),
    followers: counts?.followers ?? 0,
    following: counts?.following ?? 0
  };
}

function rowToPersistedProfile(row: ProfileRow): PersistedProfile {
  return {
    spotifyUserId: row.spotify_user_id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    onboardingComplete: row.onboarding_complete,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function countSetOverlap(left: Set<string>, right: Set<string>) {
  let count = 0;

  left.forEach((value) => {
    if (right.has(value)) {
      count += 1;
    }
  });

  return count;
}

function buildSuggestionReason(input: {
  followsViewer: boolean;
  sharedFollowingCount: number;
  followedByCircleCount: number;
}) {
  if (input.followsViewer && input.sharedFollowingCount > 0) {
    return `Follows you + shares ${input.sharedFollowingCount} of your follows`;
  }

  if (input.followsViewer) {
    return "Already follows you";
  }

  if (input.sharedFollowingCount > 0) {
    return `Shares ${input.sharedFollowingCount} of your follows`;
  }

  if (input.followedByCircleCount > 0) {
    return `Followed by ${input.followedByCircleCount} people in your circle`;
  }

  return "Taste-first suggestion";
}

const getPersistedProfiles = cache(async () => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "spotify_user_id, username, display_name, bio, avatar_url, onboarding_complete, created_at, updated_at"
    )
    .eq("onboarding_complete", true);

  if (error) {
    throw new Error(`Failed to load public profiles: ${error.message}`);
  }

  return (data ?? []).map((row) => rowToPersistedProfile(row as ProfileRow));
});

export async function getPublicProfileSnapshotByUsername(username: string): Promise<PublicSnapshot | null> {
  const persistedProfile = await getPublicProfileByUsername(username);

  if (persistedProfile) {
    const [persistedStats, counts] = await Promise.all([
      getStoredMusicStatsBySpotifyUserId(persistedProfile.spotifyUserId),
      getFollowCountsForUsers([persistedProfile.spotifyUserId])
    ]);

    return {
      profile: toProfileShape(
        persistedProfile,
        counts.get(persistedProfile.spotifyUserId)
      ),
      stats: persistedStats?.stats ?? null,
      score: persistedStats?.score ?? null,
      source: "supabase"
    };
  }

  const mockProfile = getProfileByUsername(username);

  if (!mockProfile) {
    return null;
  }

  const mockStats = getStatsByUserId(mockProfile.id);

  return {
    profile: mockProfile,
    stats: mockStats,
    score: calculateMusicActivityScore(mockStats),
    source: "mock"
  };
}

export async function getPublicProfileSnapshotBySpotifyUserId(
  spotifyUserId: string
): Promise<PublicSnapshot | null> {
  const persistedProfile = await getPublicProfileBySpotifyUserId(spotifyUserId);

  if (persistedProfile) {
    const [persistedStats, counts] = await Promise.all([
      getStoredMusicStatsBySpotifyUserId(persistedProfile.spotifyUserId),
      getFollowCountsForUsers([persistedProfile.spotifyUserId])
    ]);

    return {
      profile: toProfileShape(
        persistedProfile,
        counts.get(persistedProfile.spotifyUserId)
      ),
      stats: persistedStats?.stats ?? null,
      score: persistedStats?.score ?? null,
      source: "supabase"
    };
  }

  const mockProfile = getProfileById(spotifyUserId);

  if (!mockProfile) {
    return null;
  }

  const mockStats = getStatsByUserId(mockProfile.id);

  return {
    profile: mockProfile,
    stats: mockStats,
    score: calculateMusicActivityScore(mockStats),
    source: "mock"
  };
}

export async function getPublicLeaderboardEntries(limit?: number): Promise<LeaderboardEntry[]> {
  if (!supabaseServerConfigIsReady()) {
    const entries = getMockLeaderboard();

    return typeof limit === "number" ? entries.slice(0, limit) : entries;
  }

  const persistedProfiles = await getPersistedProfiles();
  const spotifyUserIds = persistedProfiles.map((profile) => profile.spotifyUserId);
  const [counts, statsMap] = await Promise.all([
    getFollowCountsForUsers(spotifyUserIds),
    getStoredMusicStatsMapBySpotifyUserIds(spotifyUserIds)
  ]);
  const snapshots = persistedProfiles.map((profile) => {
    const persistedStats = statsMap.get(profile.spotifyUserId);

    if (!persistedStats) {
      return null;
    }

    return {
      profile: toProfileShape(profile, counts.get(profile.spotifyUserId)),
      score: persistedStats.score,
      topGenre: getLeadGenre(persistedStats.stats) ?? "music"
    };
  });

  const realEntries = snapshots
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((left, right) => right.score - left.score)
    .map((entry, index) => ({
      rank: index + 1,
      profile: entry.profile,
      score: entry.score,
      topGenre: entry.topGenre
    }));

  if (!realEntries.length) {
    const fallback = getMockLeaderboard();
    return typeof limit === "number" ? fallback.slice(0, limit) : fallback;
  }

  return typeof limit === "number" ? realEntries.slice(0, limit) : realEntries;
}

export async function getPublicLeaderboardRank(username: string) {
  const entries = await getPublicLeaderboardEntries();
  return entries.find((entry) => entry.profile.username === username)?.rank ?? null;
}

export async function getFollowingLeaderboardEntriesForSession(
  session: AppSession | null
): Promise<LeaderboardEntry[]> {
  if (!session) {
    return [];
  }

  const followingIds = await getFollowingSpotifyUserIdsForSession(session);
  const circleIds = [...new Set([session.spotifyUserId, ...followingIds])];

  if (!circleIds.length) {
    return [];
  }

  const [counts, persistedProfiles, statsMap] = await Promise.all([
    getFollowCountsForUsers(circleIds),
    Promise.all(circleIds.map((spotifyUserId) => getPublicProfileBySpotifyUserId(spotifyUserId))),
    getStoredMusicStatsMapBySpotifyUserIds(circleIds)
  ]);

  const snapshots = circleIds.map((spotifyUserId) => {
    const persistedProfile = persistedProfiles.find(
      (profile) => profile?.spotifyUserId === spotifyUserId
    );
    const persistedStats = statsMap.get(spotifyUserId);

    if (persistedProfile && persistedStats) {
      return {
        profile: toProfileShape(persistedProfile, counts.get(spotifyUserId)),
        score: persistedStats.score,
        stats: persistedStats.stats,
        source: "supabase" as const
      };
    }

    return getPublicProfileSnapshotBySpotifyUserId(spotifyUserId);
  });

  const resolvedSnapshots = await Promise.all(snapshots);

  const entries = resolvedSnapshots
    .filter((snapshot): snapshot is NonNullable<typeof snapshot> => Boolean(snapshot))
    .filter(
      (snapshot): snapshot is NonNullable<typeof snapshot> & {
        score: number;
        stats: MusicStats;
      } => snapshot.score !== null && snapshot.stats !== null
    )
    .sort((left, right) => right.score - left.score)
    .map((snapshot, index) => ({
      rank: index + 1,
      profile: snapshot.profile,
      score: snapshot.score,
      topGenre: getLeadGenre(snapshot.stats) ?? "music"
    }));

  return entries;
}

export async function getSuggestedProfileMatchesForSession(
  session: AppSession | null,
  viewerStats: MusicStats | null,
  limit = 3
): Promise<SuggestedProfileMatch[]> {
  if (!session) {
    return getMockSuggestedProfiles()
      .slice(0, limit)
      .map((entry) => {
        const stats = getStatsByUserId(entry.profile.id);
        const score = calculateMusicActivityScore(stats);

        return {
          ...entry,
          badges: buildProfileBadges(entry.profile, stats, score),
          source: "mock" as const
        };
      });
  }

  if (!viewerStats || !supabaseServerConfigIsReady()) {
    return [];
  }

  const followedSpotifyUserIds = await getFollowingSpotifyUserIdsForSession(session);
  const excludedIds = new Set([session.spotifyUserId, ...followedSpotifyUserIds]);
  const persistedProfiles = await getPersistedProfiles();
  const candidateProfiles = persistedProfiles.filter(
    (profile) => !excludedIds.has(profile.spotifyUserId)
  );

  if (!candidateProfiles.length) {
    return [];
  }

  const spotifyUserIds = candidateProfiles.map((profile) => profile.spotifyUserId);
  const graphParticipantIds = [
    session.spotifyUserId,
    ...followedSpotifyUserIds,
    ...spotifyUserIds
  ];
  const [counts, statsMap, followEdges] = await Promise.all([
    getFollowCountsForUsers(spotifyUserIds),
    getStoredMusicStatsMapBySpotifyUserIds(spotifyUserIds),
    getFollowEdgesForUserIds(graphParticipantIds)
  ]);
  const viewerFollowingSet = new Set(followedSpotifyUserIds);
  const outgoingMap = new Map<string, Set<string>>();
  const incomingMap = new Map<string, Set<string>>();

  followEdges.forEach((edge) => {
    const outgoing = outgoingMap.get(edge.followerSpotifyUserId) ?? new Set<string>();
    outgoing.add(edge.followedSpotifyUserId);
    outgoingMap.set(edge.followerSpotifyUserId, outgoing);

    const incoming = incomingMap.get(edge.followedSpotifyUserId) ?? new Set<string>();
    incoming.add(edge.followerSpotifyUserId);
    incomingMap.set(edge.followedSpotifyUserId, incoming);
  });

  const suggestions = candidateProfiles.map((profile) => {
    const persistedStats = statsMap.get(profile.spotifyUserId);

    if (!persistedStats?.stats) {
      return null;
    }

    const shapedProfile = toProfileShape(profile, counts.get(profile.spotifyUserId));
    const comparison = buildComparisonBreakdown(viewerStats, persistedStats.stats);
    const candidateFollowingSet = outgoingMap.get(profile.spotifyUserId) ?? new Set<string>();
    const candidateFollowersSet = incomingMap.get(profile.spotifyUserId) ?? new Set<string>();
    const followsViewer = candidateFollowingSet.has(session.spotifyUserId);
    const sharedFollowingCount = countSetOverlap(
      candidateFollowingSet,
      viewerFollowingSet
    );
    const followedByCircleCount = countSetOverlap(
      candidateFollowersSet,
      viewerFollowingSet
    );
    const graphScore =
      sharedFollowingCount * 12 +
      followedByCircleCount * 10 +
      (followsViewer ? 24 : 0);
    const rankingScore =
      comparison.score * 3 + graphScore + Math.min(shapedProfile.followers, 12);

    return {
      profile: shapedProfile,
      comparison,
      socialLabel: buildSuggestionReason({
        followsViewer,
        sharedFollowingCount,
        followedByCircleCount
      }),
      badges: buildProfileBadges(
        shapedProfile,
        persistedStats.stats,
        persistedStats.score
      ),
      rankingScore,
      source: "supabase" as const
    };
  });

  const realSuggestions = suggestions
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((left, right) => {
      if (right.rankingScore !== left.rankingScore) {
        return right.rankingScore - left.rankingScore;
      }

      return right.profile.followers - left.profile.followers;
    })
    .map((entry) => ({
      profile: entry.profile,
      comparison: entry.comparison,
      socialLabel: entry.socialLabel,
      badges: entry.badges,
      source: entry.source
    }));

  if (!realSuggestions.length) {
    return [];
  }

  return realSuggestions.slice(0, limit);
}

export async function searchPublicProfilesByUsername(
  rawQuery: string,
  limit = 8
): Promise<PublicProfileSearchResult[]> {
  const query = rawQuery
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_.]/g, "")
    .slice(0, 24);

  if (!query) {
    return [];
  }

  if (!supabaseServerConfigIsReady()) {
    return getMockLeaderboard()
      .map((entry) => ({
        profile: entry.profile,
        stats: getStatsByUserId(entry.profile.id),
        score: entry.score,
        source: "mock" as const
      }))
      .filter((entry) => entry.profile.username.includes(query))
      .slice(0, limit);
  }

  const persistedProfiles = await getPersistedProfiles();
  const matchedProfiles = persistedProfiles
    .filter((profile) => profile.username.includes(query))
    .sort((left, right) => {
      const leftStartsWith = left.username.startsWith(query) ? 1 : 0;
      const rightStartsWith = right.username.startsWith(query) ? 1 : 0;

      if (rightStartsWith !== leftStartsWith) {
        return rightStartsWith - leftStartsWith;
      }

      return left.username.localeCompare(right.username);
    })
    .slice(0, limit);

  if (!matchedProfiles.length) {
    return [];
  }

  const spotifyUserIds = matchedProfiles.map((profile) => profile.spotifyUserId);
  const [counts, statsMap] = await Promise.all([
    getFollowCountsForUsers(spotifyUserIds),
    getStoredMusicStatsMapBySpotifyUserIds(spotifyUserIds)
  ]);

  return matchedProfiles.map((profile) => {
    const persistedStats = statsMap.get(profile.spotifyUserId);

    return {
      profile: toProfileShape(profile, counts.get(profile.spotifyUserId)),
      stats: persistedStats?.stats ?? null,
      score: persistedStats?.score ?? null,
      source: "supabase" as const
    };
  });
}
