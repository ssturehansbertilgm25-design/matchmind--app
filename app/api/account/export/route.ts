import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/api";

/**
 * Egen dataexport (GDPR, rätt till dataportabilitet). Innehåller allt appen lagrar om
 * den inloggade användaren — inklusive reflektionstexterna, som är användarens egna.
 */
export async function GET() {
  try {
    const user = await requireUser();

    const record = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        club: true,
        profile: true,
        reflections: { include: { aiFeedback: true }, orderBy: { createdAt: "asc" } },
        scheduleEntries: { orderBy: { weekday: "asc" } },
        flags: true,
        sentMessages: true,
        receivedMessages: true,
      },
    });
    if (!record) return NextResponse.json({ error: "Kontot finns inte" }, { status: 404 });

    const data = {
      exporteradAt: new Date().toISOString(),
      konto: {
        namn: record.name,
        epost: record.email,
        roll: record.role,
        klubb: record.club?.name ?? null,
        skapad: record.createdAt.toISOString(),
      },
      profil: record.profile,
      reflektioner: record.reflections.map((reflection) => ({
        datum: reflection.createdAt.toISOString(),
        maende: reflection.mood,
        tagg: reflection.tag,
        text: reflection.text,
        deladMedTranare: reflection.sharedWithCoach,
        eskalerad: reflection.escalated,
        aiSvar: reflection.aiFeedback
          ? {
              diagnos: reflection.aiFeedback.diagnosis,
              teknik: reflection.aiFeedback.technique,
              uppfoljning: reflection.aiFeedback.followup,
              modell: reflection.aiFeedback.model,
            }
          : null,
      })),
      schema: record.scheduleEntries,
      flaggor: record.flags.map((flag) => ({
        typ: flag.type,
        anledning: flag.reason,
        skapad: flag.createdAt.toISOString(),
        atgardad: flag.resolvedAt?.toISOString() ?? null,
      })),
      meddelanden: {
        skickade: record.sentMessages.map((m) => ({ text: m.text, datum: m.createdAt })),
        mottagna: record.receivedMessages.map((m) => ({ text: m.text, datum: m.createdAt })),
      },
    };

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="matchmind-export-${record.id}.json"`,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
