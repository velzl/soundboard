import { cache } from "react";
import { ensureFreshSpotifyAccessToken, fetchSpotifyTopArtists, fetchSpotifyTopTracks } from "@/lib/spotify";
import { createSupabaseAdminClient, supabaseServerConfigIsReady } from "@/lib/supabase/admin";
import type { AppSession } from "@/lib/session";
import { calculateMusicActivityScore } from "@/lib/scoring";
import { recordMusicSyncHistory } from "@/lib/sync-history";
import type { ArtistSummary, MusicStats, TrackSummary } from "@/types";

const MUSIC_STATS_TABLE = "user_music_stats";

type MusicStatsStore = Map<string, MusicStats>;

type PersistedMusicStatsRow = {
  spotify_user_id: string;
  top_artists_json: ArtistSummary[];
  top_tracks_json: TrackSummary[];
  top_genres_json: string[];
  music_activity_score: number;
  stats_updated_at: string;
};

declare global {
  var __soundboardMusicStatsStore: MusicStatsStore | undefined;
}

const musicStatsStore = globalThis.__soundboardMusicStatsStore ?? new Map<string, MusicStats>();

if (!globalThis.__soundboardMusicStatsStore) {
  globalThis.__soundboardMusicStatsStore = musicStatsStore;
}

function dedupeGenres(genres: string[]) {
  return [...new Set(genres.map((genre) => genre.trim()).filter(Boolean))];
}

function normalizeArtists(artists: ArtistSummary[] = []) {
  return artists.map((artist) => ({
    ...artist,
    genres: dedupeGenres(Array.isArray(artist.genres) ? artist.genres : [])
  }));
}

export function deriveTopGenresFromArtists(artists: ArtistSummary[]) {
  const weights = new Map<string, number>();

  artists.forEach((artist, index) => {
    const rankWeight = artists.length - index;

    artist.genres.forEach((genre) => {
      weights.set(genre, (weights.get(genre) ?? 0) + rankWeight);
    });
  });

  return [...weights.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 5)
    .map(([genre]) => genre);
}

export function getResolvedTopGenres(
  stats: Pick<MusicStats, "topArtists" | "topGenres"> | null | undefined
) {
  const storedGenres = dedupeGenres(Array.isArray(stats?.topGenres) ? stats.topGenres : []);

  if (storedGenres.length) {
    return storedGenres.slice(0, 5);
  }

  return deriveTopGenresFromArtists(normalizeArtists(stats?.topArtists ?? []));
}

export function getLeadGenre(
  stats: Pick<MusicStats, "topArtists" | "topGenres"> | null | undefined
) {
  return getResolvedTopGenres(stats)[0] ?? null;
}

function mapRowToMusicStats(row: PersistedMusicStatsRow): MusicStats {
  const topArtists = normalizeArtists(Array.isArray(row.top_artists_json) ? row.top_artists_json : []);
  const topTracks = Array.isArray(row.top_tracks_json) ? row.top_tracks_json : [];
  const topGenres = getResolvedTopGenres({
    topArtists,
    topGenres: Array.isArray(row.top_genres_json) ? row.top_genres_json : []
  });

  return {
    userId: row.spotify_user_id,
    topArtists,
    topTracks,
    topGenres,
    updatedAt: row.stats_updated_at
  };
}

function buildMusicStats(spotifyUserId: string, artists: ArtistSummary[], tracks: TrackSummary[]) {
  const normalizedArtists = normalizeArtists(artists);
  const topGenres = deriveTopGenresFromArtists(normalizedArtists);

  return {
    userId: spotifyUserId,
    topArtists: normalizedArtists,
    topTracks: tracks,
    topGenres,
    updatedAt: new Date().toISOString()
  } satisfies MusicStats;
}

async function savePersistedMusicStats(stats: MusicStats) {
  const supabase = createSupabaseAdminClient();
  const score = calculateMusicActivityScore(stats);
  const { data, error } = await supabase
    .from(MUSIC_STATS_TABLE)
    .upsert(
      {
        spotify_user_id: stats.userId,
        top_artists_json: stats.topArtists,
        top_tracks_json: stats.topTracks,
        top_genres_json: stats.topGenres,
        music_activity_score: score,
        stats_updated_at: stats.updatedAt
      },
      { onConflict: "spotify_user_id" }
    )
    .select(
      "spotify_user_id, top_artists_json, top_tracks_json, top_genres_json, music_activity_score, stats_updated_at"
    )
    .single<PersistedMusicStatsRow>();

  if (error) {
    throw new Error(`Failed to save music stats: ${error.message}`);
  }

  return {
    stats: mapRowToMusicStats(data),
    score: data.music_activity_score
  };
}

