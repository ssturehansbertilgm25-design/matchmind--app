/**
 * Seed — en klubb, en tränare och de 15 spelarna från prototypen.
 *
 * Reflektionerna sprids över de senaste fyra veckorna så att mående-trender och
 * riskberäkningar (lib/risk.ts) blir meningsfulla. Varje spelare får ett veckoschema
 * med muskelgrupper, vilket belastningskollen (lib/load.ts) bygger på.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "demo1234";
const CLUB_NAME = "Apelryds Tennisklubb";

const TEAM_PLAN = `Denna period: bygg upp benstyrka och explosivitet inför säsongsstart, men undvik tung underkroppsträning dagen innan matchdagar. Axlar/core tränas tungt en gång i veckan, aldrig två dagar i rad. Söndagar är alltid lätt rörlighet eller vila — ingen tung belastning.`;

type ScheduleSeed = {
  weekday: number;
  time: string | null;
  focus: string;
  muscleGroup: string | null;
  intensity: "HIGH" | "MEDIUM" | "LOW" | "REST";
};

const SCHEDULE_PATTERNS: ScheduleSeed[][] = [
  [
    { weekday: 0, time: "17:00", focus: "Styrka (ben)", muscleGroup: "Ben", intensity: "HIGH" },
    { weekday: 1, time: null, focus: "Vila", muscleGroup: null, intensity: "REST" },
    { weekday: 2, time: "17:00", focus: "Matchspel", muscleGroup: null, intensity: "MEDIUM" },
    { weekday: 3, time: "16:00", focus: "Styrka (axlar/core)", muscleGroup: "Axlar", intensity: "HIGH" },
    { weekday: 4, time: null, focus: "Vila", muscleGroup: null, intensity: "REST" },
    { weekday: 5, time: "10:00", focus: "Match", muscleGroup: null, intensity: "HIGH" },
    { weekday: 6, time: null, focus: "Lätt rörlighet", muscleGroup: "Helkropp", intensity: "LOW" },
  ],
  [
    { weekday: 0, time: "16:30", focus: "Teknik", muscleGroup: null, intensity: "MEDIUM" },
    { weekday: 1, time: "17:30", focus: "Styrka (helkropp)", muscleGroup: "Helkropp", intensity: "HIGH" },
    { weekday: 2, time: null, focus: "Vila", muscleGroup: null, intensity: "REST" },
    { weekday: 3, time: "17:00", focus: "Matchspel", muscleGroup: null, intensity: "MEDIUM" },
    { weekday: 4, time: "16:00", focus: "Styrka (ben)", muscleGroup: "Ben", intensity: "HIGH" },
    { weekday: 5, time: null, focus: "Vila", muscleGroup: null, intensity: "REST" },
    { weekday: 6, time: "10:00", focus: "Match", muscleGroup: null, intensity: "HIGH" },
  ],
  [
    { weekday: 0, time: null, focus: "Vila", muscleGroup: null, intensity: "REST" },
    { weekday: 1, time: "17:00", focus: "Teknik", muscleGroup: null, intensity: "MEDIUM" },
    { weekday: 2, time: "16:30", focus: "Styrka (core/rygg)", muscleGroup: "Core", intensity: "HIGH" },
    { weekday: 3, time: null, focus: "Vila", muscleGroup: null, intensity: "REST" },
    { weekday: 4, time: "17:00", focus: "Matchspel", muscleGroup: null, intensity: "MEDIUM" },
    { weekday: 5, time: "11:00", focus: "Styrka (ben)", muscleGroup: "Ben", intensity: "HIGH" },
    { weekday: 6, time: null, focus: "Lätt rörlighet", muscleGroup: "Helkropp", intensity: "LOW" },
  ],
];

type PlayerSeed = {
  firstName: string;
  lastName: string;
  level: string;
  birthYear: number;
  /** Mående 1–5, äldst först. */
  trend: number[];
  /** Tagg som spelarens reflektioner brukar sättas på. */
  tag: string | null;
  attendance: number;
  daysSinceLast: number;
  schedule: number;
  /** Texter till de senaste reflektionerna, nyast först. */
  history: { text: string; sharedWithCoach?: boolean }[];
  followupFlag?: string;
};

