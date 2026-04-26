import { pinProfile, unpinProfile } from "@/app/pin-actions";

type PinToggleProps = {
  username: string;
  redirectPath: string;
  isPinned: boolean;
};

export function PinToggle({ username, redirectPath, isPinned }: PinToggleProps) {
  return (
    <form action={isPinned ? unpinProfile : pinProfile}>
      <input type="hidden" name="username" value={username} />
      <input type="hidden" name="redirectPath" value={redirectPath} />
      <button className="button button-secondary" type="submit">
        {isPinned ? `Unpin @${username}` : `Pin @${username}`}
      </button>
    </form>
  );
}
