import Link from "next/link";
import { findUsableInvite } from "@/lib/invites";
import { ROLE_LABEL } from "@/lib/constants";
import { AcceptInviteForm } from "@/components/AcceptInviteForm";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await findUsableInvite(token);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-7 text-center">
          <span className="font-display text-court-dark mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-[var(--brass)] text-[24px] italic">
            M
          </span>
          <h1 className="font-display text-court-dark text-[30px] leading-tight">MatchMind</h1>
        </div>

        {invite ? (
          <>
            <div className="mm-card mb-4 px-5 py-4">
              <p className="text-[13.5px] leading-relaxed">
                Du är inbjuden som <strong>{ROLE_LABEL[invite.role] ?? invite.role}</strong>
                {invite.club ? (
                  <>
                    {" "}
                    till <strong>{invite.club.name}</strong>
                  </>
                ) : null}
                .
              </p>
              <p className="text-ink-soft mt-1 font-mono text-[12px]">{invite.email}</p>
            </div>
            <AcceptInviteForm
              token={token}
              defaultName={invite.name ?? ""}
              isPlayer={invite.role === "PLAYER"}
            />
          </>
        ) : (
          <div className="mm-card p-6 text-center">
            <h2 className="font-display mb-2 text-[20px]">Länken går inte att använda</h2>
            <p className="text-ink-soft text-[13px] leading-relaxed">
              Inbjudan är redan använd, återkallad eller för gammal. Be den som bjöd in dig att
              skicka en ny länk.
            </p>
            <Link href="/login" className="text-clay mt-4 inline-block text-[13px] underline">
              Till inloggningen
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