const PLAYERS: PlayerSeed[] = [
  {
    firstName: "Emma",
    lastName: "Lindqvist",
    level: "Tävling, DM-nivå",
    birthYear: 2010,
    trend: [3, 3, 4, 3, 4, 5, 5],
    tag: "Andraserve",
    attendance: 92,
    daysSinceLast: 1,
    schedule: 0,
    history: [
      { text: "Kände mig trygg på andraserven idag, vågade slå igenom på press-poäng.", sharedWithCoach: true },
      { text: "Fortfarande lite försiktig på 5-4, men bättre än förra veckan." },
      { text: "Dubbelfelade två gånger på press-poäng, kändes tungt." },
    ],
  },
  {
    firstName: "Viktor",
    lastName: "Åström",
    level: "Tävling, regionnivå",
    birthYear: 2009,
    trend: [4, 4, 3, 4, 4, 4, 4],
    tag: null,
    attendance: 85,
    daysSinceLast: 2,
    schedule: 1,
    history: [
      { text: "Bra match, höll fokus genom hela tredje setet." },
      { text: "Okej dag, inget speciellt att lyfta." },
    ],
  },
  {
    firstName: "Alice",
    lastName: "Berggren",
    level: "Tävling, DM-nivå",
    birthYear: 2010,
    trend: [2, 2, 3, 2, 1, 2, 2],
    tag: "Press-poäng",
    attendance: 60,
    daysSinceLast: 2,
    schedule: 2,
    history: [
      { text: "Tappade fokus helt efter att ha missat två brytbollar. Kändes svårt att komma tillbaka." },
      { text: "Nervös redan innan matchen började, kunde inte skaka av mig det." },
      { text: "Samma sak som förra veckan — brytbollar känns tunga." },
    ],
    followupFlag: "Hör av dig till spelaren — ta ett kort enskilt samtal om press-poängen före nästa match.",
  },
  {
    firstName: "Oscar",
    lastName: "Nilsson",
    level: "Fritid, klubbnivå",
    birthYear: 2012,
    trend: [4, 5, 4, 4, 5, 5, 4],
    tag: "Koncentration",
    attendance: 70,
    daysSinceLast: 3,
    schedule: 0,
    history: [
      { text: "Trivs bra med sparringen just nu, känner mig taggad inför säsongen.", sharedWithCoach: true },
    ],
  },
  {
    firstName: "Elsa",
    lastName: "Holm",
    level: "Tävling, regionnivå",
    birthYear: 2009,
    trend: [3, 4, 4, 5, 5, 4, 5],
    tag: "Andraserve",
    attendance: 88,
    daysSinceLast: 1,
    schedule: 1,
    history: [
      { text: "Andraserven känns äntligen som ett vapen, inte en risk." },
      { text: "Fortsätter jobba på att sikta istället för att bara inte missa." },
    ],
  },
  {
    firstName: "Liam",
    lastName: "Karlsson",
    level: "Fritid, klubbnivå",
    birthYear: 2011,
    trend: [3, 3, 3, 3, 3, 3, 3],
    tag: null,
    attendance: 35,
    daysSinceLast: 14,
    schedule: 2,
    history: [{ text: "Har inte spelat så mycket senaste veckorna." }],
  },
  {
    firstName: "Wilma",
    lastName: "Öberg",
    level: "Tävling, DM-nivå",
    birthYear: 2008,
    trend: [4, 4, 5, 4, 4, 5, 5],
    tag: "Koncentration",
    attendance: 95,
    daysSinceLast: 1,
    schedule: 0,
    history: [{ text: "Stark match, kände mig lugn även när ställningen var jämn." }],
  },
  {
    firstName: "Hugo",
    lastName: "Ekström",
    level: "Tävling, regionnivå",
    birthYear: 2010,
    trend: [3, 2, 3, 2, 3, 2, 3],
    tag: "Tappade humöret",
    attendance: 78,
    daysSinceLast: 3,
    schedule: 1,
    history: [
      { text: "Blev arg på mig själv efter enkla missar, tog med mig det för länge in i matchen." },
    ],
  },
  {
    firstName: "Ines",
    lastName: "Dahl",
    level: "Fritid, klubbnivå",
    birthYear: 2012,
    trend: [4, 4, 4, 5, 4, 4, 5],
    tag: null,
    attendance: 65,
    daysSinceLast: 4,
    schedule: 2,
    history: [{ text: "Bra känsla i kroppen, inget mentalt som stör just nu." }],
  },
  {
    firstName: "Noah",
    lastName: "Sjöberg",
    level: "Tävling, DM-nivå",
    birthYear: 2009,
    trend: [2, 3, 2, 2, 3, 2, 2],
    tag: "Press-poäng",
    attendance: 55,
    daysSinceLast: 2,
    schedule: 0,
    history: [
      { text: "Spelar för säkert när det är jämnt, vågar inte ta risker på viktiga poäng." },
      { text: "Samma mönster igen — blir passiv i tighta lägen." },
    ],
    followupFlag: "Hör av dig till spelaren — mental uppföljning kring press-poäng.",
  },
  {
    firstName: "Saga",
    lastName: "Nyström",
    level: "Tävling, regionnivå",
    birthYear: 2008,
    trend: [4, 4, 4, 5, 5, 5, 5],
    tag: "Koncentration",
    attendance: 90,
    daysSinceLast: 1,
    schedule: 1,
    history: [{ text: "Känner mig starkare mentalt för varje vecka som går." }],
  },
  {
    firstName: "Elias",
    lastName: "Fagerberg",
    level: "Fritid, klubbnivå",
    birthYear: 2011,
    trend: [3, 4, 3, 4, 4, 3, 4],
    tag: null,
    attendance: 72,
    daysSinceLast: 3,
    schedule: 2,
    history: [{ text: "Vanlig träningsvecka, inget särskilt att lyfta." }],
  },
  {
    firstName: "Freja",
    lastName: "Lund",
    level: "Tävling, DM-nivå",
    birthYear: 2008,
    trend: [5, 5, 4, 5, 5, 5, 5],
    tag: "Koncentration",
    attendance: 96,
    daysSinceLast: 1,
    schedule: 0,
    history: [{ text: "Bästa matchkänslan hittills i höst, allt klaffade mentalt." }],
  },
  {
    firstName: "Melvin",
    lastName: "Ström",
    level: "Fritid, klubbnivå",
    birthYear: 2011,
    trend: [4, 4, 3, 3, 2, 2, 2],
    tag: null,
    attendance: 58,
    daysSinceLast: 6,
    schedule: 1,
    history: [
      { text: "Känns som att jag inte kommer någon vart, samma nivå i flera månader nu." },
      { text: "Mindre sugen på att åka till träningen senaste tiden." },
    ],
  },
  {
    firstName: "Alva",
    lastName: "Rosén",
    level: "Tävling, regionnivå",
    birthYear: 2009,
    trend: [3, 3, 3, 2, 3, 3, 3],
    tag: "Koncentration",
    attendance: 80,
    daysSinceLast: 2,
    schedule: 2,
    history: [{ text: "Tappar koncentrationen lite mot slutet av längre matcher." }],
  },
];

