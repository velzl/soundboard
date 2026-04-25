import { buildComparisonBreakdown } from "@/lib/compatibility";
import { calculateCompatibility, calculateMusicActivityScore } from "@/lib/scoring";
import type { ComparisonBreakdown, LeaderboardEntry, MusicStats, Profile } from "@/types";

export const currentUsername = "mira";

export const profiles: Profile[] = [
  {
    id: "user-mira",
    username: "mira",
    displayName: "Mira Vale",
    bio: "Late-night playlists, atmospheric pop, alt rap, and the occasional deep electronic spiral.",
    avatarSeed: "MV",
    followers: 418,
    following: 63
  },
  {
    id: "user-sol",
    username: "sol",
    displayName: "Sol Mercer",
    bio: "Genre-hopping from house to hyperpop whenever the week needs a reset.",
    avatarSeed: "SM",
    followers: 291,
    following: 80
  },
  {
    id: "user-nova",
    username: "nova",
    displayName: "Nova Kade",
    bio: "Indie rock loyalist with enough bedroom pop to keep the edges soft.",
    avatarSeed: "NK",
    followers: 522,
    following: 104
  },
  {
    id: "user-kito",
    username: "kito",
    displayName: "Kito Lane",
    bio: "Rhythm-first listener. Rap, club, and sharp left turns into experimental scenes.",
    avatarSeed: "KL",
    followers: 184,
    following: 49
  }
];

export const followingUsernames = ["sol", "nova"];

export const statsByUserId: Record<string, MusicStats> = {
  "user-mira": {
    userId: "user-mira",
    topArtists: [
      { id: "1", name: "SZA", genres: ["r&b", "pop"] },
      { id: "2", name: "The Weeknd", genres: ["pop", "r&b"] },
      { id: "3", name: "070 Shake", genres: ["alt rap", "pop"] },
      { id: "4", name: "Kaytranada", genres: ["house", "electronic"] },
      { id: "5", name: "FKA twigs", genres: ["art pop", "electronic"] },
      { id: "6", name: "Tame Impala", genres: ["psychedelic", "indie"] },
      { id: "7", name: "Kali Uchis", genres: ["latin pop", "r&b"] },
      { id: "8", name: "Fred again..", genres: ["electronic", "house"] },
      { id: "9", name: "Kendrick Lamar", genres: ["hip-hop", "rap"] },
      { id: "10", name: "Rosalia", genres: ["latin", "art pop"] }
    ],
    topTracks: [
      { id: "1", name: "Good Days", artist: "SZA" },
      { id: "2", name: "Escapism", artist: "RAYE" },
      { id: "3", name: "Space Song", artist: "Beach House" },
      { id: "4", name: "Ghostin", artist: "Ariana Grande" },
      { id: "5", name: "Selfish", artist: "Kali Uchis" },
      { id: "6", name: "Breathe Deeper", artist: "Tame Impala" },
      { id: "7", name: "Running Around", artist: "Fred again.." },
      { id: "8", name: "Telepatia", artist: "Kali Uchis" },
      { id: "9", name: "Nice To Have", artist: "070 Shake" },
      { id: "10", name: "Less Than Zero", artist: "The Weeknd" }
    ],
    topGenres: ["r&b", "pop", "electronic", "alt rap", "house"],
    updatedAt: "2026-04-14T08:15:00.000Z"
  },
  "user-sol": {
    userId: "user-sol",
    topArtists: [
      { id: "11", name: "Fred again..", genres: ["electronic", "house"] },
      { id: "12", name: "PinkPantheress", genres: ["pop", "dance"] },
      { id: "13", name: "Charli xcx", genres: ["hyperpop", "pop"] },
      { id: "14", name: "Kaytranada", genres: ["house", "electronic"] },
      { id: "15", name: "Skrillex", genres: ["electronic", "bass"] },
      { id: "16", name: "Romy", genres: ["dance", "electronic"] },
      { id: "17", name: "The Weeknd", genres: ["pop", "r&b"] },
      { id: "18", name: "Disclosure", genres: ["house", "electronic"] },
      { id: "19", name: "Rosalia", genres: ["latin", "art pop"] },
      { id: "20", name: "Amaarae", genres: ["alt pop", "r&b"] }
    ],
    topTracks: [
      { id: "11", name: "leavemealone", artist: "Fred again.." },
      { id: "12", name: "Von dutch", artist: "Charli xcx" },
      { id: "13", name: "Boy's a liar Pt. 2", artist: "PinkPantheress" },
      { id: "14", name: "Stayinit", artist: "Fred again.." },
      { id: "15", name: "Turn On The Lights again..", artist: "Fred again.." },
      { id: "16", name: "Strong", artist: "Romy" },
      { id: "17", name: "Latch", artist: "Disclosure" },
      { id: "18", name: "Rush", artist: "Troye Sivan" },
      { id: "19", name: "MOTOMAMI", artist: "Rosalia" },
      { id: "20", name: "SAD GIRLZ LUV MONEY", artist: "Amaarae" }
    ],
    topGenres: ["electronic", "house", "pop", "dance", "r&b"],
    updatedAt: "2026-04-14T07:45:00.000Z"
  },
  "user-nova": {
    userId: "user-nova",
    topArtists: [
      { id: "21", name: "Phoebe Bridgers", genres: ["indie", "folk"] },
      { id: "22", name: "Tame Impala", genres: ["psychedelic", "indie"] },
      { id: "23", name: "Japanese Breakfast", genres: ["indie", "dream pop"] },
      { id: "24", name: "The 1975", genres: ["indie pop", "rock"] },
      { id: "25", name: "Lorde", genres: ["pop", "alt pop"] },
      { id: "26", name: "The Marias", genres: ["indie pop", "dream pop"] },
      { id: "27", name: "Clairo", genres: ["bedroom pop", "indie"] },
      { id: "28", name: "Arctic Monkeys", genres: ["rock", "indie"] },
      { id: "29", name: "Wallows", genres: ["indie rock", "rock"] },
      { id: "30", name: "SZA", genres: ["r&b", "pop"] }
    ],
    topTracks: [
      { id: "21", name: "Motion Sickness", artist: "Phoebe Bridgers" },
      { id: "22", name: "Kyoto", artist: "Phoebe Bridgers" },
      { id: "23", name: "The Less I Know The Better", artist: "Tame Impala" },
      { id: "24", name: "Be Sweet", artist: "Japanese Breakfast" },
      { id: "25", name: "Robbers", artist: "The 1975" },
      { id: "26", name: "Supercut", artist: "Lorde" },
      { id: "27", name: "Hush", artist: "The Marias" },
      { id: "28", name: "Bags", artist: "Clairo" },
      { id: "29", name: "Do I Wanna Know?", artist: "Arctic Monkeys" },
      { id: "30", name: "Good Days", artist: "SZA" }
    ],
    topGenres: ["indie", "rock", "dream pop", "pop", "folk"],
    updatedAt: "2026-04-14T09:05:00.000Z"
  },
  "user-kito": {
    userId: "user-kito",
    topArtists: [
      { id: "31", name: "Kendrick Lamar", genres: ["hip-hop", "rap"] },
      { id: "32", name: "Travis Scott", genres: ["hip-hop", "rap"] },
      { id: "33", name: "Playboi Carti", genres: ["rap", "rage"] },
      { id: "34", name: "Metro Boomin", genres: ["rap", "trap"] },
      { id: "35", name: "Rosalia", genres: ["latin", "art pop"] },
      { id: "36", name: "Yeat", genres: ["rap", "rage"] },
      { id: "37", name: "Drake", genres: ["rap", "pop"] },
      { id: "38", name: "Kaytranada", genres: ["house", "electronic"] },
      { id: "39", name: "Future", genres: ["trap", "rap"] },
      { id: "40", name: "Lil Yachty", genres: ["rap", "experimental"] }
    ],
    topTracks: [
      { id: "31", name: "N95", artist: "Kendrick Lamar" },
      { id: "32", name: "Hyaena", artist: "Travis Scott" },
      { id: "33", name: "FE!N", artist: "Travis Scott" },
      { id: "34", name: "Type Shit", artist: "Future" },
      { id: "35", name: "ILUV", artist: "Yeat" },
      { id: "36", name: "CARNIVAL", artist: "Ye and Ty Dolla $ign" },
      { id: "37", name: "SORRY NOT SORRY", artist: "Tyler, The Creator" },
      { id: "38", name: "Pick Up The Phone", artist: "Young Thug" },
      { id: "39", name: "MOTOMAMI", artist: "Rosalia" },
      { id: "40", name: "10%", artist: "Kaytranada" }
    ],
    topGenres: ["rap", "hip-hop", "trap", "electronic", "latin"],
    updatedAt: "2026-04-14T06:25:00.000Z"
  }
};

