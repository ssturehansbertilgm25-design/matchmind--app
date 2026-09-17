/**
 * Belastningskoll för extra träning — deterministisk affärslogik.
 *
 * Skaderisk får inte avgöras av en språkmodell. Beslutet fattas här och skickas
 * in som fakta till AI:n, som bara formulerar texten runt det.
 *
 *   - Slå upp när muskelgruppen senast tränades hårt i spelarens schema.
 *   - Ligger den önskade dagen <= 1 dag från ett hårt pass för samma muskelgrupp,
 *     eller är dagen redan markerad HIGH -> varning för överbelastning, förslag på
 *     vilo-/lågdag istället, och lätta övningar.
 *   - Annars -> godkänt, tunga övningar.
 */

import { DAYS, INTENSITY } from "./constants";

export type ScheduleLike = {
  weekday: number;
  focus: string;
  muscleGroup: string | null;
  intensity: string;
};

export type LoadDecision = {
  /** true = passet går bra att lägga på den önskade dagen. */
  approved: boolean;
  level: "lätt" | "tung";
  muscleGroup: string;
  requestedWeekday: number;
  requestedDayLabel: string;
  /** Närmaste hårda pass för samma muskelgrupp, om något finns. */
  hardWeekday: number | null;
  hardDayLabel: string | null;
  hardFocus: string | null;
  distanceToHardDay: number | null;
  alreadyHighThatDay: boolean;
  /** Föreslagen alternativ dag vid varning. */
  suggestedWeekday: number | null;
  suggestedDayLabel: string | null;
  reason: string;
};

export function dayLabel(weekday: number): string {
  return DAYS[((weekday % 7) + 7) % 7];
}

/** Avstånd i dagar i en cirkulär vecka: måndag och söndag ligger 1 dag isär. */
export function circularDayDistance(a: number, b: number): number {
  const raw = Math.abs(a - b) % 7;
  return Math.min(raw, 7 - raw);
}

export function checkLoad(
  schedule: ScheduleLike[],
  muscleGroup: string,
  requestedWeekday: number,
): LoadDecision {
  const hardEntries = schedule.filter(
    (entry) => entry.muscleGroup === muscleGroup && entry.intensity === INTENSITY.HIGH,
  );

  let nearest: ScheduleLike | null = null;
  let nearestDistance: number | null = null;
  for (const entry of hardEntries) {
    const distance = circularDayDistance(entry.weekday, requestedWeekday);
    if (nearestDistance === null || distance < nearestDistance) {
      nearest = entry;
      nearestDistance = distance;
    }
  }

  const requestedEntry = schedule.find((entry) => entry.weekday === requestedWeekday);
  const alreadyHighThatDay = requestedEntry?.intensity === INTENSITY.HIGH;
  const tooClose = nearestDistance !== null && nearestDistance <= 1;
  const approved = !tooClose && !alreadyHighThatDay;

  const suggested = approved ? null : suggestRecoveryDay(schedule, hardEntries);

  const base = {
    level: (approved ? "tung" : "lätt") as "tung" | "lätt",
    muscleGroup,
    requestedWeekday,
    requestedDayLabel: dayLabel(requestedWeekday),
    hardWeekday: nearest?.weekday ?? null,
    hardDayLabel: nearest ? dayLabel(nearest.weekday) : null,
    hardFocus: nearest?.focus ?? null,
    distanceToHardDay: nearestDistance,
    alreadyHighThatDay,
    suggestedWeekday: suggested?.weekday ?? null,
    suggestedDayLabel: suggested ? dayLabel(suggested.weekday) : null,
  };

  if (approved) {
    return {
      ...base,
      approved: true,
      reason: nearest
        ? `${muscleGroup} tränades senast hårt på ${dayLabel(nearest.weekday)}, ${nearestDistance} dagar från ${dayLabel(requestedWeekday)} — kroppen har hunnit återhämta sig.`
        : `Inget hårt pass för ${muscleGroup.toLowerCase()} i veckoschemat, så ${dayLabel(requestedWeekday)} är ledigt för tyngre belastning.`,
    };
  }

  const parts: string[] = [];
  if (tooClose && nearest) {
    parts.push(
      `${muscleGroup.toLowerCase()} tränas redan hårt på ${dayLabel(nearest.weekday)} (${nearest.focus}), bara ${nearestDistance} dag${nearestDistance === 1 ? "" : "ar"} från ${dayLabel(requestedWeekday)}`,
    );
  }
  if (alreadyHighThatDay && requestedEntry) {
    parts.push(
      `${dayLabel(requestedWeekday)} är redan en hård dag i schemat (${requestedEntry.focus})`,
    );
  }

  return {
    ...base,
    approved: false,
    reason: `${parts.join(" och ")} — för kort återhämtning ökar skaderisken.`,
  };
}

/** Vilo- eller lågdag som ligger längst från de hårda passen. */
function suggestRecoveryDay(
  schedule: ScheduleLike[],
  hardEntries: ScheduleLike[],
): ScheduleLike | null {
  const candidates = schedule.filter(
    (entry) => entry.intensity === INTENSITY.REST || entry.intensity === INTENSITY.LOW,
  );
  if (candidates.length === 0) return null;
  if (hardEntries.length === 0) return candidates[0];

  return candidates.reduce((best, entry) => {
    const distance = (candidate: ScheduleLike) =>
      Math.min(...hardEntries.map((h) => circularDayDistance(h.weekday, candidate.weekday)));
    return distance(entry) > distance(best) ? entry : best;
  }, candidates[0]);
}
