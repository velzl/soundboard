import { cache } from "react";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseAdminClient, supabaseServerConfigIsReady } from "@/lib/supabase/admin";

const SESSION_COOKIE_NAME = "soundboard_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const ACCOUNT_TABLE = "spotify_accounts";
const SESSION_TABLE = "app_sessions";

export type AppSession = {
  id: string;
  spotifyUserId: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  accessToken: string;
  refreshToken: string | null;
  scope: string[];
  accessTokenExpiresAt: number;
  createdAt: number;
  updatedAt: number;
};

type SessionStore = Map<string, AppSession>;

type PersistedSessionRow = {
  id: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  spotify_accounts: {
    spotify_user_id: string;
    display_name: string;
    email: string | null;
    avatar_url: string | null;
    access_token: string;
    refresh_token: string | null;
    scope: string[] | null;
    access_token_expires_at: string;
  };
};

declare global {
  var __soundboardSessionStore: SessionStore | undefined;
}

const sessionStore = globalThis.__soundboardSessionStore ?? new Map<string, AppSession>();

if (!globalThis.__soundboardSessionStore) {
  globalThis.__soundboardSessionStore = sessionStore;
}

function getCookieSettings(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge
  };
}

function getSessionExpiryIso() {
  return new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
}

function cleanupExpiredMemorySessions() {
  const now = Date.now();

  for (const [sessionId, session] of sessionStore.entries()) {
    if (session.updatedAt + SESSION_TTL_SECONDS * 1000 < now) {
      sessionStore.delete(sessionId);
    }
  }
}

function mapRowToSession(row: PersistedSessionRow): AppSession {
  return {
    id: row.id,
    spotifyUserId: row.spotify_accounts.spotify_user_id,
    displayName: row.spotify_accounts.display_name,
    email: row.spotify_accounts.email,
    avatarUrl: row.spotify_accounts.avatar_url,
    accessToken: row.spotify_accounts.access_token,
    refreshToken: row.spotify_accounts.refresh_token,
    scope: row.spotify_accounts.scope ?? [],
    accessTokenExpiresAt: new Date(row.spotify_accounts.access_token_expires_at).getTime(),
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime()
  };
}

function getMemorySessionById(sessionId?: string | null) {
  cleanupExpiredMemorySessions();

  if (!sessionId) {
    return null;
  }

  return sessionStore.get(sessionId) ?? null;
}

const getPersistedSessionById = cache(async (sessionId?: string | null) => {
  if (!sessionId) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from(SESSION_TABLE)
    .select(
      `
        id,
        created_at,
        updated_at,
        expires_at,
        spotify_accounts!inner(
          spotify_user_id,
          display_name,
          email,
          avatar_url,
          access_token,
          refresh_token,
          scope,
          access_token_expires_at
        )
      `
    )
    .eq("id", sessionId)
    .maybeSingle<PersistedSessionRow>();

  if (error) {
    throw new Error(`Failed to load session from Supabase: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  if (new Date(data.expires_at).getTime() <= Date.now()) {
    await deletePersistedSession(sessionId);
    return null;
  }

  return mapRowToSession(data);
});

async function persistAccount(session: AppSession) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from(ACCOUNT_TABLE).upsert(
    {
      spotify_user_id: session.spotifyUserId,
      display_name: session.displayName,
      email: session.email,
      avatar_url: session.avatarUrl,
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
      scope: session.scope,
      access_token_expires_at: new Date(session.accessTokenExpiresAt).toISOString()
    },
    { onConflict: "spotify_user_id" }
  );

  if (error) {
    throw new Error(`Failed to persist Spotify account: ${error.message}`);
  }
}

async function createPersistedSession(session: Omit<AppSession, "id" | "createdAt" | "updatedAt">) {
  const nextSession: AppSession = {
    ...session,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await persistAccount(nextSession);

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from(SESSION_TABLE).insert({
    id: nextSession.id,
    spotify_user_id: nextSession.spotifyUserId,
    expires_at: getSessionExpiryIso()
  });

  if (error) {
    throw new Error(`Failed to create session row: ${error.message}`);
  }

  return nextSession;
}

async function updatePersistedSession(sessionId: string, updates: Partial<AppSession>) {
  const existing = await getPersistedSessionById(sessionId);

  if (!existing) {
    return null;
  }

  const nextSession: AppSession = {
    ...existing,
    ...updates,
    id: existing.id,
    updatedAt: Date.now()
  };

  await persistAccount(nextSession);

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from(SESSION_TABLE)
    .update({
      updated_at: new Date(nextSession.updatedAt).toISOString(),
      expires_at: getSessionExpiryIso()
    })
    .eq("id", sessionId);

  if (error) {
    throw new Error(`Failed to update session row: ${error.message}`);
  }

  return nextSession;
}

async function deletePersistedSession(sessionId?: string | null) {
  if (!sessionId) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from(SESSION_TABLE).delete().eq("id", sessionId);

  if (error) {
    throw new Error(`Failed to delete session row: ${error.message}`);
  }
}

export async function createSession(
  session: Omit<AppSession, "id" | "createdAt" | "updatedAt">
) {
  if (!supabaseServerConfigIsReady()) {
    cleanupExpiredMemorySessions();

    const now = Date.now();
    const nextSession: AppSession = {
      ...session,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    };

    sessionStore.set(nextSession.id, nextSession);

    return nextSession;
  }

  return createPersistedSession(session);
}

export async function updateSession(sessionId: string, updates: Partial<AppSession>) {
  if (!supabaseServerConfigIsReady()) {
    const existing = sessionStore.get(sessionId);

    if (!existing) {
      return null;
    }

    const nextSession = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    };

    sessionStore.set(sessionId, nextSession);

    return nextSession;
  }

  return updatePersistedSession(sessionId, updates);
}

export async function getSessionById(sessionId?: string | null) {
  if (!supabaseServerConfigIsReady()) {
    return getMemorySessionById(sessionId);
  }

  return getPersistedSessionById(sessionId);
}

export async function deleteSession(sessionId?: string | null) {
  if (!supabaseServerConfigIsReady()) {
    if (!sessionId) {
      return;
    }

    sessionStore.delete(sessionId);
    return;
  }

  await deletePersistedSession(sessionId);
}

export const getCurrentSession = cache(async () => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  return getSessionById(sessionId);
});

export function setSessionCookie(response: NextResponse, sessionId: string) {
  response.cookies.set(SESSION_COOKIE_NAME, sessionId, getCookieSettings(SESSION_TTL_SECONDS));
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", getCookieSettings(0));
}

export { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS };
