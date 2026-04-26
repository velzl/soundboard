import { getResolvedTopGenres } from "@/lib/music-stats";
import type { MusicStats } from "@/types";
import type { MusicSyncHistoryEntry } from "@/lib/sync-history";

type CompareHistoryCard = {
  label: string;
  currentTopArtist: string;
  previousTopArtist: string | null;
  currentTopTrack: string;
  previousTopTrack: string | null;
  currentScore: number;
  previousScore: number | null;
  scoreDeltaLabel: string;
  currentGenres: string[];
  previousGenres: string[];
};

export type CompareHistoryView = {
  availability: "full" | "partial";
  title: string;
  summary: string;
  continuityLabel: string;
  currentSharedGenres: string[];
  previousSharedGenres: string[];
  cards: [CompareHistoryCard, CompareHistoryCard];
  note: string;
};

function uniqueIntersection(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return [...new Set(left.filter((value) => rightSet.has(value)))];
}

function formatDelta(current: number, previous: number | null) {
  if (previous === null) {
    return "No earlier saved score yet";
  }

  const delta = current - previous;

  if (delta > 0) {
    return `Up ${delta} since the previous saved snapshot`;
  }

  if (delta < 0) {
    return `Down ${Math.abs(delta)} since the previous saved snapshot`;
  }

  return "Holding steady since the previous saved snapshot";
}

function buildHistoryCard(input: {
  label: string;
  currentStats: MusicStats;
  currentScore: number;
  previousSync: MusicSyncHistoryEntry | null;
}) {
  return {
    label: input.label,
    currentTopArtist: input.currentStats.topArtists[0]?.name ?? "No current artist",
    previousTopArtist: input.previousSync?.topArtistName ?? null,
    currentTopTrack: input.currentStats.topTracks[0]?.name ?? "No current track",
    previousTopTrack: input.previousSync?.topTrackName ?? null,
    currentScore: input.currentScore,
    previousScore: input.previousSync?.score ?? null,
    scoreDeltaLabel: formatDelta(input.currentScore, input.previousSync?.score ?? null),
    currentGenres: getResolvedTopGenres(input.currentStats),
    previousGenres: input.previousSync?.topGenres ?? []
  } satisfies CompareHistoryCard;
}

function buildContinuityLabel(
  currentSharedGenres: string[],
  previousSharedGenres: string[],
  hasFullHistory: boolean
) {
  if (!hasFullHistory) {
    return "Full overlap continuity unlocks after both profiles have at least two saved syncs.";
  }

  const delta = currentSharedGenres.length - previousSharedGenres.length;

  if (delta > 0) {
    return `Your shared lane strengthened by ${delta} genre ${delta === 1 ? "signal" : "signals"} across the last saved snapshot pair.`;
  }

  if (delta < 0) {
    return `Your shared lane loosened by ${Math.abs(delta)} genre ${Math.abs(delta) === 1 ? "signal" : "signals"} across the last saved snapshot pair.`;
  }

  return "Your shared lane is holding steady across the last saved snapshot pair.";
}

export function buildCompareHistoryView(input: {
  viewerDisplayName: string;
  targetDisplayName: string;
  viewerCurrentStats: MusicStats;
  viewerCurrentScore: number;
  viewerPreviousSync: MusicSyncHistoryEntry | null;
  targetCurrentStats: MusicStats;
  targetCurrentScore: number;
  targetPreviousSync: MusicSyncHistoryEntry | null;
}) {
  const currentSharedGenres = uniqueIntersection(
    getResolvedTopGenres(input.viewerCurrentStats),
    getResolvedTopGenres(input.targetCurrentStats)
  );
  const previousSharedGenres =
    input.viewerPreviousSync && input.targetPreviousSync
      ? uniqueIntersection(
          input.viewerPreviousSync.topGenres,
          input.targetPreviousSync.topGenres
        )
      : [];
  const hasFullHistory = Boolean(input.viewerPreviousSync && input.targetPreviousSync);
  const availability = hasFullHistory ? "full" : "partial";

  return {
    availability,
    title: hasFullHistory
      ? "Compare how the match is moving over time"
      : "Start collecting more history for a deeper compare read",
    summary: hasFullHistory
      ? `${input.viewerDisplayName} and ${input.targetDisplayName} can now be read as a moving comparison, not just a single snapshot. This view uses saved sync summaries to show how each side's top artist, top track, score, and shared lane signals have shifted.`
      : `This history view is already tracking the current top artist, top track, and score for both sides. Once each profile has one more saved sync, the overlap trend becomes much more specific.`,
    continuityLabel: buildContinuityLabel(
      currentSharedGenres,
      previousSharedGenres,
      hasFullHistory
    ),
    currentSharedGenres,
    previousSharedGenres,
    cards: [
      buildHistoryCard({
        label: input.viewerDisplayName,
        currentStats: input.viewerCurrentStats,
        currentScore: input.viewerCurrentScore,
        previousSync: input.viewerPreviousSync
      }),
      buildHistoryCard({
        label: input.targetDisplayName,
        currentStats: input.targetCurrentStats,
        currentScore: input.targetCurrentScore,
        previousSync: input.targetPreviousSync
      })
    ],
    note: "This view is based on saved sync snapshots, not a minute-by-minute private listening log. It is intentionally lightweight and privacy-conscious."
  } satisfies CompareHistoryView;
}
