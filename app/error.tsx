"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="mm-card max-w-[420px] p-6 text-center">
        <h1 className="font-display mb-2 text-[24px]">Något gick fel</h1>
        <p className="text-ink-soft mb-4 text-[13px] leading-relaxed">
          Sidan kunde inte laddas. Ingen data har gått förlorad — försök igen, och hör av dig om
          det upprepar sig.
        </p>
        <button type="button" onClick={reset} className="mm-btn-primary">
          Försök igen
        </button>
      </div>
    </main>
  );
}
