/**
 * Miljökontroll. Körs vid start så att en felaktig deploy syns direkt i loggen
 * i stället för som ett konstigt fel långt senare.
 */

type EnvProblem = { level: "error" | "warning"; message: string };

export function checkEnv(): EnvProblem[] {
  const problems: EnvProblem[] = [];
  const production = process.env.NODE_ENV === "production";

  if (!process.env.DATABASE_URL) {
    problems.push({ level: "error", message: "DATABASE_URL saknas — appen når ingen databas" });
  } else if (production && process.env.DATABASE_URL.startsWith("file:")) {
    problems.push({
      level: "error",
      message: "DATABASE_URL pekar på en SQLite-fil i produktion — använd PostgreSQL",
    });
  }

  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const mock = process.env.MOCK_AI === "1";
  if (!hasKey && !mock) {
    problems.push({
      level: "warning",
      message: "ANTHROPIC_API_KEY saknas — AI-lagret kör i demoläge",
    });
  }
  if (hasKey && mock) {
    problems.push({
      level: "warning",
      message: "MOCK_AI=1 är satt trots att en API-nyckel finns — AI:n kör fortfarande demosvar",
    });
  }

  if (production && !process.env.APP_URL) {
    problems.push({
      level: "warning",
      message: "APP_URL saknas — inbjudningslänkar pekar på http://localhost:3000",
    });
  }

  return problems;
}

let reported = false;

export function reportEnvOnce(): void {
  if (reported) return;
  reported = true;
  for (const problem of checkEnv()) {
    const prefix = problem.level === "error" ? "[env] FEL:" : "[env] varning:";
    console[problem.level === "error" ? "error" : "warn"](`${prefix} ${problem.message}`);
  }
}
