import { followProfile, unfollowProfile } from "@/app/social-actions";

type FollowToggleProps = {
  username: string;
  redirectPath: string;
  isFollowing: boolean;
  followLabel?: string;
  unfollowLabel?: string;
};

export function FollowToggle({
  username,
  redirectPath,
  isFollowing,
  followLabel,
  unfollowLabel
}: FollowToggleProps) {
  return (
    <form action={isFollowing ? unfollowProfile : followProfile}>
      <input type="hidden" name="username" value={username} />
      <input type="hidden" name="redirectPath" value={redirectPath} />
      <button className="button button-secondary" type="submit">
        {isFollowing
          ? (unfollowLabel ?? `Unfollow @${username}`)
          : (followLabel ?? `Follow @${username}`)}
      </button>
    </form>
  );
}
