/**
 * Sammanställningar för tränarvyn.
 *
 * VIKTIGT (se åtkomstreglerna i lib/auth.ts): funktionerna här returnerar aggregerad
 * data. Reflektionernas råtext följer ALDRIG med om inte spelaren själv kryssat i
 * sharedWithCoach. Föräldrarapporten innehåller aldrig råtext över huvud taget.
 */

import { prisma } from "./db";
import { computeDropoutRisk, isImproving, average, type RiskResult } from "./risk";
import { FLAG_TYPE, ROLE } from "./constants";
import { generateCoachSummary } from "./ai";

const DAY_MS = 24 * 60 * 60 * 1000;
export const PERIOD_DAYS = 28;

export type PlayerSummary = {
  id: string;
  name: string;
  level: string;
  attendance: number;
  /** Mående 1–5, äldst först — underlag för sparkline och trend. */
  moods: number[];
  lastMood: number | null;
  tags: string[];
  daysSinceLastReflection: number | null;
  reflectionCount: number;
  risk: RiskResult;
  needsFollowup: boolean;
  hasEscalation: boolean;
  improving: boolean;
};

function daysSince(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / DAY_MS);
}

function distinctTags(tags: (string | null)[]): string[] {
  return [...new Set(tags.filter((tag): tag is string => Boolean(tag)))];
}

export async function getClubPlayers(clubId: string): Promise<PlayerSummary[]> {
  const players = await prisma.user.findMany({
    where: { clubId, role: ROLE.PLAYER },
    include: {
      profile: true,
      reflections: { orderBy: { createdAt: "asc" } },
      flags: { where: { resolvedAt: null } },
    },
    orderBy: { name: "asc" },
  });

  return players.map((player) => {
    const moods = player.reflections.map((reflection) => reflection.mood);
    const last = player.reflections.at(-1) ?? null;
    const daysSinceLastReflection = daysSince(last?.createdAt ?? null);
    const attendance = player.profile?.trainingAttendance ?? 0;

    return {
      id: player.id,
      name: player.name,
      level: player.profile?.level ?? "—",
      attendance,
      moods,
      lastMood: last?.mood ?? null,
      tags: distinctTags(player.reflections.slice(-6).map((r) => r.tag)),
      daysSinceLastReflection,
      reflectionCount: player.reflections.filter(
        (r) => r.createdAt.getTime() > Date.now() - PERIOD_DAYS * DAY_MS,
      ).length,
      risk: computeDropoutRisk({ moods, daysSinceLastReflection, attendance }),
      needsFollowup: player.flags.some((flag) => flag.type === FLAG_TYPE.FOLLOWUP),
      hasEscalation: player.flags.some((flag) => flag.type === FLAG_TYPE.ESCALATION),
      improving: isImproving(moods),
    };
  });
}

/** Spelare som behöver uppmärksamhet först: flaggade, sedan risk, sedan lägst mående. */
export function sortByAttention(players: PlayerSummary[]): PlayerSummary[] {
  const priority = (player: PlayerSummary) =>
    player.hasEscalation ? 3 : player.needsFollowup ? 2 : player.risk.risk ? 1 : 0;
  return [...players].sort(
    (a, b) => priority(b) - priority(a) || (a.lastMood ?? 5) - (b.lastMood ?? 5),
  );
}

export type ClubStats = {
  playerCount: number;
  reflectionsThisPeriod: number;
  averageMood: number;
  flaggedCount: number;
  dropoutRiskCount: number;
};

export function clubStats(players: PlayerSummary[]): ClubStats {
  const moods = players.map((p) => p.lastMood).filter((m): m is number => m !== null);
  return {
    playerCount: players.length,
    reflectionsThisPeriod: players.reduce((sum, p) => sum + p.reflectionCount, 0),
    averageMood: moods.length ? Number(average(moods).toFixed(1)) : 0,
    flaggedCount: players.filter((p) => p.needsFollowup || p.hasEscalation).length,
    dropoutRiskCount: players.filter((p) => p.risk.risk && !p.needsFollowup && !p.hasEscalation)
      .length,
  };
}

export type WeeklyDigest = {
  improving: string[];
  flagged: string[];
  atRisk: { name: string; reason: string }[];
  tip: string;
};

const firstName = (name: string) => name.split(" ")[0];

/** Veckans sammanfattning — räknas fram ur faktisk data, inte av en språkmodell. */
export function buildWeeklyDigest(players: PlayerSummary[]): WeeklyDigest {
  const counts = { press: 0, serve: 0, fokus: 0 };
  for (const player of players) {
    for (const tag of player.tags) {
      const key = tag.toLowerCase();
      if (key.includes("press") || key.includes("brytpoäng")) counts.press += 1;
      if (key.includes("andraserve")) counts.serve += 1;
      if (key.includes("koncentration") || key.includes("fokus")) counts.fokus += 1;
    }
  }

  let tip =
    "Ingen tydlig gemensam trend denna vecka — fortsätt med individuella avstämningar som vanligt.";
  if (counts.press >= 2) {
    tip = `Press-poäng återkommer hos ${counts.press} spelare just nu. En övning med simulerade press-scenarier (t.ex. spel från 30-40) på nästa gruppträning skulle träffa flera samtidigt.`;
  } else if (counts.serve >= 2) {
    tip =
      "Flera spelare arbetar med andraserven — ett gemensamt tekniskt pass på serven kan vara effektivt den här veckan.";
  } else if (counts.fokus >= 3) {
    tip = `Koncentration är veckans vanligaste tema (${counts.fokus} spelare) — ett kort pass om fokusrutiner mellan poäng passar hela gruppen.`;
  }

  return {
    improving: players.filter((p) => p.improving).map((p) => firstName(p.name)),
    flagged: players
      .filter((p) => p.needsFollowup || p.hasEscalation)
      .map((p) => firstName(p.name)),
    atRisk: players
      .filter((p) => p.risk.risk && !p.needsFollowup && !p.hasEscalation)
      .map((p) => ({
        name: firstName(p.name),
        reason: p.risk.risk ? p.risk.reason : "",
      })),
    tip,
  };
}

