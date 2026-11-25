import { Play, Volume2, VolumeX } from 'lucide-react';

interface TitleScreenProps {
  highScore: number;
  muted: boolean;
  onStart: () => void;
  onToggleMute: () => void;
}

export function TitleScreen({
  highScore,
  muted,
  onStart,
  onToggleMute,
}: TitleScreenProps) {
  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-6 sm:p-10 md:p-14 pointer-events-none">
      {/* Top bar utility: Mute only */}
      <div className="flex items-start justify-between">
        <div className="pointer-events-auto max-w-xl pt-4 sm:pt-8">
          {/* Bespoke inline SVG Title Emblem Lockup */}
          <svg
            viewBox="0 0 540 138"
            className="w-full max-w-[460px] h-auto"
            role="img"
            aria-label="Neon Overdrive"
          >
            <defs>
              <linearGradient id="neonTitleAccent" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00F0FF" />
                <stop offset="60%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#FF2A85" />
              </linearGradient>
            </defs>
            {/* Angular geometric frame bars */}
            <path
              d="M4 18 L24 4 L196 4 L184 18 Z"
              fill="#00F0FF"
              opacity="0.9"
            />
            <path
              d="M204 11 L520 11"
              stroke="#00F0FF"
              strokeWidth="2"
              strokeOpacity="0.38"
            />
            <text
              x="4"
              y="72"
              fill="#F8FAFC"
              fontFamily="Chakra Petch, sans-serif"
              fontWeight="700"
              fontSize="60"
              letterSpacing="6"
            >
              NEON
            </text>
            <text
              x="4"
              y="124"
              fill="url(#neonTitleAccent)"
              fontFamily="Chakra Petch, sans-serif"
              fontWeight="700"
              fontStyle="italic"
              fontSize="56"
              letterSpacing="4"
            >
              OVERDRIVE
            </text>
            <path
              d="M4 134 L360 134 L374 128"
              fill="none"
              stroke="#FF2A85"
              strokeWidth="2.5"
              strokeOpacity="0.85"
            />
          </svg>

          <p className="mt-4 max-w-md text-sm sm:text-base text-slate-300 leading-relaxed">
            Pilot your cyber-cycle through high-speed neon traffic, chain energy cores for combo multipliers, and survive the surge.
          </p>

          {highScore > 0 && (
            <div className="mt-4 flex items-center gap-3 text-sm text-cyan-300">
              <span className="text-slate-400">Best Score</span>
              <span aria-hidden="true" className="text-slate-600">/</span>
              <span className="font-mono-tabular font-bold text-base text-cyan-300">
                {highScore.toLocaleString()}
              </span>
            </div>
          )}

          <div className="mt-7 flex items-center gap-4">
            <button
              type="button"
              data-start="true"
              onClick={onStart}
              className="group inline-flex items-center gap-3 px-7 py-3.5 bg-[#00F0FF] hover:bg-[#5CF6FF] active:translate-y-px text-[#070913] font-display font-bold text-lg tracking-wider rounded-sm shadow-[0_0_26px_rgba(0,240,255,0.45)] transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00F0FF] whitespace-nowrap shrink-0"
            >
              <Play className="w-5 h-5 fill-current" aria-hidden="true" />
              <span>Start Run</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          className="pointer-events-auto inline-flex items-center justify-center w-11 h-11 bg-[#0E1529]/90 border border-cyan-400/30 hover:border-cyan-300 text-slate-200 hover:text-cyan-300 rounded-sm transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400 shrink-0"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Bottom safe margin: single flat borderless control hint */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-slate-400">
        <p className="tracking-wide">
          Arrows / WASD Move &amp; Jump · Down Slide · Shift Dash · P Pause · Enter Start
        </p>
      </div>
    </div>
  );
}
