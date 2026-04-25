import { cache } from "react";

import { buildAvatarSeed, getPublicProfilesBySpotifyUserIds } from "@/lib/profiles";
import type { AppSession } from "@/lib/session";
import { createSupabaseAdminClient, supabaseServerConfigIsReady } from "@/lib/supabase/admin";
import type { AppNotification, NotificationType } from "@/types";

const NOTIFICATIONS_TABLE = "notifications";

type NotificationRecord = {
  id: string;
  type: NotificationType;
  actorSpotifyUserId: string;
  recipientSpotifyUserId: string;
  actorDisplayName: string;
  createdAt: string;
  readAt: string | null;
};

type NotificationStore = NotificationRecord[];

declare global {
  var __soundboardNotificationStore: NotificationStore | undefined;
}

const notificationStore = globalThis.__soundboardNotificationStore ?? [];

if (!globalThis.__soundboardNotificationStore) {
  globalThis.__soundboardNotificationStore = notificationStore;
}

function isMissingNotificationsTableError(errorMessage: string) {
  return (
    errorMessage.includes("Could not find the table") ||
    errorMessage.includes("relation \"public.notifications\" does not exist") ||
    errorMessage.includes("schema cache")
  );
}

function mapRowToNotification(row: {
  id: string;
  type: NotificationType;
  actor_spotify_user_id: string;
  recipient_spotify_user_id: string;
  actor_display_name: string;
  created_at: string;
  read_at: string | null;
}): NotificationRecord {
  return {
    id: row.id,
    type: row.type,
    actorSpotifyUserId: row.actor_spotify_user_id,
    recipientSpotifyUserId: row.recipient_spotify_user_id,
    actorDisplayName: row.actor_display_name,
    createdAt: row.created_at,
    readAt: row.read_at
  };
}

function getUnreadMemoryNotification(
  recipientSpotifyUserId: string,
  actorSpotifyUserId: string,
  type: NotificationType
) {
  return (
    notificationStore.find(
      (notification) =>
        notification.recipientSpotifyUserId === recipientSpotifyUserId &&
        notification.actorSpotifyUserId === actorSpotifyUserId &&
        notification.type === type &&
        !notification.readAt
    ) ?? null
  );
}

function createMemoryFollowNotification(
  recipientSpotifyUserId: string,
  actorSpotifyUserId: string,
  actorDisplayName: string
) {
  if (getUnreadMemoryNotification(recipientSpotifyUserId, actorSpotifyUserId, "follow")) {
    return;
  }

  notificationStore.unshift({
    id: crypto.randomUUID(),
    type: "follow",
    actorSpotifyUserId,
    recipientSpotifyUserId,
    actorDisplayName,
    createdAt: new Date().toISOString(),
    readAt: null
  });
}

async function createPersistedFollowNotification(
  recipientSpotifyUserId: string,
  actorSpotifyUserId: string,
  actorDisplayName: string
) {
  const supabase = createSupabaseAdminClient();
  const { data: existing, error: lookupError } = await supabase
    .from(NOTIFICATIONS_TABLE)
    .select("id")
    .eq("recipient_spotify_user_id", recipientSpotifyUserId)
    .eq("actor_spotify_user_id", actorSpotifyUserId)
    .eq("type", "follow")
    .is("read_at", null)
    .maybeSingle<{ id: string }>();

  if (lookupError) {
    if (isMissingNotificationsTableError(lookupError.message)) {
      createMemoryFollowNotification(recipientSpotifyUserId, actorSpotifyUserId, actorDisplayName);
      return;
    }

    throw new Error(`Failed to check existing notifications: ${lookupError.message}`);
  }

  if (existing) {
    return;
  }

  const { error } = await supabase.from(NOTIFICATIONS_TABLE).insert({
    recipient_spotify_user_id: recipientSpotifyUserId,
    actor_spotify_user_id: actorSpotifyUserId,
    actor_display_name: actorDisplayName,
    type: "follow"
  });

  if (error) {
    if (isMissingNotificationsTableError(error.message)) {
      createMemoryFollowNotification(recipientSpotifyUserId, actorSpotifyUserId, actorDisplayName);
      return;
    }

    throw new Error(`Failed to create follow notification: ${error.message}`);
  }
}

