"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { pinProfileForSession, unpinProfileForSession } from "@/lib/pins";
import { getPublicProfileSnapshotByUsername } from "@/lib/public-data";
import { getCurrentSession } from "@/lib/session";
import { isFollowingUser } from "@/lib/social";

async function handlePinToggle(nextState: "pin" | "unpin", formData: FormData) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/?spotify_error=not_authenticated");
  }

  const username = String(formData.get("username") ?? "");
  const redirectPath = String(formData.get("redirectPath") ?? `/u/${username}`);
  const snapshot = await getPublicProfileSnapshotByUsername(username);

  if (!snapshot) {
    redirect(`${redirectPath}?pin_error=user_not_found`);
  }

  if (snapshot.source !== "supabase") {
    redirect(`${redirectPath}?pin_error=pinning_available_for_persisted_profiles_only`);
  }

  if (nextState === "pin") {
    const following = await isFollowingUser(session, snapshot.profile.id);

    if (!following) {
      redirect(`${redirectPath}?pin_error=pinning_requires_following_first`);
    }
  }

  try {
    if (nextState === "pin") {
      await pinProfileForSession(session, snapshot.profile.id);
    } else {
      await unpinProfileForSession(session, snapshot.profile.id);
    }
  } catch (pinError) {
    const message = pinError instanceof Error ? pinError.message : "pin_action_failed";
    redirect(`${redirectPath}?pin_error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/");
  revalidatePath("/activity");
  revalidatePath("/dashboard");
  revalidatePath("/discover");
  revalidatePath("/following");
  revalidatePath("/leaderboard");
  revalidatePath("/notifications");
  revalidatePath(`/compare/${username}`);
  revalidatePath(`/u/${username}`);

  redirect(`${redirectPath}?${nextState === "pin" ? "pinned=1" : "unpinned=1"}`);
}

export async function pinProfile(formData: FormData) {
  return handlePinToggle("pin", formData);
}

export async function unpinProfile(formData: FormData) {
  return handlePinToggle("unpin", formData);
}
