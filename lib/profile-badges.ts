import { getLeadGenre, getResolvedTopGenres } from "@/lib/music-stats";
import type { MusicStats, Profile } from "@/types";

export type ProfileBadgeDetail = {
  label: string;
  detail: string;
};

export function buildProfileBadgeDetails(
  profile: Profile,
  stats: MusicStats | null,
  score: number | null
) {
  const badges: ProfileBadgeDetail[] = [];

  const addBadge = (label: string, detail: string) => {
    if (!badges.some((badge) => badge.label === label)) {
      badges.push({ label, detail });
    }
  };

  if (!stats) {
    addBadge(
      "Sync pending",
      "This profile is public, but it still needs a Spotify snapshot before stronger ranking and lane signals can be attached."
    );
  } else {
    const leadGenre = getLeadGenre(stats);
    const resolvedGenres = getResolvedTopGenres(stats);

    if (score !== null && score >= 85) {
      addBadge(
        "High activity",
        "The profile's synced listening spread is strong enough to place it in the top activity tier."
      );
    } else if (score !== null && score >= 70) {
      addBadge(
        "Rank climber",
        "This profile has enough synced breadth and artist depth to feel competitive on the board."
      );
    }

    if (leadGenre) {
      addBadge(
        `${leadGenre} lane`,
        "Spotify exposed enough genre signal to give this profile a clearly named listening lane."
      );
    }

    if (resolvedGenres.length >= 5) {
      addBadge(
        "Genre explorer",
        "The synced artist stack spans enough usable genre tags to show broad lane coverage."
      );
    }

    if (stats.topArtists.length >= 8) {
      addBadge(
        "Artist deep dive",
        "This snapshot has a full enough artist stack to make artist overlap especially meaningful."
      );
    }

    if (stats.topTracks.length >= 8) {
      addBadge(
        "Track stack loaded",
        "The top-track snapshot is populated deeply enough to make the profile feel current and specific."
      );
    }
  }

  if (profile.followers >= 5) {
    addBadge(
      "Crowd pull",
      "Enough other listeners are tracking this profile that it is starting to carry public social weight."
    );
  } else if (profile.followers >= 1) {
    addBadge(
      "Being watched",
      "At least one other profile is already following this listener's public identity."
    );
  }

  if (profile.following >= 5) {
    addBadge(
      "Circle builder",
      "This listener is actively building a wider social comparison circle inside the app."
    );
  } else if (profile.following >= 1) {
    addBadge(
      "Active scout",
      "This listener has already started exploring other public profiles instead of staying isolated."
    );
  }

  return badges.slice(0, 4);
}

export function buildProfileBadges(
  profile: Profile,
  stats: MusicStats | null,
  score: number | null
) {
  return buildProfileBadgeDetails(profile, stats, score).map((badge) => badge.label);
}

export function buildPinnedIdentityMarkers(
  profile: Profile,
  stats: MusicStats | null,
  score: number | null
) {
  if (!stats) {
    return [
      `@${profile.username}`,
      `${profile.followers} followers`,
      "Waiting on first sync"
    ];
  }

  const markers = [
    stats.topArtists[0]?.name ? `Anchored by ${stats.topArtists[0].name}` : null,
    stats.topTracks[0]?.name ? `Front track: ${stats.topTracks[0].name}` : null,
    score !== null ? `Score ${score}` : null,
    `${profile.followers} followers`
  ].filter(Boolean);

  return markers.slice(0, 4) as string[];
}
