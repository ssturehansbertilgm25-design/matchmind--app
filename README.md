# MatchMind

Webbapp för mental träning och spelarengagemang inom tennis, byggd för tennisklubbar och
-akademier. Två roller: **tränare** och **spelare** (12–19 år).

Byggd från prototypen `matchmind-demo.html` — samma designspråk och flöden, men med riktig
backend: databas, sessionsautentisering, server-side åtkomstkontroll och ett AI-lager som
bara anropas från servern.

---

## Kom igång

```bash
npm install
cp .env.example .env      # redan gjort om du klonat med .env på plats
npx prisma migrate dev    # skapar SQLite-databasen
npm run db:seed           # klubb, tränare och 15 spelare
npm run dev               # http://localhost:3000
```

Appen svarar på `http://localhost:3000`. Inloggningssidan visar demokontona som klickbara
knappar som fyller i formuläret.

### Inloggningar (samma lösenord för alla i demon)

| Roll | E-post | Lösenord | Not |
| --- | --- | --- | --- |
| Tränare | `coach@matchmind.se` | `demo1234` | ser hela truppen |
| Spelare | `emma@matchmind.se` | `demo1234` | demospelaren |
| Spelare | `alice@matchmind.se` | `demo1234` | flaggad för uppföljning |
| Spelare | `liam@matchmind.se` | `demo1234` | avhoppsrisk, inaktivitet |

Övriga spelare loggar in med `förnamn@matchmind.se` / `demo1234`.

### Kommandon

| Kommando | Gör |
| --- | --- |
| `npm run dev` | startar utvecklingsservern |
| `npm run build` | produktionsbygge |
| `npm test` | Vitest — risk- och belastningslogiken |
| `npm run db:seed` | kör seed igen |
| `npm run db:reset` | nollställer databasen och kör seed igen |
| | *(Prisma kräver bekräftelse om kommandot körs av ett AI-verktyg — `npm run db:seed` räcker oftast, seed-scriptet tömmer tabellerna själv.)* |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | typkontroll |

---

## Teknisk stack

- **Next.js (App Router) + TypeScript**
- **Tailwind CSS v4** — paletten ligger som CSS-variabler i `app/globals.css` och mappas till
  Tailwind-tokens med `@theme inline` (Tailwind v4 konfigureras i CSS, inte i
  `tailwind.config.js`). Typsnitt via `next/font/google`: Instrument Serif (rubriker),
  Inter (brödtext), Space Mono (siffror).
- **Prisma + SQLite** i utveckling
- **Egen sessionsautentisering** — `bcryptjs` för lösenordshash, sessions-token i databasen,
  httpOnly-cookie. Ingen NextAuth/Auth.js.
- **`@anthropic-ai/sdk`**, anropas endast server-side i API-routes.

### AI-läge

Modellnamnet ligger i `ANTHROPIC_MODEL` med `claude-sonnet-5` som default. **Verifiera
modellnamnet mot <https://docs.claude.com> innan produktion** — modellnamn ändras över tid.

Saknas `ANTHROPIC_API_KEY`, eller är `MOCK_AI=1` satt, körs AI-lagret i demoläge med
deterministiska exempelsvar per tagg (formuleringarna kommer från `feedbackByTag` i
prototypen), inklusive ett eskaleringsfall. Appen fungerar fullt ut utan API-nyckel och
markerar demoläget i UI:t ("AI i demoläge" i toppbaren).

### Byta till PostgreSQL (Supabase) senare

Schemat undviker SQLite-specifika konstruktioner. Byt `provider` i `prisma/schema.prisma`
till `"postgresql"`, peka `DATABASE_URL` mot databasen och kör en ny migration. Rollen,
intensiteten och flaggtypen lagras som `String` med dokumenterade värden i stället för
Prisma-enum, eftersom enum inte stöds av SQLite — det fungerar identiskt i Postgres.

---

## Åtkomstregler

Användarna är minderåriga och datan är känslig. Reglerna kontrolleras **server-side** i varje
API-route och server component. Ingen åtkomstlogik ligger i klientkoden. Reglerna står också
som kommentar högst upp i `lib/auth.ts`.

1. En spelare ser endast sin egen data.
2. En tränare ser endast spelare i sin egen klubb.
3. Tränaren ser sammanställd information — mående-trend, taggar, närvaro, flaggor och en kort
   AI-genererad sammanfattning — **inte** spelarens råa reflektionstext. Råtexten lämnar servern
   endast för reflektioner där spelaren själv kryssat i "dela med min tränare".
4. Vid eskalering får tränaren en flagga med anledningen "hör av dig till spelaren" — aldrig
   innehållet i reflektionen. En eskalerad reflektion delas aldrig med tränaren, även om
   spelaren hade kryssat i delningsrutan innan hen skickade.
5. Föräldrarapporten innehåller aldrig råtext, bara sammanställning.

---

## Arkitektur

```
app/
  login/        inloggning för båda roller, rollen avgör landningssida
  coach/        tränarvy (endast COACH)
  player/       spelarvy (endast PLAYER), mobilanpassad
  api/          route handlers, all åtkomstkontroll
components/     UI, uppdelat på coach/ och player/
lib/
  auth.ts       session, roller, åtkomstregler
  ai.ts         ENDA stället där Anthropic-API:t anropas
  risk.ts       avhoppsrisk — deterministisk
  load.ts       belastningskoll — deterministisk
  players.ts    sammanställningar till tränarvyn
prisma/         schema, migrationer, seed
tests/          Vitest för risk- och belastningslogiken
```

### Affärslogik i kod, inte i modellen

Skaderisk och avhoppsrisk får inte bero på en språkmodells gissning.

**Avhoppsrisk** (`lib/risk.ts`), prövas i ordning, första träffen vinner:

- ingen reflektion på ≥ 10 dagar → `inaktivitet`
- snitt(3 senaste) − snitt(3 första) ≤ −1.0 → `trend`
- träningsnärvaro < 45 % → `narvaro`

**Belastningskoll** (`lib/load.ts`): slår upp när muskelgruppen senast tränades hårt i
spelarens schema. Ligger den önskade dagen ≤ 1 dag från det passet (räknat cirkulärt över
veckan), eller är dagen redan `HIGH`, blir det varning för överbelastning, förslag på
vilo-/lågdag och **lätta** övningar. Annars godkänt och **tunga** övningar.

Besluten fattas i koden och skickas in som fakta till AI:n, som bara formulerar texten runt
dem. Lagets träningsplan (`TeamPlan`) skickas med som kontext så att förslagen inte krockar
med tränarens upplägg.

### AI-lagret

- Systemprompten ramar in svaret som **generell mental träning för idrott** — inte vård,
  terapi, diagnostik eller personlig sportpsykologisk rådgivning.
- Modellen svarar med JSON: `{escalate, diagnosis, technique, followup}`. Parsningen är
  defensiv (kodstaket strippas, JSON-objekt plockas ut ur omgivande text, try/catch).
- Vid parse-fel eller API-fel loggas felet, reflektionen sparas ändå och spelaren får ett
  neutralt fallback-svar. Appen kraschar aldrig på ett AI-fel.
- Ett **nyckelords-skyddsnät** i koden sätter `escalate = true` oavsett modellens svar för
  vissa formuleringar (uppgivenhet, självskada, utsatthet).
- Vid eskalering sparas ingen AI-feedback. Spelaren får en hänvisning till tränare eller vuxen
  hen litar på, och en `Flag` av typen `ESCALATION` skapas utan reflektionens innehåll.
- Timeout: 20 sekunder.

---

## API

| Metod | Route | Roll | Gör |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | — | e-post + lösenord → sätter session-cookie |
| POST | `/api/auth/logout` | — | avslutar sessionen |
| GET | `/api/auth/me` | inloggad | inloggad användare + roll |
| POST | `/api/reflections` | PLAYER | sparar reflektion, anropar AI, returnerar feedback |
| GET | `/api/reflections` | PLAYER | egen historik |
| GET | `/api/players` | COACH | alla spelare i klubben, aggregerat + risknivå |
| GET | `/api/players/[id]` | COACH | detaljvy: trend, schema, taggar, flaggor, not |
| POST | `/api/players/[id]/note` | COACH | sparar tränaranteckning |
| GET | `/api/players/[id]/parent-report` | COACH | genererar föräldrarapport |
| GET | `/api/team-plan` | COACH | hämtar lagets träningsplan |
| POST | `/api/team-plan` | COACH | sparar lagets träningsplan |
| POST | `/api/exercises/suggest` | PLAYER | muskelgrupp + ev. dag → belastningskoll + övningar |
| GET | `/api/messages/[userId]` | PLAYER | sparringkonversation |
| POST | `/api/messages` | PLAYER | skickar meddelande |

---

## Antaganden

- **`matchmind-demo.html` ingår inte i repot.** Prototypen användes som referens för palett,
  typografi, flöden, spelarroster, övningskatalog och AI-formuleringar, men den är en
  fristående fil och ligger inte i projektet.
- **Next.js-version.** `npx create-next-app@latest` scaffoldar numera Next 16. App Router-koden
  är densamma som i den specificerade Next 15-uppsättningen; ingen v15-specifik API används.
- **Tailwind v4** konfigureras i CSS (`@theme inline` i `app/globals.css`) i stället för i
  `tailwind.config.js`, vilket är v4:s konvention. Paletten är exakt prototypens.
- **Taggar i tränarvyn** räknas fram ur spelarens senaste reflektioner i stället för att vara
  fritextetiketter som i prototypen — samma information, men härledd ur faktisk data.
- **Veckans sammanfattning och föräldrarapporten** byggs deterministiskt ur data (inte av
  modellen), så att siffror och riskbedömningar alltid stämmer. Den korta lägesbilden per
  spelare i detaljpanelen går via AI-lagret, men får bara aggregerad data — aldrig råtext.
- **"Övningsförslag nu"** utgår från dagens veckodag i spelarens schema och kör samma
  belastningskoll som extrapass-läget.
- **Eskalerade reflektioner delas aldrig med tränaren**, även om spelaren kryssat i
  delningsrutan. Flaggan räcker.
- **Sessions-token lagras hashat** (SHA-256) i databasen; klienten får klartext-token i en
  httpOnly-cookie.
- **Föräldrasamtycke** (`guardianConsent`, `guardianEmail`) finns i datamodellen och seedas,
  men något utskicksflöde byggs inte i denna omgång.
- **Röstinspelning** är byggd som knapp och flöde men markerad "kommer snart" — Web Speech API
  är inte inkopplat.

## Vad som återstår

- Riktiga Anthropic-anrop är implementerade men har inte kunnat köras skarpt i den här miljön
  (ingen `ANTHROPIC_API_KEY`). Sätt nyckeln och `MOCK_AI=0` för att verifiera mot modellen,
  och kontrollera modellnamnet mot dokumentationen.
- Röstinspelning (Web Speech API).
- Migrering till PostgreSQL/Supabase och deploy.
- Automatiska svar/notiser i sparringchatten — konversationen sparas, men mottagaren får
  ingen notis.
- Inga tester på API-lagret ännu; risk- och belastningslogiken är testad med Vitest.

## Byggs inte i denna omgång

Stripe eller betalningar, push-notiser, native app, Supabase-migrering, deploy till Vercel,
videoanalys, avancerad matchningsalgoritm, flerspråksstöd, e-postutskick.
