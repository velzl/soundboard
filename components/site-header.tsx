import Link from "next/link";

import { getUnreadNotificationCountForSession } from "@/lib/notifications";
import { getViewerProfile } from "@/lib/profiles";
import { getCurrentSession } from "@/lib/session";

export async function SiteHeader() {
  const session = await getCurrentSession();
  const [viewerProfile, unreadNotifications] = await Promise.all([
    getViewerProfile(session),
    session ? getUnreadNotificationCountForSession(session) : Promise.resolve(0)
  ]);
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/activity", label: "Activity" },
    { href: "/discover", label: "Discover" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/following", label: "Following" },
    { href: viewerProfile ? `/u/${viewerProfile.username}` : "/onboarding", label: "Profile" },
    { href: "/settings", label: "Settings" }
  ];

  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <span className="brand-mark" aria-hidden="true" />
        <span className="brand-copy">
          <span>Soundboard</span>
          <span className="brand-label">Music identity for competitive listeners</span>
        </span>
      </Link>

      <nav className="nav" aria-label="Primary">
        <div className="nav-links">
          {links.map((link) => (
            <Link key={link.href} className="nav-link" href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
        <div className="nav-utility">
          {session ? (
            <Link
              className="notification-link"
              href="/notifications"
              aria-label={
                unreadNotifications > 0
                  ? `Notifications, ${unreadNotifications} unread`
                  : "Notifications"
              }
            >
              <svg
                aria-hidden="true"
                className="notification-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9a6 6 0 1 1 12 0v4.2l1.3 2.3A1 1 0 0 1 18.43 17H5.57a1 1 0 0 1-.87-1.5L6 13.2V9Z" />
                <path d="M10 20a2 2 0 0 0 4 0" />
              </svg>
              <span>Alerts</span>
              {unreadNotifications > 0 ? (
                <span className="notification-badge">{unreadNotifications}</span>
              ) : null}
            </Link>
          ) : null}
          <form action="/discover" className="header-search-form">
            <label className="sr-only" htmlFor="global-profile-search">
              Search profiles by username
            </label>
            <input
              className="header-search-input"
              id="global-profile-search"
              name="q"
              type="search"
              placeholder="Search @handle"
              maxLength={32}
              autoComplete="off"
              spellCheck={false}
            />
            <button className="button button-secondary header-search-button" type="submit">
              Search
            </button>
          </form>
          {session ? (
            <>
              <span className="pill">
                {viewerProfile?.onboardingComplete ? "Profile live" : "Profile setup pending"}
              </span>
              <span className="pill">
                Linked as {viewerProfile?.username ? `@${viewerProfile.username}` : session.displayName}
              </span>
              <form action="/auth/logout" method="post">
                <button className="button button-secondary" type="submit">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link className="button button-primary" href="/auth/spotify/start">
              Connect Spotify
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
