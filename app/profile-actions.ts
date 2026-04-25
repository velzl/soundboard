"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { saveProfileForSession } from "@/lib/profiles";
import { getCurrentSession } from "@/lib/session";

async function handleProfileSave(
  destination: "onboarding" | "settings",
  formData: FormData
) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/?spotify_error=not_authenticated");
  }

  const username = String(formData.get("username") ?? "");
  const bio = String(formData.get("bio") ?? "");
  let profileUsername: string;

  try {
    const profile = await saveProfileForSession(session, { username, bio });
    profileUsername = profile.username;
  } catch (saveError) {
    const message = saveError instanceof Error ? saveError.message : "profile_save_failed";

    redirect(
      destination === "onboarding"
        ? `/onboarding?error=${encodeURIComponent(message)}`
        : `/settings?error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  revalidatePath("/onboarding");
  revalidatePath("/settings");
  revalidatePath(`/u/${profileUsername}`);

  redirect(
    destination === "onboarding"
      ? "/dashboard?profile_saved=1"
      : "/settings?saved=1"
  );
}

export async function saveOnboardingProfile(formData: FormData) {
  return handleProfileSave("onboarding", formData);
}

export async function saveSettingsProfile(formData: FormData) {
  return handleProfileSave("settings", formData);
}
