import type { MuscleGroup } from "./constants";

export type Exercise = { name: string; detail: string };

export const EXERCISES: Record<MuscleGroup, { lätt: Exercise[]; tung: Exercise[] }> = {
  Axlar: {
    lätt: [
      { name: "Axelcirklar med lätt band", detail: "2×15, kontrollerat" },
      { name: "Skulderbladsklämningar", detail: "2×12" },
      { name: "Rotatorcuff-rörlighet", detail: "2×10 per sida" },
    ],
    tung: [
      { name: "Militärpress", detail: "4×8" },
      { name: "Sidolyft med hantlar", detail: "3×12" },
      { name: "Rodd med skivstång", detail: "4×8" },
    ],
  },
  Ben: {
    lätt: [
      { name: "Kroppsviktsknäböj", detail: "2×15" },
      { name: "Höftlyft", detail: "2×15" },
      { name: "Vadpress, lätt", detail: "2×20" },
    ],
    tung: [
      { name: "Knäböj med skivstång", detail: "4×6–8" },
      { name: "Utfallssteg med vikt", detail: "3×10 per ben" },
      { name: "Marklyft", detail: "4×6" },
    ],
  },
  Core: {
    lätt: [
      { name: "Plankan", detail: "3×30 sek" },
      { name: "Sidoplanka", detail: "2×20 sek per sida" },
      { name: "Fågelhund", detail: "2×10 per sida" },
    ],
    tung: [
      { name: "Rotationskast med boll", detail: "3×12" },
      { name: "Hängande benlyft", detail: "3×10" },
      { name: "Plankan med belastning", detail: "3×40 sek" },
    ],
  },
  Rygg: {
    lätt: [
      { name: "Katt-ko rörlighet", detail: "2×10" },
      { name: "Superman, lätt", detail: "2×12" },
      { name: "Rygghäng, passivt", detail: "2×20 sek" },
    ],
    tung: [
      { name: "Marklyft", detail: "4×6" },
      { name: "Kroppsviktsrodd", detail: "3×12" },
      { name: "Latsdrag", detail: "4×8" },
    ],
  },
  Helkropp: {
    lätt: [
      { name: "Lätt rörlighetsflöde", detail: "10 min" },
      { name: "Promenad + dynamisk stretch", detail: "15 min" },
      { name: "Yoga för tennisspelare", detail: "15 min" },
    ],
    tung: [
      { name: "Burpees", detail: "3×10" },
      { name: "Kettlebell swings", detail: "4×15" },
      { name: "Cirkelpass helkropp", detail: "20 min" },
    ],
  },
};

export function exercisesFor(muscleGroup: MuscleGroup, level: "lätt" | "tung"): Exercise[] {
  return EXERCISES[muscleGroup][level];
}