const getPersistedMusicStatsBySpotifyUserId = cache(async (spotifyUserId: string) => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from(MUSIC_STATS_TABLE)
    .select(
      "spotify_user_id, top_artists_json, top_tracks_json, top_genres_json, music_activity_score, stats_updated_at"
    )
    .eq("spotify_user_id", spotifyUserId)
    .maybeSingle<PersistedMusicStatsRow>();

  if (error) {
    throw new Error(`Failed to load music stats: ${error.message}`);
  }

  return data
    ? {
        stats: mapRowToMusicStats(data),
        score: data.music_activity_score
      }
    : null;
});

const getPersistedMusicStatsMapBySpotifyUserIds = cache(async (spotifyUserIdsKey: string) => {
  const spotifyUserIds = spotifyUserIdsKey
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const statsMap = new Map<string, { stats: MusicStats; score: number }>();

  if (!spotifyUserIds.length) {
    return statsMap;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from(MUSIC_STATS_TABLE)
    .select(
      "spotify_user_id, top_artists_json, top_tracks_json, top_genres_json, music_activity_score, stats_updated_at"
    )
    .in("spotify_user_id", spotifyUserIds);

  if (error) {
    throw new Error(`Failed to load music stats batch: ${error.message}`);
  }

  (data ?? []).forEach((row) => {
    const typedRow = row as PersistedMusicStatsRow & { music_activity_score: number };

    statsMap.set(typedRow.spotify_user_id, {
      stats: mapRowToMusicStats(typedRow),
      score: typedRow.music_activity_score
    });
  });

  return statsMap;
});

function saveMemoryMusicStats(stats: MusicStats) {
  musicStatsStore.set(stats.userId, stats);

  return {
    stats,
    score: calculateMusicActivityScore(stats)
  };
}

function getMemoryMusicStatsBySpotifyUserId(spotifyUserId: string) {
  const stats = musicStatsStore.get(spotifyUserId);

  return stats
    ? {
        stats,
        score: calculateMusicActivityScore(stats)
      }
    : null;
}

export async function syncSpotifyMusicStats(session: AppSession) {
  const freshSession = await ensureFreshSpotifyAccessToken(session.id);

  if (!freshSession) {
    throw new Error("Your Spotify session is no longer available. Please reconnect Spotify.");
  }

  const [topArtists, topTracks] = await Promise.all([
    fetchSpotifyTopArtists(freshSession.accessToken),
    fetchSpotifyTopTracks(freshSession.accessToken)
  ]);

  const stats = buildMusicStats(freshSession.spotifyUserId, topArtists, topTracks);

  const storedResult = !supabaseServerConfigIsReady()
    ? saveMemoryMusicStats(stats)
    : await savePersistedMusicStats(stats);

  await recordMusicSyncHistory({
    spotifyUserId: freshSession.spotifyUserId,
    stats: storedResult.stats,
    score: storedResult.score
  });

  return storedResult;
}

export async function getStoredMusicStatsForSession(session: AppSession) {
  if (!supabaseServerConfigIsReady()) {
    return getMemoryMusicStatsBySpotifyUserId(session.spotifyUserId);
  }

  return getPersistedMusicStatsBySpotifyUserId(session.spotifyUserId);
}

export async function getStoredMusicStatsBySpotifyUserId(spotifyUserId: string) {
  if (!supabaseServerConfigIsReady()) {
    return getMemoryMusicStatsBySpotifyUserId(spotifyUserId);
  }

  return getPersistedMusicStatsBySpotifyUserId(spotifyUserId);
}

export async function getStoredMusicStatsMapBySpotifyUserIds(spotifyUserIds: string[]) {
  const uniqueIds = [...new Set(spotifyUserIds.filter(Boolean))];

  if (!supabaseServerConfigIsReady()) {
    const statsMap = new Map<string, { stats: MusicStats; score: number }>();

    uniqueIds.forEach((spotifyUserId) => {
      const stats = getMemoryMusicStatsBySpotifyUserId(spotifyUserId);

      if (stats) {
        statsMap.set(spotifyUserId, stats);
      }
    });

    return statsMap;
  }

  return getPersistedMusicStatsMapBySpotifyUserIds(uniqueIds.sort().join(","));
}
