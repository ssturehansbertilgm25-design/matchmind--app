/**
 * Avhoppsrisk — deterministisk affärslogik.
 *
 * Reglerna får inte bero på en språkmodells gissning. De körs i kod, testas med
 * Vitest (tests/risk.test.ts) och är samma regler som i prototypen:
 *   1. ingen reflektion på >= 10 dagar               -> typ "inaktivitet"
 *   2. snitt(3 senaste) - snitt(3 första) <= -1.0    -> typ "trend"
 *   3. träningsnärvaro < 45 %                        -> typ "narvaro"
 * Reglerna prövas i den ordningen och första träffen vinner.
 */

export type RiskType = "inaktivitet" | "trend" | "narvaro";

export type RiskResult =
  | { risk: false }
  | { risk: true; type: RiskType; reason: string };

export type RiskInput = {
  /** Mående 1–5 i kronologisk ordning, äldst först. */
  moods: number[];
  /** Antal dagar sedan senaste reflektionen. null = har aldrig reflekterat. */
  daysSinceLastReflection: number | null;
  /** Träningsnärvaro i procent, 0–100. */
  attendance: number;
};

export const INACTIVITY_DAYS = 10;
export const MOOD_DROP_LIMIT = -1.0;
export const ATTENDANCE_LIMIT = 45;
/** Under fyra reflektioner går det inte att jämföra tre första mot tre senaste. */
export const MIN_MOODS_FOR_TREND = 4;

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Snittförändring: positivt tal = måendet har förbättrats över perioden. */
export function moodDelta(moods: number[]): number | null {
  if (moods.length < MIN_MOODS_FOR_TREND) return null;
  return average(moods.slice(-3)) - average(moods.slice(0, 3));
}

export function computeDropoutRisk(input: RiskInput): RiskResult {
  const { moods, daysSinceLastReflection, attendance } = input;

  if (daysSinceLastReflection === null) {
    return {
      risk: true,
      type: "inaktivitet",
      reason: "ingen reflektion registrerad ännu",
    };
  }
  if (daysSinceLastReflection >= INACTIVITY_DAYS) {
    return {
      risk: true,
      type: "inaktivitet",
      reason: `ingen reflektion på ${daysSinceLastReflection} dagar`,
    };
  }

  const delta = moodDelta(moods);
  if (delta !== null && delta <= MOOD_DROP_LIMIT) {
    const first = average(moods.slice(0, 3));
    const last = average(moods.slice(-3));
    return {
      risk: true,
      type: "trend",
      reason: `sjunkande mående (${first.toFixed(1)} → ${last.toFixed(1)}) senaste veckorna`,
    };
  }

  if (attendance < ATTENDANCE_LIMIT) {
    return {
      risk: true,
      type: "narvaro",
      reason: `låg träningsnärvaro (${attendance} %)`,
    };
  }

  return { risk: false };
}

/** Tydlig förbättring används i veckosammanfattningen. */
export function isImproving(moods: number[]): boolean {
  const delta = moodDelta(moods);
  return delta !== null && delta >= 1;
}
