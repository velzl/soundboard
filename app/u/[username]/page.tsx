import Link from "next/link";
import { notFound } from "next/navigation";

import { buildComparisonBreakdown } from "@/lib/compatibility";
import { FollowToggle } from "@/components/follow-toggle";
import {
  buildPinnedIdentityMarkers,
  buildProfileBadgeDetails,
  buildProfileBadges
} from "@/lib/profile-badges";
import { buildProfileIdentity } from "@/lib/profile-identity";
import { SectionHeading } from "@/components/section-heading";
import { StatCard } from "@/components/stat-card";
import { getLeadGenre, getResolvedTopGenres, getStoredMusicStatsForSession } from "@/lib/music-stats";
import { getPublicProfileSnapshotByUsername } from "@/lib/public-data";
import { getViewerProfile } from "@/lib/profiles";
import { getCurrentSession } from "@/lib/session";
import { getFollowRelationshipMapForViewer } from "@/lib/social";
import { toUserFacingErrorMessage } from "@/lib/ui-errors";

export default async function ProfilePage({
  params,
  searchParams
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ followed?: string; unfollowed?: string; social_error?: string }>;
}) {
  const { username } = await params;
  const { followed, unfollowed, social_error: socialError } = await searchParams;
  const friendlySocialError = toUserFacingErrorMessage(socialError);
  const [snapshot, session] = await Promise.all([
    getPublicProfileSnapshotByUsername(username),
    getCurrentSession()
  ]);

  if (!snapshot) {
    notFound();
  }

  const [viewerProfile, viewerStoredStats] = session
    ? await Promise.all([
        getViewerProfile(session),
        getStoredMusicStatsForSession(session)
      ])
    : [null, null];
  const isOwnProfile = Boolean(session && snapshot.profile.id === session.spotifyUserId);
  const viewerStats = viewerProfile?.onboardingComplete
    ? viewerStoredStats?.stats ?? null
    : null;
  const canFollow = Boolean(session && snapshot.source === "supabase" && !isOwnProfile);
  const relationship =
    canFollow && session
      ? (await getFollowRelationshipMapForViewer(session.spotifyUserId, [snapshot.profile.id])).get(
          snapshot.profile.id
        ) ?? {
          isFollowing: false,
          followsViewer: false,
          isMutual: false
        }
      : null;
  const isFollowing = relationship?.isFollowing ?? false;
  const comparison =
    viewerStats && snapshot.stats && !isOwnProfile
      ? buildComparisonBreakdown(viewerStats, snapshot.stats)
      : null;
  const hasSyncedStats = Boolean(snapshot.stats && snapshot.score !== null);
  const resolvedTopGenres = getResolvedTopGenres(snapshot.stats);
  const hasGenreSignals = resolvedTopGenres.length > 0;
  const leadGenre = snapshot.stats
    ? getLeadGenre(snapshot.stats) ?? "No genre labels"
    : "Awaiting sync";
  const leadGenreDetail = !snapshot.stats
    ? "This profile needs a Spotify sync before the app can estimate a musical lane."
    : hasGenreSignals
      ? "The profile's current lane comes from the strongest genre signal in the synced artist snapshot."
      : "Spotify synced the artists successfully, but this snapshot did not include enough genre metadata to name a clear lane yet.";
  const syncStatus = snapshot.stats
    ? new Date(snapshot.stats.updatedAt).toLocaleDateString()
    : "Not synced";
  const comparisonScore = isOwnProfile
    ? "Self"
    : comparison
      ? `${comparison.score}%`
      : !session
        ? "Connect"
        : !viewerStats
          ? "Sync first"
          : !snapshot.stats
            ? "Pending"
            : "Unavailable";
  const comparisonDetail = isOwnProfile
    ? "Open someone else's profile to turn comparison into a real match score."
    : comparison
      ? "When both sides are synced, this turns profile browsing into a more personal competition loop."
      : !session
        ? "Connect Spotify to compare your real listening history against this profile."
        : !viewerStats
          ? "Sync your own Spotify snapshot first so the match score can be computed."
          : !snapshot.stats
            ? "This profile still needs a Spotify sync before the overlap score can appear."
            : "Comparison is temporarily unavailable for this profile.";
  const identity = buildProfileIdentity(snapshot.profile, snapshot.stats);
  const profileBadges = buildProfileBadges(snapshot.profile, snapshot.stats, snapshot.score);
  const profileBadgeDetails = buildProfileBadgeDetails(
    snapshot.profile,
    snapshot.stats,
    snapshot.score
  );
  const pinnedMarkers = buildPinnedIdentityMarkers(
    snapshot.profile,
    snapshot.stats,
    snapshot.score
  );

  return (
    <main className="page">
      {followed ? (
        <section className="panel stack">
          <span className="eyebrow">Social status</span>
          <strong>You are now following @{snapshot.profile.username}.</strong>
        </section>
      ) : null}

      {unfollowed ? (
        <section className="panel stack">
          <span className="eyebrow">Social status</span>
          <strong>You unfollowed @{snapshot.profile.username}.</strong>
        </section>
      ) : null}

      {friendlySocialError ? (
        <section className="panel stack">
          <span className="eyebrow">Social status</span>
          <strong>That social action did not complete.</strong>
          <span className="note">{friendlySocialError}</span>
        </section>
      ) : null}

      <section className="hero profile-hero">
        <div className="profile-hero-copy stack">
          <span className="hero-kicker">Public profile</span>
          <h1>{snapshot.profile.displayName}</h1>
          <p className="lede">
            {snapshot.profile.bio ||
              (hasSyncedStats
                ? "This profile is backed by a real Spotify snapshot."
                : "This profile exists, but music data has not been synced yet.")}
          </p>
          <div className="pill-row">
            {snapshot.score !== null ? (
              <span className="pill pill-accent">{snapshot.score} activity score</span>
            ) : null}
            <span className="pill">Lead genre: {leadGenre}</span>
            <span className="pill">@{snapshot.profile.username}</span>
            <span className="pill">{snapshot.profile.followers} followers</span>
            <span className="pill">{snapshot.profile.following} following</span>
            {relationship?.isMutual ? (
              <span className="pill pill-accent">Mutual follow</span>
            ) : relationship?.followsViewer ? (
              <span className="pill">Follows you</span>
            ) : relationship?.isFollowing ? (
              <span className="pill">You follow this profile</span>
            ) : null}
            {snapshot.stats ? (
              <span className="pill">
                Synced {new Date(snapshot.stats.updatedAt).toLocaleDateString()}
              </span>
            ) : null}
          </div>
        </div>

        <aside className="profile-identity-card stack">
          <div className="avatar avatar-large" aria-hidden="true">
            {snapshot.profile.avatarSeed}
          </div>
          <span className="eyebrow">{identity.eyebrow}</span>
          <strong className="profile-identity-title">{identity.headline}</strong>
          <p className="note">{identity.summary}</p>
          <div className="tag-list">
            {identity.markers.map((marker) => (
              <span className="tag" key={marker}>
                {marker}
              </span>
            ))}
          </div>
          {profileBadges.length ? (
            <div className="stack">
              <span className="eyebrow">Pinned badges</span>
              <div className="pill-row">
                {profileBadges.map((badge) => (
                  <span className="pill pill-accent" key={badge}>
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </section>

      <section className="grid grid-4">
        <StatCard
          label="Activity score"
          value={snapshot.score !== null ? String(snapshot.score) : "-"}
          detail="This is the same score used on the global and follow-circle boards."
        />
        <StatCard
          label="Lead genre"
          value={leadGenre}
          detail={leadGenreDetail}
        />
        <StatCard
          label="Sync status"
          value={syncStatus}
          detail="Comparison, ranking, and discovery only become fully meaningful after a Spotify snapshot is available."
        />
        <StatCard
          label="Match score"
          value={comparisonScore}
          detail={comparisonDetail}
        />
      </section>

      <section className="split">
        <div className="stack">
          <SectionHeading
            eyebrow={hasSyncedStats ? "Music snapshot" : "Profile status"}
            title={
              hasSyncedStats
                ? "The artists and genres defining this account"
                : "Music stat syncing is not connected for this account yet"
            }
            description={
              hasSyncedStats
                ? "Profiles should feel expressive before they feel analytical."
                : "Once this account completes a Spotify sync, leaderboard placement and taste comparison can show up here."
            }
          />

          {snapshot.stats ? (
            <>
              <article className="panel stack">
                <h3>Top artists</h3>
                <div className="tag-list">
                  {snapshot.stats.topArtists.slice(0, 10).map((artist) => (
                    <span className="tag" key={artist.id}>
                      {artist.name}
                    </span>
                  ))}
                </div>
              </article>

              <article className="card stack">
                <h3>Top genres</h3>
                {resolvedTopGenres.length ? (
                  <div className="tag-list">
                    {resolvedTopGenres.map((genre) => (
                      <span className="tag" key={genre}>
                        {genre}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="note">
                    Spotify synced the artist list, but this particular snapshot does not expose usable genre labels yet.
                  </p>
                )}
              </article>

              <article className="card stack">
                <h3>Top tracks</h3>
                <div className="tag-list">
                  {snapshot.stats.topTracks.slice(0, 8).map((track) => (
                    <span className="tag" key={track.id}>
                      {track.name}
                    </span>
                  ))}
                </div>
              </article>
            </>
          ) : (
            <article className="card stack">
              <h3>What is already live</h3>
              <div className="tag-list">
                <span className="tag">Spotify auth</span>
                <span className="tag">Profile persistence</span>
                <span className="tag">Server-side sessions</span>
              </div>
              <p className="note">
                Once this profile completes a Spotify sync, the stat cards above and the compare route will start reflecting real taste data instead of just account identity.
              </p>
            </article>
          )}
        </div>

        <div className="stack">
          <article className="card stack">
            <h3>Quick actions</h3>
            <div className="inline-actions">
              {hasSyncedStats && !isOwnProfile ? (
                <Link className="button button-primary" href={`/compare/${snapshot.profile.username}`}>
                  Compare profiles
                </Link>
              ) : isOwnProfile ? (
                <Link className="button button-primary" href="/settings">
                  {hasSyncedStats ? "Manage profile" : "Sync from settings"}
                </Link>
              ) : (
                <Link className="button button-primary" href="/leaderboard">
                  Back to leaderboard
                </Link>
              )}
              <Link className="button button-secondary" href="/dashboard">
                Dashboard
              </Link>
              {canFollow ? (
                <FollowToggle
                  username={snapshot.profile.username}
                  redirectPath={`/u/${snapshot.profile.username}`}
                  isFollowing={isFollowing}
                  followLabel={
                    relationship?.followsViewer
                      ? `Follow back @${snapshot.profile.username}`
                      : undefined
                  }
                />
              ) : null}
            </div>
          </article>

          {comparison ? (
            <article className="card stack">
              <h3>How this profile matches yours</h3>
              <p className="note">{comparison.summary}</p>
              <span className="pill pill-accent">{comparison.score}% compatibility</span>
            </article>
          ) : session && !isOwnProfile ? (
            <article className="card stack">
              <h3>How this profile matches yours</h3>
              <p className="note">
                {viewerStats && !snapshot.stats
                  ? `@${snapshot.profile.username} still needs a Spotify sync before we can compute a real match.`
                  : !viewerStats
                    ? "Sync your Spotify data first so this profile can be compared against your real listening history."
                    : "Comparison will appear here once both profiles have synced data."}
              </p>
            </article>
          ) : null}

          <article className="card stack">
            <h3>Pinned identity markers</h3>
            <p className="note">
              Lightweight profile markers keep the social read fast without exposing raw private data or requiring free-form public posting.
            </p>
            <div className="tag-list">
              {pinnedMarkers.map((marker) => (
                <span className="tag" key={marker}>
                  {marker}
                </span>
              ))}
            </div>
          </article>

          {profileBadgeDetails.length ? (
            <article className="card stack">
              <h3>Why these badges showed up</h3>
              <p className="note">
                Badge logic is deterministic. It comes from synced music breadth, follower/following counts, and profile state, not from hidden moderation scores or manual labels.
              </p>
              <div className="stack">
                {profileBadgeDetails.map((badge) => (
                  <div className="stack badge-explainer" key={badge.label}>
                    <strong>{badge.label}</strong>
                    <span className="note">{badge.detail}</span>
                  </div>
                ))}
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </main>
  );
}
