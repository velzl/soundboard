import { getResolvedTopGenres } from "@/lib/music-stats";
import type { MusicSyncHistoryEntry } from "@/lib/sync-history";
import type { MusicStats, WeeklyRecap } from "@/types";

type WeeklyRecapInput = {
  stats: MusicStats;
  score: number | null;
  rank: number | null;
  bestMatchUsername?: string;
  previousSync?: MusicSyncHistoryEntry | null;
};

export function buildWeeklyRecap({
  stats,
  score,
  rank,
  bestMatchUsername,
  previousSync
}: WeeklyRecapInput): WeeklyRecap {
  const resolvedGenres = getResolvedTopGenres(stats);
  const topArtist = stats.topArtists[0]?.name ?? "Your current top artist";
  const topTrack = stats.topTracks[0]?.name ?? null;
  const scoreDelta =
    previousSync && score !== null ? score - previousSync.score : null;
  const topArtistChanged =
    previousSync?.topArtistName &&
    previousSync.topArtistName !== topArtist
      ? previousSync.topArtistName
      : null;
  const laneSummary = resolvedGenres.length
    ? `This snapshot is leaning into ${resolvedGenres.slice(0, 2).join(" and ")}.`
    : "This snapshot synced cleanly, but Spotify kept the genre metadata light.";
  const scoreSummary =
    score !== null && rank !== null
      ? `You are currently sitting at #${rank} with an activity score of ${score}.`
      : score !== null
        ? `Your current activity score is ${score}.`
        : "Your current score will appear once ranking data catches up.";

  return {
    eyebrow: "This week's recap",
    title: `${topArtist} is defining your week.`,
    summary: `${scoreSummary} ${
      scoreDelta === null
        ? "Run another sync later and this recap will start tracking actual movement over time."
        : scoreDelta > 0
          ? `That is up ${scoreDelta} from your previous synced snapshot.`
          : scoreDelta < 0
            ? `That is down ${Math.abs(scoreDelta)} from your previous synced snapshot.`
            : "Your activity score held steady since the previous synced snapshot."
    } ${laneSummary}`,
    highlights: [
      topArtistChanged
        ? `Top artist changed from ${topArtistChanged} to ${topArtist}`
        : `Top artist: ${topArtist}`,
      topTrack ? `Top track: ${topTrack}` : "Top track data is synced and ready for the next pass.",
      bestMatchUsername
        ? `Closest active match right now: @${bestMatchUsername}`
        : "No strong synced match yet, so discovery will widen as more listeners join."
    ]
  };
}
