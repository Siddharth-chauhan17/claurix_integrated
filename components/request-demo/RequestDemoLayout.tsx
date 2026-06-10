import Link from "next/link";
import { HexLogo } from "./icons";

interface RequestDemoLayoutProps {
  children: React.ReactNode;
}

export function RequestDemoLayout({ children }: RequestDemoLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4f5f6]">
      <WaveBackground />

      <header className="relative z-10 px-4 pt-8 sm:px-8 sm:pt-10 lg:px-12">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <HexLogo className="h-9 w-9 text-primary-600" />
          <span className="text-[1.35rem] font-bold tracking-tight text-slate-900">
            claurix
          </span>
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-8 sm:pb-20 lg:px-12 lg:pt-12">
        {children}
      </main>
    </div>
  );
}

function WaveBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <svg
        className="absolute -right-24 top-0 h-full w-[55%] min-w-[28rem] opacity-90"
        viewBox="0 0 600 900"
        fill="none"
        preserveAspectRatio="xMaxYMid slice"
      >
        <path
          d="M420 0C380 120 520 180 480 320C440 460 300 420 340 580C380 740 520 780 480 900"
          stroke="#22c55e"
          strokeWidth="1.5"
          strokeOpacity="0.12"
        />
        <path
          d="M480 0C440 140 580 200 540 340C500 480 360 440 400 600C440 760 580 800 540 900"
          stroke="#22c55e"
          strokeWidth="1.5"
          strokeOpacity="0.18"
        />
        <path
          d="M540 0C500 160 640 220 600 360C560 500 420 460 460 620C500 780 640 820 600 900"
          stroke="#22c55e"
          strokeWidth="1.5"
          strokeOpacity="0.25"
        />
        <path
          d="M600 0C560 180 700 240 660 380C620 520 480 480 520 640C560 800 700 840 660 900"
          stroke="#16a34a"
          strokeWidth="2"
          strokeOpacity="0.3"
        />
      </svg>
    </div>
  );
}
