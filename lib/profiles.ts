import { cache } from "react";
import type { AppSession } from "@/lib/session";
import { createSupabaseAdminClient, supabaseServerConfigIsReady } from "@/lib/supabase/admin";
import { getUsernameValidationMessage, isReservedUsername, normalizeUsername } from "@/lib/username";
import type { PersistedProfile, ViewerProfile } from "@/types";

const PROFILE_TABLE = "profiles";

type ProfileStore = Map<string, PersistedProfile>;

declare global {
  var __soundboardProfileStore: ProfileStore | undefined;
}

const profileStore = globalThis.__soundboardProfileStore ?? new Map<string, PersistedProfile>();

if (!globalThis.__soundboardProfileStore) {
  globalThis.__soundboardProfileStore = profileStore;
}

function toIsoIfPresent(value: string | null | undefined) {
  return value ?? new Date().toISOString();
}

export function buildAvatarSeed(source: string) {
  const alphanumeric = source.replace(/[^a-z0-9]/gi, "");

  if (!alphanumeric) {
    return "SB";
  }

  return alphanumeric.slice(0, 2).toUpperCase();
}

function sanitizeBio(input: string) {
  return input.replace(/\s+/g, " ").trim().slice(0, 160);
}

export function buildUsernameSuggestion(displayName: string) {
  const normalized = normalizeUsername(displayName);

  if (normalized.length >= 3 && !isReservedUsername(normalized)) {
    return normalized;
  }

  return normalizeUsername(`listener_${displayName.length || 1}`).slice(0, 24);
}

function validateUsername(username: string) {
  const validationMessage = getUsernameValidationMessage(username);

  if (validationMessage) {
    throw new Error(validationMessage);
  }
}

function mapRowToProfile(row: {
  spotify_user_id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}): PersistedProfile {
  return {
    spotifyUserId: row.spotify_user_id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    onboardingComplete: row.onboarding_complete,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const getPersistedProfileBySpotifyUserId = cache(async (spotifyUserId: string) => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select(
      "spotify_user_id, username, display_name, bio, avatar_url, onboarding_complete, created_at, updated_at"
    )
    .eq("spotify_user_id", spotifyUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load profile: ${error.message}`);
  }

  return data ? mapRowToProfile(data) : null;
});

const getPersistedProfileByUsername = cache(async (username: string) => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select(
      "spotify_user_id, username, display_name, bio, avatar_url, onboarding_complete, created_at, updated_at"
    )
    .eq("username", username)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load public profile: ${error.message}`);
  }

  return data ? mapRowToProfile(data) : null;
});

async function ensureUsernameAvailable(username: string, spotifyUserId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select("spotify_user_id")
    .eq("username", username)
    .maybeSingle<{ spotify_user_id: string }>();

  if (error) {
    throw new Error(`Failed to validate username: ${error.message}`);
  }

  if (data && data.spotify_user_id !== spotifyUserId) {
    throw new Error("That username is already taken.");
  }
}

async function savePersistedProfile(session: AppSession, input: { username: string; bio: string }) {
  const username = normalizeUsername(input.username);
  const bio = sanitizeBio(input.bio);

  validateUsername(username);
  await ensureUsernameAvailable(username, session.spotifyUserId);

  const supabase = createSupabaseAdminClient();
  const payload = {
    spotify_user_id: session.spotifyUserId,
    username,
    display_name: session.displayName,
    bio,
    avatar_url: session.avatarUrl,
    onboarding_complete: true
  };

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .upsert(payload, { onConflict: "spotify_user_id" })
    .select(
      "spotify_user_id, username, display_name, bio, avatar_url, onboarding_complete, created_at, updated_at"
    )
    .single();

  if (error) {
    throw new Error(`Failed to save profile: ${error.message}`);
  }

  return mapRowToProfile(data);
}

function getMemoryProfileBySpotifyUserId(spotifyUserId: string) {
  return profileStore.get(spotifyUserId) ?? null;
}

function getMemoryProfileByUsername(username: string) {
  return (
    [...profileStore.values()].find((profile) => profile.username === username) ?? null
  );
}

