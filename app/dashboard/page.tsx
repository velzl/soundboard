import Link from "next/link";

import { syncSpotifyMusicFromDashboard } from "@/app/music-actions";
import { ActivityFeed } from "@/components/activity-feed";
import { LeaderboardList } from "@/components/leaderboard-list";
import { SectionHeading } from "@/components/section-heading";
import { StatCard } from "@/components/stat-card";
import { UserCard } from "@/components/user-card";
import { getCircleActivityFeedForSession } from "@/lib/activity-feed";
import { getResolvedTopGenres, getStoredMusicStatsForSession } from "@/lib/music-stats";
import { getViewerProfile } from "@/lib/profiles";
import {
  getPublicLeaderboardEntries,
  getPublicLeaderboardRank,
  getPublicProfileSnapshotBySpotifyUserId,
  getSuggestedProfileMatchesForSession
} from "@/lib/public-data";
import { calculateMusicActivityScore } from "@/lib/scoring";
import { getCurrentSession } from "@/lib/session";
import { getRecentMusicSyncHistoryForSpotifyUserId } from "@/lib/sync-history";
import { toUserFacingErrorMessage } from "@/lib/ui-errors";
import { buildWeeklyRecap } from "@/lib/weekly-recap";

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ profile_saved?: string; sync?: string; sync_error?: string }>;
}) {
  const { profile_saved: profileSaved, sync, sync_error: syncError } = await searchParams;
  const session = await getCurrentSession();
  const friendlySyncError = toUserFacingErrorMessage(syncError);

  if (!session) {
    const previewEntries = await getPublicLeaderboardEntries(4);

    return (
      <main className="page">
        <section className="hero">
          <span className="hero-kicker">Dashboard</span>
          <h1>Your real dashboard starts after Spotify is connected.</h1>
          <p className="lede">
            The personal dashboard is now reserved for real listener data. Connect Spotify to unlock your own rank, identity snapshot, and discovery feed, or browse the public preview below first.
          </p>
          <div className="pill-row">
            <span className="pill">No demo identity here</span>
            <span className="pill">Real profile required</span>
            <span className="pill pill-accent">Public preview below</span>
          </div>
          <div className="hero-actions">
            <Link className="button button-primary" href="/auth/spotify/start">
              Connect Spotify
            </Link>
            <Link className="button button-secondary" href="/leaderboard">
              Open leaderboard
            </Link>
          </div>
        </section>

        <section className="grid grid-3">
          <article className="card stack">
            <span className="eyebrow">What unlocks</span>
            <h3>Your identity snapshot</h3>
            <p className="note">
              Top artists, top tracks, and genre shape only appear once the app has your real Spotify snapshot.
            </p>
          </article>
          <article className="card stack">
            <span className="eyebrow">What unlocks</span>
            <h3>Personal rankings</h3>
            <p className="note">
              Global rank and follow-circle rankings stay tied to real synced profiles now, not demo stand-ins.
            </p>
          </article>
          <article className="card stack">
            <span className="eyebrow">What unlocks</span>
            <h3>Taste matching</h3>
            <p className="note">
              Compatibility becomes meaningful only when both sides have real artist and genre data to compare.
            </p>
          </article>
        </section>

        <section className="stack">
          <SectionHeading
            eyebrow="Public preview"
            title="People currently shaping the public board"
            description="This keeps the route useful without pretending you already have a personal music identity here."
          />
          {previewEntries.length ? (
            <LeaderboardList entries={previewEntries} />
          ) : (
            <article className="card stack">
              <h3>No synced public profiles yet</h3>
              <p className="note">
                Once profiles connect and sync, this preview will start reflecting the real public board.
              </p>
            </article>
          )}
        </section>
      </main>
    );
  }

  const [viewerProfile, storedMusicStats] = await Promise.all([
    getViewerProfile(session),
    getStoredMusicStatsForSession(session)
  ]);
  const stats = storedMusicStats?.stats ?? null;
  const displayName = (viewerProfile?.displayName ?? session.displayName).split(" ")[0];
  const score = storedMusicStats?.score ?? (stats ? calculateMusicActivityScore(stats) : null);
  const [viewerSnapshot, rank, suggested, syncHistory, circleActivity] = await Promise.all([
    viewerProfile?.onboardingComplete
      ? getPublicProfileSnapshotBySpotifyUserId(session.spotifyUserId)
      : Promise.resolve(null),
    storedMusicStats?.stats && viewerProfile?.onboardingComplete
      ? getPublicLeaderboardRank(viewerProfile.username)
      : Promise.resolve(null),
    getSuggestedProfileMatchesForSession(session, storedMusicStats?.stats ?? null),
    getRecentMusicSyncHistoryForSpotifyUserId(session.spotifyUserId, 2),
    getCircleActivityFeedForSession(session, 4)
  ]);
  const followers = viewerSnapshot ? String(viewerSnapshot.profile.followers) : "-";
  const following = viewerSnapshot ? String(viewerSnapshot.profile.following) : "-";
  const usingSyncedStats = Boolean(storedMusicStats?.stats);
  const bestMatchUsername = suggested[0]?.profile.username;
  const needsProfileSetup = Boolean(!viewerProfile?.onboardingComplete);
  const needsSpotifySync = Boolean(viewerProfile?.onboardingComplete && !storedMusicStats?.stats);
  const genreLane = getResolvedTopGenres(stats).slice(0, 3);
  const genreLaneSummary =
    genreLane.length >= 3
      ? `${genreLane[0]}, ${genreLane[1]}, and ${genreLane[2]}`
      : genreLane.length === 2
        ? `${genreLane[0]} and ${genreLane[1]}`
        : genreLane.length === 1
          ? genreLane[0]
          : null;
  const weeklyRecap = stats
    ? buildWeeklyRecap({
        stats,
        score,
        rank,
        bestMatchUsername,
        previousSync: syncHistory[1] ?? null
      })
    : null;

  return (
    <main className="page">
      {profileSaved ? (
        <section className="panel stack">
          <span className="eyebrow">Profile status</span>
          <strong>Your profile is saved and ready for the next data-sync pass.</strong>
        </section>
      ) : null}

      {sync ? (
        <section className="panel stack">
          <span className="eyebrow">Spotify sync status</span>
          <strong>Your latest Spotify top artists and tracks were synced.</strong>
        </section>
      ) : null}

      {friendlySyncError ? (
        <section className="panel stack">
          <span className="eyebrow">Spotify sync status</span>
          <strong>We could not finish the Spotify sync.</strong>
          <span className="note">{friendlySyncError}</span>
        </section>
      ) : null}

      <section className="hero">
        <span className="hero-kicker">Dashboard</span>
        <h1>
          Welcome back, {displayName}.
        </h1>
        {stats && genreLaneSummary ? (
          <p className="lede">
            Your current profile is leaning into {genreLaneSummary}. You are sitting at #{rank} globally with a score shaped by genre spread, track artist variety, and the shape of your top-list identity.
          </p>
        ) : stats ? (
          <p className="lede">
            Your Spotify snapshot is live and shaping your profile. As more artist genre data settles in, this summary will keep getting more specific without losing your synced rank and identity snapshot.
          </p>
        ) : needsProfileSetup ? (
          <p className="lede">
            Finish onboarding to turn your Spotify login into a public music identity. Once your profile is set, your dashboard can start reflecting real ranking and comparison data.
          </p>
        ) : (
          <p className="lede">
            Your profile is connected, but it still needs one Spotify sync before this dashboard can show real artists, genres, compatibility matches, and leaderboard placement.
          </p>
        )}
        <div className="pill-row">
          {viewerProfile ? <span className="pill">Profile handle: @{viewerProfile.username}</span> : null}
          <span className="pill">{usingSyncedStats ? "Live Spotify snapshot" : "Awaiting first sync"}</span>
          {weeklyRecap ? <span className="pill pill-accent">{weeklyRecap.title}</span> : null}
          {bestMatchUsername ? <span className="pill">Best match today: @{bestMatchUsername}</span> : null}
          {stats ? <span className="pill">Updated {new Date(stats.updatedAt).toLocaleDateString()}</span> : null}
        </div>
      </section>

      {session ? (
        <section className="card stack">
          <span className="eyebrow">Current auth state</span>
          <h2>
            Spotify sign-in is real, profile persistence is wired, and your own dashboard can now use a synced Spotify snapshot.
          </h2>
          <p className="note">
            Comparison and discovery now prefer persisted artist and genre overlap whenever enough synced profiles exist. Signed-in users who have not synced yet now get explicit empty states instead of demo data.
          </p>
          <div className="inline-actions">
            {!viewerProfile?.onboardingComplete ? (
              <Link className="button button-primary" href="/onboarding">
                Finish profile setup
              </Link>
            ) : null}
            <form action={syncSpotifyMusicFromDashboard}>
              <button className="button button-secondary" type="submit">
                Sync Spotify data
              </button>
            </form>
          </div>
        </section>
      ) : null}

      <section className="grid grid-4">
        <StatCard label="Music activity score" value={score !== null ? String(score) : "-"} detail="Built from genre spread, track artist variety, and genre breadth." />
        <StatCard label="Global rank" value={`#${rank}`} detail="A single leaderboard keeps the app easy to understand in V1." />
        <StatCard label="Followers" value={followers} detail="Public identity matters more when people can track your taste." />
        <StatCard label="Following" value={following} detail="Keep your music circle tight for stronger comparisons." />
      </section>

      {weeklyRecap ? (
        <section className="panel stack">
          <span className="eyebrow">{weeklyRecap.eyebrow}</span>
          <h2>{weeklyRecap.title}</h2>
          <p className="note">{weeklyRecap.summary}</p>
          <div className="tag-list">
            {weeklyRecap.highlights.map((highlight) => (
              <span className="tag" key={highlight}>
                {highlight}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="stack">
        <SectionHeading
          eyebrow="Social pulse"
          title="What your listening circle is doing"
          description="This keeps the app feeling alive through follows, syncs, and new profile claims without opening up an unsafe public posting surface."
        />
        <ActivityFeed
          items={viewerProfile?.onboardingComplete ? circleActivity : []}
          emptyTitle={
            viewerProfile?.onboardingComplete
              ? "Your circle has not moved yet"
              : "Your circle feed is waiting on profile setup"
          }
          emptyNote={
            viewerProfile?.onboardingComplete
              ? "Follow a few people or let more synced profiles join your orbit and this area will start feeling more like a live social pulse."
              : "Complete onboarding first so this feed can anchor itself to your public music identity."
          }
        />
        <Link className="button button-secondary" href="/activity">
          Open the full activity feed
        </Link>
      </section>

      <section className="split">
        <div className="stack">
          <SectionHeading
            eyebrow="Identity snapshot"
            title="What is defining your profile right now"
            description="The dashboard should feel like a music persona, not a spreadsheet."
          />

          {stats ? (
            <>
              <article className="panel stack">
                <h3>Top artists</h3>
                <div className="tag-list">
                  {stats.topArtists.slice(0, 8).map((artist) => (
                    <span className="tag" key={artist.id}>
                      {artist.name}
                    </span>
                  ))}
                </div>
              </article>

              <article className="card stack">
                <h3>Top tracks</h3>
                <div className="tag-list">
                  {stats.topTracks.slice(0, 8).map((track) => (
                    <span className="tag" key={track.id}>
                      {track.name}
                    </span>
                  ))}
                </div>
              </article>
            </>
          ) : (
            <article className="card stack">
              <h3>{needsProfileSetup ? "Finish your profile first" : "Your music snapshot is waiting"}</h3>
              <p className="note">
                {needsProfileSetup
                  ? "Choose your username and bio so the app can treat this account as a public music identity."
                  : "Run your first Spotify sync and this section will fill in with the artists and tracks shaping your profile."}
              </p>
              <div className="inline-actions">
                {needsProfileSetup ? (
                  <Link className="button button-primary" href="/onboarding">
                    Finish profile setup
                  </Link>
                ) : needsSpotifySync ? (
                  <Link className="button button-primary" href="/settings">
                    Sync from settings
                  </Link>
                ) : (
                  <Link className="button button-primary" href="/auth/spotify/start">
                    Connect Spotify
                  </Link>
                )}
              </div>
            </article>
          )}
        </div>

        <div className="stack">
          <SectionHeading
            eyebrow="Suggested listeners"
            title="People who are close to your lane"
            description="These suggestions blend artist and genre overlap with lightweight circle signals like shared follows and follow-back momentum."
          />

          {suggested.length ? (
            suggested.map(({ profile: suggestedProfile, comparison, socialLabel, badges }) => (
              <UserCard
                key={suggestedProfile.id}
                profile={suggestedProfile}
                comparison={comparison}
                socialLabel={socialLabel}
                badges={badges}
                actionHref={`/compare/${suggestedProfile.username}`}
              />
            ))
          ) : (
            <article className="card stack">
              <h3>
                {session ? "No strong matches yet" : "Discovery preview stays on the landing page"}
              </h3>
              <p className="note">
                {session
                  ? "Once more synced listeners are in the system, this area will start surfacing people whose artists and genres genuinely line up with yours."
                  : "Connect Spotify to unlock a real discovery feed built from your own listening profile."}
              </p>
            </article>
          )}

          <Link className="button button-secondary" href="/leaderboard">
            Explore the full leaderboard
          </Link>
        </div>
      </section>
    </main>
  );
}
