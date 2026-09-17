/**
 * Lösenordspolicy. Medvetet enkel och förklarad på svenska i UI:t: längd bär mer än
 * teckenkrav, så kravet är 10 tecken och att lösenordet inte är uppenbart gissningsbart.
 */

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 200;

const COMMON_PASSWORDS = [
  "password",
  "lösenord",
  "losenord",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyuiop",
  "matchmind",
  "tennis123",
  "demo1234",
  "admin1234",
  "passw0rd",
];

export type PasswordCheck = { ok: true } | { ok: false; error: string };

export function checkPassword(password: string, email?: string): PasswordCheck {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Lösenordet måste vara minst ${MIN_PASSWORD_LENGTH} tecken` };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, error: "Lösenordet är för långt" };
  }

  const lowered = password.toLowerCase();
  if (COMMON_PASSWORDS.some((common) => lowered.includes(common))) {
    return { ok: false, error: "Lösenordet är för lätt att gissa — välj något annat" };
  }
  if (email && lowered.includes(email.toLowerCase().split("@")[0])) {
    return { ok: false, error: "Lösenordet får inte innehålla din e-postadress" };
  }
  if (/^(.)\1+$/.test(password)) {
    return { ok: false, error: "Lösenordet får inte vara samma tecken om och om igen" };
  }
  return { ok: true };
}
