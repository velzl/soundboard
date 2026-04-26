import Link from "next/link";

import { PinToggle } from "@/components/pin-toggle";
import { LeaderboardList } from "@/components/leaderboard-list";
import { SectionHeading } from "@/components/section-heading";
import { UserCard } from "@/components/user-card";
import { buildComparisonBreakdown } from "@/lib/compatibility";
import { buildProfileBadges } from "@/lib/profile-badges";
import { getStoredMusicStatsForSession } from "@/lib/music-stats";
import { getPinnedEntriesForSession, getPinnedRelationshipMapForViewer } from "@/lib/pins";
import {
  getFollowingLeaderboardEntriesForSession,
  getPublicProfileSnapshotBySpotifyUserId
} from "@/lib/public-data";
import { getViewerProfile } from "@/lib/profiles";
import { getCurrentSession } from "@/lib/session";
import {
  getFollowRelationshipMapForViewer,
  getFollowingSpotifyUserIdsForSession
} from "@/lib/social";
import { toUserFacingErrorMessage } from "@/lib/ui-errors";

export default async function FollowingPage({
  searchParams
}: {
  searchParams: Promise<{ pinned?: string; unpinned?: string; pin_error?: string }>;
}) {
  const { pinned, unpinned, pin_error: pinError } = await searchParams;
  const session = await getCurrentSession();
  const friendlyPinError = toUserFacingErrorMessage(pinError);
  const viewerProfile = await getViewerProfile(session);
  const needsProfileSetup = Boolean(session && !viewerProfile?.onboardingComplete);
  const viewerStats =
    session && viewerProfile?.onboardingComplete
      ? (await getStoredMusicStatsForSession(session))?.stats ?? null
      : null;
  const needsViewerSync = Boolean(session && viewerProfile?.onboardingComplete && !viewerStats);
  const followingLeaderboard = await getFollowingLeaderboardEntriesForSession(session);
  const followingIds = session ? await getFollowingSpotifyUserIdsForSession(session) : [];
  const pinnedEntries = session ? await getPinnedEntriesForSession(session) : [];
  const pinnedIds = pinnedEntries.map((entry) => entry.pinnedSpotifyUserId);
  const relationshipMap =
    session && followingIds.length
      ? await getFollowRelationshipMapForViewer(session.spotifyUserId, followingIds)
      : new Map();
  const pinnedMap =
    session && followingIds.length
      ? await getPinnedRelationshipMapForViewer(session.spotifyUserId, followingIds)
      : new Map();
  const followingSnapshots = await Promise.all(
    followingIds.map((spotifyUserId) => getPublicProfileSnapshotBySpotifyUserId(spotifyUserId))
  );
  const following = followingSnapshots.filter(
    (snapshot): snapshot is NonNullable<typeof snapshot> => Boolean(snapshot)
  );
  const pinnedSnapshots = pinnedIds
    .map((pinnedSpotifyUserId) =>
      following.find((snapshot) => snapshot.profile.id === pinnedSpotifyUserId) ?? null
    )
    .filter((snapshot): snapshot is NonNullable<typeof snapshot> => Boolean(snapshot));
  const unsyncedFollowCount = following.filter((snapshot) => !snapshot.stats).length;
  const mutualCount = following.filter((snapshot) =>
    relationshipMap.get(snapshot.profile.id)?.isMutual
  ).length;

  return (
    <main className="page">
      {pinned ? (
        <section className="panel stack">
          <span className="eyebrow">Pin status</span>
          <strong>Your pinned circle was updated.</strong>
        </section>
      ) : null}

      {unpinned ? (
        <section className="panel stack">
          <span className="eyebrow">Pin status</span>
          <strong>A profile was removed from your pinned circle.</strong>
        </section>
      ) : null}

      {friendlyPinError ? (
        <section className="panel stack">
          <span className="eyebrow">Pin status</span>
          <strong>That pin action did not complete.</strong>
          <span className="note">{friendlyPinError}</span>
        </section>
      ) : null}

      <section className="hero">
        <span className="hero-kicker">Following</span>
        <h1>Your personal music circle should feel easy to revisit.</h1>
        <p className="lede">
          V1 keeps the social layer intentionally light: follow people, compare taste, and use your circle as a more personal leaderboard.
        </p>
        <div className="pill-row">
          <span className="pill">{following.length} in your circle</span>
          <span className="pill">{pinnedSnapshots.length} pinned</span>
          <span className="pill">{mutualCount} mutual {mutualCount === 1 ? "follow" : "follows"}</span>
          <span className="pill pill-accent">Safer system-social design</span>
        </div>
      </section>

      {!session ? (
        <section className="panel stack">
          <span className="eyebrow">Circle status</span>
          <strong>Connect Spotify to build a personal music circle.</strong>
          <span className="note">
            Following, personal rankings, and match scores only become meaningful once the app knows who you are.
          </span>
        </section>
      ) : needsProfileSetup ? (
        <section className="panel stack">
          <span className="eyebrow">Circle status</span>
          <strong>Finish your profile setup before the social layer can fully unlock.</strong>
          <span className="note">
            Choose your username first so follows, rankings, and comparisons attach to a real public identity.
          </span>
        </section>
      ) : needsViewerSync ? (
        <section className="panel stack">
          <span className="eyebrow">Circle status</span>
          <strong>Your circle is live, but match scores need your first Spotify sync.</strong>
          <span className="note">
            Once your snapshot is synced, this page can show real compatibility instead of just profile cards and ranking slots.
          </span>
        </section>
      ) : unsyncedFollowCount ? (
        <section className="panel stack">
          <span className="eyebrow">Circle status</span>
          <strong>{unsyncedFollowCount} followed {unsyncedFollowCount === 1 ? "profile still needs" : "profiles still need"} a Spotify sync.</strong>
          <span className="note">
            Those profiles can still be followed and ranked later, but match percentages will only appear after their listening snapshots are available.
          </span>
        </section>
      ) : null}

      <section className="stack">
        <SectionHeading
          eyebrow="Pinned"
          title="Profiles you want to keep close"
          description="Pinning is intentionally capped and tied to followed profiles so it behaves more like a trusted shortlist than an unbounded watchlist."
        />

        {pinnedSnapshots.length ? (
          <div className="grid grid-2">
            {pinnedSnapshots.map((snapshot) => {
              const relationship = relationshipMap.get(snapshot.profile.id);
              const isPinned = pinnedMap.get(snapshot.profile.id) ?? false;
              const socialTokens = [
                isPinned ? "Pinned" : null,
                relationship?.isMutual
                  ? "Mutual follow"
                  : relationship?.followsViewer
                    ? "Follows you"
                    : "You follow this profile"
              ].filter(Boolean);

              return (
                <UserCard
                  key={`pinned-${snapshot.profile.id}`}
                  profile={snapshot.profile}
                  comparison={
                    viewerStats && snapshot.stats
                      ? buildComparisonBreakdown(viewerStats, snapshot.stats)
                      : undefined
                  }
                  actionHref={`/compare/${snapshot.profile.username}`}
                  actionLabel={viewerStats && snapshot.stats ? "Compare" : "View sync status"}
                  socialLabel={socialTokens.join(" | ")}
                  badges={buildProfileBadges(snapshot.profile, snapshot.stats, snapshot.score)}
                  extraAction={
                    <PinToggle
                      username={snapshot.profile.username}
                      redirectPath="/following"
                      isPinned={isPinned}
                    />
                  }
                />
              );
            })}
          </div>
        ) : (
          <article className="card stack">
            <h3>No pinned profiles yet</h3>
            <p className="note">
              Follow someone first, then pin them from their profile or from your circle to keep them near the top of your social loop.
            </p>
          </article>
        )}
      </section>

      <section className="stack">
        <SectionHeading
          eyebrow="Circle ranking"
          title="How your personal leaderboard looks right now"
          description="This ranking uses the same music activity score, but only inside the people you actually follow plus your own profile."
        />

        {followingLeaderboard.length ? (
          <LeaderboardList entries={followingLeaderboard} />
        ) : (
          <article className="card stack">
            <h3>Your personal leaderboard is still empty</h3>
            <p className="note">
              Follow a few synced listeners to turn this page into a more personal ranking board instead of just a profile list.
            </p>
          </article>
        )}
      </section>

      <section className="stack">
        <SectionHeading
          eyebrow="Your people"
          title="Profiles worth checking back on"
          description="This page is the bridge between discovery and retention."
        />

        {following.length ? (
          <div className="grid grid-2">
            {following.map((snapshot) => {
                const relationship = relationshipMap.get(snapshot.profile.id);

                return (
                  <UserCard
                    key={snapshot.profile.id}
                    profile={snapshot.profile}
                    comparison={
                      viewerStats && snapshot.stats
                        ? buildComparisonBreakdown(viewerStats, snapshot.stats)
                        : undefined
                    }
                    actionHref={`/compare/${snapshot.profile.username}`}
                    actionLabel={
                      viewerStats && snapshot.stats ? "Compare" : "View sync status"
                    }
                    socialLabel={
                      [
                        pinnedMap.get(snapshot.profile.id) ? "Pinned" : null,
                        relationship?.isMutual
                          ? "Mutual follow"
                          : relationship?.followsViewer
                            ? "Follows you"
                            : "You follow this profile"
                      ]
                        .filter(Boolean)
                        .join(" | ")
                    }
                    badges={buildProfileBadges(snapshot.profile, snapshot.stats, snapshot.score)}
                    extraAction={
                      <PinToggle
                        username={snapshot.profile.username}
                        redirectPath="/following"
                        isPinned={pinnedMap.get(snapshot.profile.id) ?? false}
                      />
                    }
                  />
                );
              })}
          </div>
        ) : (
          <article className="card stack">
            <h3>No follows yet</h3>
            <p className="note">
              Start with profiles on the leaderboard. Once you follow people, this page becomes your personal music circle.
            </p>
          </article>
        )}
      </section>

      <Link className="button button-secondary" href="/leaderboard">
        Find more people to follow
      </Link>
    </main>
  );
}
