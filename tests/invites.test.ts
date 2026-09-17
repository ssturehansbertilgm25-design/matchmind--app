import { describe, expect, it } from "vitest";
import { inviteStatus, inviteUrl } from "../lib/invites";

const future = new Date(Date.now() + 60_000);
const past = new Date(Date.now() - 60_000);

describe("inviteStatus", () => {
  it("är öppen när den varken använts, återkallats eller gått ut", () => {
    expect(inviteStatus({ acceptedAt: null, revokedAt: null, expiresAt: future })).toBe("open");
  });

  it("använd inbjudan väger tyngst", () => {
    expect(inviteStatus({ acceptedAt: past, revokedAt: past, expiresAt: past })).toBe("accepted");
  });

  it("återkallad inbjudan går inte att använda", () => {
    expect(inviteStatus({ acceptedAt: null, revokedAt: past, expiresAt: future })).toBe("revoked");
  });

  it("utgången inbjudan går inte att använda", () => {
    expect(inviteStatus({ acceptedAt: null, revokedAt: null, expiresAt: past })).toBe("expired");
  });
});

describe("inviteUrl", () => {
  it("bygger länken från APP_URL utan dubbla snedstreck", () => {
    process.env.APP_URL = "https://matchmind.example.se/";
    expect(inviteUrl("abc123")).toBe("https://matchmind.example.se/invite/abc123");
  });

  it("faller tillbaka på localhost när APP_URL saknas", () => {
    delete process.env.APP_URL;
    expect(inviteUrl("abc123")).toBe("http://localhost:3000/invite/abc123");
  });
});