export type CoachReflectionView = {
  id: string;
  createdAt: string;
  mood: number;
  tag: string | null;
  sharedWithCoach: boolean;
  /** Råtext endast när spelaren delat reflektionen. Annars null. */
  text: string | null;
};

export type PlayerDetail = PlayerSummary & {
  schedule: {
    weekday: number;
    time: string | null;
    focus: string;
    muscleGroup: string | null;
    intensity: string;
  }[];
  reflections: CoachReflectionView[];
  flags: { id: string; type: string; reason: string; createdAt: string }[];
  note: string;
  aiSummary: string;
};

export async function getPlayerDetail(
  clubId: string,
  coachId: string,
  playerId: string,
): Promise<PlayerDetail | null> {
  const player = await prisma.user.findFirst({
    where: { id: playerId, clubId, role: ROLE.PLAYER },
    include: {
      profile: true,
      reflections: { orderBy: { createdAt: "asc" } },
      flags: { where: { resolvedAt: null }, orderBy: { createdAt: "desc" } },
      scheduleEntries: { orderBy: { weekday: "asc" } },
      notesAboutMe: { where: { coachId } },
    },
  });
  if (!player) return null;

  const summaries = await getClubPlayers(clubId);
  const summary = summaries.find((item) => item.id === playerId)!;

  const aiSummary = await generateCoachSummary({
    name: summary.name,
    level: summary.level,
    attendance: summary.attendance,
    moods: summary.moods,
    tags: summary.tags,
    riskReason: summary.risk.risk ? summary.risk.reason : null,
    openFlagTypes: player.flags.map((flag) => flag.type),
    daysSinceLastReflection: summary.daysSinceLastReflection,
  });

  return {
    ...summary,
    schedule: player.scheduleEntries.map((entry) => ({
      weekday: entry.weekday,
      time: entry.time,
      focus: entry.focus,
      muscleGroup: entry.muscleGroup,
      intensity: entry.intensity,
    })),
    reflections: player.reflections
      .slice()
      .reverse()
      .slice(0, 10)
      .map((reflection) => ({
        id: reflection.id,
        createdAt: reflection.createdAt.toISOString(),
        mood: reflection.mood,
        tag: reflection.tag,
        sharedWithCoach: reflection.sharedWithCoach,
        // Regel 3: råtexten lämnar servern endast när spelaren delat den.
        text: reflection.sharedWithCoach ? reflection.text : null,
      })),
    flags: player.flags.map((flag) => ({
      id: flag.id,
      type: flag.type,
      reason: flag.reason,
      createdAt: flag.createdAt.toISOString(),
    })),
    note: player.notesAboutMe[0]?.text ?? "",
    aiSummary,
  };
}

export type ParentReport = {
  playerName: string;
  period: string;
  attendance: string;
  mentalDevelopment: string;
  focusAreas: string;
  recommendation: string;
  disclaimer: string;
};

/** Föräldrarapport — enbart sammanställning, aldrig spelarens egna texter. */
export function buildParentReport(player: PlayerSummary): ParentReport {
  const mentalDevelopment = player.risk.risk
    ? player.risk.type === "trend"
      ? "Nedåtgående trend i det mentala måendet de senaste veckorna."
      : player.risk.type === "inaktivitet"
        ? `Har inte registrerat någon reflektion på ${player.daysSinceLastReflection ?? "flera"} dagar.`
        : `Deltagandet har legat lägre än vanligt (${player.attendance} % närvaro).`
    : player.improving
      ? "Tydlig positiv utveckling i det mentala måendet över perioden."
      : "Stabilt mående över perioden, utan större svängningar.";

  return {
    playerName: player.name,
    period: `Senaste ${PERIOD_DAYS} dagarna`,
    attendance: `${player.attendance} % av schemalagda pass`,
    mentalDevelopment,
    focusAreas: player.tags.length ? player.tags.join(", ") : "Inget särskilt fokusområde noterat",
    recommendation:
      player.risk.risk || player.needsFollowup
        ? "Ett kort, avdramatiserat samtal med spelaren rekommenderas inom de närmaste veckorna."
        : "Inget särskilt behov av åtgärd just nu — fortsätt som planerat.",
    disclaimer:
      "Rapporten innehåller sammanställd information — spelarens egna reflektionstexter delas aldrig automatiskt.",
  };
}
