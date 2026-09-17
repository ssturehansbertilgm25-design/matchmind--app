# MatchMind

Webbapp för mental träning och spelarengagemang inom tennis, byggd för tennisklubbar och
-akademier. Tre roller: **founder** (du), **tränare** och **spelare** (12–19 år).

Det här är inte en demo. Konton skapas via inbjudningslänkar, lösenord sätts av användarna
själva, all åtkomst kontrolleras server-side, och känsliga åtgärder hamnar i en
granskningslogg som appen aldrig raderar.

---

## Snabbstart lokalt

Kräver Node 20+ och en PostgreSQL-databas.

```bash
npm install
cp .env.example .env          # fyll i DATABASE_URL
npx prisma migrate deploy     # skapar tabellerna
npm run dev                   # http://localhost:3000
```

Öppna `http://localhost:3000`. Eftersom databasen är tom skickas du till **/setup**, där du
skapar founder-kontot. Sidan stängs permanent så fort kontot finns.

Därefter, i founder-vyn:

1. **Klubbar** → skapa klubben.
2. **Inbjudningar** → bjud in en tränare till klubben. Kopiera länken och skicka den.
3. Tränaren öppnar länken, väljer lösenord och landar i tränarvyn.
4. Tränaren bjuder in sina spelare från sin egen vy.

Vill du se hur appen ser ut med data i, kör `npm run db:seed:demo`. Den skapar en separat
klubb ("Demoklubben") med 15 spelare och fyra veckors historik. Den rör aldrig
founder-konton eller riktiga klubbar, och kan köras om när som helst.

### Kommandon

| Kommando | Gör |
| --- | --- |
| `npm run dev` | utvecklingsserver |
| `npm run build` / `npm start` | produktionsbygge och start |
| `npm test` | Vitest — risk, belastning, lösenordspolicy, inbjudningar |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | typkontroll |
| `npx prisma migrate deploy` | kör migrationer (drift) |
| `npx prisma migrate dev` | skapa ny migration (utveckling) |
| `npm run db:seed:demo` | lägg in demoklubben med exempeldata |

---

## Deploy

Stegvis guide för Supabase + Vercel finns i **[DEPLOY.md](DEPLOY.md)** — inklusive exakt
vilka anslutningssträngar som ska vart, och vad man gör när något strular.

### Kortversion

1. **Databas.** Skapa ett Supabase-projekt. `DATABASE_URL` = transaction pooler (port 6543,
   med `?pgbouncer=true&connection_limit=1`), `DIRECT_URL` = session pooler (port 5432).
