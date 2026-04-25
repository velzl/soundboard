const MESSAGE_MAP: Array<{ match: string; message: string }> = [
  {
    match: "The user is not registered for this application",
    message:
      "This Spotify account is not allowlisted for the app yet. Add it in the Spotify Developer Dashboard before testing login."
  },
  {
    match: "not_authenticated",
    message: "Please sign in with Spotify and try again."
  },
  {
    match: "user_not_found",
    message: "We could not find that profile anymore."
  },
  {
    match: "follow_available_for_persisted_profiles_only",
    message: "Following is only available for fully saved public profiles right now."
  },
  {
    match: "social_action_failed",
    message: "That follow action did not go through. Please try again."
  },
  {
    match: "profile_save_failed",
    message: "We could not save your profile just yet. Please try again."
  },
  {
    match: "notification_read_failed",
    message: "We could not update your notification state just yet. Please try again."
  },
  {
    match: "Failed to",
    message: "Something went wrong on the server. Please try again in a moment."
  }
];

export function toUserFacingErrorMessage(rawMessage: string | null | undefined) {
  if (!rawMessage) {
    return null;
  }

  const normalized = rawMessage.trim();

  for (const entry of MESSAGE_MAP) {
    if (normalized.includes(entry.match)) {
      return entry.message;
    }
  }

  if (normalized.length > 140) {
    return "Something went wrong. Please try again in a moment.";
  }

  return normalized;
}
