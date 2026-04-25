import Link from "next/link";

import type { ComparisonBreakdown, Profile } from "@/types";

type UserCardProps = {
  profile: Profile;
  comparison?: ComparisonBreakdown;
  actionHref?: string;
  actionLabel?: string;
};

export function UserCard({
  profile,
  comparison,
  actionHref,
  actionLabel = "Compare"
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
        {comparison ? <span className="pill pill-accent">{comparison.score}% match</span> : null}
      </div>

      <div className="inline-actions">
        <Link className="button button-secondary" href={`/u/${profile.username}`}>
          View profile
        </Link>
        {actionHref ? (
          <Link className="button button-primary" href={actionHref}>
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
