import type { AppSession } from "@/lib/session";
import { createSupabaseAdminClient, supabaseServerConfigIsReady } from "@/lib/supabase/admin";

const PINNED_PROFILES_TABLE = "pinned_profiles";
const MAX_PINNED_PROFILES = 12;

export type PinnedProfileEntry = {
  pinnerSpotifyUserId: string;
  pinnedSpotifyUserId: string;
  createdAt: string;
};

type PinStore = Map<string, PinnedProfileEntry[]>;

declare global {
  var __soundboardPinStore: PinStore | undefined;
}

const pinStore = globalThis.__soundboardPinStore ?? new Map<string, PinnedProfileEntry[]>();

if (!globalThis.__soundboardPinStore) {
  globalThis.__soundboardPinStore = pinStore;
}

function isMissingPinnedProfilesTableError(message: string) {
  return (
    message.includes(PINNED_PROFILES_TABLE) &&
    (message.includes("relation") ||
      message.includes("schema cache") ||
      message.includes("Could not find the table"))
  );
}

function sortPinnedEntries(entries: PinnedProfileEntry[]) {
  return [...entries].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function getMemoryPinnedEntries(pinnerSpotifyUserId: string) {
  return sortPinnedEntries(pinStore.get(pinnerSpotifyUserId) ?? []);
}

function saveMemoryPinnedEntries(
  pinnerSpotifyUserId: string,
  entries: PinnedProfileEntry[]
) {
  pinStore.set(pinnerSpotifyUserId, sortPinnedEntries(entries).slice(0, MAX_PINNED_PROFILES));
}

function mapRowToPinnedEntry(row: {
  pinner_spotify_user_id: string;
  pinned_spotify_user_id: string;
  created_at: string;
}): PinnedProfileEntry {
  return {
    pinnerSpotifyUserId: row.pinner_spotify_user_id,
    pinnedSpotifyUserId: row.pinned_spotify_user_id,
    createdAt: row.created_at
  };
}

export async function getPinnedEntriesForSession(session: AppSession) {
  if (!supabaseServerConfigIsReady()) {
    return getMemoryPinnedEntries(session.spotifyUserId);
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from(PINNED_PROFILES_TABLE)
    .select("pinner_spotify_user_id, pinned_spotify_user_id, created_at")
    .eq("pinner_spotify_user_id", session.spotifyUserId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingPinnedProfilesTableError(error.message)) {
      return getMemoryPinnedEntries(session.spotifyUserId);
    }

    throw new Error(`Failed to load pinned profiles: ${error.message}`);
  }

  return (data ?? []).map((row) =>
    mapRowToPinnedEntry(
      row as {
        pinner_spotify_user_id: string;
        pinned_spotify_user_id: string;
        created_at: string;
      }
    )
  );
}

export async function getPinnedSpotifyUserIdsForSession(session: AppSession) {
  const entries = await getPinnedEntriesForSession(session);
  return entries.map((entry) => entry.pinnedSpotifyUserId);
}

export async function getPinnedRelationshipMapForViewer(
  viewerSpotifyUserId: string,
  targetSpotifyUserIds: string[]
) {
  const targetIds = [...new Set(targetSpotifyUserIds.filter(Boolean))].filter(
    (targetSpotifyUserId) => targetSpotifyUserId !== viewerSpotifyUserId
  );
  const pinnedMap = new Map<string, boolean>();

  targetIds.forEach((targetSpotifyUserId) => {
    pinnedMap.set(targetSpotifyUserId, false);
  });

  if (!targetIds.length) {
    return pinnedMap;
  }

  if (!supabaseServerConfigIsReady()) {
    const entries = getMemoryPinnedEntries(viewerSpotifyUserId);
    const pinnedIds = new Set(entries.map((entry) => entry.pinnedSpotifyUserId));

    targetIds.forEach((targetSpotifyUserId) => {
      pinnedMap.set(targetSpotifyUserId, pinnedIds.has(targetSpotifyUserId));
    });

    return pinnedMap;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from(PINNED_PROFILES_TABLE)
    .select("pinned_spotify_user_id")
    .eq("pinner_spotify_user_id", viewerSpotifyUserId)
    .in("pinned_spotify_user_id", targetIds);

  if (error) {
    if (isMissingPinnedProfilesTableError(error.message)) {
      const entries = getMemoryPinnedEntries(viewerSpotifyUserId);
      const pinnedIds = new Set(entries.map((entry) => entry.pinnedSpotifyUserId));

      targetIds.forEach((targetSpotifyUserId) => {
        pinnedMap.set(targetSpotifyUserId, pinnedIds.has(targetSpotifyUserId));
      });

      return pinnedMap;
    }

    throw new Error(`Failed to load pinned relationship state: ${error.message}`);
  }

  (data ?? []).forEach((row) => {
    pinnedMap.set(row.pinned_spotify_user_id as string, true);
  });

  return pinnedMap;
}

export async function pinProfileForSession(session: AppSession, pinnedSpotifyUserId: string) {
  if (!pinnedSpotifyUserId || pinnedSpotifyUserId === session.spotifyUserId) {
    throw new Error("You can only pin other public profiles.");
  }

  const existingEntries = await getPinnedEntriesForSession(session);

  if (existingEntries.some((entry) => entry.pinnedSpotifyUserId === pinnedSpotifyUserId)) {
    return;
  }

  if (existingEntries.length >= MAX_PINNED_PROFILES) {
    throw new Error(`You can only pin up to ${MAX_PINNED_PROFILES} profiles right now.`);
  }

  const nextEntry: PinnedProfileEntry = {
    pinnerSpotifyUserId: session.spotifyUserId,
    pinnedSpotifyUserId,
    createdAt: new Date().toISOString()
  };

  saveMemoryPinnedEntries(session.spotifyUserId, [nextEntry, ...existingEntries]);

  if (!supabaseServerConfigIsReady()) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from(PINNED_PROFILES_TABLE).upsert(
    {
      pinner_spotify_user_id: session.spotifyUserId,
      pinned_spotify_user_id: pinnedSpotifyUserId
    },
    { onConflict: "pinner_spotify_user_id,pinned_spotify_user_id" }
  );

  if (error) {
    if (isMissingPinnedProfilesTableError(error.message)) {
      return;
    }

    throw new Error(`Failed to pin profile: ${error.message}`);
  }
}

export async function unpinProfileForSession(session: AppSession, pinnedSpotifyUserId: string) {
  const existingEntries = await getPinnedEntriesForSession(session);
  saveMemoryPinnedEntries(
    session.spotifyUserId,
    existingEntries.filter((entry) => entry.pinnedSpotifyUserId !== pinnedSpotifyUserId)
  );

  if (!supabaseServerConfigIsReady()) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from(PINNED_PROFILES_TABLE)
    .delete()
    .eq("pinner_spotify_user_id", session.spotifyUserId)
    .eq("pinned_spotify_user_id", pinnedSpotifyUserId);

  if (error) {
    if (isMissingPinnedProfilesTableError(error.message)) {
      return;
    }

    throw new Error(`Failed to unpin profile: ${error.message}`);
  }
}
