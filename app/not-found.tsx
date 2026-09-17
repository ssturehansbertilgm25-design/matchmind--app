import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="mm-card max-w-[420px] p-6 text-center">
        <h1 className="font-display mb-2 text-[24px]">Sidan finns inte</h1>
        <p className="text-ink-soft mb-4 text-[13px] leading-relaxed">
          Länken kan vara gammal eller felstavad.
        </p>
        <Link href="/" className="text-clay text-[13px] underline">
          Till startsidan
        </Link>
      </div>
    </main>
  );
}
