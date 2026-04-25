import type { MusicStats } from "@/types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const toScore = (count: number, maxCount: number, maxScore: number) =>
  clamp(Math.round((count / maxCount) * maxScore), 0, maxScore);

export function calculateMusicActivityScore(stats: MusicStats) {
  const artistGenreSpread = new Set(
    stats.topArtists.flatMap((artist) => artist.genres.map((genre) => genre.toLowerCase()))
  ).size;
  const trackArtistSpread = new Set(
    stats.topTracks.map((track) => track.artist.toLowerCase())
  ).size;
  const artistDiversity = toScore(artistGenreSpread, 15, 40);
  const trackDiversity = toScore(trackArtistSpread, 10, 40);
  const genreBreadth = toScore(stats.topGenres.length, 5, 20);

  return artistDiversity + trackDiversity + genreBreadth;
}

function overlapScore(left: string[], right: string[]) {
  const leftLookup = new Map(
    left
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => [item.toLowerCase(), item])
  );
  const rightLookup = new Map(
    right
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => [item.toLowerCase(), item])
  );
  const leftSet = new Set(leftLookup.keys());
  const rightSet = new Set(rightLookup.keys());
  const sharedKeys = [...leftSet].filter((item) => rightSet.has(item));
  const shared = sharedKeys
    .map((item) => leftLookup.get(item) ?? item);
  const leftOnly = [...leftSet]
    .filter((item) => !rightSet.has(item))
    .map((item) => leftLookup.get(item) ?? item);
  const rightOnly = [...rightSet]
    .filter((item) => !leftSet.has(item))
    .map((item) => rightLookup.get(item) ?? item);
  const total = new Set([...leftSet, ...rightSet]).size || 1;

  return {
    shared,
    leftOnly,
    rightOnly,
    score: Math.round((shared.length / total) * 100)
  };
}

export function calculateCompatibility(left: MusicStats, right: MusicStats) {
  const artistOverlap = overlapScore(
    left.topArtists.map((artist) => artist.name),
    right.topArtists.map((artist) => artist.name)
  );
  const genreOverlap = overlapScore(left.topGenres, right.topGenres);

  const score = Math.round(artistOverlap.score * 0.6 + genreOverlap.score * 0.4);

  const differentGenres = [...genreOverlap.leftOnly, ...genreOverlap.rightOnly];

  return {
    score,
    sharedArtists: artistOverlap.shared,
    sharedGenres: genreOverlap.shared,
    differentGenres
  };
}
