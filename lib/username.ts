const RESERVED_USERNAMES = new Set([
  "admin",
  "alerts",
  "api",
  "app",
  "auth",
  "compare",
  "dashboard",
  "discover",
  "explore",
  "feed",
  "following",
  "help",
  "home",
  "leaderboard",
  "login",
  "notifications",
  "onboarding",
  "profile",
  "root",
  "search",
  "settings",
  "signup",
  "soundboard",
  "support",
  "system",
  "user",
  "users"
]);

export function normalizeUsername(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_.]/g, "")
    .replace(/_+/g, "_")
    .replace(/\.+/g, ".")
    .replace(/[._]{2,}/g, "_")
    .replace(/^[._]+|[._]+$/g, "")
    .slice(0, 24);
}

export function getUsernameValidationMessage(username: string) {
  if (username.length < 3) {
    return "Username must be at least 3 characters.";
  }

  if (username.length > 24) {
    return "Username must be 24 characters or fewer.";
  }

  if (!/^[a-z0-9_.]+$/.test(username)) {
    return "Username can only use lowercase letters, numbers, underscores, and periods.";
  }

  if (/^[._]|[._]$/.test(username)) {
    return "Username cannot start or end with a period or underscore.";
  }

  if (/[._]{2,}/.test(username)) {
    return "Username cannot contain repeated periods or underscores.";
  }

  if (RESERVED_USERNAMES.has(username)) {
    return "That username is reserved. Pick a different handle.";
  }

  return null;
}

export function isReservedUsername(username: string) {
  return RESERVED_USERNAMES.has(username);
}
