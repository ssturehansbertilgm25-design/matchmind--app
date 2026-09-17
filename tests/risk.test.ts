import { describe, expect, it } from "vitest";
import { average, computeDropoutRisk, isImproving, moodDelta } from "../lib/risk";

const stable = [3, 3, 3, 3, 3, 3, 3];

describe("computeDropoutRisk", () => {
  it("flaggar inaktivitet vid 10 dagar eller mer utan reflektion", () => {
    const result = computeDropoutRisk({
      moods: stable,
      daysSinceLastReflection: 10,
      attendance: 90,
    });
    expect(result).toMatchObject({ risk: true, type: "inaktivitet" });
    expect(result.risk && result.reason).toContain("10 dagar");
  });

  it("flaggar inte vid 9 dagar", () => {
    expect(
      computeDropoutRisk({ moods: stable, daysSinceLastReflection: 9, attendance: 90 }),
    ).toEqual({ risk: false });
  });

  it("flaggar spelare som aldrig reflekterat", () => {
    expect(
      computeDropoutRisk({ moods: [], daysSinceLastReflection: null, attendance: 90 }),
    ).toMatchObject({ risk: true, type: "inaktivitet" });
  });

  it("flaggar sjunkande trend när snittet faller minst 1.0", () => {
    // Tre första: 4.0. Tre senaste: 2.0. Delta -2.0.
    const result = computeDropoutRisk({
      moods: [4, 4, 4, 3, 2, 2, 2],
      daysSinceLastReflection: 1,
      attendance: 90,
    });
    expect(result).toMatchObject({ risk: true, type: "trend" });
    expect(result.risk && result.reason).toContain("4.0 → 2.0");
  });

  it("flaggar exakt på gränsen -1.0", () => {
    // Tre första: 4.0. Tre senaste: 3.0.
    expect(
      computeDropoutRisk({
        moods: [4, 4, 4, 3, 3, 3, 3],
        daysSinceLastReflection: 1,
        attendance: 90,
      }),
    ).toMatchObject({ risk: true, type: "trend" });
  });

  it("flaggar inte ett fall mindre än 1.0", () => {
    // Tre första: 4.0. Tre senaste: 3.33.
    expect(
      computeDropoutRisk({
        moods: [4, 4, 4, 3, 3, 3, 4],
        daysSinceLastReflection: 1,
        attendance: 90,
      }),
    ).toEqual({ risk: false });
  });

  it("flaggar låg träningsnärvaro under 45 procent", () => {
    const result = computeDropoutRisk({
      moods: stable,
      daysSinceLastReflection: 1,
      attendance: 44,
    });
    expect(result).toMatchObject({ risk: true, type: "narvaro" });
    expect(result.risk && result.reason).toContain("44");
  });

  it("flaggar inte vid exakt 45 procent", () => {
    expect(
      computeDropoutRisk({ moods: stable, daysSinceLastReflection: 1, attendance: 45 }),
    ).toEqual({ risk: false });
  });

  it("låter inaktivitet gå före både trend och närvaro", () => {
    expect(
      computeDropoutRisk({
        moods: [5, 5, 5, 2, 1, 1, 1],
        daysSinceLastReflection: 20,
        attendance: 10,
      }),
    ).toMatchObject({ type: "inaktivitet" });
  });

  it("hoppar över trendregeln med för få reflektioner", () => {
    expect(
      computeDropoutRisk({ moods: [5, 1, 1], daysSinceLastReflection: 1, attendance: 90 }),
    ).toEqual({ risk: false });
  });
});

describe("hjälpfunktioner", () => {
  it("average räknar snitt och klarar tom lista", () => {
    expect(average([1, 2, 3, 4])).toBe(2.5);
    expect(average([])).toBe(0);
  });

  it("moodDelta är null under fyra värden", () => {
    expect(moodDelta([3, 3, 3])).toBeNull();
    expect(moodDelta([2, 2, 2, 5])).toBeCloseTo(1, 5);
  });

  it("isImproving kräver en uppgång på minst 1.0", () => {
    expect(isImproving([3, 3, 4, 3, 4, 5, 5])).toBe(true);
    expect(isImproving([4, 4, 4, 4, 4, 4, 4])).toBe(false);
  });
});
