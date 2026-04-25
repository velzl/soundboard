import Link from "next/link";

import { LeaderboardList } from "@/components/leaderboard-list";
import { SectionHeading } from "@/components/section-heading";
import { UserCard } from "@/components/user-card";
import { buildComparisonBreakdown } from "@/lib/compatibility";
import { getStoredMusicStatsForSession } from "@/lib/music-stats";
import { getViewerProfile } from "@/lib/profiles";
import {
  getPublicLeaderboardEntries,
  searchPublicProfilesByUsername
} from "@/lib/public-data";
import { getCurrentSession } from "@/lib/session";

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
  const personalizedResults = searchResults.map((result) => {
    const comparison =
      viewerStats &&
      result.stats &&
      (!viewerProfile || result.profile.username !== viewerProfile.username)
        ? buildComparisonBreakdown(viewerStats, result.stats)
        : undefined;

    return {
      ...result,
      comparison
    };
  });

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
          description="Even without a search query, discovery should still feel alive."
        />
        {featuredEntries.length ? (
          <LeaderboardList entries={featuredEntries} />
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
