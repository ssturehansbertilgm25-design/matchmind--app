export function Sparkline({ moods }: { moods: number[] }) {
  const recent = moods.slice(-7);
  if (recent.length === 0) {
    return <span className="text-ink-soft text-[11px] italic">inga reflektioner</span>;
  }
  return (
    <div className="flex h-5 items-end gap-[2px]" aria-label="Mående-trend">
      {recent.map((mood, index) => (
        <div
          key={index}
          className="bg-court w-[4px] rounded-[1px]"
          style={{ height: `${(mood / 5) * 20}px`, opacity: 0.35 + (mood / 5) * 0.5 }}
        />
      ))}
    </div>
  );
}
