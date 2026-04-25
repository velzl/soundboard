import Link from "next/link";

import { syncSpotifyMusicFromSettings } from "@/app/music-actions";
import { saveSettingsProfile } from "@/app/profile-actions";
import { UsernameEditor } from "@/components/username-editor";
import { getStoredMusicStatsForSession } from "@/lib/music-stats";
import { getViewerProfile } from "@/lib/profiles";
import { getCurrentSession } from "@/lib/session";
import { spotifyConfigIsReady } from "@/lib/spotify";
import { supabaseServerConfigIsReady } from "@/lib/supabase/admin";
import { toUserFacingErrorMessage } from "@/lib/ui-errors";

export default async function SettingsPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string; error?: string; sync?: string; sync_error?: string }>;
}) {
  const { saved, error, sync, sync_error: syncError } = await searchParams;
  const session = await getCurrentSession();
  const viewerProfile = await getViewerProfile(session);
  const storedMusicStats = session ? await getStoredMusicStatsForSession(session) : null;
  const friendlyError = toUserFacingErrorMessage(error);
  const friendlySyncError = toUserFacingErrorMessage(syncError);
  const needsProfileSetup = Boolean(session && !viewerProfile?.onboardingComplete);
  const integrationChecks = [
    {
      label: "Spotify env",
      ready: spotifyConfigIsReady(),
      detail: spotifyConfigIsReady()
        ? "Spotify client credentials are present for this local app."
        : "Add Spotify credentials to .env.local before the real OAuth flow can be tested."
    },
    {
      label: "Supabase env",
      ready: supabaseServerConfigIsReady(),
      detail: supabaseServerConfigIsReady()
        ? "Supabase server credentials are present for persisted auth and profile data."
        : "Add NEXT_PUBLIC_SUPABASE_URL plus a server key to .env.local before live persistence can be tested."
    },
    {
      label: "Profile setup",
      ready: Boolean(viewerProfile?.onboardingComplete),
      detail: viewerProfile?.onboardingComplete
        ? "This account already has a public username and profile record."
        : "Finish onboarding so follows, rankings, and comparisons attach to your real public identity."
    },
    {
      label: "Spotify snapshot",
      ready: Boolean(storedMusicStats?.stats),
      detail: storedMusicStats?.stats
        ? `Latest snapshot is stored from ${new Date(storedMusicStats.stats.updatedAt).toLocaleString()}.`
        : "Run your first Spotify sync so rankings, comparison, and discovery can use real listening data."
    }
  ];

  return (
    <main className="page">
      <section className="hero">
        <span className="hero-kicker">Settings</span>
        <h1>Keep account control simple and clear.</h1>
        <p className="lede">
          The MVP version keeps this page focused on profile editing, stat refresh, and future Spotify disconnect behavior.
        </p>
      </section>

      {saved ? (
        <section className="panel stack">
          <span className="eyebrow">Profile save status</span>
          <strong>Your profile changes were saved.</strong>
        </section>
      ) : null}

      {friendlyError ? (
        <section className="panel stack">
          <span className="eyebrow">Profile save status</span>
          <strong>We could not save those changes yet.</strong>
          <span className="note">{friendlyError}</span>
        </section>
      ) : null}

      {sync ? (
        <section className="panel stack">
          <span className="eyebrow">Spotify sync status</span>
          <strong>Your Spotify listening snapshot was refreshed.</strong>
        </section>
      ) : null}

      {friendlySyncError ? (
        <section className="panel stack">
          <span className="eyebrow">Spotify sync status</span>
          <strong>We could not refresh Spotify data yet.</strong>
          <span className="note">
            {friendlySyncError} Try again in a moment, and make sure your Spotify connection is still active.
          </span>
        </section>
      ) : null}

      <section className="panel stack">
        <span className="eyebrow">Live integration readiness</span>
        <h2>What is already ready for real end-to-end testing</h2>
        <div className="grid grid-2">
          {integrationChecks.map((check) => (
            <article key={check.label} className="card stack">
              <div className="pill-row">
                <span className={`pill ${check.ready ? "pill-accent" : ""}`}>
                  {check.ready ? "Ready" : "Needs setup"}
                </span>
                <span className="pill">{check.label}</span>
              </div>
              <p className="note">{check.detail}</p>
            </article>
          ))}
        </div>
        {!spotifyConfigIsReady() || !supabaseServerConfigIsReady() ? (
          <p className="note">
            Local blocker right now: this workspace does not have a `.env.local`, so real Spotify and Supabase flows cannot be exercised yet even though the code paths are in place.
          </p>
        ) : null}
      </section>

      <section className="split">
        <article className="panel stack">
          <h2>Edit profile</h2>

          {session ? (
            <form action={saveSettingsProfile} className="stack">
              <div className="two-column-form">
                <div className="field">
                  <label htmlFor="username">Username</label>
                  <UsernameEditor
                    id="username"
                    name="username"
                    defaultValue={viewerProfile?.username ?? ""}
                  />
                </div>

                <div className="field">
                  <label htmlFor="bio">Bio</label>
                  <textarea
                    id="bio"
                    name="bio"
                    defaultValue={viewerProfile?.bio ?? ""}
                    maxLength={160}
                  />
                </div>
              </div>

              <div className="inline-actions">
                <button className="button button-primary" type="submit">
                  Save changes
                </button>
                <Link className="button button-secondary" href="/dashboard">
                  Back to dashboard
                </Link>
              </div>
            </form>
          ) : (
            <p className="note">
              Connect Spotify before settings can save profile changes or run music syncs.
            </p>
          )}
        </article>

        <article className="card stack">
          <h3>Account safety notes</h3>
          <p className="note">
            Public profile data stays separate from private Spotify tokens. This page is the control point for identity updates, Spotify snapshot refreshes, and disconnecting the account safely.
          </p>
          <p className="note">
            {storedMusicStats
              ? `Latest synced snapshot: ${new Date(storedMusicStats.stats.updatedAt).toLocaleString()}.`
              : needsProfileSetup
                ? "Finish profile setup first, then run your first Spotify sync to unlock rankings and comparisons."
                : "No Spotify stats have been synced yet for this account. Run your first sync to unlock rankings, comparisons, and discovery."}
          </p>
          <form action={syncSpotifyMusicFromSettings}>
            <button className="button button-primary" type="submit">
              {storedMusicStats ? "Refresh Spotify snapshot" : "Run first Spotify sync"}
            </button>
          </form>
          <form action="/auth/logout" method="post">
            <button className="button button-secondary" type="submit">
              Disconnect Spotify
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}
