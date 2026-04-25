import { followProfile, unfollowProfile } from "@/app/social-actions";

type FollowToggleProps = {
  username: string;
  redirectPath: string;
  isFollowing: boolean;
};

export function FollowToggle({
  username,
  redirectPath,
  isFollowing
}: FollowToggleProps) {
  return (
    <form action={isFollowing ? unfollowProfile : followProfile}>
      <input type="hidden" name="username" value={username} />
      <input type="hidden" name="redirectPath" value={redirectPath} />
      <button className="button button-secondary" type="submit">
        {isFollowing ? `Unfollow @${username}` : `Follow @${username}`}
      </button>
    </form>
  );
}
