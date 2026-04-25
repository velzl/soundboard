import { cache } from "react";

import { createSupabaseAdminClient, supabaseServerConfigIsReady } from "@/lib/supabase/admin";
import type { MusicStats } from "@/types";

const MUSIC_SYNC_HISTORY_TABLE = "music_sync_history";

export type MusicSyncHistoryEntry = {
  spotifyUserId: string;
  score: number;
  topArtistName: string | null;
  topTrackName: string | null;
  topGenres: string[];
  syncedAt: string;
  createdAt: string;
};

type PersistedMusicSyncHistoryRow = {
  spotify_user_id: string;
  music_activity_score: number;
  top_artist_name: string | null;
  top_track_name: string | null;
  top_genres_json: string[] | null;
  synced_at: string;
  created_at: string;
};

type MusicSyncHistoryStore = Map<string, MusicSyncHistoryEntry[]>;

declare global {
  var __soundboardMusicSyncHistoryStore: MusicSyncHistoryStore | undefined;
}

const musicSyncHistoryStore =
  globalThis.__soundboardMusicSyncHistoryStore ?? new Map<string, MusicSyncHistoryEntry[]>();

if (!globalThis.__soundboardMusicSyncHistoryStore) {
  globalThis.__soundboardMusicSyncHistoryStore = musicSyncHistoryStore;
}

function isMissingHistoryTableError(message: string) {
  return (
    message.includes(MUSIC_SYNC_HISTORY_TABLE) &&
    (message.includes("relation") ||
      message.includes("schema cache") ||
      message.includes("Could not find the table"))
  );
}

function mapRowToMusicSyncHistoryEntry(
  row: PersistedMusicSyncHistoryRow
): MusicSyncHistoryEntry {
  return {
    spotifyUserId: row.spotify_user_id,
    score: row.music_activity_score,
    topArtistName: row.top_artist_name,
    topTrackName: row.top_track_name,
    topGenres: Array.isArray(row.top_genres_json) ? row.top_genres_json : [],
    syncedAt: row.synced_at,
    createdAt: row.created_at
  };
}

function buildMusicSyncHistoryEntry(input: {
  spotifyUserId: string;
  stats: MusicStats;
  score: number;
}): MusicSyncHistoryEntry {
  return {
    spotifyUserId: input.spotifyUserId,
    score: input.score,
    topArtistName: input.stats.topArtists[0]?.name ?? null,
    topTrackName: input.stats.topTracks[0]?.name ?? null,
    topGenres: input.stats.topGenres,
    syncedAt: input.stats.updatedAt,
    createdAt: new Date().toISOString()
  };
}

async function insertPersistedMusicSyncHistoryEntry(entry: MusicSyncHistoryEntry) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from(MUSIC_SYNC_HISTORY_TABLE).insert({
    spotify_user_id: entry.spotifyUserId,
    music_activity_score: entry.score,
    top_artist_name: entry.topArtistName,
    top_track_name: entry.topTrackName,
    top_genres_json: entry.topGenres,
    synced_at: entry.syncedAt
  });

  if (error) {
    if (isMissingHistoryTableError(error.message)) {
      return false;
    }

    throw new Error(`Failed to save music sync history: ${error.message}`);
  }

  return true;
}

const getPersistedRecentMusicSyncHistoryForSpotifyUserId = cache(
  async (spotifyUserId: string, limit: number) => {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(MUSIC_SYNC_HISTORY_TABLE)
      .select(
        "spotify_user_id, music_activity_score, top_artist_name, top_track_name, top_genres_json, synced_at, created_at"
      )
      .eq("spotify_user_id", spotifyUserId)
      .order("synced_at", { ascending: false })
      .limit(limit);

    if (error) {
      if (isMissingHistoryTableError(error.message)) {
        return [];
      }

      throw new Error(`Failed to load music sync history: ${error.message}`);
    }

    return (data ?? []).map((row) =>
      mapRowToMusicSyncHistoryEntry(row as PersistedMusicSyncHistoryRow)
    );
  }
);

function saveMemoryMusicSyncHistoryEntry(entry: MusicSyncHistoryEntry) {
  const existing = musicSyncHistoryStore.get(entry.spotifyUserId) ?? [];
  const nextEntries = [entry, ...existing].slice(0, 12);
  musicSyncHistoryStore.set(entry.spotifyUserId, nextEntries);
}

function getMemoryRecentMusicSyncHistoryForSpotifyUserId(spotifyUserId: string, limit: number) {
  return (musicSyncHistoryStore.get(spotifyUserId) ?? []).slice(0, limit);
}

export async function recordMusicSyncHistory(input: {
  spotifyUserId: string;
  stats: MusicStats;
  score: number;
}) {
  const entry = buildMusicSyncHistoryEntry(input);
  saveMemoryMusicSyncHistoryEntry(entry);

  if (!supabaseServerConfigIsReady()) {
    return;
  }

  await insertPersistedMusicSyncHistoryEntry(entry);
}

export async function getRecentMusicSyncHistoryForSpotifyUserId(
  spotifyUserId: string,
  limit = 2
) {
  if (!supabaseServerConfigIsReady()) {
    return getMemoryRecentMusicSyncHistoryForSpotifyUserId(spotifyUserId, limit);
  }

  return getPersistedRecentMusicSyncHistoryForSpotifyUserId(spotifyUserId, limit);
}