2. **Repo → Vercel.** Importera repot i [vercel.com/new](https://vercel.com/new).
3. **Miljövariabler** i Vercel:

   | Variabel | Värde |
   | --- | --- |
   | `DATABASE_URL` | transaction pooler-strängen |
   | `DIRECT_URL` | session pooler-strängen (används av migrationer) |
   | `APP_URL` | `https://din-app.vercel.app` — annars pekar inbjudningslänkarna fel |
   | `ANTHROPIC_API_KEY` | nyckeln från [console.anthropic.com](https://console.anthropic.com) |
   | `ANTHROPIC_MODEL` | `claude-sonnet-5` (verifiera mot <https://docs.claude.com>) |
   | `MOCK_AI` | `0` när nyckeln är på plats, annars `1` |
   | `SETUP_TOKEN` | valfri egen kod — krävs då för att skapa founder-kontot |

4. **Deploy.** `vercel-build`-scriptet kör `prisma migrate deploy` före bygget, så tabellerna
   skapas automatiskt. Vill du hellre göra det i webbläsaren: klistra in
   `prisma/supabase-setup.sql` i Supabase SQL Editor.
5. **Första inloggningen.** Öppna `https://din-app.vercel.app/setup` och skapa
   founder-kontot. Ta bort `SETUP_TOKEN` efteråt.
6. **Kontrollera.** `https://din-app.vercel.app/api/health` ska svara
   `{"status":"ok","database":"ok","aiMode":"live"}`.

Byter du domän senare: uppdatera `APP_URL`, annars fortsätter inbjudningslänkar peka på den
gamla adressen.

---

## Roller och åtkomst

Reglerna kontrolleras **server-side** i varje API-route och server component. Ingen
åtkomstlogik ligger i klientkoden. De står också som kommentar högst upp i `lib/auth.ts`.

**Spelare** ser bara sin egen data: reflektioner, AI-svar, sitt schema, sparringchatten med
klubbkompisar, och kan exportera allt appen lagrar om dem.

**Tränare** ser bara spelare i sin egen klubb, och ser **sammanställd information** — inte
råa reflektionstexter. Tränarvyn visar mående-trend, taggar, närvaro, flaggor och en kort
AI-genererad sammanfattning. Råtexten visas bara för reflektioner där spelaren själv kryssat
i "dela med min tränare". Tränaren kan bjuda in spelare, redigera profil och veckoschema,
skriva anteckningar, sätta lagets träningsplan och åtgärda flaggor.

**Founder** står utanför klubbstrukturen och administrerar hela appen: klubbar, konton,
roller, klubbtillhörighet, inbjudningar (inklusive fler founders), avstängning, utloggning av
enheter, radering, träningsplaner och flaggor.

### Reflektionstext och break-glass

Founder ser inte reflektionstext i någon vanlig vy. Texten kan öppnas via **break-glass** i
Användare-fliken, och då gäller:

- ett skäl på minst 15 tecken måste skrivas,
- öppningen loggas i `AuditLog` med vem, när, vilken spelare och skälet,
- loggen kan läsas i Granskningslogg-fliken men har ingen raderings- eller ändringsväg i
  koden.

Använd det bara när du har ett konkret skäl — oro för spelarens säkerhet, en orosanmälan
eller ett myndighetsärende. Spelarvyn lovar spelaren att texten är deras; loggen är det som
gör löftet kontrollerbart.

Vid eskalering får tränaren en flagga med anledningen "hör av dig till spelaren" — aldrig
innehållet. En eskalerad reflektion delas aldrig med tränaren, även om spelaren kryssat i
delningsrutan innan hen skickade. Föräldrarapporten innehåller aldrig råtext.

---

## Säkerhet

- **Inbjudningar i stället för registrering.** Ingen kan skapa ett konto själv. Länkarna är
  engångs, går ut efter 14 dagar och lagras hashade — token visas bara när länken skapas.
- **Lösenord** hashas med bcrypt (12 rundor). Policy: minst 10 tecken, inte uppenbart
  gissningsbara, får inte innehålla e-postadressen.
- **Sessioner** lagras hashade (SHA-256) i databasen, klienten får en httpOnly-cookie.
  Lösenordsbyte avslutar alla andra sessioner. Founder kan logga ut ett konto från alla
  enheter.
- **Avstängning slår igenom direkt** — sessionerna avslutas, kontot kan inte logga in, men
  data och historik finns kvar.
- **Rate limiting** på inloggning: 8 misslyckade försök per e-post och 30 per IP inom 15
  minuter.
- **Säkerhetsheaders** (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, HSTS) sätts i
  `next.config.ts`.
- **API-nyckeln når aldrig klienten** — AI:n anropas bara från server-side routes.
- Minst en aktiv founder måste alltid finnas; den sista går varken att stänga av, degradera
  eller radera.

---

## Affärslogik i kod, inte i modellen

Skaderisk och avhoppsrisk får inte bero på en språkmodells gissning.

**Avhoppsrisk** (`lib/risk.ts`), prövas i ordning, första träffen vinner:

- ingen reflektion på ≥ 10 dagar → `inaktivitet`
- snitt(3 senaste) − snitt(3 första) ≤ −1.0 → `trend`
- träningsnärvaro < 45 % → `narvaro`

**Belastningskoll** (`lib/load.ts`): slår upp när muskelgruppen senast tränades hårt i
spelarens schema. Ligger den önskade dagen ≤ 1 dag från det passet (cirkulärt över veckan),
eller är dagen redan `HIGH`, blir det varning för överbelastning, förslag på vilo-/lågdag och
**lätta** övningar. Annars godkänt och **tunga** övningar.

Besluten fattas i koden och skickas in som fakta till AI:n, som bara formulerar texten runt
dem. Lagets träningsplan skickas med som kontext så att förslagen inte krockar med tränarens
upplägg.

### AI-lagret (`lib/ai.ts`)

Ett enda ställe anropar Anthropic-API:t.

- Systemprompten ramar in svaret som **generell mental träning för idrott** — inte vård,
  terapi, diagnostik eller personlig sportpsykologisk rådgivning.
- Modellen svarar med JSON `{escalate, diagnosis, technique, followup}`. Parsningen är
  defensiv: kodstaket strippas, objektet plockas ut ur omgivande text, allt i try/catch.
- Vid parse-fel eller API-fel loggas felet, reflektionen sparas ändå och spelaren får ett
  neutralt fallback-svar. Appen kraschar aldrig på ett AI-fel.
- Ett **nyckelords-skyddsnät** sätter `escalate = true` oavsett modellens svar för vissa
  formuleringar (uppgivenhet, självskada, utsatthet).
- Vid eskalering sparas ingen AI-feedback. Spelaren hänvisas till tränare eller vuxen hen
  litar på, och en `Flag` av typen `ESCALATION` skapas utan innehåll.
- Timeout: 20 sekunder. Utan API-nyckel körs deterministiska demosvar och UI:t visar
  "AI i demoläge".

---

## Arkitektur

```
app/
  setup/          engångssetup, skapar founder-kontot
  login/          inloggning, rollen avgör landningssida
  invite/[token]/ acceptera inbjudan och välj lösenord
  founder/        founder-konsolen
  coach/          tränarvy
  player/         spelarvy, mobilanpassad
  account/        byt lösenord, exportera data, logga ut överallt
  api/            route handlers — all åtkomstkontroll
components/       UI, uppdelat på founder/, coach/, player/
lib/
  auth.ts         session, roller, åtkomstregler, rate limiting
  audit.ts        granskningslogg och break-glass
  invites.ts      inbjudningar
  password.ts     lösenordspolicy
  ai.ts           ENDA stället där Anthropic-API:t anropas
  risk.ts         avhoppsrisk — deterministisk
  load.ts         belastningskoll — deterministisk
  players.ts      sammanställningar till tränar- och founder-vyn
  env.ts          miljökontroll vid start
prisma/           schema, migrationer, demo-seed
tests/            Vitest
```

### API

| Metod | Route | Roll |
| --- | --- | --- |
| GET/POST | `/api/setup` | — (bara innan founder finns) |
| POST | `/api/auth/login` · `/api/auth/logout` | — |
| GET | `/api/auth/me` | inloggad |
| GET/POST | `/api/invite/[token]` | — |
| GET/POST | `/api/invites` · DELETE `/api/invites/[id]` | FOUNDER, COACH |
| POST | `/api/account/password` · DELETE `/api/account/sessions` | inloggad |
| GET | `/api/account/export` | inloggad |
| GET/POST | `/api/reflections` | PLAYER |
| POST | `/api/exercises/suggest` | PLAYER |
| GET/POST | `/api/messages` · `/api/messages/[userId]` | PLAYER |
| GET | `/api/players` | COACH |
| GET | `/api/players/[id]` · `/api/players/[id]/parent-report` | COACH, FOUNDER |
| POST | `/api/players/[id]/note` | COACH |
| PATCH | `/api/players/[id]/profile` · PUT `/api/players/[id]/schedule` | COACH, FOUNDER |
| GET | `/api/flags` · POST `/api/flags/[id]` | COACH, FOUNDER |
| GET | `/api/founder/overview` · `/api/founder/audit` | FOUNDER |
| GET/POST | `/api/founder/clubs` · PATCH/DELETE `/api/founder/clubs/[id]` | FOUNDER |
| GET | `/api/founder/users` · PATCH/DELETE `/api/founder/users/[id]` | FOUNDER |
| DELETE | `/api/founder/users/[id]/sessions` | FOUNDER |
| POST | `/api/founder/players/[id]/reveal` | FOUNDER (break-glass) |
| GET | `/api/health` | — |

---

## Design

Färgpalett och typografi kommer från prototypen `matchmind-demo.html`: CSS-variabler i
`app/globals.css`, mappade till Tailwind-tokens med `@theme inline` (Tailwind v4 konfigureras
i CSS, inte i `tailwind.config.js`). Typsnitt via `next/font/google`: Instrument Serif
(rubriker), Inter (brödtext), Space Mono (siffror). Spelarvyn är verifierad på 390 px bredd.

---

## Antaganden och val

- **Next.js 16.** `create-next-app@latest` scaffoldar numera 16; App Router-koden är densamma
  som i en 15-uppsättning och inget v15-specifikt API används.
- **String i stället för Prisma-enum** för roll, belastning och flaggtyp — nya värden kan
  läggas till utan enum-migration i produktion.
- **Inbjudningslänkar i stället för e-post.** Appen skickar ingen e-post; du kopierar länken
  och skickar den på det sätt du föredrar. Ett e-postutskick kan läggas till senare utan att
  flödet ändras.
- **Veckans sammanfattning och föräldrarapporten** byggs deterministiskt ur data, så att
  siffror och riskbedömningar alltid stämmer. Bara den korta lägesbilden per spelare går via
  AI:n, och den får enbart aggregerad data.
- **Radering av klubb** tar med sig klubbens konton och deras data. Vill du bara spärra
  åtkomsten, använd Stäng av i stället.
- **Taggarna i tränarvyn** räknas fram ur spelarens senaste reflektioner.

## Vad som återstår

- **Glömt lösenord** finns inte som självbetjäning. En founder kan logga ut kontot från alla
  enheter, men ett nytt lösenord kräver i dag en ny inbjudan. Ett återställningsflöde kräver
  e-postutskick.
- **E-post** över huvud taget: inbjudningar, föräldrarapporter och notiser skickas manuellt.
- **Röstinspelning** i reflektionsflödet är byggd som knapp men markerad "kommer snart".
- **Notiser** i sparringchatten — meddelanden sparas, men mottagaren får ingen avisering.
- **Automatiska tester på API-lagret.** Behörighet och flöden är verifierade manuellt
  end-to-end; risk-, belastnings-, lösenords- och inbjudningslogiken har Vitest-tester.
- **Radering av eget konto** för spelare (GDPR) görs i dag av en founder, inte av spelaren
  själv.
