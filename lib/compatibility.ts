import { calculateCompatibility } from "@/lib/scoring";
import type { ComparisonBreakdown, MusicStats } from "@/types";

function buildComparisonSummary(
  score: number,
  sharedArtists: number,
  sharedGenres: number,
  genreSignalsSparse: boolean
) {
  if (genreSignalsSparse && sharedArtists >= 3) {
    return `Spotify gave us stronger artist signals than genre labels here, but you still overlap on ${sharedArtists} artists. The match is real even if the lane labels are thin.`;
  }

  if (genreSignalsSparse && sharedArtists > 0) {
    return `Genre labels are sparse in this comparison, so artist overlap is doing most of the work. You still share ${sharedArtists} artists.`;
  }

  if (genreSignalsSparse) {
    return "This comparison is running with limited genre metadata, so treat the score as a lighter first pass rather than a full taste map.";
  }

  if (score >= 70) {
    return `You overlap heavily across ${sharedArtists} artists and ${sharedGenres} genres. This is a strong match.`;
  }

  if (score >= 45) {
    return `There is real overlap here, with ${sharedArtists} shared artists and ${sharedGenres} shared genres anchoring the match.`;
  }

  return "You are pulling from different corners of music right now, which makes the contrast feel personal instead of random.";
}

export function buildComparisonBreakdown(
  left: MusicStats,
  right: MusicStats
): ComparisonBreakdown {
  const comparison = calculateCompatibility(left, right);
  const genreSignalsSparse = left.topGenres.length === 0 || right.topGenres.length === 0;

  return {
    ...comparison,
    sharedArtists: comparison.sharedArtists.slice(0, 6),
    sharedGenres: comparison.sharedGenres.slice(0, 6),
    differentGenres: comparison.differentGenres.slice(0, 6),
    genreSignalsSparse,
    summary: buildComparisonSummary(
      comparison.score,
      comparison.sharedArtists.length,
      comparison.sharedGenres.length,
      genreSignalsSparse
    )
  };
}
