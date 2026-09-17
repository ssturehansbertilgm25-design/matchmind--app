/**
 * AI-lagret — ENDA stället där Anthropic-API:t anropas.
 *
 * Körs alltid server-side (API-routes). ANTHROPIC_API_KEY får aldrig nå klienten.
 * Saknas nyckeln, eller är MOCK_AI=1 satt, körs deterministiska demosvar istället —
 * appen fungerar då fullt ut, med markering i UI:t att AI:n är i demoläge.
 *
 * Skaderisk och avhoppsrisk beslutas ALDRIG här, utan i lib/load.ts och lib/risk.ts.
 * AI:n formulerar bara text runt beslut som redan är fattade i kod.
 */

import Anthropic from "@anthropic-ai/sdk";

const TIMEOUT_MS = 20_000;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export function isMockMode(): boolean {
  return process.env.MOCK_AI === "1" || !process.env.ANTHROPIC_API_KEY;
}

export type ReflectionFeedback = {
  escalate: boolean;
  diagnosis: string;
  technique: string;
  followup: string;
  model: string;
};

const SYSTEM_PROMPT = `Du är MatchMinds mentala träningsstöd för tennisklubbar.

Du ger GENERELL MENTAL TRÄNING FÖR IDROTT — inte vård, terapi, diagnostik eller personlig
sportpsykologisk rådgivning. Du ställer aldrig diagnoser och ger aldrig medicinska eller
kliniska råd.

Målgruppen är tennisspelare 12–19 år. Svara på svenska, varmt men kort och konkret.

Svara ENDAST med giltig JSON, ingen inledning, inga kodstaket, inget efter JSON-objektet:
{"escalate": boolean, "diagnosis": string, "technique": string, "followup": string}

- diagnosis: vad som händer, förklarat som ett vanligt mönster, 2–4 meningar.
- technique: en konkret sak att testa nästa gång, 2–4 meningar.
- followup: en enkel, mätbar uppföljningspunkt, 1 mening.

Sätt escalate: true om reflektionen tyder på något allvarligare än vanlig matchfrustration
(uppgivenhet, hopplöshet, tecken på psykisk ohälsa, självskada, utsatthet). Bedöm på
innebörd, inte enbart nyckelord. Vid escalate: true ska diagnosis, technique och followup
lämnas tomma ("").`;

/**
 * Nyckelords-skyddsnät utöver modellens egen bedömning. Vissa formuleringar sätter
 * escalate = true oavsett vad modellen svarar — hellre en flagga för mycket.
 */
const ESCALATION_KEYWORDS = [
  "orkar inte mer",
  "orkar inte längre",
  "orkar ingenting",
  "vill inte spela mer",
  "vill inte hålla på längre",
  "ingen mening",
  "meningslöst",
  "ger upp helt",
  "hopplöst",
  "vill försvinna",
  "vill inte leva",
  "självmord",
  "ta livet av mig",
  "skada mig själv",
  "skär mig",
  "hatar mig själv",
  "ingen bryr sig",
  "mår skit hela tiden",
  "vågar inte berätta",
  "någon gör mig illa",
];

