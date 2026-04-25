import Link from "next/link";

import { LeaderboardList } from "@/components/leaderboard-list";
import { SectionHeading } from "@/components/section-heading";
import { UserCard } from "@/components/user-card";
import { buildComparisonBreakdown } from "@/lib/compatibility";
import { getStoredMusicStatsForSession } from "@/lib/music-stats";
import {
  getFollowingLeaderboardEntriesForSession,
  getPublicProfileSnapshotBySpotifyUserId
} from "@/lib/public-data";
import { getViewerProfile } from "@/lib/profiles";
import { getCurrentSession } from "@/lib/session";
import { getFollowingSpotifyUserIdsForSession } from "@/lib/social";

export default async function FollowingPage() {
  const session = await getCurrentSession();
  const viewerProfile = await getViewerProfile(session);
  const needsProfileSetup = Boolean(session && !viewerProfile?.onboardingComplete);
  const viewerStats =
    session && viewerProfile?.onboardingComplete
      ? (await getStoredMusicStatsForSession(session))?.stats ?? null
      : null;
  const needsViewerSync = Boolean(session && viewerProfile?.onboardingComplete && !viewerStats);
  const followingLeaderboard = await getFollowingLeaderboardEntriesForSession(session);
  const followingIds = session ? await getFollowingSpotifyUserIdsForSession(session) : [];
  const followingSnapshots = await Promise.all(
    followingIds.map((spotifyUserId) => getPublicProfileSnapshotBySpotifyUserId(spotifyUserId))
  );
  const following = followingSnapshots.filter(
    (snapshot): snapshot is NonNullable<typeof snapshot> => Boolean(snapshot)
  );
  const unsyncedFollowCount = following.filter((snapshot) => !snapshot.stats).length;

  return (
    <main className="page">
      <section className="hero">
        <span className="hero-kicker">Following</span>
        <h1>Your personal music circle should feel easy to revisit.</h1>
        <p className="lede">
          V1 keeps the social layer intentionally light: follow people, compare taste, and use your circle as a more personal leaderboard.
        </p>
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
            {following.map((snapshot) => (
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
              />
            ))}
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
