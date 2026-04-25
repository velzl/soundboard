export type ArtistSummary = {
  id: string;
  name: string;
  genres: string[];
};

export type TrackSummary = {
  id: string;
  name: string;
  artist: string;
};

export type Profile = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarSeed: string;
  followers: number;
  following: number;
};

export type MusicStats = {
  userId: string;
  topArtists: ArtistSummary[];
  topTracks: TrackSummary[];
  topGenres: string[];
  updatedAt: string;
};

export type LeaderboardEntry = {
  rank: number;
  profile: Profile;
  score: number;
  topGenre: string;
};

export type ComparisonBreakdown = {
  score: number;
  sharedArtists: string[];
  sharedGenres: string[];
  differentGenres: string[];
  summary: string;
  genreSignalsSparse: boolean;
};

export type WeeklyRecap = {
  eyebrow: string;
  title: string;
  summary: string;
  highlights: string[];
};

export type NotificationType = "follow";

export type AppNotification = {
  id: string;
  type: NotificationType;
  actorSpotifyUserId: string;
  recipientSpotifyUserId: string;
  actorDisplayName: string;
  actorUsername: string | null;
  actorAvatarUrl: string | null;
  actorAvatarSeed: string;
  createdAt: string;
  readAt: string | null;
};

export type PersistedProfile = {
  spotifyUserId: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ViewerProfile = PersistedProfile & {
  email: string | null;
  avatarSeed: string;
};
