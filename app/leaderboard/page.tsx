import { StatCard } from "@/components/stat-card";
import { LeaderboardList } from "@/components/leaderboard-list";
import { SectionHeading } from "@/components/section-heading";
import { UserCard } from "@/components/user-card";
import { getPublicLeaderboardEntries, searchPublicProfilesByUsername } from "@/lib/public-data";

export default async function LeaderboardPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const entries = await getPublicLeaderboardEntries();
  const query = q?.trim() ?? "";
  const searchResults = query ? await searchPublicProfilesByUsername(query) : [];
  const leader = entries[0];
  const topGenre = leader?.topGenre ?? "music";
  const topScore = leader ? String(leader.score) : "-";
  const rankedProfiles = String(entries.length);

  return (
    <main className="page">
      <section className="hero">
        <span className="hero-kicker">Global leaderboard</span>
        <h1>Who is moving the culture inside this app right now?</h1>
        <p className="lede">
          The first MVP version uses one score only. That keeps the ranking legible while we prove the core comparison loop.
        </p>
        <div className="pill-row">
          <span className="pill pill-accent">Real public board</span>
          <span className="pill">Top lane: {topGenre}</span>
          <span className="pill">Leader: {leader ? `@${leader.profile.username}` : "Waiting on profiles"}</span>
          <span className="pill">Search by username</span>
        </div>
        <form action="/leaderboard" className="search-form">
          <label className="search-shell" htmlFor="leaderboard-search">
            <span className="search-label">Find a profile by handle</span>
            <input
              className="search-input"
              id="leaderboard-search"
              name="q"
              type="search"
              placeholder="listener_1"
              defaultValue={query}
            />
          </label>
          <button className="button button-primary" type="submit">
            Search
          </button>
          {query ? (
            <a className="button button-secondary" href="/leaderboard">
              Clear
            </a>
          ) : null}
        </form>
      </section>

      {query ? (
        <section className="stack">
          <SectionHeading
            eyebrow="Profile search"
            title={`Results for @${query}`}
            description="Search stays username-only in V1 so finding people is fast and predictable."
          />
          {searchResults.length ? (
            <div className="grid grid-2">
              {searchResults.map((result) => (
                <UserCard
                  key={result.profile.id}
                  profile={result.profile}
                  actionHref={result.stats ? `/compare/${result.profile.username}` : undefined}
                  actionLabel={result.stats ? "Compare" : "Open profile"}
                />
              ))}
            </div>
          ) : (
            <article className="card stack">
              <h3>No profiles matched that handle</h3>
              <p className="note">
                Try a shorter username fragment. Search currently looks only at public handles, not bios or artist names.
              </p>
            </article>
          )}
        </section>
      ) : null}

      <section className="grid grid-3">
        <StatCard label="Ranked profiles" value={rankedProfiles} detail="Only profiles with a real synced snapshot appear here." />
        <StatCard label="Current high score" value={topScore} detail="The board stays simple on purpose so rank movement is easy to understand." />
        <StatCard
          label="Why it matters"
          value={leader ? `@${leader.profile.username}` : "-"}
          detail="Leaderboard visits are meant to turn into profile visits, follows, and comparisons."
        />
      </section>

      <section className="stack">
        <SectionHeading
          eyebrow="Ranked profiles"
          title="Music activity score"
          description="Score is based on artist diversity, track diversity, and genre breadth. The top of the board should feel like a competitive music scene, not a spreadsheet."
        />
        <LeaderboardList entries={entries} />
      </section>
    </main>
  );
}