export function hasEscalationKeyword(text: string | null | undefined): boolean {
  if (!text) return false;
  const haystack = text.toLowerCase();
  return ESCALATION_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

/** Demosvar per tagg, hämtade från prototypens feedbackByTag. */
const MOCK_FEEDBACK: Record<string, Omit<ReflectionFeedback, "escalate" | "model">> = {
  Andraserve: {
    diagnosis:
      "Det du beskriver är ett klassiskt mönster: rädsla för dubbelfel gör att du omedvetet siktar på att inte missa istället för att sikta mot ett mål. Hjärnan kan inte rikta rörelsen mot en negation — resultatet blir en försiktig, kort serve utan spinn eller hastighet, vilket paradoxalt nog gör den lättare för motståndaren att attackera. Det är samma mönster som ligger bakom att många spelare dubbelfelar mer på press-poäng än på vanliga poäng, trots att tekniken i grunden är densamma.",
    technique:
      "Testa detta till din nästa match: innan varje andraserve, säg tyst för dig själv målet i positiva, konkreta termer — till exempel \"hög kick till backhanden\" eller \"djup till mitten\". Kombinera det med att medvetet sänka risken med ungefär 10 % på just de poäng där rädslan är som starkast, till exempel på brytbollar. En säker andraserve som går in vinner alltid över en perfekt serve som inte gör det.",
    followup:
      "Nästa steg: notera efter matchen, på en skala 1–5, hur andraserven kändes specifikt på pressade poäng.",
  },
  "Press-poäng": {
    diagnosis:
      "Att bli passiv på press-poäng är ett av de vanligaste mönstren i tennis, oavsett nivå — hjärnan väljer säkerhet automatiskt när mycket står på spel, vilket i praktiken ofta betyder kortare, mindre aggressiva slag precis när du behöver motsatsen. Det är inte ett tecken på att du saknar mod, utan en förutsägbar reaktion som går att träna bort med rätt vanor.",
    technique:
      "Bestäm ett enkelt, konkret tekniskt mål för just det poänget innan du går in i det — till exempel \"djup boll till mitten\" eller \"kliv in på returen\" — istället för att tänka på vad som händer om du förlorar poängen. Ett tydligt görbart mål tar bort utrymmet för tvekan.",
    followup:
      "Nästa steg: välj ett specifikt press-poäng-mål inför nästa match, och notera efteråt hur många gånger du faktiskt körde det istället för att bli passiv.",
  },
  "Tappade humöret": {
    diagnosis:
      "Frustration efter enkla missar är helt normalt — det som faktiskt avgör matchen är inte om du blir frustrerad, utan hur snabbt du kommer tillbaka till nästa poäng. Många spelare tappar flera poäng i rad efter en miss just för att de fortsätter tänka på den förra bollen istället för att nollställa.",
    technique:
      "Testa en kort, fysisk rutin mellan poäng — till exempel andas ut medvetet en gång och gå till linjen i ett bestämt, lugnt tempo. Det fungerar som en signal till hjärnan att den föregående bollen är avslutad, och hjälper dig komma in i nästa poäng med ett rent huvud istället för kvarvarande irritation.",
    followup:
      "Nästa steg: notera hur lång tid, ungefär i antal poäng, det tog att återhämta fokus efter en miss idag jämfört med förra veckan.",
  },
  Koncentration: {
    diagnosis:
      "Tappad koncentration mot slutet av matcher handlar oftast om mental uthållighet snarare än fysisk trötthet — hjärnan tröttnar på att hålla fullt fokus under lång tid, precis som en muskel. Det är fullt normalt, men går att träna upp gradvis.",
    technique:
      "Istället för att försöka hålla fullt fokus genom hela matchen på en gång, sätt ett litet återkommande fokusmål för korta avstånd i taget — till exempel var femte poäng. Det gör uppgiften mindre mentalt tröttande och lättare att hålla i genom hela matchen.",
    followup:
      "Nästa steg: testa fokusmålet i din nästa match och beskriv hur sista setet kändes jämfört med tidigare matcher.",
  },
};

const FALLBACK_FEEDBACK: Omit<ReflectionFeedback, "escalate" | "model"> = {
  diagnosis:
    "Tack för att du skrev ner hur det kändes — att sätta ord på matchen är i sig en del av den mentala träningen. Vi kunde inte hämta någon djupare analys just nu, men din reflektion är sparad och finns med i din historik.",
  technique:
    "Välj en enda konkret sak att fokusera på nästa gång du spelar, till exempel ett tydligt mål på serven eller en fast rutin mellan poängen. En sak i taget ger mer än att försöka ändra allt samtidigt.",
  followup:
    "Nästa steg: notera efter nästa match, på skalan 1–5, hur det gick med just den saken.",
};

export const ESCALATION_MESSAGE = {
  title: "Vi vill att du mår bra",
  text: "Det låter som att det här är tungt just nu — mer än vad som brukar höra till en vanlig match. Vi ger inte råd om det här själva. Prata gärna med din tränare eller en vuxen du litar på, de vet mer om hur de kan stötta dig.",
  note: "Din tränare får en flagga om att höra av sig till dig — inte innehållet i det du skrivit.",
};

/** Flaggans anledning når tränaren. Den får aldrig innehålla reflektionens text. */
export const ESCALATION_FLAG_REASON = "Hör av dig till spelaren — mental avstämning behövs.";

function stripCodeFences(raw: string): string {
  return raw
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

/** Defensiv parsning: kodstaket, prat runt objektet och trasig JSON får inte krascha appen. */
export function parseFeedbackJson(raw: string): Omit<ReflectionFeedback, "model"> | null {
  const candidates = [stripCodeFences(raw)];
  const match = stripCodeFences(raw).match(/\{[\s\S]*\}/);
  if (match) candidates.push(match[0]);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      return {
        escalate: parsed.escalate === true,
        diagnosis: typeof parsed.diagnosis === "string" ? parsed.diagnosis : "",
        technique: typeof parsed.technique === "string" ? parsed.technique : "",
        followup: typeof parsed.followup === "string" ? parsed.followup : "",
      };
    } catch {
      // Prova nästa kandidat.
    }
  }
  return null;
}

