# Deploy: Supabase + Vercel

Följ stegen i ordning. Allt görs i webbläsaren — inga terminalkommandon behövs.

Räkna med 15–20 minuter första gången.

---

## 1. Supabase — databasen

1. Skapa ett projekt på [supabase.com](https://supabase.com) (region **Europe (Frankfurt)** eller
   **Europe (Stockholm)** — närmast användarna, och personuppgifterna stannar i EU).
2. Du får välja ett **databaslösenord** när projektet skapas. Spara det direkt i din
   lösenordshanterare — det visas bara en gång. (Tappar du bort det: Settings → Database →
   Reset database password.)
3. Vänta tills projektet är klart (ungefär två minuter).

### Hämta de två anslutningssträngarna

Gå till **Settings → Database → Connection string** och välj fliken **URI**. Du behöver två
av dem:

| Vad | Vilken flik i Supabase | Används till |
| --- | --- | --- |
| `DATABASE_URL` | **Transaction pooler** (port `6543`) | appens vanliga trafik — tål serverless |
| `DIRECT_URL` | **Session pooler** (port `5432`) | migrationer, som inte fungerar via transaction pooler |

I båda: byt ut `[YOUR-PASSWORD]` mot lösenordet från steg 2.

Lägg till `?pgbouncer=true&connection_limit=1` sist i `DATABASE_URL`. Den ska då se ut
ungefär så här:

```
postgresql://postgres.abcdefgh:LÖSENORDET@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

och `DIRECT_URL` så här:

```
postgresql://postgres.abcdefgh:LÖSENORDET@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

> Använd **inte** fliken "Direct connection". Den är IPv6-only, och Vercel når inte IPv6.

---

## 2. Vercel — appen

1. Pusha repot till GitHub om det inte redan ligger där.
2. Gå till [vercel.com/new](https://vercel.com/new), importera repot. Vercel känner igen
   Next.js själv — rör inte Framework Preset eller Build Command.
3. Innan du trycker Deploy, öppna **Environment Variables** och lägg in:

   | Namn | Värde |
   | --- | --- |
   | `DATABASE_URL` | transaction pooler-strängen från steg 1 |
   | `DIRECT_URL` | session pooler-strängen från steg 1 |
   | `APP_URL` | `https://DITT-PROJEKT.vercel.app` (fyll i efter första deployen, se steg 4) |
   | `ANTHROPIC_API_KEY` | nyckeln från [console.anthropic.com](https://console.anthropic.com) |
   | `ANTHROPIC_MODEL` | `claude-sonnet-5` |
   | `MOCK_AI` | `0` om du har en nyckel, annars `1` |
   | `SETUP_TOKEN` | hitta på en egen slumpsträng — se steg 5 |

   Sätt dem för **alla tre miljöerna** (Production, Preview, Development).

4. **Deploy.** Bygget kör `prisma migrate deploy` automatiskt innan Next.js byggs, så
   tabellerna skapas i Supabase av sig själva. När du fått adressen: gå tillbaka till
   Settings → Environment Variables, fyll i rätt `APP_URL` och kör **Redeploy**.
   Utan det pekar inbjudningslänkarna fel.

5. **Skapa founder-kontot.** Öppna `https://DITT-PROJEKT.vercel.app/setup`, fyll i namn,
   e-post, lösenord och setup-koden du valde. Sidan stänger sig permanent efteråt.
   Ta bort `SETUP_TOKEN` ur Vercel när kontot är skapat.

6. **Kontrollera** `https://DITT-PROJEKT.vercel.app/api/health`. Du ska få:
   ```json
   {"status":"ok","database":"ok","aiMode":"live","problems":[]}
   ```
   Står det `"aiMode":"demo"` saknas `ANTHROPIC_API_KEY` eller så är `MOCK_AI` fortfarande `1`.

---

## 3. Kom igång i appen

1. Logga in som founder.
2. **Klubbar** → skapa klubben.
3. **Inbjudningar** → bjud in tränaren till klubben. Kopiera länken (den visas bara en gång)
   och skicka den.
4. Tränaren öppnar länken, väljer sitt lösenord och landar i tränarvyn.
5. Tränaren bjuder in sina spelare från sin egen vy, lägger in veckoscheman och skriver
   lagets träningsplan.

---

## Om något går fel

**Bygget misslyckas med `P1001: Can't reach database server`**
`DIRECT_URL` är fel eller pekar på "Direct connection". Använd session pooler (port 5432).

**Bygget misslyckas med `prepared statement already exists` eller liknande**
`?pgbouncer=true` saknas i `DATABASE_URL`.

**Appen startar men `/api/health` svarar `database: unreachable`**
Kontrollera att lösenordet i strängen är rätt och att `[YOUR-PASSWORD]` faktiskt är utbytt.
Innehåller lösenordet `@ : / ?` eller `#` måste det URL-kodas (t.ex. `@` → `%40`).

**Du vill hellre skapa tabellerna för hand**
Öppna `prisma/supabase-setup.sql` i repot, kopiera hela innehållet, klistra in i Supabase →
SQL Editor → New query → Run. Filen skapar alla tabeller och talar om för Prisma att
migrationen är körd, så kommande deployer inte försöker skapa dem igen.

**`/setup` säger att setupen redan är genomförd**
Det finns redan ett founder-konto i databasen. Logga in i stället, eller töm tabellen `User`
i Supabase om du vill börja om.

---

## Efteråt

- **Backup.** Supabase tar automatiska dagliga backupper i betalplanen. På gratisplanen:
  Database → Backups, ladda ner manuellt med jämna mellanrum.
- **Rotera lösenord** i Supabase (Settings → Database → Reset database password) om
  anslutningssträngen läckt någonstans — glöm inte uppdatera båda variablerna i Vercel.
- **Personuppgifter.** Appen lagrar uppgifter om minderåriga. Se till att klubben har ett
  personuppgiftsbiträdesavtal och att föräldrarna informeras om vad som sparas. Spelarens
  reflektionstext når bara spelaren själv, med undantag för break-glass som alltid loggas.
