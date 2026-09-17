export const ROLE = { COACH: "COACH", PLAYER: "PLAYER" } as const;
export type Role = (typeof ROLE)[keyof typeof ROLE];

export const INTENSITY = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  REST: "REST",
} as const;
export type Intensity = (typeof INTENSITY)[keyof typeof INTENSITY];

export const FLAG_TYPE = {
  ESCALATION: "ESCALATION",
  FOLLOWUP: "FOLLOWUP",
  DROPOUT_RISK: "DROPOUT_RISK",
} as const;
export type FlagType = (typeof FLAG_TYPE)[keyof typeof FLAG_TYPE];

export const MUSCLE_GROUPS = ["Axlar", "Ben", "Core", "Rygg", "Helkropp"] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/** 0 = måndag ... 6 = söndag */
export const DAYS = ["Mån", "Tis", "Ons", "Tors", "Fre", "Lör", "Sön"] as const;

export const INTENSITY_LABEL: Record<string, string> = {
  HIGH: "Hög",
  MEDIUM: "Medel",
  LOW: "Låg",
  REST: "Vila",
};

export const REFLECTION_TAGS = [
  { tag: "Andraserve", emoji: "🎾" },
  { tag: "Press-poäng", emoji: "😤" },
  { tag: "Tappade humöret", emoji: "😞" },
  { tag: "Koncentration", emoji: "🧠" },
] as const;