function saveMemoryProfile(session: AppSession, input: { username: string; bio: string }) {
  const username = normalizeUsername(input.username);
  const bio = sanitizeBio(input.bio);

  validateUsername(username);

  const conflict = getMemoryProfileByUsername(username);

  if (conflict && conflict.spotifyUserId !== session.spotifyUserId) {
    throw new Error("That username is already taken.");
  }

  const existing = getMemoryProfileBySpotifyUserId(session.spotifyUserId);
  const nextProfile: PersistedProfile = {
    spotifyUserId: session.spotifyUserId,
    username,
    displayName: session.displayName,
    bio,
    avatarUrl: session.avatarUrl,
    onboardingComplete: true,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  profileStore.set(session.spotifyUserId, nextProfile);

  return nextProfile;
}

export async function saveProfileForSession(
  session: AppSession,
  input: { username: string; bio: string }
) {
  if (!supabaseServerConfigIsReady()) {
    return saveMemoryProfile(session, input);
  }

  return savePersistedProfile(session, input);
}

export async function getStoredProfileForSession(session: AppSession) {
  if (!supabaseServerConfigIsReady()) {
    return getMemoryProfileBySpotifyUserId(session.spotifyUserId);
  }

  return getPersistedProfileBySpotifyUserId(session.spotifyUserId);
}

export async function getViewerProfile(session: AppSession | null): Promise<ViewerProfile | null> {
  if (!session) {
    return null;
  }

  const stored = await getStoredProfileForSession(session);

  return {
    spotifyUserId: session.spotifyUserId,
    username: stored?.username ?? buildUsernameSuggestion(session.displayName),
    displayName: stored?.displayName ?? session.displayName,
    bio: stored?.bio ?? "",
    avatarUrl: stored?.avatarUrl ?? session.avatarUrl,
    onboardingComplete: stored?.onboardingComplete ?? false,
    createdAt: toIsoIfPresent(stored?.createdAt),
    updatedAt: toIsoIfPresent(stored?.updatedAt),
    email: session.email,
    avatarSeed: buildAvatarSeed(stored?.username ?? session.displayName)
  };
}

export async function getPublicProfileByUsername(username: string) {
  const normalized = normalizeUsername(username);

  if (!normalized) {
    return null;
  }

  if (!supabaseServerConfigIsReady()) {
    return getMemoryProfileByUsername(normalized);
  }

  return getPersistedProfileByUsername(normalized);
}

export async function getPublicProfileBySpotifyUserId(spotifyUserId: string) {
  if (!spotifyUserId) {
    return null;
  }

  if (!supabaseServerConfigIsReady()) {
    return getMemoryProfileBySpotifyUserId(spotifyUserId);
  }

  return getPersistedProfileBySpotifyUserId(spotifyUserId);
}

export async function getPublicProfilesBySpotifyUserIds(spotifyUserIds: string[]) {
  const ids = [...new Set(spotifyUserIds.filter(Boolean))];
  const profiles = new Map<string, PersistedProfile>();

  if (!ids.length) {
    return profiles;
  }

  if (!supabaseServerConfigIsReady()) {
    ids.forEach((spotifyUserId) => {
      const profile = getMemoryProfileBySpotifyUserId(spotifyUserId);

      if (profile) {
        profiles.set(spotifyUserId, profile);
      }
    });

    return profiles;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select(
      "spotify_user_id, username, display_name, bio, avatar_url, onboarding_complete, created_at, updated_at"
    )
    .in("spotify_user_id", ids);

  if (error) {
    throw new Error(`Failed to load profile batch: ${error.message}`);
  }

  (data ?? []).forEach((row) => {
    const profile = mapRowToProfile(
      row as {
        spotify_user_id: string;
        username: string;
        display_name: string;
        bio: string;
        avatar_url: string | null;
        onboarding_complete: boolean;
        created_at: string;
        updated_at: string;
      }
    );

    profiles.set(profile.spotifyUserId, profile);
  });

  return profiles;
}

export async function getRecentPublicProfiles(limit = 12) {
  if (!supabaseServerConfigIsReady()) {
    return [...profileStore.values()]
      .filter((profile) => profile.onboardingComplete)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit);
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select(
      "spotify_user_id, username, display_name, bio, avatar_url, onboarding_complete, created_at, updated_at"
    )
    .eq("onboarding_complete", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load recent public profiles: ${error.message}`);
  }

  return (data ?? []).map((row) =>
    mapRowToProfile(
      row as {
        spotify_user_id: string;
        username: string;
        display_name: string;
        bio: string;
        avatar_url: string | null;
        onboarding_complete: boolean;
        created_at: string;
        updated_at: string;
      }
    )
  );
}
