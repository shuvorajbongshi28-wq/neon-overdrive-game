import { Home, Play, RotateCcw } from 'lucide-react';
import type { GameSnapshot } from '../game/types';

interface StatusModalProps {
  mode: 'paused' | 'gameover';
  snapshot: GameSnapshot;
  onResume?: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
}

export function StatusModal({
  mode,
  snapshot,
  onResume,
  onRestart,
  onReturnTitle,
}: StatusModalProps) {
  const isPaused = mode === 'paused';

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#050711]/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
    >
      <div className="w-full max-w-md bg-[#0D1326] border border-cyan-400/35 p-6 sm:p-8 rounded-sm shadow-[0_18px_60px_rgba(0,0,0,0.75)]">
        <div className="flex items-baseline justify-between gap-4">
          <h2
            id="status-modal-title"
            className="font-display font-bold text-2xl sm:text-3xl tracking-wide text-slate-50"
          >
            {isPaused ? 'Run Paused' : 'Game Over'}
          </h2>
          {!isPaused && snapshot.isNewHighScore && (
            <span className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
              New Best
            </span>
          )}
        </div>

        {/* 3 Tabular Stat Tiles */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="bg-[#080C1A] border border-slate-800 px-3 py-3 rounded-sm">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Score
            </div>
            <div className="mt-1 font-mono-tabular font-bold text-lg sm:text-xl text-slate-100">
              {snapshot.score.toLocaleString()}
            </div>
          </div>

          <div className="bg-[#080C1A] border border-slate-800 px-3 py-3 rounded-sm">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Best
            </div>
            <div className="mt-1 font-mono-tabular font-bold text-lg sm:text-xl text-cyan-300">
              {snapshot.highScore.toLocaleString()}
            </div>
          </div>

          <div className="bg-[#080C1A] border border-slate-800 px-3 py-3 rounded-sm">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Distance
            </div>
            <div className="mt-1 font-mono-tabular font-bold text-lg sm:text-xl text-slate-100">
              {snapshot.distance}m
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-400 font-mono-tabular">
          <span>Cores Collected: {snapshot.coresCollected}</span>
          <span>Peak Combo: x{snapshot.bestCombo}</span>
        </div>

        {/* Primary & Secondary Actions */}
        <div className="mt-7 flex flex-col gap-3">
          {isPaused && onResume ? (
            <button
              type="button"
              onClick={onResume}
              className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 bg-[#00F0FF] hover:bg-[#5CF6FF] text-[#070913] font-display font-bold text-base tracking-wider rounded-sm transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-300 whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-current" aria-hidden="true" />
              <span>Resume</span>
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onRestart}
              className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 bg-[#00F0FF] hover:bg-[#5CF6FF] text-[#070913] font-display font-bold text-base tracking-wider rounded-sm shadow-[0_0_20px_rgba(0,240,255,0.35)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-300 whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Play Again</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-3">
            {isPaused && (
              <button
                type="button"
                onClick={onRestart}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#121B36] hover:bg-[#19254A] border border-slate-700 text-slate-200 text-sm font-medium rounded-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>Restart</span>
              </button>
            )}
            <button
              type="button"
              onClick={onReturnTitle}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#121B36] hover:bg-[#19254A] border border-slate-700 text-slate-200 text-sm font-medium rounded-sm transition-colors cursor-pointer whitespace-nowrap ${
                isPaused ? '' : 'col-span-2'
              }`}
            >
              <Home className="w-4 h-4" aria-hidden="true" />
              <span>Title Screen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