async function enrichNotifications(records: NotificationRecord[]) {
  const actorProfiles = await getPublicProfilesBySpotifyUserIds(
    records.map((record) => record.actorSpotifyUserId)
  );

  return records.map((record) => {
    const actorProfile = actorProfiles.get(record.actorSpotifyUserId);

    const notification: AppNotification = {
      ...record,
      actorUsername: actorProfile?.username ?? null,
      actorAvatarUrl: actorProfile?.avatarUrl ?? null,
      actorAvatarSeed: buildAvatarSeed(actorProfile?.username ?? record.actorDisplayName)
    };

    return notification;
  });
}

export async function createFollowNotificationForUser(
  recipientSpotifyUserId: string,
  actor: Pick<AppSession, "spotifyUserId" | "displayName">
) {
  if (!recipientSpotifyUserId || recipientSpotifyUserId === actor.spotifyUserId) {
    return;
  }

  if (!supabaseServerConfigIsReady()) {
    createMemoryFollowNotification(recipientSpotifyUserId, actor.spotifyUserId, actor.displayName);
    return;
  }

  await createPersistedFollowNotification(
    recipientSpotifyUserId,
    actor.spotifyUserId,
    actor.displayName
  );
}

const getPersistedNotificationsForRecipient = cache(
  async (recipientSpotifyUserId: string, limit: number) => {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .select(
        "id, type, actor_spotify_user_id, recipient_spotify_user_id, actor_display_name, created_at, read_at"
      )
      .eq("recipient_spotify_user_id", recipientSpotifyUserId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      if (isMissingNotificationsTableError(error.message)) {
        return null;
      }

      throw new Error(`Failed to load notifications: ${error.message}`);
    }

    return (data ?? []).map((row) =>
      mapRowToNotification(
        row as {
          id: string;
          type: NotificationType;
          actor_spotify_user_id: string;
          recipient_spotify_user_id: string;
          actor_display_name: string;
          created_at: string;
          read_at: string | null;
        }
      )
    );
  }
);

const getPersistedUnreadCountForRecipient = cache(async (recipientSpotifyUserId: string) => {
  const supabase = createSupabaseAdminClient();
  const { count, error } = await supabase
    .from(NOTIFICATIONS_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("recipient_spotify_user_id", recipientSpotifyUserId)
    .is("read_at", null);

  if (error) {
    if (isMissingNotificationsTableError(error.message)) {
      return null;
    }

    throw new Error(`Failed to load unread notification count: ${error.message}`);
  }

  return count ?? 0;
});

export async function getNotificationsForSession(session: AppSession, limit = 20) {
  if (!supabaseServerConfigIsReady()) {
    const records = notificationStore
      .filter((notification) => notification.recipientSpotifyUserId === session.spotifyUserId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit);

    return enrichNotifications(records);
  }

  const records = await getPersistedNotificationsForRecipient(session.spotifyUserId, limit);

  if (!records) {
    const fallbackRecords = notificationStore
      .filter((notification) => notification.recipientSpotifyUserId === session.spotifyUserId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit);

    return enrichNotifications(fallbackRecords);
  }

  return enrichNotifications(records);
}

export async function getUnreadNotificationCountForSession(session: AppSession) {
  if (!supabaseServerConfigIsReady()) {
    return notificationStore.filter(
      (notification) =>
        notification.recipientSpotifyUserId === session.spotifyUserId && !notification.readAt
    ).length;
  }

  const count = await getPersistedUnreadCountForRecipient(session.spotifyUserId);

  if (count === null) {
    return notificationStore.filter(
      (notification) =>
        notification.recipientSpotifyUserId === session.spotifyUserId && !notification.readAt
    ).length;
  }

  return count;
}

export async function markAllNotificationsAsReadForSession(session: AppSession) {
  if (!supabaseServerConfigIsReady()) {
    notificationStore.forEach((notification) => {
      if (notification.recipientSpotifyUserId === session.spotifyUserId && !notification.readAt) {
        notification.readAt = new Date().toISOString();
      }
    });

    return;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from(NOTIFICATIONS_TABLE)
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_spotify_user_id", session.spotifyUserId)
    .is("read_at", null);

  if (error) {
    if (isMissingNotificationsTableError(error.message)) {
      notificationStore.forEach((notification) => {
        if (notification.recipientSpotifyUserId === session.spotifyUserId && !notification.readAt) {
          notification.readAt = new Date().toISOString();
        }
      });
      return;
    }

    throw new Error(`Failed to mark notifications as read: ${error.message}`);
  }
}