export type ReflectionInput = {
  mood: number;
  tag: string | null;
  text: string | null;
};

export async function generateReflectionFeedback(
  input: ReflectionInput,
): Promise<ReflectionFeedback> {
  // Skyddsnätet går före allt annat — ingen coachning på en reflektion som ska eskaleras.
  if (hasEscalationKeyword(input.text)) {
    return { escalate: true, diagnosis: "", technique: "", followup: "", model: "keyword-guard" };
  }

  if (isMockMode()) {
    const mock = (input.tag && MOCK_FEEDBACK[input.tag]) || MOCK_FEEDBACK["Koncentration"];
    return { escalate: false, ...mock, model: "mock" };
  }

  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: TIMEOUT_MS,
      maxRetries: 1,
    });

    const userParts = [
      `Mående på skala 1–5: ${input.mood}`,
      input.tag ? `Vald tagg: ${input.tag}` : null,
      input.text ? `Spelarens egna ord: ${input.text}` : null,
    ].filter(Boolean);

    const response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 900,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userParts.join("\n") }],
      },
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    );

    const raw = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();

    const parsed = parseFeedbackJson(raw);
    if (!parsed) {
      console.error("[ai] kunde inte tolka modellens JSON-svar, använder fallback");
      return { escalate: false, ...FALLBACK_FEEDBACK, model: MODEL };
    }
    if (parsed.escalate) {
      return { escalate: true, diagnosis: "", technique: "", followup: "", model: MODEL };
    }
    if (!parsed.diagnosis || !parsed.technique || !parsed.followup) {
      return { escalate: false, ...FALLBACK_FEEDBACK, model: MODEL };
    }
    return { ...parsed, model: MODEL };
  } catch (error) {
    console.error("[ai] anrop misslyckades:", error);
    return { escalate: false, ...FALLBACK_FEEDBACK, model: MODEL };
  }
}

export type ExerciseContext = {
  approved: boolean;
  muscleGroup: string;
  requestedDayLabel: string;
  hardDayLabel: string | null;
  hardFocus: string | null;
  suggestedDayLabel: string | null;
  alreadyHighThatDay: boolean;
  reason: string;
  teamPlan: string | null;
  exercises: { name: string; detail: string }[];
};

function mockExerciseText(context: ExerciseContext): string {
  if (context.approved) {
    return context.hardDayLabel
      ? `${context.muscleGroup} tränades senast hårt på ${context.hardDayLabel}, så till ${context.requestedDayLabel} har kroppen hunnit återhämta sig. Passet krockar inte med tränarens plan för perioden — kör på, men avsluta med lite rörlighet.`
      : `Det finns inget hårt ${context.muscleGroup.toLowerCase()}-pass i ditt schema den här veckan, så ${context.requestedDayLabel} är en bra dag att lägga det på. Håll dig till tränarens upplägg i övrigt och avsluta med lite rörlighet.`;
  }
  return `Du tränar redan ${context.muscleGroup.toLowerCase()} hårt på ${context.hardDayLabel ?? "en närliggande dag"}${context.hardFocus ? ` — ${context.hardFocus}` : ""}, och ${context.requestedDayLabel} ligger för nära för att kroppen ska hinna återhämta sig. Det ökar risken för skada och att du missar ett kommande pass eller match. Kör de lättare övningarna nedan nu om du ändå vill träna.`;
}

/**
 * AI:n formulerar texten runt ett beslut som redan är fattat i lib/load.ts.
 * Beslutet skickas in som fakta och får inte ändras av modellen.
 */
