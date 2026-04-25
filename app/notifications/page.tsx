import Link from "next/link";

import { markNotificationsRead } from "@/app/notification-actions";
import { SectionHeading } from "@/components/section-heading";
import { getNotificationsForSession, getUnreadNotificationCountForSession } from "@/lib/notifications";
import { getViewerProfile } from "@/lib/profiles";
import { getCurrentSession } from "@/lib/session";
import { toUserFacingErrorMessage } from "@/lib/ui-errors";

function formatNotificationDate(createdAt: string) {
  return new Date(createdAt).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export default async function NotificationsPage({
  searchParams
}: {
  searchParams: Promise<{ notifications_read?: string; notification_error?: string }>;
}) {
  const { notifications_read: notificationsRead, notification_error: notificationError } =
    await searchParams;
  const session = await getCurrentSession();
  const friendlyNotificationError = toUserFacingErrorMessage(notificationError);

  if (!session) {
    return (
      <main className="page">
        <section className="hero">
          <span className="hero-kicker">Notifications</span>
          <h1>Connect Spotify to open your social inbox.</h1>
          <p className="lede">
            Follow alerts only become meaningful once the app knows who you are. Sign in to see who has started following your profile.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/auth/spotify/start">
              Connect Spotify
            </Link>
            <Link className="button button-secondary" href="/leaderboard">
              Browse public profiles
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const [viewerProfile, notifications, unreadCount] = await Promise.all([
    getViewerProfile(session),
    getNotificationsForSession(session),
    getUnreadNotificationCountForSession(session)
  ]);

  return (
    <main className="page">
      {notificationsRead ? (
        <section className="panel stack">
          <span className="eyebrow">Notifications</span>
          <strong>Your inbox is marked as read.</strong>
        </section>
      ) : null}

      {friendlyNotificationError ? (
        <section className="panel stack">
          <span className="eyebrow">Notifications</span>
          <strong>We could not update your notification state.</strong>
          <span className="note">{friendlyNotificationError}</span>
        </section>
      ) : null}

      <section className="hero">
        <span className="hero-kicker">Notifications</span>
        <h1>
          {unreadCount > 0
            ? `${unreadCount} unread follow ${unreadCount === 1 ? "alert" : "alerts"}`
            : "Your social inbox is caught up."}
        </h1>
        <p className="lede">
          {viewerProfile?.onboardingComplete
            ? "This is where new social signals land first. For now, the inbox tracks follow activity so your profile starts feeling alive the moment people discover it."
            : "Finish onboarding to give people a profile they can actually follow. Once that is live, new follow alerts will start landing here."}
        </p>
        <div className="pill-row">
          <span className="pill">
            {viewerProfile?.onboardingComplete
              ? `Inbox for @${viewerProfile.username}`
              : "Profile setup still pending"}
          </span>
          <span className="pill">{unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}</span>
          <span className="pill pill-accent">Follow alerts only</span>
        </div>
        {unreadCount > 0 ? (
          <div className="hero-actions">
            <form action={markNotificationsRead}>
              <button className="button button-primary" type="submit">
                Mark all as read
              </button>
            </form>
          </div>
        ) : null}
      </section>

      <section className="stack">
        <SectionHeading
          eyebrow="Inbox"
          title="Latest notifications"
          description="Lean and intentional for MVP: one place to see who followed you, then jump straight into their profile."
        />
        {notifications.length ? (
          <div className="list-grid">
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className={`card stack notification-card${notification.readAt ? "" : " notification-card-unread"}`}
              >
                <div className="meta-row notification-header">
                  <div className="meta-row">
                    <span className="avatar" aria-hidden="true">
                      {notification.actorAvatarSeed}
                    </span>
                    <div className="stack notification-copy">
                      <strong>
                        {notification.actorUsername
                          ? `@${notification.actorUsername}`
                          : notification.actorDisplayName}{" "}
                        followed you
                      </strong>
                      <span className="note">
                        {notification.actorUsername
                          ? `${notification.actorDisplayName} found your profile and added you to their listening circle.`
                          : "A listener followed your profile and added you to their listening circle."}
                      </span>
                    </div>
                  </div>
                  <div className="stack notification-meta">
                    <span className="metric-label">{formatNotificationDate(notification.createdAt)}</span>
                    <span className={`pill${notification.readAt ? "" : " pill-accent"}`}>
                      {notification.readAt ? "Read" : "Unread"}
                    </span>
                  </div>
                </div>
                <div className="inline-actions">
                  {notification.actorUsername ? (
                    <>
                      <Link className="button button-secondary" href={`/u/${notification.actorUsername}`}>
                        View profile
                      </Link>
                      <Link className="button button-secondary" href={`/compare/${notification.actorUsername}`}>
                        Compare taste
                      </Link>
                    </>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <article className="card stack">
            <h3>No notifications yet</h3>
            <p className="note">
              Once someone follows your profile, their alert will land here with a quick path back to their profile and comparison page.
            </p>
          </article>
        )}
      </section>
    </main>
  );
}
