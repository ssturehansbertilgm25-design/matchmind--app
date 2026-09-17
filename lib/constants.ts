export const ROLE = { FOUNDER: "FOUNDER", COACH: "COACH", PLAYER: "PLAYER" } as const;
export type Role = (typeof ROLE)[keyof typeof ROLE];

export const ROLE_LABEL: Record<string, string> = {
  FOUNDER: "Founder",
  COACH: "Tränare",
  PLAYER: "Spelare",
};

/** Var varje roll landar efter inloggning. */
export const HOME_FOR_ROLE: Record<string, string> = {
  FOUNDER: "/founder",
  COACH: "/coach",
  PLAYER: "/player",
};

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

export const FLAG_LABEL: Record<string, string> = {
  ESCALATION: "Eskalering",
  FOLLOWUP: "Uppföljning",
  DROPOUT_RISK: "Avhoppsrisk",
};

export const MUSCLE_GROUPS = ["Axlar", "Ben", "Core", "Rygg", "Helkropp"] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/** 0 = måndag ... 6 = söndag */
export const DAYS = ["Mån", "Tis", "Ons", "Tors", "Fre", "Lör", "Sön"] as const;
export const DAYS_LONG = [
  "Måndag",
  "Tisdag",
  "Onsdag",
  "Torsdag",
  "Fredag",
  "Lördag",
  "Söndag",
] as const;

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

/** Åtgärder som hamnar i granskningsloggen. */
export const AUDIT = {
  FOUNDER_CREATED: "FOUNDER_CREATED",
  INVITE_CREATED: "INVITE_CREATED",
  INVITE_REVOKED: "INVITE_REVOKED",
  INVITE_ACCEPTED: "INVITE_ACCEPTED",
  CLUB_CREATED: "CLUB_CREATED",
  CLUB_RENAMED: "CLUB_RENAMED",
  CLUB_DELETED: "CLUB_DELETED",
  USER_ROLE_CHANGED: "USER_ROLE_CHANGED",
  USER_CLUB_CHANGED: "USER_CLUB_CHANGED",
  USER_DEACTIVATED: "USER_DEACTIVATED",
  USER_REACTIVATED: "USER_REACTIVATED",
  USER_DELETED: "USER_DELETED",
  USER_SESSIONS_REVOKED: "USER_SESSIONS_REVOKED",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  TEAM_PLAN_EDITED: "TEAM_PLAN_EDITED",
  FLAG_RESOLVED: "FLAG_RESOLVED",
  REFLECTION_TEXT_REVEALED: "REFLECTION_TEXT_REVEALED",
} as const;
export type AuditAction = (typeof AUDIT)[keyof typeof AUDIT];

export const AUDIT_LABEL: Record<string, string> = {
  FOUNDER_CREATED: "Founder-konto skapat",
  INVITE_CREATED: "Inbjudan skapad",
  INVITE_REVOKED: "Inbjudan återkallad",
  INVITE_ACCEPTED: "Inbjudan accepterad",
  CLUB_CREATED: "Klubb skapad",
  CLUB_RENAMED: "Klubb omdöpt",
  CLUB_DELETED: "Klubb raderad",
  USER_ROLE_CHANGED: "Roll ändrad",
  USER_CLUB_CHANGED: "Klubbtillhörighet ändrad",
  USER_DEACTIVATED: "Konto avaktiverat",
  USER_REACTIVATED: "Konto återaktiverat",
  USER_DELETED: "Konto raderat",
  USER_SESSIONS_REVOKED: "Sessioner avslutade",
  PASSWORD_CHANGED: "Lösenord ändrat",
  TEAM_PLAN_EDITED: "Träningsplan ändrad",
  FLAG_RESOLVED: "Flagga åtgärdad",
  REFLECTION_TEXT_REVEALED: "Reflektionstext öppnad (break-glass)",
};
