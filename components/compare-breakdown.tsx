import type { ComparisonBreakdown } from "@/types";

type CompareBreakdownProps = {
  comparison: ComparisonBreakdown;
};

export function CompareBreakdown({ comparison }: CompareBreakdownProps) {
  return (
    <div className="compare-grid">
      <article className="panel stack">
        <span className="metric-label">Compatibility</span>
        <span className="stat-value">{comparison.score}%</span>
        <p className="muted">{comparison.summary}</p>
        {comparison.genreSignalsSparse ? (
          <p className="note">
            Spotify exposed stronger artist signals than genre labels for at least one side of this comparison, so artist overlap is carrying more of the read than usual.
          </p>
        ) : null}
      </article>

      <article className="card stack">
        <h3>Shared artists</h3>
        <div className="tag-list">
          {comparison.sharedArtists.length ? (
            comparison.sharedArtists.map((artist) => (
              <span key={artist} className="tag">
                {artist}
              </span>
            ))
          ) : (
            <span className="muted">No artist overlap yet.</span>
          )}
        </div>
      </article>

      <article className="card stack">
        <h3>{comparison.genreSignalsSparse ? "Genre labels available" : "Shared genres"}</h3>
        <div className="tag-list">
          {comparison.sharedGenres.length ? (
            comparison.sharedGenres.map((genre) => (
              <span key={genre} className="tag">
                {genre}
              </span>
            ))
          ) : comparison.genreSignalsSparse ? (
            <span className="muted">Genre labels are too sparse in this snapshot to anchor the match cleanly.</span>
          ) : (
            <span className="muted">No genre overlap yet.</span>
          )}
        </div>
      </article>

      <article className="card stack">
        <h3>{comparison.genreSignalsSparse ? "What still feels different" : "Different lanes"}</h3>
        <div className="tag-list">
          {comparison.differentGenres.length ? (
            comparison.differentGenres.map((genre) => (
              <span key={genre} className="tag">
                {genre}
              </span>
            ))
          ) : (
            <span className="muted">
              {comparison.genreSignalsSparse
                ? "There is not enough opposing genre metadata here to map the split cleanly yet."
                : "Right now your genre mix is unusually aligned."}
            </span>
          )}
        </div>
      </article>
    </div>
  );
}