export function getProfileByUsername(username: string) {
  return profiles.find((profile) => profile.username === username);
}

export function getProfileById(id: string) {
  return profiles.find((profile) => profile.id === id);
}

export function getStatsByUserId(userId: string) {
  return statsByUserId[userId];
}

export function getCurrentProfile() {
  return getProfileByUsername(currentUsername)!;
}

export function getCurrentStats() {
  return getStatsByUserId(getCurrentProfile().id);
}

export function getLeaderboard(): LeaderboardEntry[] {
  return profiles
    .map((profile) => {
      const stats = getStatsByUserId(profile.id);

      return {
        rank: 0,
        profile,
        score: calculateMusicActivityScore(stats),
        topGenre: stats.topGenres[0]
      };
    })
    .sort((left, right) => right.score - left.score)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
}

export function getFollowingProfiles() {
  return profiles.filter((profile) => followingUsernames.includes(profile.username));
}

export function getSuggestedProfiles() {
  const currentStats = getCurrentStats();

  return profiles
    .filter((profile) => profile.username !== currentUsername)
    .map((profile) => {
      const comparison = calculateCompatibility(currentStats, getStatsByUserId(profile.id));

      return {
        profile,
        comparison: {
          ...comparison,
          genreSignalsSparse: false,
          summary:
            comparison.score >= 70
              ? "Near-overlap across artists and mood."
              : comparison.score >= 45
                ? "Strong enough overlap to be worth a closer look."
                : "Different overall lane, but still enough overlap to explore."
        }
      };
    })
    .sort((left, right) => right.comparison.score - left.comparison.score)
    .slice(0, 3);
}

export function getComparisonForUsername(username: string): ComparisonBreakdown | null {
  const currentProfile = getCurrentProfile();
  const targetProfile = getProfileByUsername(username);

  if (!targetProfile || targetProfile.id === currentProfile.id) {
    return null;
  }

  const currentStats = getStatsByUserId(currentProfile.id);
  const targetStats = getStatsByUserId(targetProfile.id);
  return buildComparisonBreakdown(currentStats, targetStats);
}


