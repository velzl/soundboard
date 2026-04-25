import { NextRequest, NextResponse } from "next/server";

import { buildSpotifyAuthorizeUrl, spotifyConfigIsReady, SPOTIFY_STATE_COOKIE_NAME } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  if (!spotifyConfigIsReady()) {
    return NextResponse.redirect(new URL("/?spotify_error=missing_config", appUrl));
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(buildSpotifyAuthorizeUrl(state));

  response.cookies.set(SPOTIFY_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10
  });

  return response;
}
