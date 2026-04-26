import Link from "next/link";
import type { ReactNode } from "react";

import type { ComparisonBreakdown, Profile } from "@/types";

type UserCardProps = {
  profile: Profile;
  comparison?: ComparisonBreakdown;
  actionHref?: string;
  actionLabel?: string;
  socialLabel?: string;
  badges?: string[];
  extraAction?: ReactNode;
};

export function UserCard({
  profile,
  comparison,
  actionHref,
  actionLabel = "Compare",
  socialLabel,
  badges = [],
  extraAction
}: UserCardProps) {
  return (
    <article className="card stack user-card">
      <div className="meta-row">
        <div className="avatar" aria-hidden="true">
          {profile.avatarSeed}
        </div>
        <div className="stack">
          <strong>{profile.displayName}</strong>
          <span className="muted">@{profile.username}</span>
        </div>
      </div>

      <p className="muted">{profile.bio}</p>

      <div className="pill-row">
        <span className="pill">{comparison ? "Taste overlap" : "Public profile"}</span>
        <span className="pill">{profile.followers} followers</span>
        <span className="pill">{profile.following} following</span>
        {socialLabel ? <span className="pill">{socialLabel}</span> : null}
        {comparison ? <span className="pill pill-accent">{comparison.score}% match</span> : null}
      </div>

      {badges.length ? (
        <div className="tag-list">
          {badges.map((badge) => (
            <span className="tag" key={badge}>
              {badge}
            </span>
          ))}
        </div>
      ) : null}

      <div className="inline-actions">
        <Link className="button button-secondary" href={`/u/${profile.username}`}>
          View profile
        </Link>
        {actionHref ? (
          <Link className="button button-primary" href={actionHref}>
            {actionLabel}
          </Link>
        ) : null}
        {extraAction}
      </div>
    </article>
  );
}