export async function generateExerciseMessage(context: ExerciseContext): Promise<string> {
  if (isMockMode()) return mockExerciseText(context);

  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: TIMEOUT_MS,
      maxRetries: 1,
    });

    const facts = [
      `Beslut fattat i systemet: ${context.approved ? "passet godkänns" : "varning för överbelastning"}.`,
      `Muskelgrupp: ${context.muscleGroup}.`,
      `Önskad dag: ${context.requestedDayLabel}.`,
      context.hardDayLabel
        ? `Senaste hårda pass för samma muskelgrupp: ${context.hardDayLabel}${context.hardFocus ? ` (${context.hardFocus})` : ""}.`
        : "Inget hårt pass för muskelgruppen i veckoschemat.",
      context.alreadyHighThatDay ? "Den önskade dagen är redan markerad som hård." : null,
      context.suggestedDayLabel ? `Föreslagen alternativ dag: ${context.suggestedDayLabel}.` : null,
      `Systemets motivering: ${context.reason}`,
      context.teamPlan ? `Tränarens plan för perioden: ${context.teamPlan}` : null,
      `Övningar som visas: ${context.exercises.map((e) => `${e.name} (${e.detail})`).join(", ")}.`,
    ].filter(Boolean);

    const response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 400,
        system:
          "Du formulerar ett kort svar till en tennisspelare 12–19 år om extra fysträning. Besluten nedan är redan fattade av systemet och du får inte ändra dem, bara förklara dem varmt och konkret på svenska i 2–4 meningar. Ge inga medicinska råd. Svara med ren text, ingen JSON och inga kodstaket.",
        messages: [{ role: "user", content: facts.join("\n") }],
      },
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    );

    const text = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();
    return text || mockExerciseText(context);
  } catch (error) {
    console.error("[ai] övningsanrop misslyckades:", error);
    return mockExerciseText(context);
  }
}

export type CoachSummaryFacts = {
  name: string;
  level: string;
  attendance: number;
  moods: number[];
  tags: string[];
  riskReason: string | null;
  openFlagTypes: string[];
  daysSinceLastReflection: number | null;
};

function mockCoachSummary(facts: CoachSummaryFacts): string {
  const trend =
    facts.moods.length >= 4
      ? facts.moods.slice(-3).reduce((a, b) => a + b, 0) / 3 -
        facts.moods.slice(0, 3).reduce((a, b) => a + b, 0) / 3
      : 0;
  const direction =
    trend >= 1 ? "stigande" : trend <= -1 ? "sjunkande" : "stabilt";
  const flagPart = facts.openFlagTypes.includes("ESCALATION")
    ? " Det finns en öppen eskaleringsflagga — hör av dig till spelaren."
    : facts.riskReason
      ? ` Observera: ${facts.riskReason}.`
      : "";
  return `${facts.name.split(" ")[0]} har ett ${direction} mående över perioden och ${facts.attendance} % träningsnärvaro.${facts.tags.length ? ` Återkommande tema: ${facts.tags.join(", ").toLowerCase()}.` : ""}${flagPart}`;
}

/**
 * Sammanfattning till tränarvyn. Får ENDAST innehålla aggregerad data —
 * spelarens råa reflektionstext skickas aldrig hit (se åtkomstreglerna i lib/auth.ts).
 */
export async function generateCoachSummary(facts: CoachSummaryFacts): Promise<string> {
  if (isMockMode()) return mockCoachSummary(facts);

  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: TIMEOUT_MS,
      maxRetries: 1,
    });
    const response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 300,
        system:
          "Du skriver en kort lägesbild till en tennistränare om en spelare, på svenska, 1–3 meningar. Du får bara utgå från den sammanställda datan nedan — du har aldrig tillgång till spelarens egna reflektionstexter. Ställ inga diagnoser och ge inga kliniska råd. Svara med ren text.",
        messages: [
          {
            role: "user",
            content: [
              `Spelare: ${facts.name}`,
              `Nivå: ${facts.level}`,
              `Träningsnärvaro: ${facts.attendance} %`,
              `Mående 1–5 i kronologisk ordning: ${facts.moods.join(", ") || "inga reflektioner"}`,
              `Taggar: ${facts.tags.join(", ") || "inga"}`,
              `Dagar sedan senaste reflektion: ${facts.daysSinceLastReflection ?? "ingen registrerad"}`,
              `Öppna flaggor: ${facts.openFlagTypes.join(", ") || "inga"}`,
              `Avhoppsrisk enligt systemet: ${facts.riskReason ?? "ingen"}`,
            ].join("\n"),
          },
        ],
      },
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    const text = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();
    return text || mockCoachSummary(facts);
  } catch (error) {
    console.error("[ai] sammanfattning misslyckades:", error);
    return mockCoachSummary(facts);
  }
}
