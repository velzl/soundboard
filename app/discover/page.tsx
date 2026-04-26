import Link from "next/link";

import { LeaderboardList } from "@/components/leaderboard-list";
import { SectionHeading } from "@/components/section-heading";
import { UserCard } from "@/components/user-card";
import { buildComparisonBreakdown } from "@/lib/compatibility";
import { getStoredMusicStatsForSession } from "@/lib/music-stats";
import { buildProfileBadges } from "@/lib/profile-badges";
import { getViewerProfile } from "@/lib/profiles";
import {
  getPublicLeaderboardEntries,
  searchPublicProfilesByUsername
} from "@/lib/public-data";
import { getCurrentSession } from "@/lib/session";
import { getFollowRelationshipMapForViewer } from "@/lib/social";

function getSocialProofLabel(input: {
  isOwnProfile: boolean;
  isFollowing?: boolean;
  followsViewer?: boolean;
  isMutual?: boolean;
}) {
  if (input.isOwnProfile) {
    return "You";
  }

  if (input.isMutual) {
    return "Mutual follow";
  }

  if (input.followsViewer) {
    return "Follows you";
  }

  if (input.isFollowing) {
    return "Already following";
  }

  return undefined;
}

export default async function DiscoverPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const session = await getCurrentSession();
  const [viewerProfile, storedMusicStats, featuredEntries, searchResults] = await Promise.all([
    session ? getViewerProfile(session) : Promise.resolve(null),
    session ? getStoredMusicStatsForSession(session) : Promise.resolve(null),
    getPublicLeaderboardEntries(6),
    query ? searchPublicProfilesByUsername(query, 12) : Promise.resolve([])
  ]);

  const viewerStats =
    viewerProfile?.onboardingComplete ? storedMusicStats?.stats ?? null : null;
  const relationshipMap =
    session && viewerProfile?.onboardingComplete
      ? await getFollowRelationshipMapForViewer(session.spotifyUserId, [
          ...searchResults.map((result) => result.profile.id),
          ...featuredEntries.map((entry) => entry.profile.id)
        ])
      : new Map();
  const personalizedResults = searchResults.map((result) => {
    const comparison =
      viewerStats &&
      result.stats &&
      (!viewerProfile || result.profile.username !== viewerProfile.username)
        ? buildComparisonBreakdown(viewerStats, result.stats)
        : undefined;
    const relationship = relationshipMap.get(result.profile.id);
    const socialLabel = getSocialProofLabel({
      isOwnProfile: result.profile.username === viewerProfile?.username,
      isFollowing: relationship?.isFollowing,
      followsViewer: relationship?.followsViewer,
      isMutual: relationship?.isMutual
    });

    return {
      ...result,
      comparison,
      socialLabel,
      badges: buildProfileBadges(result.profile, result.stats, result.score)
    };
  });
  const featuredSocialLabels = Object.fromEntries(
    featuredEntries
      .map((entry) => {
        const relationship = relationshipMap.get(entry.profile.id);
        const socialLabel = getSocialProofLabel({
          isOwnProfile: entry.profile.username === viewerProfile?.username,
          isFollowing: relationship?.isFollowing,
          followsViewer: relationship?.followsViewer,
          isMutual: relationship?.isMutual
        });

        return socialLabel ? [entry.profile.id, socialLabel] : null;
      })
      .filter((entry): entry is [string, string] => Boolean(entry))
  );

  return (
    <main className="page">
      <section className="hero">
        <span className="hero-kicker">Discover listeners</span>
        <h1>Find people by handle, then decide if their lane feels close to yours.</h1>
        <p className="lede">
          Discovery is still intentionally simple in V1. Search by username, browse the featured public board, and jump straight into profile visits and comparison.
        </p>
        <div className="pill-row">
          <span className="pill pill-accent">Public handle search</span>
          <span className="pill">Compare from results</span>
          <span className="pill">Featured listeners below</span>
          {session ? <span className="pill">Relationship proof enabled</span> : null}
        </div>
        <form action="/discover" className="search-form">
          <label className="search-shell" htmlFor="discover-search">
            <span className="search-label">Search a public handle</span>
            <input
              className="search-input"
              id="discover-search"
              name="q"
              type="search"
              placeholder="listener_1"
              defaultValue={query}
              maxLength={32}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <button className="button button-primary" type="submit">
            Search
          </button>
          {query ? (
            <Link className="button button-secondary" href="/discover">
              Clear
            </Link>
          ) : null}
        </form>
      </section>

      {query ? (
        <section className="stack">
          <SectionHeading
            eyebrow="Search results"
            title={`Results for @${query}`}
            description="Search stays username-only so the results remain fast, clear, and social-first."
          />
          {personalizedResults.length ? (
            <div className="grid grid-2">
              {personalizedResults.map((result) => (
                <UserCard
                  key={result.profile.id}
                  profile={result.profile}
                  comparison={result.comparison}
                  socialLabel={result.socialLabel}
                  badges={result.badges}
                  actionHref={
                    result.profile.username === viewerProfile?.username
                      ? `/u/${result.profile.username}`
                      : result.stats
                        ? `/compare/${result.profile.username}`
                        : `/u/${result.profile.username}`
                  }
                  actionLabel={
                    result.profile.username === viewerProfile?.username
                      ? "Open profile"
                      : result.stats
                        ? "Compare"
                        : "View profile"
                  }
                />
              ))}
            </div>
          ) : (
            <article className="card stack">
              <h3>No public profile matched that handle</h3>
              <p className="note">
                Try a shorter username fragment. Search only checks public handles right now, not artist names or bios.
              </p>
            </article>
          )}
        </section>
      ) : null}

      <section className="stack">
        <SectionHeading
          eyebrow="Featured listeners"
          title="Profiles already shaping the public board"
          description="Even without a search query, discovery should still feel alive and socially legible."
        />
        {featuredEntries.length ? (
          <LeaderboardList entries={featuredEntries} socialLabels={featuredSocialLabels} />
        ) : (
          <article className="card stack">
            <h3>No featured listeners yet</h3>
            <p className="note">
              Once more public profiles sync, this page will start to feel more like a real discovery surface.
            </p>
          </article>
        )}
      </section>
    </main>
  );
}
