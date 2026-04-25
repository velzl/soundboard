import Link from "next/link";
import { notFound } from "next/navigation";

import { CompareBreakdown } from "@/components/compare-breakdown";
import { buildComparisonBreakdown } from "@/lib/compatibility";
import { getStoredMusicStatsForSession } from "@/lib/music-stats";
import { buildAvatarSeed, getViewerProfile } from "@/lib/profiles";
import { getPublicProfileSnapshotByUsername } from "@/lib/public-data";
import { getCurrentSession } from "@/lib/session";
import type { Profile } from "@/types";

function toViewerComparisonProfile(viewerProfile: NonNullable<Awaited<ReturnType<typeof getViewerProfile>>>): Profile {
  return {
    id: viewerProfile.spotifyUserId,
    username: viewerProfile.username,
    displayName: viewerProfile.displayName,
    bio: viewerProfile.bio,
    avatarSeed: buildAvatarSeed(viewerProfile.username || viewerProfile.displayName),
    followers: 0,
    following: 0
  };
}

export default async function ComparePage({
  params
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const session = await getCurrentSession();
  const viewerProfile = await getViewerProfile(session);
  const viewerStoredStats = session ? await getStoredMusicStatsForSession(session) : null;
  const publicSnapshot = await getPublicProfileSnapshotByUsername(username);

  if (!publicSnapshot) {
    notFound();
  }

  if (!session) {
    return (
      <main className="page">
        <section className="hero">
          <span className="hero-kicker">Taste comparison</span>
          <h1>Comparison gets personal after you connect Spotify.</h1>
          <p className="lede">
            This page now avoids demo stand-ins for your side of the comparison. Connect Spotify first, then we can compare your real listening profile against {publicSnapshot.profile.displayName}.
          </p>
        </section>

        <section className="split">
          <article className="panel stack">
            <h3>Compared profile</h3>
            <strong>{publicSnapshot.profile.displayName}</strong>
            <span className="muted">@{publicSnapshot.profile.username}</span>
            {publicSnapshot.stats ? (
              <div className="tag-list">
                {publicSnapshot.stats.topGenres.slice(0, 3).map((genre) => (
                  <span className="tag" key={genre}>
                    {genre}
                  </span>
                ))}
              </div>
            ) : (
              <p className="note">This profile still needs a Spotify sync before comparisons can go live.</p>
            )}
          </article>

          <article className="card stack">
            <h3>Next best move</h3>
            <p className="note">
              Connect Spotify and complete onboarding so this route can compare your actual top artists and genres instead of a demo profile.
            </p>
            <div className="inline-actions">
              <Link className="button button-primary" href="/auth/spotify/start">
                Connect Spotify
              </Link>
              <Link className="button button-secondary" href={`/u/${publicSnapshot.profile.username}`}>
                View profile
              </Link>
            </div>
          </article>
        </section>
      </main>
    );
  }

  if (!viewerProfile?.onboardingComplete) {
    return (
      <main className="page">
        <section className="hero">
          <span className="hero-kicker">Taste comparison</span>
          <h1>Finish your profile before comparing taste.</h1>
          <p className="lede">
            Your Spotify account is linked, but your public music identity still needs a username and onboarding pass before comparisons can feel consistent.
          </p>
        </section>

        <section className="split">
          <article className="panel stack">
            <h3>Compared profile</h3>
            <strong>{publicSnapshot.profile.displayName}</strong>
            <span className="muted">@{publicSnapshot.profile.username}</span>
          </article>

          <article className="card stack">
            <h3>Next best move</h3>
            <p className="note">
              Claim your username first, then sync Spotify data so this page can compare real overlap instead of guessing.
            </p>
            <div className="inline-actions">
              <Link className="button button-primary" href="/onboarding">
                Finish profile setup
              </Link>
              <Link className="button button-secondary" href={`/u/${publicSnapshot.profile.username}`}>
                View profile
              </Link>
            </div>
          </article>
        </section>
      </main>
    );
  }

  const currentProfile = toViewerComparisonProfile(viewerProfile);
  const currentStats = viewerStoredStats?.stats ?? null;

  if (publicSnapshot.profile.username === currentProfile.username) {
    notFound();
  }

  if (!currentStats || !publicSnapshot.stats) {
    return (
      <main className="page">
        <section className="hero">
          <span className="hero-kicker">Taste comparison</span>
          <h1>
            {currentProfile.displayName} vs {publicSnapshot.profile.displayName}
          </h1>
          <p className="lede">
            Comparison is now wired to real persisted artist and genre snapshots, so both sides need synced music data before the overlap view can render honestly.
          </p>
        </section>

        <section className="split">
          <article className="panel stack">
            <h3>What is blocking this comparison</h3>
            <div className="tag-list">
              {!currentStats ? <span className="tag">Your profile still needs a Spotify sync</span> : null}
              {!publicSnapshot.stats ? <span className="tag">@{publicSnapshot.profile.username} has not synced stats yet</span> : null}
            </div>
          </article>

          <article className="card stack">
            <h3>Next best move</h3>
            <p className="note">
              Once both profiles have music snapshots, this page will compute real overlap directly from persisted top artists and genres.
            </p>
            <div className="inline-actions">
              <Link className="button button-secondary" href={`/u/${publicSnapshot.profile.username}`}>
                View profile
              </Link>
              <Link className="button button-primary" href="/settings">
                Sync from settings
              </Link>
            </div>
          </article>
        </section>
      </main>
    );
  }

  const comparison = buildComparisonBreakdown(currentStats, publicSnapshot.stats);

  return (
    <main className="page">
      <section className="hero">
        <span className="hero-kicker">Taste comparison</span>
        <h1>
          {currentProfile.displayName} vs {publicSnapshot.profile.displayName}
        </h1>
        <p className="lede">
          Comparison now runs on persisted artist and genre overlap, so this view leads with what genuinely lines up before showing where each profile pulls away.
        </p>
      </section>

      <section className="grid grid-2">
        <article className="panel stack">
          <span className="metric-label">Current profile</span>
          <strong>{currentProfile.displayName}</strong>
          <span className="muted">@{currentProfile.username}</span>
        </article>

        <article className="panel stack">
          <span className="metric-label">Compared profile</span>
          <strong>{publicSnapshot.profile.displayName}</strong>
          <span className="muted">@{publicSnapshot.profile.username}</span>
        </article>
      </section>

      <CompareBreakdown comparison={comparison} />

      <div className="inline-actions">
        <Link className="button button-secondary" href={`/u/${publicSnapshot.profile.username}`}>
          View profile
        </Link>
        <Link className="button button-primary" href="/following">
          Back to your circle
        </Link>
      </div>
    </main>
  );
}
