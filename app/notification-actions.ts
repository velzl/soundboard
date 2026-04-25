"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { markAllNotificationsAsReadForSession } from "@/lib/notifications";
import { getCurrentSession } from "@/lib/session";

export async function markNotificationsRead() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/?spotify_error=not_authenticated");
  }

  try {
    await markAllNotificationsAsReadForSession(session);
  } catch (notificationError) {
    const message =
      notificationError instanceof Error
        ? notificationError.message
        : "notification_read_failed";
    redirect(`/notifications?notification_error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/discover");
  revalidatePath("/following");
  revalidatePath("/leaderboard");
  revalidatePath("/notifications");

  redirect("/notifications?notifications_read=1");
}
