import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, checkPassword } from "../lib/password";

describe("checkPassword", () => {
  it("godkänner ett rimligt lösenord", () => {
    expect(checkPassword("segerbollen i tredje", "emma@klubben.se")).toEqual({ ok: true });
  });

  it("kräver minsta längd", () => {
    const result = checkPassword("kort123", "emma@klubben.se");
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain(String(MIN_PASSWORD_LENGTH));
  });

  it("stoppar vanliga lösenord", () => {
    expect(checkPassword("password123", "emma@klubben.se").ok).toBe(false);
    expect(checkPassword("matchmind2026", "emma@klubben.se").ok).toBe(false);
  });

  it("stoppar lösenord som innehåller e-postadressen", () => {
    expect(checkPassword("emma-är-bäst-2026", "emma@klubben.se").ok).toBe(false);
  });

  it("stoppar upprepade tecken", () => {
    expect(checkPassword("aaaaaaaaaaaa", "emma@klubben.se").ok).toBe(false);
  });

  it("stoppar orimligt långa lösenord", () => {
    expect(checkPassword("a1".repeat(200), "emma@klubben.se").ok).toBe(false);
  });
});
