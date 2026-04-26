import Link from "next/link";

import type { SocialActivityItem } from "@/types";

function formatActivityTimestamp(createdAt: string) {
  return new Date(createdAt).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function getActivityEyebrow(type: SocialActivityItem["type"]) {
  switch (type) {
    case "follow":
      return "Follow event";
    case "sync":
      return "Fresh sync";
    case "joined":
      return "New profile";
    default:
      return "Activity";
  }
}

type ActivityFeedProps = {
  items: SocialActivityItem[];
  emptyTitle: string;
  emptyNote: string;
};

export function ActivityFeed({ items, emptyTitle, emptyNote }: ActivityFeedProps) {
  if (!items.length) {
    return (
      <article className="card stack">
        <h3>{emptyTitle}</h3>
        <p className="note">{emptyNote}</p>
      </article>
    );
  }

  return (
    <div className="activity-feed">
      {items.map((item) => (
        <article className="card stack activity-card" key={item.id}>
          <div className="meta-row activity-header">
            <div className="meta-row">
              <div className="activity-avatar-stack" aria-hidden="true">
                <span className="avatar">{item.actorProfile.avatarSeed}</span>
                {item.targetProfile ? (
                  <span className="avatar activity-avatar-secondary">
                    {item.targetProfile.avatarSeed}
                  </span>
                ) : null}
              </div>
              <div className="stack activity-copy">
                <span className="eyebrow">{getActivityEyebrow(item.type)}</span>
                <strong>{item.headline}</strong>
                <span className="note">{item.detail}</span>
              </div>
            </div>
            <span className="metric-label">{formatActivityTimestamp(item.createdAt)}</span>
          </div>

          <div className="pill-row">
            <span className="pill">@{item.actorProfile.username}</span>
            {item.targetProfile ? (
              <span className="pill">@{item.targetProfile.username}</span>
            ) : null}
            <span className="pill activity-privacy-pill">{item.privacyNote}</span>
          </div>

          <div className="inline-actions">
            <Link className="button button-secondary" href={item.actionHref}>
              {item.actionLabel}
            </Link>
            <Link className="button button-secondary" href="/leaderboard">
              Open leaderboard
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
