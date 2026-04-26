import { getRecentMusicSyncHistoryEntries } from "@/lib/sync-history";
import {
  getFollowCountsForUsers,
  getFollowingSpotifyUserIdsForSession,
  getRecentFollowEvents
} from "@/lib/social";
import {
  buildAvatarSeed,
  getPublicProfilesBySpotifyUserIds,
  getRecentPublicProfiles
} from "@/lib/profiles";
import type { AppSession } from "@/lib/session";
import type { PersistedProfile, Profile, SocialActivityItem } from "@/types";

export type ActivityKindFilter = "all" | "follow" | "sync" | "joined";

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

async function buildActivityFeed(
  limit: number,
  participantSpotifyUserIds?: string[],
  kind: ActivityKindFilter = "all"
) {
  const participantIds = participantSpotifyUserIds
    ? [...new Set(participantSpotifyUserIds.filter(Boolean))]
    : [];
  const expandedLimit = Math.max(limit * 3, 12);
  const [recentProfiles, followEvents, syncEvents] = await Promise.all([
    participantIds.length
      ? getPublicProfilesBySpotifyUserIds(participantIds).then((profiles) =>
          [...profiles.values()].sort((left, right) =>
            right.createdAt.localeCompare(left.createdAt)
          )
        )
      : getRecentPublicProfiles(expandedLimit),
    getRecentFollowEvents(expandedLimit, participantIds.length ? participantIds : undefined),
    getRecentMusicSyncHistoryEntries(expandedLimit, participantIds.length ? participantIds : undefined)
  ]);

  const relevantSpotifyUserIds = [
    ...recentProfiles.map((profile) => profile.spotifyUserId),
    ...followEvents.flatMap((event) => [
      event.followerSpotifyUserId,
      event.followedSpotifyUserId
    ]),
    ...syncEvents.map((entry) => entry.spotifyUserId)
  ];
  const uniqueSpotifyUserIds = [...new Set(relevantSpotifyUserIds.filter(Boolean))];
  const [profileMap, countsMap] = await Promise.all([
    getPublicProfilesBySpotifyUserIds(uniqueSpotifyUserIds),
    getFollowCountsForUsers(uniqueSpotifyUserIds)
  ]);

  const items: SocialActivityItem[] = [];

  recentProfiles.forEach((profile) => {
    const actorProfile = toProfileShape(
      profile,
      countsMap.get(profile.spotifyUserId)
    );

    items.push({
      id: `joined:${profile.spotifyUserId}:${profile.createdAt}`,
      type: "joined",
      actorProfile,
      targetProfile: null,
      createdAt: profile.createdAt,
      headline: `@${profile.username} claimed a Soundboard profile`,
      detail: `${profile.displayName} joined the public listening graph and is ready to be followed, ranked, and compared.`,
      actionHref: `/u/${profile.username}`,
      actionLabel: "Open profile",
      privacyNote: "System-generated from completed onboarding. No public free-form post was created."
    });
  });

  followEvents.forEach((event) => {
    const actor = profileMap.get(event.followerSpotifyUserId);
    const target = profileMap.get(event.followedSpotifyUserId);

    if (!actor || !target) {
      return;
    }

    const actorProfile = toProfileShape(
      actor,
      countsMap.get(actor.spotifyUserId)
    );
    const targetProfile = toProfileShape(
      target,
      countsMap.get(target.spotifyUserId)
    );

    items.push({
      id: `follow:${event.followerSpotifyUserId}:${event.followedSpotifyUserId}:${event.createdAt}`,
      type: "follow",
      actorProfile,
      targetProfile,
      createdAt: event.createdAt,
      headline: `@${actor.username} followed @${target.username}`,
      detail: `${actor.displayName} added ${target.displayName} to their listening circle.`,
      actionHref: `/u/${actor.username}`,
      actionLabel: "View follower",
      privacyNote: "System-generated from follow activity. No direct messaging or public comments are attached."
    });
  });

  syncEvents.forEach((entry) => {
    const actor = profileMap.get(entry.spotifyUserId);

    if (!actor) {
      return;
    }

    const actorProfile = toProfileShape(
      actor,
      countsMap.get(actor.spotifyUserId)
    );
    const syncSummaryParts = [
      entry.topArtistName ? `Top artist: ${entry.topArtistName}` : null,
      entry.topTrackName ? `Top track: ${entry.topTrackName}` : null,
      `Score ${entry.score}`
    ].filter(Boolean);

    items.push({
      id: `sync:${entry.spotifyUserId}:${entry.syncedAt}`,
      type: "sync",
      actorProfile,
      targetProfile: null,
      createdAt: entry.syncedAt,
      headline: `@${actor.username} refreshed their listening snapshot`,
      detail: syncSummaryParts.join(" | "),
      actionHref: `/u/${actor.username}`,
      actionLabel: "View snapshot",
      privacyNote: "System-generated from a Spotify sync. This feed never exposes private auth tokens or hidden listener data."
    });
  });

  return items
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .filter((item) => kind === "all" || item.type === kind)
    .slice(0, limit);
}

export async function getPublicActivityFeed(limit = 12, kind: ActivityKindFilter = "all") {
  return buildActivityFeed(limit, undefined, kind);
}

export async function getCircleActivityFeedForSession(
  session: AppSession | null,
  limit = 12,
  kind: ActivityKindFilter = "all"
) {
  if (!session) {
    return [];
  }

  const followingSpotifyUserIds = await getFollowingSpotifyUserIdsForSession(session);

  return buildActivityFeed(limit, [session.spotifyUserId, ...followingSpotifyUserIds], kind);
}
