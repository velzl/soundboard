import Link from "next/link";

import { ActivityFeed } from "@/components/activity-feed";
import { SectionHeading } from "@/components/section-heading";
import {
  type ActivityKindFilter,
  getCircleActivityFeedForSession,
  getPublicActivityFeed
} from "@/lib/activity-feed";
import { getViewerProfile } from "@/lib/profiles";
import { getCurrentSession } from "@/lib/session";

export default async function ActivityPage({
  searchParams
}: {
  searchParams: Promise<{ view?: string; kind?: string }>;
}) {
  const { view, kind } = await searchParams;
  const session = await getCurrentSession();
  const allowedKinds: ActivityKindFilter[] = ["all", "follow", "sync", "joined"];
  const activeKind = allowedKinds.includes(kind as ActivityKindFilter)
    ? (kind as ActivityKindFilter)
    : "all";
  const [viewerProfile, circleActivity, publicActivity] = await Promise.all([
    getViewerProfile(session),
    getCircleActivityFeedForSession(session, 8, activeKind),
    getPublicActivityFeed(10, activeKind)
  ]);
  const canUseCircleView = Boolean(session && viewerProfile?.onboardingComplete);
  const activeView = view === "public" || !canUseCircleView ? "public" : "circle";
  const activeItems = activeView === "circle" ? circleActivity : publicActivity;
  const activeTitle =
    activeView === "circle"
      ? viewerProfile?.onboardingComplete
        ? `Recent activity around @${viewerProfile.username}`
        : "Finish onboarding to personalize your circle feed"
      : "What the public graph is doing right now";
  const activeDescription =
    activeView === "circle"
      ? "This feed is limited to you and the people you follow, so it feels social without becoming noisy."
      : "A safer activity feed built from follows, syncs, and onboarding completions instead of open-ended public posting.";
  const emptyTitle =
    activeView === "circle"
      ? viewerProfile?.onboardingComplete
        ? "Your circle is still quiet"
        : "Your personalized feed is waiting"
      : "The public graph is still warming up";
  const emptyNote =
    activeView === "circle"
      ? viewerProfile?.onboardingComplete
        ? "Follow a few people or sync your profile again to start seeing more motion in your private listening circle."
        : "Claim your public profile first, then this page can start reflecting your follow graph and synced activity."
      : "As more synced profiles join, this feed will show the safest version of social motion first.";

  return (
    <main className="page">
      <section className="hero">
        <span className="hero-kicker">Activity</span>
        <h1>See the listening graph move without turning the app into a chaos feed.</h1>
        <p className="lede">
          Soundboard stays social by surfacing controlled system events: new follows, fresh Spotify syncs, and newly claimed public profiles. No open comment threads, no spam wall, and no hidden private data leakage.
        </p>
        <div className="pill-row">
          <span className="pill pill-accent">System-generated events only</span>
          <span className="pill">No public posting yet</span>
          <span className="pill">Built for safer discovery</span>
        </div>
        <div className="inline-actions activity-filter-row">
          <Link
            className={`button ${activeView === "public" ? "button-primary" : "button-secondary"}`}
            href={`/activity?view=public&kind=${activeKind}`}
          >
            Public feed
          </Link>
          {canUseCircleView ? (
            <Link
              className={`button ${activeView === "circle" ? "button-primary" : "button-secondary"}`}
              href={`/activity?view=circle&kind=${activeKind}`}
            >
              My circle
            </Link>
          ) : (
            <span className="pill">Circle view unlocks after profile setup</span>
          )}
        </div>
        <div className="inline-actions activity-filter-row">
          <Link
            className={`button ${activeKind === "all" ? "button-primary" : "button-secondary"}`}
            href={`/activity?view=${activeView}&kind=all`}
          >
            All events
          </Link>
          <Link
            className={`button ${activeKind === "follow" ? "button-primary" : "button-secondary"}`}
            href={`/activity?view=${activeView}&kind=follow`}
          >
            Follows
          </Link>
          <Link
            className={`button ${activeKind === "sync" ? "button-primary" : "button-secondary"}`}
            href={`/activity?view=${activeView}&kind=sync`}
          >
            Syncs
          </Link>
          <Link
            className={`button ${activeKind === "joined" ? "button-primary" : "button-secondary"}`}
            href={`/activity?view=${activeView}&kind=joined`}
          >
            New profiles
          </Link>
        </div>
        {!session ? (
          <div className="hero-actions">
            <Link className="button button-primary" href="/auth/spotify/start">
              Connect Spotify
            </Link>
            <Link className="button button-secondary" href="/discover">
              Discover profiles
            </Link>
          </div>
        ) : null}
      </section>

      <section className="stack">
        <SectionHeading
          eyebrow={activeView === "circle" ? "Your circle" : "Public feed"}
          title={activeTitle}
          description={activeDescription}
        />
        <ActivityFeed
          items={activeView === "circle" && !viewerProfile?.onboardingComplete ? [] : activeItems}
          emptyTitle={emptyTitle}
          emptyNote={emptyNote}
        />
      </section>
    </main>
  );
}
