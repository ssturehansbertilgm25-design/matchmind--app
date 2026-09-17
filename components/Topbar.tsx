import { LogoutButton } from "./LogoutButton";

export function Topbar({
  subtitle,
  right,
  demoMode,
}: {
  subtitle?: string;
  right?: React.ReactNode;
  demoMode?: boolean;
}) {
  return (
    <header className="bg-court-dark text-chalk">
      <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-7">
        <div className="flex items-center gap-3">
          <span className="font-display text-ball inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[var(--brass)] text-[19px] italic">
            M
          </span>
          <div>
            <div className="font-display text-[23px] leading-none">MatchMind</div>
            <div className="font-display mt-[3px] text-[12.5px] italic text-[#b9c4b4]">
              {subtitle ?? "mental träning & spelarengagemang"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {demoMode ? (
            <span className="rounded-full border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.07)] px-3 py-1.5 text-[10.5px] font-semibold tracking-[0.06em] text-[#d3d9c9] uppercase">
              AI i demoläge
            </span>
          ) : null}
          {right}
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
