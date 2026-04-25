"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/session";
import { syncSpotifyMusicStats } from "@/lib/music-stats";

type SyncDestination = "dashboard" | "settings";

async function syncMusic(destination: SyncDestination) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/?spotify_error=not_authenticated");
  }

  try {
    await syncSpotifyMusicStats(session);
  } catch (syncError) {
    const message = syncError instanceof Error ? syncError.message : "spotify_sync_failed";

    redirect(
      destination === "dashboard"
        ? `/dashboard?sync_error=${encodeURIComponent(message)}`
        : `/settings?sync_error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/discover");
  revalidatePath("/settings");
  revalidatePath("/leaderboard");

  redirect(
    destination === "dashboard"
      ? "/dashboard?sync=1"
      : "/settings?sync=1"
  );
}

export async function syncSpotifyMusicFromDashboard() {
  return syncMusic("dashboard");
}

export async function syncSpotifyMusicFromSettings() {
  return syncMusic("settings");
}
