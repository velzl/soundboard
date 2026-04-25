"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createFollowNotificationForUser } from "@/lib/notifications";
import { getPublicProfileSnapshotByUsername } from "@/lib/public-data";
import { getCurrentSession } from "@/lib/session";
import { followUser, unfollowUser } from "@/lib/social";

async function handleFollowToggle(nextState: "follow" | "unfollow", formData: FormData) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/?spotify_error=not_authenticated");
  }

  const username = String(formData.get("username") ?? "");
  const redirectPath = String(formData.get("redirectPath") ?? `/u/${username}`);
  const snapshot = await getPublicProfileSnapshotByUsername(username);

  if (!snapshot) {
    redirect(`${redirectPath}?social_error=user_not_found`);
  }

  if (snapshot.source !== "supabase") {
    redirect(`${redirectPath}?social_error=follow_available_for_persisted_profiles_only`);
  }

  try {
    if (nextState === "follow") {
      await followUser(session, snapshot.profile.id);
      await createFollowNotificationForUser(snapshot.profile.id, session);
    } else {
      await unfollowUser(session, snapshot.profile.id);
    }
  } catch (followError) {
    const message = followError instanceof Error ? followError.message : "social_action_failed";
    redirect(`${redirectPath}?social_error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/discover");
  revalidatePath("/leaderboard");
  revalidatePath("/following");
  revalidatePath("/notifications");
  revalidatePath(`/u/${username}`);

  redirect(
    `${redirectPath}?${nextState === "follow" ? "followed=1" : "unfollowed=1"}`
  );
}

export async function followProfile(formData: FormData) {
  return handleFollowToggle("follow", formData);
}

export async function unfollowProfile(formData: FormData) {
  return handleFollowToggle("unfollow", formData);
}
