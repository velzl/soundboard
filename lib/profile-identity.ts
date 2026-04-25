import { getLeadGenre, getResolvedTopGenres } from "@/lib/music-stats";
import type { MusicStats, Profile } from "@/types";

export type ProfileIdentity = {
  eyebrow: string;
  headline: string;
  summary: string;
  markers: string[];
};

export function buildProfileIdentity(
  profile: Profile,
  stats: MusicStats | null
): ProfileIdentity {
  if (!stats) {
    return {
      eyebrow: "Profile shell",
      headline: `@${profile.username} is ready for a real music snapshot.`,
      summary:
        "The public identity is live, but Spotify data still needs to land before this profile gets a stronger lane read.",
      markers: [
        `${profile.followers} followers`,
        `${profile.following} following`,
        "Sync pending"
      ]
    };
  }

  const topArtist = stats.topArtists[0]?.name ?? profile.displayName;
  const secondArtist = stats.topArtists[1]?.name ?? null;
  const topTrack = stats.topTracks[0]?.name ?? null;
  const leadGenre = getLeadGenre(stats);
  const resolvedGenres = getResolvedTopGenres(stats);

  if (leadGenre) {
    return {
      eyebrow: "Identity read",
      headline: `${topArtist} is anchoring a ${leadGenre}-leaning profile.`,
      summary: secondArtist
        ? `${topArtist} and ${secondArtist} are doing most of the world-building here, while ${
            topTrack ? `"${topTrack}"` : "the top-track stack"
          } keeps the profile feeling immediate instead of static.`
        : `${topArtist} is defining the lane right now, with ${
            topTrack ? `"${topTrack}"` : "the top-track stack"
          } reinforcing the profile's current pull.`,
      markers: [
        `Lead lane: ${leadGenre}`,
        `Top artist: ${topArtist}`,
        topTrack ? `Top track: ${topTrack}` : "Top track synced"
      ]
    };
  }

  return {
    eyebrow: "Artist-led identity",
    headline: `${topArtist} is carrying the signal here.`,
    summary: secondArtist
      ? `Spotify kept the genre labels light, so this profile reads more through artist overlap than named lanes. ${topArtist} and ${secondArtist} are doing most of the identity work.`
      : `Spotify kept the genre labels light, so this profile reads more through artist overlap than named lanes.`,
    markers: [
      `Top artist: ${topArtist}`,
      topTrack ? `Top track: ${topTrack}` : "Top track synced",
      resolvedGenres.length ? `Genre tags: ${resolvedGenres.length}` : "No genre labels yet"
    ]
  };
}