const EMAILS: Record<string, string> = {
  Emma: "emma@matchmind.se",
  Viktor: "viktor@matchmind.se",
  Alice: "alice@matchmind.se",
  Oscar: "oscar@matchmind.se",
  Elsa: "elsa@matchmind.se",
  Liam: "liam@matchmind.se",
  Wilma: "wilma@matchmind.se",
  Hugo: "hugo@matchmind.se",
  Ines: "ines@matchmind.se",
  Noah: "noah@matchmind.se",
  Saga: "saga@matchmind.se",
  Elias: "elias@matchmind.se",
  Freja: "freja@matchmind.se",
  Melvin: "melvin@matchmind.se",
  Alva: "alva@matchmind.se",
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Reflektionsdatum bakåt i tiden, jämnt fördelade inom de senaste ~4 veckorna. */
function reflectionDates(count: number, daysSinceLast: number): Date[] {
  const now = Date.now();
  const spacing = Math.max(1, Math.floor((26 - daysSinceLast) / Math.max(1, count - 1)));
  const dates: Date[] = [];
  for (let i = 0; i < count; i++) {
    const daysAgo = daysSinceLast + spacing * (count - 1 - i);
    dates.push(new Date(now - daysAgo * DAY_MS - 9 * 60 * 60 * 1000));
  }
  return dates;
}

async function main() {
  console.log("Rensar befintlig data...");
  await prisma.message.deleteMany();
  await prisma.flag.deleteMany();
  await prisma.aiFeedback.deleteMany();
  await prisma.reflection.deleteMany();
  await prisma.scheduleEntry.deleteMany();
  await prisma.coachNote.deleteMany();
  await prisma.session.deleteMany();
  await prisma.playerProfile.deleteMany();
  await prisma.teamPlan.deleteMany();
  await prisma.user.deleteMany();
  await prisma.club.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const club = await prisma.club.create({ data: { name: CLUB_NAME } });
  await prisma.teamPlan.create({ data: { clubId: club.id, text: TEAM_PLAN } });

  const coach = await prisma.user.create({
    data: {
      email: "coach@matchmind.se",
      passwordHash,
      name: "Johan Wide",
      role: "COACH",
      clubId: club.id,
    },
  });

  const playersByFirstName = new Map<string, string>();

  for (const seed of PLAYERS) {
    const player = await prisma.user.create({
      data: {
        email: EMAILS[seed.firstName],
        passwordHash,
        name: `${seed.firstName} ${seed.lastName}`,
        role: "PLAYER",
        clubId: club.id,
        profile: {
          create: {
            level: seed.level,
            birthYear: seed.birthYear,
            guardianConsent: true,
            guardianEmail: `foralder.${seed.firstName.toLowerCase()}@example.com`,
            coachId: coach.id,
            trainingAttendance: seed.attendance,
          },
        },
      },
    });
    playersByFirstName.set(seed.firstName, player.id);

    await prisma.scheduleEntry.createMany({
      data: SCHEDULE_PATTERNS[seed.schedule].map((entry) => ({
        playerId: player.id,
        weekday: entry.weekday,
        time: entry.time,
        focus: entry.focus,
        muscleGroup: entry.muscleGroup,
        intensity: entry.intensity,
      })),
    });

    const dates = reflectionDates(seed.trend.length, seed.daysSinceLast);
    for (let i = 0; i < seed.trend.length; i++) {
      // history[0] är den nyaste texten; äldre reflektioner har bara mående + tagg.
      const historyIndex = seed.trend.length - 1 - i;
      const entry = seed.history[historyIndex];
      await prisma.reflection.create({
        data: {
          playerId: player.id,
          mood: seed.trend[i],
          tag: seed.tag,
          text: entry?.text ?? null,
          sharedWithCoach: entry?.sharedWithCoach ?? false,
          createdAt: dates[i],
        },
      });
    }

    if (seed.followupFlag) {
      await prisma.flag.create({
        data: { playerId: player.id, type: "FOLLOWUP", reason: seed.followupFlag },
      });
      await prisma.coachNote.create({
        data: {
          coachId: coach.id,
          playerId: player.id,
          text: "Ta ett kort enskilt samtal innan nästa match.",
        },
      });
    }
  }

  // Sparringkonversationer från prototypen (Emma är demospelaren).
  const emma = playersByFirstName.get("Emma")!;
  const conversations: { with: string; messages: { fromEmma: boolean; text: string }[] }[] = [
    { with: "Wilma", messages: [{ fromEmma: false, text: "Hej! Är du sugen på sparring imorgon?" }] },
    { with: "Oscar", messages: [{ fromEmma: false, text: "Vi kör bana 3 kl 17 imorgon om du vill hänga på?" }] },
    {
      with: "Saga",
      messages: [
        { fromEmma: true, text: "Vill du träna sparring på torsdag?" },
        { fromEmma: false, text: "Ja gärna! Funkar 16:30?" },
      ],
    },
  ];

  let offset = conversations.length * 4;
  for (const conversation of conversations) {
    const otherId = playersByFirstName.get(conversation.with)!;
    for (const message of conversation.messages) {
      await prisma.message.create({
        data: {
          fromUserId: message.fromEmma ? emma : otherId,
          toUserId: message.fromEmma ? otherId : emma,
          text: message.text,
          createdAt: new Date(Date.now() - offset * 60 * 60 * 1000),
        },
      });
      offset -= 1;
    }
  }

  const players = await prisma.user.count({ where: { role: "PLAYER" } });
  const reflections = await prisma.reflection.count();
  console.log(`Klart: ${players} spelare, ${reflections} reflektioner, klubb "${club.name}".`);
  console.log("Logga in med coach@matchmind.se / demo1234 eller emma@matchmind.se / demo1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
