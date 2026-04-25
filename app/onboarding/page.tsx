import Link from "next/link";

import { saveOnboardingProfile } from "@/app/profile-actions";
import { UsernameEditor } from "@/components/username-editor";
import { getViewerProfile } from "@/lib/profiles";
import { getCurrentSession } from "@/lib/session";
import { toUserFacingErrorMessage } from "@/lib/ui-errors";

export default async function OnboardingPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await getCurrentSession();
  const viewerProfile = await getViewerProfile(session);
  const friendlyError = toUserFacingErrorMessage(error);

  return (
    <main className="page">
      <section className="hero">
        <span className="hero-kicker">Onboarding</span>
        <h1>Claim the profile people will recognize you by.</h1>
        <p className="lede">
          This step stays intentionally short. In the MVP, the goal is to turn Spotify login into a public identity with as little friction as possible.
        </p>
        {!session ? (
          <div className="hero-actions">
            <Link className="button button-primary" href="/auth/spotify/start">
              Connect Spotify first
            </Link>
          </div>
        ) : null}
      </section>

      {friendlyError ? (
        <section className="panel stack">
          <span className="eyebrow">Profile save status</span>
          <strong>We could not save that profile yet.</strong>
          <span className="note">{friendlyError}</span>
        </section>
      ) : null}

      <section className="split">
        <article className="panel stack">
          <h2>Finish setup</h2>

          {session ? (
            <form action={saveOnboardingProfile} className="stack">
              <div className="two-column-form">
                <div className="field">
                  <label htmlFor="display-username">Username</label>
                  <UsernameEditor
                    id="display-username"
                    name="username"
                    defaultValue={viewerProfile?.username ?? ""}
                    placeholder="pick a handle"
                  />
                </div>

                <div className="field">
                  <label htmlFor="display-bio">Bio</label>
                  <textarea
                    id="display-bio"
                    name="bio"
                    defaultValue={viewerProfile?.bio ?? ""}
                    placeholder="Give people a quick read on your lane."
                    maxLength={160}
                  />
                </div>
              </div>

              <div className="inline-actions">
                <button className="button button-primary" type="submit">
                  Finish setup
                </button>
              </div>
            </form>
          ) : (
            <p className="note">
              Spotify login needs to be connected before onboarding can persist profile data.
            </p>
          )}
        </article>

        <article className="card stack">
          <h3>Profile preview</h3>
          <div className="meta-row">
            <div className="avatar avatar-large" aria-hidden="true">
              {viewerProfile?.avatarSeed ?? "SB"}
            </div>
            <div className="stack">
              <strong>{viewerProfile ? `@${viewerProfile.username}` : "@yourname"}</strong>
              <span className="muted">
                {session ? `Spotify connected${session.email ? ` | ${session.email}` : ""}` : "Spotify connected"}
              </span>
            </div>
          </div>
          <p className="note">
            Profile customization stays light in V1 so the app can focus on music identity, ranking, and comparisons first.
          </p>
        </article>
      </section>
    </main>
  );
}
