import Link from "next/link";

import type { LeaderboardEntry } from "@/types";

type LeaderboardListProps = {
  entries: LeaderboardEntry[];
};

export function LeaderboardList({ entries }: LeaderboardListProps) {
  return (
    <div className="leaderboard-list">
      {entries.map((entry) => (
        <article key={entry.profile.id} className="leaderboard-row">
          <span className="pill pill-accent">#{entry.rank}</span>

          <div className="meta-row">
            <div className="avatar" aria-hidden="true">
              {entry.profile.avatarSeed}
            </div>
            <div className="stack leaderboard-copy">
              <strong>{entry.profile.displayName}</strong>
              <div className="pill-row leaderboard-subline">
                <span className="muted">@{entry.profile.username}</span>
                <span className="pill">{entry.topGenre}</span>
              </div>
            </div>
          </div>

          <div className="metric">
            <span className="metric-label">Score</span>
            <span className="metric-value">{entry.score}</span>
          </div>

          <Link className="button button-secondary" href={`/u/${entry.profile.username}`}>
            Profile
          </Link>

          <Link className="button button-primary" href={`/compare/${entry.profile.username}`}>
            Compare
          </Link>
        </article>
      ))}
    </div>
  );
}


