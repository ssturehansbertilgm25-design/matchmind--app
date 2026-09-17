"use client";

import { useEffect, useRef, useState } from "react";
import { avatarColor, initials } from "@/components/coach/avatar";

export type Clubmate = {
  id: string;
  name: string;
  level: string;
  preview: string | null;
};

type ChatMessage = { id: string; fromMe: boolean; text: string; createdAt: string };

const QUICK_MESSAGES = [
  { label: "Vill du spela imorgon?", text: "Vill du spela sparring imorgon?" },
  { label: "Ledig efter skolan?", text: "Är du ledig efter skolan?" },
  { label: "Föreslå tid & bana", text: "Bana 2 kl 17, funkar det?" },
];

export function SparringTab({ clubmates }: { clubmates: Clubmate[] }) {
  const [partner, setPartner] = useState<Clubmate | null>(null);

  if (partner) {
    return <ChatWindow partner={partner} onBack={() => setPartner(null)} />;
  }

  return (
    <>
      <h1 className="font-display text-[23px] leading-tight">Sparring-chatt</h1>
      <p className="font-display text-ink-soft mb-4 text-[14.5px] italic">
        Klubbkompisar på din nivå just nu
      </p>
      <div className="flex flex-col">
        {clubmates.map((mate) => (
          <button
            key={mate.id}
            type="button"
            onClick={() => setPartner(mate)}
            className="hover:bg-chalk-dim flex items-center gap-3 rounded-[9px] p-2.5 text-left transition"
          >
            <span
              className="font-display flex h-[39px] w-[39px] shrink-0 items-center justify-center rounded-full text-[14px] text-white"
              style={{ background: avatarColor(mate.id) }}
            >
              {initials(mate.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-semibold">{mate.name}</span>
              <span className="text-ink-soft block truncate text-[11.5px]">
                {mate.preview ?? "Ingen konversation ännu — säg hej!"}
              </span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function ChatWindow({ partner, onBack }: { partner: Clubmate; onBack: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/messages/${partner.id}`)
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        setMessages(data.messages ?? []);
        setLoading(false);
      })
      .catch(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [partner.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setDraft("");

    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId: partner.id, text: trimmed }),
    });
    if (!response.ok) return;
    const data = await response.json();
    setMessages((current) => [...current, data.message]);
  }

  return (
    <>
      <button type="button" onClick={onBack} className="text-ink-soft mb-3 text-[12px]">
        ← Alla chattar
      </button>
      <div className="mb-3 flex items-center gap-3">
        <span
          className="font-display flex h-[33px] w-[33px] shrink-0 items-center justify-center rounded-full text-[13px] text-white"
          style={{ background: avatarColor(partner.id) }}
        >
          {initials(partner.name)}
        </span>
        <h1 className="font-display text-[18px]">{partner.name}</h1>
      </div>

      <div className="flex h-[360px] flex-col">
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-0.5 pb-3">
          {loading ? (
            <p className="text-ink-soft text-[12.5px] italic">Hämtar meddelanden…</p>
          ) : null}
          {!loading && messages.length === 0 ? (
            <p className="text-ink-soft text-[12.5px] italic">
              Ingen konversation ännu — skicka första meddelandet.
            </p>
          ) : null}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[78%] rounded-[15px] px-3.5 py-2.5 text-[13px] leading-snug ${
                message.fromMe
                  ? "bg-clay self-end rounded-br-[4px] text-white"
                  : "bg-chalk-dim self-start rounded-bl-[4px]"
              }`}
            >
              {message.text}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {QUICK_MESSAGES.map((quick) => (
            <button
              key={quick.label}
              type="button"
              onClick={() => send(quick.text)}
              className="border-line hover:border-clay rounded-full border bg-[var(--white)] px-2.5 py-1.5 text-[11.5px]"
            >
              {quick.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            send(draft);
          }}
          className="flex gap-2"
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Skriv ett meddelande…"
            className="mm-input flex-1 rounded-full"
          />
          <button
            type="submit"
            aria-label="Skicka"
            className="bg-clay h-[37px] w-[37px] shrink-0 rounded-full text-[14px] text-white"
          >
            ➤
          </button>
        </form>
      </div>
    </>
  );
}
