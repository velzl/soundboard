import Link from "next/link";

import { LeaderboardList } from "@/components/leaderboard-list";
import { SectionHeading } from "@/components/section-heading";
import { UserCard } from "@/components/user-card";
import { getPublicLeaderboardEntries } from "@/lib/public-data";
import { toUserFacingErrorMessage } from "@/lib/ui-errors";

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ spotify_error?: string }>;
}) {
  const { spotify_error: spotifyError } = await searchParams;
  const friendlySpotifyError = toUserFacingErrorMessage(spotifyError);
  const discoveryPool = await getPublicLeaderboardEntries(5);
  const leaderboard = discoveryPool.slice(0, 3);
  const featuredListeners =
    discoveryPool.length > 3 ? discoveryPool.slice(3, 5) : discoveryPool.slice(0, 2);

  return (
    <main className="page">
      <section className="hero">
        <span className="hero-kicker">Music identity for competitive listeners</span>
        <h1>Turn your Spotify taste into a profile people can actually feel.</h1>
        <p className="lede">
          Soundboard turns listening habits into public identity, compatibility, rank movement,
          and discovery. Connect Spotify, build your profile, and find out who really shares
          your lane.
        </p>
        <div className="pill-row">
          <span className="pill">Spotify OAuth</span>
          <span className="pill">Public profiles</span>
          <span className="pill">Server-side tokens</span>
          <span className="pill pill-accent">Real leaderboard preview</span>
        </div>

        <div className="hero-actions">
          <Link className="button button-primary" href="/auth/spotify/start">
            Connect Spotify
          </Link>
          <Link className="button button-secondary" href="/leaderboard">
            Preview leaderboard
          </Link>
        </div>

        {friendlySpotifyError ? (
          <div className="panel stack" style={{ marginTop: "1.5rem" }}>
            <span className="eyebrow">Spotify auth status</span>
            <strong>Connection attempt needs attention</strong>
            <span className="note">{friendlySpotifyError}</span>
          </div>
        ) : null}
      </section>

      <section className="grid grid-3">
        <article className="card stack">
          <span className="eyebrow">Step 1</span>
          <h3>Claim your profile</h3>
          <p className="muted">Connect Spotify, choose a username, and anchor your identity around the artists shaping your week.</p>
        </article>
        <article className="card stack">
          <span className="eyebrow">Step 2</span>
          <h3>See your placement</h3>
          <p className="muted">Turn artist diversity, track diversity, and genre breadth into one score that is easy to understand.</p>
        </article>
        <article className="card stack">
          <span className="eyebrow">Step 3</span>
          <h3>Compare with people</h3>
          <p className="muted">See shared artists, overlapping genres, and the exact people who are closest to your music orbit.</p>
        </article>
      </section>

      <section className="grid grid-3">
        <article className="card stack">
          <span className="eyebrow">Privacy</span>
          <h3>Spotify tokens stay server-side</h3>
          <p className="muted">
            Auth tokens are kept out of the browser, profile data stays separate from private credentials, and local secrets stay outside the repo.
          </p>
        </article>
        <article className="card stack">
          <span className="eyebrow">Safety</span>
          <h3>Handles are normalized and protected</h3>
          <p className="muted">
            Usernames are sanitized, deduped, and blocked from using reserved app routes so public profiles stay cleaner and harder to abuse.
          </p>
        </article>
        <article className="card stack">
          <span className="eyebrow">Momentum</span>
          <h3>Built for discovery, not just stats</h3>
          <p className="muted">
            Leaderboards, notifications, compare views, and public profiles all work together to make the app feel social even before you log in.
          </p>
        </article>
      </section>

      <section className="split">
        <div className="stack">
          <SectionHeading
            eyebrow="Live preview"
            title="A leaderboard that pushes people into profile visits and comparisons."
            description="Anonymous visitors now get a clean public preview here, while the real personal dashboard unlocks only after sign-in."
          />
          <LeaderboardList entries={leaderboard} />
        </div>

        <div className="stack">
          <SectionHeading
            eyebrow="Featured listeners"
            title="Profiles people are exploring right now"
            description="This preview now comes from the real public profile pool whenever synced users exist."
          />
          {featuredListeners.length ? (
            featuredListeners.map((entry) => (
              <UserCard key={entry.profile.id} profile={entry.profile} />
            ))
          ) : (
            <article className="card stack">
              <h3>Real discovery fills in as profiles sync</h3>
              <p className="note">
                Once more listeners connect Spotify and sync their stats, this area will surface real public profiles instead of relying on demo-only previews.
              </p>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}
