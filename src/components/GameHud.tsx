import type { RefObject } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import type { GameSnapshot } from '../game/types';

export interface HudDomRefs {
  scoreEl: RefObject<HTMLSpanElement | null>;
  distanceEl: RefObject<HTMLSpanElement | null>;
  bestEl: RefObject<HTMLSpanElement | null>;
  comboBarEl: RefObject<HTMLDivElement | null>;
  dashBarEl: RefObject<HTMLDivElement | null>;
  overdriveEl: RefObject<HTMLSpanElement | null>;
  chronoEl: RefObject<HTMLSpanElement | null>;
}

interface GameHudProps {
  snapshot: GameSnapshot;
  hudRefs: HudDomRefs;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
  onTouchAction: (
    action: 'left' | 'right' | 'jump' | 'slide' | 'dash',
    pressed: boolean
  ) => void;
}

export function GameHud({
  snapshot,
  hudRefs,
  muted,
  onToggleMute,
  onPause,
  onRestart,
  onTouchAction,
}: GameHudProps) {
  const dashReady = snapshot.dashCooldownRatio <= 0.01;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
      {/* Top Perimeter Clusters — >= 85% viewport remains completely unobstructed */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left: Score, Distance & Combo Multiplier */}
        <div className="bg-[#090F20]/88 border border-cyan-400/25 px-3.5 py-2.5 rounded-sm shadow-[0_6px_24px_rgba(0,0,0,0.45)] min-w-[168px]">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
              Score
            </span>
            <span className="text-[11px] font-mono-tabular text-slate-400">
              Best{' '}
              <span ref={hudRefs.bestEl}>
                {snapshot.highScore.toLocaleString()}
              </span>
            </span>
          </div>
          <div className="mt-0.5 flex items-baseline gap-3">
            <span
              ref={hudRefs.scoreEl}
              data-testid="hud-score"
              className="font-mono-tabular font-bold text-2xl sm:text-3xl leading-none text-slate-50 hud-text-stroke"
            >
              {snapshot.score.toLocaleString()}
            </span>
            <span
              ref={hudRefs.distanceEl}
              className="font-mono-tabular text-xs font-medium text-cyan-300"
            >
              {snapshot.distance}m
            </span>
          </div>

          {/* Combo & Multiplier Bar */}
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`font-mono-tabular text-xs font-bold ${
                snapshot.combo > 1 ? 'text-amber-400' : 'text-slate-400'
              }`}
            >
              x{snapshot.combo} Combo
            </span>
            <div className="flex-1 h-1.5 bg-slate-800/90 overflow-hidden rounded-xs">
              <div
                ref={hudRefs.comboBarEl}
                className="h-full bg-amber-400 origin-left"
                style={{
                  transform: `scaleX(${snapshot.combo > 1 ? snapshot.comboProgress : 0})`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Top-Center: Hull Integrity Sockets & Active Power-ups */}
        <div className="hidden sm:flex flex-col items-center gap-2">
          <div className="bg-[#090F20]/88 border border-cyan-400/25 px-4 py-2 rounded-sm flex items-center gap-4 shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
            {/* 3-state Hull Sockets */}
            <div
              className="flex items-center gap-2"
              aria-label={`Hull ${snapshot.hull} of ${snapshot.maxHull}`}
            >
              <span className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase mr-1">
                Hull {snapshot.hull}/{snapshot.maxHull}
              </span>
              {Array.from({ length: snapshot.maxHull }).map((_, idx) => {
                const filled = idx < snapshot.hull;
                return (
                  <svg
                    key={idx}
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    aria-hidden="true"
                  >
                    <polygon
                      points="12,2 21,7 21,17 12,22 3,17 3,7"
                      fill={filled ? '#00F0FF' : 'rgba(15,23,42,0.75)'}
                      fillOpacity={filled ? 0.9 : 1}
                      stroke={filled ? '#E0FCFF' : '#334155'}
                      strokeWidth="2"
                    />
                    {filled && (
                      <polygon
                        points="12,5 17,8 12,11 7,8"
                        fill="#FFFFFF"
                        fillOpacity="0.45"
                      />
                    )}
                  </svg>
                );
              })}
            </div>

            <div className="w-px h-5 bg-slate-700/80" aria-hidden="true" />

            {/* Phase Dash Cooldown */}
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-semibold tracking-wider uppercase ${
                  dashReady ? 'text-cyan-300' : 'text-slate-400'
                }`}
              >
                Dash [Shift]
              </span>
              <div className="w-14 h-2 bg-slate-800 rounded-xs overflow-hidden">
                <div
                  ref={hudRefs.dashBarEl}
                  className={`h-full origin-left ${
                    dashReady ? 'bg-[#00F0FF]' : 'bg-slate-400'
                  }`}
                  style={{ transform: `scaleX(${1 - snapshot.dashCooldownRatio})` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top-Right: Compact Square Utility Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="sm:hidden bg-[#090F20]/88 border border-cyan-400/25 px-2.5 py-1.5 rounded-sm flex items-center gap-1.5">
            <span className="font-mono-tabular text-xs font-bold text-cyan-300">
              {snapshot.hull}/{snapshot.maxHull}
            </span>
            {snapshot.hasShield && (
              <span className="text-[11px] font-semibold text-cyan-200">SHD</span>
            )}
          </div>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            title="Mute (M)"
            className="inline-flex items-center justify-center w-10 h-10 bg-[#090F20]/90 border border-cyan-400/30 hover:border-cyan-300 text-slate-200 hover:text-cyan-300 rounded-sm transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onRestart();
            }}
            aria-label="Restart run"
            title="Restart (R)"
            className="inline-flex items-center justify-center w-10 h-10 bg-[#090F20]/90 border border-cyan-400/30 hover:border-cyan-300 text-slate-200 hover:text-cyan-300 rounded-sm transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            aria-label="Pause game"
            title="Pause (P)"
            className="inline-flex items-center justify-center w-10 h-10 bg-[#090F20]/90 border border-cyan-400/30 hover:border-cyan-300 text-slate-200 hover:text-cyan-300 rounded-sm transition-colors cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Power-Up Readout Strip (Mobile & Desktop) */}
      {(snapshot.hasShield || snapshot.overdriveTimer > 0 || snapshot.chronoTimer > 0) && (
        <div className="self-center sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:top-16 mt-2 sm:mt-0 flex items-center gap-3 bg-[#090F20]/90 border border-slate-700/80 px-3 py-1 rounded-sm text-xs font-mono-tabular">
          {snapshot.hasShield && (
            <span className="text-cyan-300 font-semibold">Shield Active</span>
          )}
          {snapshot.overdriveTimer > 0 && (
            <span ref={hudRefs.overdriveEl} className="text-[#FF2A85] font-semibold">
              Overdrive {snapshot.overdriveTimer.toFixed(1)}s
            </span>
          )}
          {snapshot.chronoTimer > 0 && (
            <span ref={hudRefs.chronoEl} className="text-violet-400 font-semibold">
              Chrono {snapshot.chronoTimer.toFixed(1)}s
            </span>
          )}
        </div>
      )}

      {/* Mobile / Tablet On-Screen Touch Controls (Bottom corners, >= 48px targets) */}
      <div className="flex lg:hidden items-end justify-between gap-4 pb-1">
        {/* Left / Right horizontal thrusters */}
        <div className="flex items-center gap-2.5 pointer-events-auto">
          <button
            type="button"
            aria-label="Move Left"
            onPointerDown={(e) => {
              e.preventDefault();
              onTouchAction('left', true);
            }}
            onPointerUp={() => onTouchAction('left', false)}
            onPointerLeave={() => onTouchAction('left', false)}
            onPointerCancel={() => onTouchAction('left', false)}
            className="w-13 h-13 inline-flex items-center justify-center bg-[#090F20]/85 active:bg-cyan-500/30 border border-cyan-400/35 text-cyan-200 rounded-sm touch-none"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            aria-label="Move Right"
            onPointerDown={(e) => {
              e.preventDefault();
              onTouchAction('right', true);
            }}
            onPointerUp={() => onTouchAction('right', false)}
            onPointerLeave={() => onTouchAction('right', false)}
            onPointerCancel={() => onTouchAction('right', false)}
            className="w-13 h-13 inline-flex items-center justify-center bg-[#090F20]/85 active:bg-cyan-500/30 border border-cyan-400/35 text-cyan-200 rounded-sm touch-none"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>

        {/* Slide, Dash, Jump */}
        <div className="flex items-center gap-2.5 pointer-events-auto">
          <button
            type="button"
            aria-label="Slide or Fast Drop"
            onPointerDown={(e) => {
              e.preventDefault();
              onTouchAction('slide', true);
            }}
            onPointerUp={() => onTouchAction('slide', false)}
            onPointerLeave={() => onTouchAction('slide', false)}
            onPointerCancel={() => onTouchAction('slide', false)}
            className="w-13 h-13 inline-flex items-center justify-center bg-[#090F20]/85 active:bg-amber-500/30 border border-amber-400/40 text-amber-200 rounded-sm touch-none"
          >
            <ArrowDown className="w-6 h-6" />
          </button>
          <button
            type="button"
            aria-label="Phase Dash"
            onPointerDown={(e) => {
              e.preventDefault();
              onTouchAction('dash', true);
            }}
            onPointerUp={() => onTouchAction('dash', false)}
            className={`w-13 h-13 inline-flex items-center justify-center bg-[#090F20]/85 border rounded-sm touch-none ${
              dashReady
                ? 'border-[#FF2A85]/70 text-[#FF2A85] active:bg-[#FF2A85]/30'
                : 'border-slate-700 text-slate-500'
            }`}
          >
            <Zap className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Jump"
            onPointerDown={(e) => {
              e.preventDefault();
              onTouchAction('jump', true);
            }}
            onPointerUp={() => onTouchAction('jump', false)}
            onPointerLeave={() => onTouchAction('jump', false)}
            onPointerCancel={() => onTouchAction('jump', false)}
            className="w-14 h-14 inline-flex items-center justify-center bg-[#00F0FF]/20 active:bg-[#00F0FF]/45 border border-[#00F0FF]/70 text-cyan-100 rounded-sm touch-none"
          >
            <ArrowUp className="w-7 h-7" />
          </button>
        </div>
      </div>
    </div>
  );
}
