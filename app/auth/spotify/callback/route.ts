import { NextRequest, NextResponse } from "next/server";

import {
  buildSessionFromSpotifyAuth,
  exchangeCodeForTokens,
  fetchSpotifyProfile,
  spotifyConfigIsReady,
  SPOTIFY_STATE_COOKIE_NAME
} from "@/lib/spotify";
import { createSession, setSessionCookie } from "@/lib/session";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = request.cookies.get(SPOTIFY_STATE_COOKIE_NAME)?.value;

  if (error) {
    return NextResponse.redirect(new URL(`/?spotify_error=${error}`, appUrl));
  }

  if (!spotifyConfigIsReady() || !code || !state || !storedState || state !== storedState) {
    const mismatchResponse = NextResponse.redirect(
      new URL("/?spotify_error=state_mismatch", appUrl)
    );

    mismatchResponse.cookies.set(SPOTIFY_STATE_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0
    });

    return mismatchResponse;
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const profile = await fetchSpotifyProfile(tokens.access_token);
    const session = await createSession(buildSessionFromSpotifyAuth(profile, tokens));
    const response = NextResponse.redirect(new URL("/onboarding?source=spotify", appUrl));

    response.cookies.set(SPOTIFY_STATE_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0
    });
    setSessionCookie(response, session.id);

    return response;
  } catch (exchangeError) {
    const message =
      exchangeError instanceof Error ? exchangeError.message : "spotify_exchange_failed";

    return NextResponse.redirect(
      new URL(`/?spotify_error=${encodeURIComponent(message)}`, appUrl)
    );
  }
}
