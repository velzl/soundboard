import { NextRequest, NextResponse } from "next/server";

import { clearSessionCookie, deleteSession, SESSION_COOKIE_NAME } from "@/lib/session";

async function handleLogout(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  await deleteSession(sessionId);

  const response = NextResponse.redirect(new URL("/", appUrl));
  clearSessionCookie(response);

  return response;
}

export async function GET(request: NextRequest) {
  return handleLogout(request);
}

export async function POST(request: NextRequest) {
  return handleLogout(request);
}
