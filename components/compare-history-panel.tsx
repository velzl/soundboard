import type { CompareHistoryView } from "@/lib/compare-history";

type CompareHistoryPanelProps = {
  historyView: CompareHistoryView;
};

export function CompareHistoryPanel({ historyView }: CompareHistoryPanelProps) {
  return (
    <section className="stack">
      <article className="panel stack">
        <span className="eyebrow">History view</span>
        <h2>{historyView.title}</h2>
        <p className="note">{historyView.summary}</p>
        <span className="pill pill-accent">{historyView.continuityLabel}</span>
        <div className="pill-row">
          <span className="pill">
            Current shared genres:{" "}
            {historyView.currentSharedGenres.length
              ? historyView.currentSharedGenres.join(", ")
              : "none yet"}
          </span>
          <span className="pill">
            Previous shared genres:{" "}
            {historyView.previousSharedGenres.length
              ? historyView.previousSharedGenres.join(", ")
              : "not enough stored history yet"}
          </span>
        </div>
        <p className="note">{historyView.note}</p>
      </article>

      <div className="grid grid-2 history-grid">
        {historyView.cards.map((card) => (
          <article className="card stack history-card" key={card.label}>
            <span className="eyebrow">{card.label}</span>
            <strong>{card.scoreDeltaLabel}</strong>
            <div className="pill-row">
              <span className="pill pill-accent">Current score {card.currentScore}</span>
              <span className="pill">
                {card.previousScore !== null
                  ? `Previous score ${card.previousScore}`
                  : "Previous score not saved yet"}
              </span>
            </div>
            <div className="history-row">
              <div className="stack">
                <span className="metric-label">Top artist now</span>
                <strong>{card.currentTopArtist}</strong>
              </div>
              <div className="stack">
                <span className="metric-label">Top artist before</span>
                <strong>{card.previousTopArtist ?? "No earlier saved artist"}</strong>
              </div>
            </div>
            <div className="history-row">
              <div className="stack">
                <span className="metric-label">Top track now</span>
                <strong>{card.currentTopTrack}</strong>
              </div>
              <div className="stack">
                <span className="metric-label">Top track before</span>
                <strong>{card.previousTopTrack ?? "No earlier saved track"}</strong>
              </div>
            </div>
            <div className="stack">
              <span className="metric-label">Current lane tags</span>
              <div className="tag-list">
                {card.currentGenres.length ? (
                  card.currentGenres.map((genre) => (
                    <span className="tag" key={`current-${card.label}-${genre}`}>
                      {genre}
                    </span>
                  ))
                ) : (
                  <span className="muted">No current lane tags</span>
                )}
              </div>
            </div>
            <div className="stack">
              <span className="metric-label">Previous lane tags</span>
              <div className="tag-list">
                {card.previousGenres.length ? (
                  card.previousGenres.map((genre) => (
                    <span className="tag" key={`previous-${card.label}-${genre}`}>
                      {genre}
                    </span>
                  ))
                ) : (
                  <span className="muted">No earlier saved lane tags</span>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
