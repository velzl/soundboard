import { getSessionById, updateSession, type AppSession } from "@/lib/session";

const SPOTIFY_SCOPES = ["user-top-read", "user-read-email", "user-read-private"];
export const SPOTIFY_STATE_COOKIE_NAME = "soundboard_spotify_state";

type SpotifyTokenResponse = {
  access_token: string;
  token_type: "Bearer";
  scope: string;
  expires_in: number;
  refresh_token?: string;
};

type SpotifyProfile = {
  id: string;
  display_name: string | null;
  email?: string;
  images?: Array<{ url: string }>;
};

type SpotifyTopArtistResponse = {
  items?: Array<{
    id: string;
    name: string;
    genres?: string[];
  }>;
};

type SpotifyTopTrackResponse = {
  items?: Array<{
    id: string;
    name: string;
    artists?: Array<{
      name: string;
    }>;
  }>;
};

function getSpotifyCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri =
    process.env.SPOTIFY_REDIRECT_URI ?? "http://127.0.0.1:3000/auth/spotify/callback";

  if (!clientId || !clientSecret) {
    throw new Error("Spotify credentials are missing.");
  }

  return { clientId, clientSecret, redirectUri };
}

function getBasicAuthorizationHeader() {
  const { clientId, clientSecret } = getSpotifyCredentials();
  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  return `Basic ${encoded}`;
}

async function parseSpotifyResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Spotify API request failed (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}

export function spotifyConfigIsReady() {
  return Boolean(
    process.env.SPOTIFY_CLIENT_ID &&
      process.env.SPOTIFY_CLIENT_SECRET &&
      process.env.SPOTIFY_REDIRECT_URI
  );
}

export function buildSpotifyAuthorizeUrl(state: string) {
  const { clientId, redirectUri } = getSpotifyCredentials();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SPOTIFY_SCOPES.join(" "),
    redirect_uri: redirectUri,
    state,
    show_dialog: "true"
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const { redirectUri } = getSpotifyCredentials();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: getBasicAuthorizationHeader(),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body,
    cache: "no-store"
  });

  return parseSpotifyResponse<SpotifyTokenResponse>(response);
}

export async function refreshSpotifyAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: getBasicAuthorizationHeader(),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body,
    cache: "no-store"
  });

  return parseSpotifyResponse<SpotifyTokenResponse>(response);
}

export async function fetchSpotifyProfile(accessToken: string) {
  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  return parseSpotifyResponse<SpotifyProfile>(response);
}

async function fetchSpotifyTopItems<T>(accessToken: string, type: "artists" | "tracks") {
  const params = new URLSearchParams({
    limit: "10",
    time_range: "medium_term"
  });
  const response = await fetch(`https://api.spotify.com/v1/me/top/${type}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  return parseSpotifyResponse<T>(response);
}

export async function fetchSpotifyTopArtists(accessToken: string) {
  const response = await fetchSpotifyTopItems<SpotifyTopArtistResponse>(accessToken, "artists");
  const items = Array.isArray(response.items) ? response.items : [];

  return items.map((artist) => ({
    id: artist.id,
    name: artist.name,
    genres: Array.isArray(artist.genres) ? artist.genres : []
  }));
}

export async function fetchSpotifyTopTracks(accessToken: string) {
  const response = await fetchSpotifyTopItems<SpotifyTopTrackResponse>(accessToken, "tracks");
  const items = Array.isArray(response.items) ? response.items : [];

  return items.map((track) => ({
    id: track.id,
    name: track.name,
    artist: (Array.isArray(track.artists) ? track.artists : []).map((artist) => artist.name).join(", ")
  }));
}

export function buildSessionFromSpotifyAuth(
  profile: SpotifyProfile,
  tokens: SpotifyTokenResponse
): Omit<AppSession, "id" | "createdAt" | "updatedAt"> {
  return {
    spotifyUserId: profile.id,
    displayName: profile.display_name?.trim() || profile.id,
    email: profile.email ?? null,
    avatarUrl: profile.images?.[0]?.url ?? null,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    scope: typeof tokens.scope === "string" ? tokens.scope.split(" ").filter(Boolean) : [],
    accessTokenExpiresAt: Date.now() + tokens.expires_in * 1000
  };
}

export async function ensureFreshSpotifyAccessToken(sessionId: string) {
  const session = await getSessionById(sessionId);

  if (!session) {
    return null;
  }

  const needsRefresh = session.accessTokenExpiresAt <= Date.now() + 60_000;

  if (!needsRefresh || !session.refreshToken) {
    return session;
  }

  const nextTokens = await refreshSpotifyAccessToken(session.refreshToken);

  return updateSession(sessionId, {
    accessToken: nextTokens.access_token,
    accessTokenExpiresAt: Date.now() + nextTokens.expires_in * 1000,
    refreshToken: nextTokens.refresh_token ?? session.refreshToken,
    scope: typeof nextTokens.scope === "string" ? nextTokens.scope.split(" ").filter(Boolean) : session.scope
  });
}
