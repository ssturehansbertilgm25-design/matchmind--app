import { describe, expect, it } from "vitest";
import { checkLoad, circularDayDistance, dayLabel, type ScheduleLike } from "../lib/load";

/** Emmas veckoschema i seed-datan. Måndag = 0. */
const schedule: ScheduleLike[] = [
  { weekday: 0, focus: "Styrka (ben)", muscleGroup: "Ben", intensity: "HIGH" },
  { weekday: 1, focus: "Vila", muscleGroup: null, intensity: "REST" },
  { weekday: 2, focus: "Matchspel", muscleGroup: null, intensity: "MEDIUM" },
  { weekday: 3, focus: "Styrka (axlar/core)", muscleGroup: "Axlar", intensity: "HIGH" },
  { weekday: 4, focus: "Vila", muscleGroup: null, intensity: "REST" },
  { weekday: 5, focus: "Match", muscleGroup: null, intensity: "HIGH" },
  { weekday: 6, focus: "Lätt rörlighet", muscleGroup: "Helkropp", intensity: "LOW" },
];

describe("circularDayDistance", () => {
  it("räknar veckan cirkulärt — söndag och måndag ligger en dag isär", () => {
    expect(circularDayDistance(6, 0)).toBe(1);
    expect(circularDayDistance(0, 3)).toBe(3);
    expect(circularDayDistance(0, 4)).toBe(3);
    expect(circularDayDistance(2, 2)).toBe(0);
  });
});

describe("checkLoad", () => {
  it("varnar för extra benträning dagen efter ett hårt benpass", () => {
    const decision = checkLoad(schedule, "Ben", 1);
    expect(decision.approved).toBe(false);
    expect(decision.level).toBe("lätt");
    expect(decision.hardDayLabel).toBe("Mån");
    expect(decision.distanceToHardDay).toBe(1);
    expect(decision.reason).toContain("skaderisken");
  });

  it("varnar även dagen före ett hårt pass, räknat över veckoskiftet", () => {
    const decision = checkLoad(schedule, "Ben", 6);
    expect(decision.approved).toBe(false);
    expect(decision.distanceToHardDay).toBe(1);
  });

  it("godkänner tung benträning två dagar från det hårda passet", () => {
    const decision = checkLoad(schedule, "Ben", 2);
    expect(decision.approved).toBe(true);
    expect(decision.level).toBe("tung");
    expect(decision.suggestedWeekday).toBeNull();
  });

  it("varnar när den önskade dagen redan är markerad som hård", () => {
    const decision = checkLoad(schedule, "Ben", 5);
    expect(decision.approved).toBe(false);
    expect(decision.alreadyHighThatDay).toBe(true);
    expect(decision.reason).toContain("redan en hård dag");
  });

  it("föreslår den vilo- eller lågdag som ligger längst från det hårda passet", () => {
    const decision = checkLoad(schedule, "Ben", 1);
    expect(decision.suggestedDayLabel).toBe("Fre");
  });

  it("godkänner en muskelgrupp som inte tränas hårt i schemat", () => {
    const decision = checkLoad(schedule, "Rygg", 2);
    expect(decision.approved).toBe(true);
    expect(decision.hardDayLabel).toBeNull();
    expect(decision.reason).toContain("Inget hårt pass");
  });

  it("tar hänsyn till rätt muskelgrupp, inte bara till hårda dagar", () => {
    // Torsdag är hård för axlar men inte för ben, och ligger tre dagar från måndag.
    const decision = checkLoad(schedule, "Axlar", 2);
    expect(decision.hardDayLabel).toBe("Tors");
    expect(decision.approved).toBe(false);
  });

  it("översätter veckodagar till svenska etiketter", () => {
    expect(dayLabel(0)).toBe("Mån");
    expect(dayLabel(6)).toBe("Sön");
  });
});
