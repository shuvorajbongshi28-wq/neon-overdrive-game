import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud, type HudDomRefs } from './components/GameHud';
import { StatusModal } from './components/StatusModal';
import { TitleScreen } from './components/TitleScreen';
import { soundEngine } from './game/audio';
import {
  PHYSICS,
  buildSnapshot,
  createInitialSim,
  loadHighScore,
  resizeSimViewport,
  saveHighScore,
  stepSimulation,
} from './game/engine';
import { CyberCanvasRenderer } from './game/renderer';
import type { GamePhase, GameSnapshot, InputState, SimulationState } from './game/types';

function shouldAutostart(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('autostart') === '1';
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<CyberCanvasRenderer | null>(null);

  const hudRefs: HudDomRefs = {
    scoreEl: useRef<HTMLSpanElement | null>(null),
    distanceEl: useRef<HTMLSpanElement | null>(null),
    bestEl: useRef<HTMLSpanElement | null>(null),
    comboBarEl: useRef<HTMLDivElement | null>(null),
    dashBarEl: useRef<HTMLDivElement | null>(null),
    overdriveEl: useRef<HTMLSpanElement | null>(null),
    chronoEl: useRef<HTMLSpanElement | null>(null),
  };

  const initialHighScore = loadHighScore();
  const initialPhase: GamePhase = shouldAutostart() ? 'playing' : 'title';

  const simRef = useRef<SimulationState>(
    createInitialSim(
      typeof window !== 'undefined' ? window.innerWidth : 1280,
      typeof window !== 'undefined' ? window.innerHeight : 720,
      initialHighScore,
      initialPhase
    )
  );

  const heldKeysRef = useRef<Set<string>>(new Set());
  const touchHeldRef = useRef({ left: false, right: false, slide: false });
  const pendingInputRef = useRef({
    jumpJustPressed: false,
    jumpJustReleased: false,
    dashJustPressed: false,
  });

  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => buildSnapshot(simRef.current));
  const [muted, setMuted] = useState(false);

  const syncBodyState = useCallback((phase: GamePhase) => {
    if (typeof document !== 'undefined') {
      document.body.dataset.state = phase;
    }
  }, []);

  const clearHeldInputs = useCallback(() => {
    heldKeysRef.current.clear();
    touchHeldRef.current.left = false;
    touchHeldRef.current.right = false;
    touchHeldRef.current.slide = false;
    pendingInputRef.current.jumpJustPressed = false;
    pendingInputRef.current.jumpJustReleased = false;
    pendingInputRef.current.dashJustPressed = false;
  }, []);

  const startNewRun = useCallback(() => {
    soundEngine.unlock();
    soundEngine.resumeFromPause();
    clearHeldInputs();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const w = window.innerWidth || 1280;
    const h = window.innerHeight || 720;
    const best = Math.max(loadHighScore(), simRef.current.highScore);
    simRef.current = createInitialSim(w, h, best, 'playing');
    rendererRef.current?.resetEffects();
    syncBodyState('playing');
    setSnapshot(buildSnapshot(simRef.current));
    canvasRef.current?.focus();
  }, [clearHeldInputs, syncBodyState]);

  const pauseRun = useCallback(() => {
    if (simRef.current.phase !== 'playing') return;
    simRef.current.phase = 'paused';
    clearHeldInputs();
    soundEngine.suspendOnPause();
    syncBodyState('paused');
    setSnapshot(buildSnapshot(simRef.current));
  }, [clearHeldInputs, syncBodyState]);

  const resumeRun = useCallback(() => {
    if (simRef.current.phase !== 'paused') return;
    clearHeldInputs();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    soundEngine.resumeFromPause();
    simRef.current.phase = 'playing';
    syncBodyState('playing');
    setSnapshot(buildSnapshot(simRef.current));
    canvasRef.current?.focus();
  }, [clearHeldInputs, syncBodyState]);

  const returnToTitle = useCallback(() => {
    clearHeldInputs();
    const w = window.innerWidth || 1280;
    const h = window.innerHeight || 720;
    const best = Math.max(loadHighScore(), simRef.current.highScore);
    saveHighScore(best);
    simRef.current = createInitialSim(w, h, best, 'title');
    rendererRef.current?.resetEffects();
    syncBodyState('title');
    setSnapshot(buildSnapshot(simRef.current));
  }, [clearHeldInputs, syncBodyState]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleTouchAction = useCallback(
    (action: 'left' | 'right' | 'jump' | 'slide' | 'dash', pressed: boolean) => {
      soundEngine.unlock();
      if (action === 'left') touchHeldRef.current.left = pressed;
      else if (action === 'right') touchHeldRef.current.right = pressed;
      else if (action === 'slide') touchHeldRef.current.slide = pressed;
      else if (action === 'jump') {
        if (pressed) pendingInputRef.current.jumpJustPressed = true;
        else pendingInputRef.current.jumpJustReleased = true;
      } else if (action === 'dash' && pressed) {
        pendingInputRef.current.dashJustPressed = true;
      }
    },
    []
  );

  // Sync initial body dataset state
  useEffect(() => {
    syncBodyState(simRef.current.phase);
  }, [syncBodyState]);

  // Keyboard & window blur bindings
  useEffect(() => {
    const isJumpKey = (code: string) =>
      code === 'Space' || code === 'ArrowUp' || code === 'KeyW';

    const onKeyDown = (e: KeyboardEvent) => {
      const phase = simRef.current.phase;

      if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
        return;
      }

      if (phase === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          startNewRun();
        }
        return;
      }

      if (phase === 'gameover') {
        if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyR') {
          e.preventDefault();
          startNewRun();
        }
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (phase === 'playing') pauseRun();
        else if (phase === 'paused') resumeRun();
        return;
      }

      if (e.code === 'KeyR' && (phase === 'playing' || phase === 'paused')) {
        e.preventDefault();
        startNewRun();
        return;
      }

      if (phase !== 'playing') return;

      soundEngine.unlock();

      if (
        e.code === 'Space' ||
        e.code === 'ArrowUp' ||
        e.code === 'ArrowDown' ||
        e.code === 'ArrowLeft' ||
        e.code === 'ArrowRight'
      ) {
        e.preventDefault();
      }

      const wasHeld = heldKeysRef.current.has(e.code);
      heldKeysRef.current.add(e.code);

      if (!wasHeld && isJumpKey(e.code)) {
        pendingInputRef.current.jumpJustPressed = true;
      }
      if (
        !wasHeld &&
        (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX' || e.code === 'KeyE')
      ) {
        pendingInputRef.current.dashJustPressed = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldKeysRef.current.delete(e.code);
      if (isJumpKey(e.code) && simRef.current.phase === 'playing') {
        pendingInputRef.current.jumpJustReleased = true;
      }
    };

    const onBlur = () => {
      clearHeldInputs();
    };

    const onVisibilityChange = () => {
      if (document.hidden) clearHeldInputs();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [clearHeldInputs, pauseRun, resumeRun, startNewRun, toggleMute]);

  // Isolated 60fps Canvas Loop (mounts once, never tears down on React state updates)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderer = new CyberCanvasRenderer();
    rendererRef.current = renderer;

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = window.innerWidth || 1280;
      const h = window.innerHeight || 720;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      resizeSimViewport(simRef.current, w, h);
      renderer.render(ctx, simRef.current);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    let rafId = 0;
    let lastTime = performance.now();
    let hudDomAccumulator = 0;
    let lastPushedPhase: GamePhase = simRef.current.phase;
    let lastPushedHull = simRef.current.hull;
    let lastPushedCombo = simRef.current.combo;
    let lastPushedShield = simRef.current.hasShield;
    let lastPushedOverdrive = simRef.current.overdriveTimer > 0;
    let lastPushedChrono = simRef.current.chronoTimer > 0;
    let lastPushedDashReady = simRef.current.player.dashCooldown <= 0;

    const frame = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);

      const sim = simRef.current;
      if (sim.phase === 'paused') {
        if (lastPushedPhase !== 'paused') {
          lastPushedPhase = 'paused';
          renderer.render(ctx, sim);
        }
        rafId = requestAnimationFrame(frame);
        return;
      }

      const keys = heldKeysRef.current;
      const touch = touchHeldRef.current;

      const input: InputState = {
        left: keys.has('ArrowLeft') || keys.has('KeyA') || touch.left,
        right: keys.has('ArrowRight') || keys.has('KeyD') || touch.right,
        upHeld: keys.has('ArrowUp') || keys.has('KeyW') || keys.has('Space'),
        downHeld: keys.has('ArrowDown') || keys.has('KeyS') || touch.slide,
        jumpJustPressed: pendingInputRef.current.jumpJustPressed,
        jumpJustReleased: pendingInputRef.current.jumpJustReleased,
        dashJustPressed: pendingInputRef.current.dashJustPressed,
      };
      pendingInputRef.current.jumpJustPressed = false;
      pendingInputRef.current.jumpJustReleased = false;
      pendingInputRef.current.dashJustPressed = false;

      const events = stepSimulation(sim, dt, input);
      renderer.updateEffects(sim, dt);
      renderer.render(ctx, sim);

      // Dispatch synchronized audio & particle bursts for gameplay events
      if (events.jumped) {
        soundEngine.playJump(false);
        renderer.spawnBurst(
          sim.player.x + sim.player.width * 0.5,
          sim.player.y + sim.player.height,
          '#00F0FF',
          6,
          170,
          380,
          3
        );
      }
      if (events.doubleJumped) {
        soundEngine.playJump(true);
        renderer.spawnBurst(
          sim.player.x + sim.player.width * 0.5,
          sim.player.y + sim.player.height,
          '#38BDF8',
          10,
          210,
          220,
          3.2
        );
      }
      if (events.landed) {
        renderer.spawnBurst(
          sim.player.x + sim.player.width * 0.5,
          sim.groundY,
          '#64748B',
          5,
          130,
          260,
          2.5
        );
      }
      if (events.dashed) {
        soundEngine.playDash();
        renderer.spawnBurst(
          sim.player.x,
          sim.player.y + sim.player.height * 0.5,
          '#00F0FF',
          12,
          280,
          0,
          3.5
        );
      }
      if (events.coreCollected) {
        soundEngine.playCorePickup(events.coreCollected.combo);
        renderer.spawnBurst(events.coreCollected.x, events.coreCollected.y, '#00F0FF', 9, 220, 220, 3);
        renderer.spawnPopup(
          events.coreCollected.x,
          events.coreCollected.y - 14,
          `+${50 * events.coreCollected.combo}`,
          '#00F0FF'
        );
      }
      if (events.powerUpCollected) {
        soundEngine.playPowerUp(events.powerUpCollected.kind);
        const color =
          events.powerUpCollected.kind === 'shield'
            ? '#00F0FF'
            : events.powerUpCollected.kind === 'overdrive'
              ? '#FF2A85'
              : '#8B5CF6';
        const label =
          events.powerUpCollected.kind === 'shield'
            ? 'SHIELD'
            : events.powerUpCollected.kind === 'overdrive'
              ? 'OVERDRIVE'
              : 'CHRONO';
        renderer.spawnBurst(events.powerUpCollected.x, events.powerUpCollected.y, color, 18, 290, 120, 4);
        renderer.spawnPopup(events.powerUpCollected.x, events.powerUpCollected.y - 18, label, color);
      }
      if (events.chargerTelegraph) {
        soundEngine.playTelegraph();
      }
      if (events.obstacleSmashed) {
        soundEngine.playSmash();
        renderer.spawnBurst(events.obstacleSmashed.x, events.obstacleSmashed.y, '#FF2A85', 20, 340, 400, 4);
        renderer.spawnPopup(
          events.obstacleSmashed.x,
          events.obstacleSmashed.y - 16,
          `+${events.obstacleSmashed.bonus}`,
          '#FFB800'
        );
      }
      if (events.shieldBroken) {
        soundEngine.playShieldShatter();
        renderer.spawnBurst(events.shieldBroken.x, events.shieldBroken.y, '#00F0FF', 24, 360, 260, 4.2);
        renderer.spawnPopup(events.shieldBroken.x, events.shieldBroken.y - 24, 'SHIELD SAVED', '#00F0FF');
      }
      if (events.playerHit) {
        soundEngine.playHit(Boolean(events.gameOver));
        renderer.spawnBurst(events.playerHit.x, events.playerHit.y, '#FF2A85', 26, 380, 450, 4.5);
      }
      if (events.gameOver) {
        saveHighScore(sim.highScore);
        syncBodyState('gameover');
      }

      // Mutate continuous HUD elements via DOM refs at ~12Hz (zero React re-renders & no 60Hz layout thrashing)
      hudDomAccumulator += dt;
      if (sim.phase === 'playing' && hudDomAccumulator >= 0.08) {
        hudDomAccumulator = 0;
        const roundedScore = Math.round(sim.score);
        if (hudRefs.scoreEl.current) {
          hudRefs.scoreEl.current.textContent = roundedScore.toLocaleString();
        }
        if (hudRefs.distanceEl.current) {
          hudRefs.distanceEl.current.textContent = `${Math.round(sim.distance)}m`;
        }
        if (hudRefs.bestEl.current) {
          hudRefs.bestEl.current.textContent = Math.max(sim.highScore, roundedScore).toLocaleString();
        }
        if (hudRefs.comboBarEl.current) {
          const pct = sim.combo > 1 ? Math.max(0, Math.min(1, sim.comboTimer / PHYSICS.COMBO_DURATION)) : 0;
          hudRefs.comboBarEl.current.style.transform = `scaleX(${pct})`;
        }
        if (hudRefs.dashBarEl.current) {
          const readyRatio = 1 - Math.max(0, Math.min(1, sim.player.dashCooldown / PHYSICS.DASH_COOLDOWN));
          hudRefs.dashBarEl.current.style.transform = `scaleX(${readyRatio})`;
        }
        if (hudRefs.overdriveEl.current && sim.overdriveTimer > 0) {
          hudRefs.overdriveEl.current.textContent = `Overdrive ${sim.overdriveTimer.toFixed(1)}s`;
        }
        if (hudRefs.chronoEl.current && sim.chronoTimer > 0) {
          hudRefs.chronoEl.current.textContent = `Chrono ${sim.chronoTimer.toFixed(1)}s`;
        }
      }

      // Only trigger React re-render on discrete phase/status transitions
      const overdriveOn = sim.overdriveTimer > 0;
      const chronoOn = sim.chronoTimer > 0;
      const dashReady = sim.player.dashCooldown <= 0.01;
      if (
        sim.phase !== lastPushedPhase ||
        sim.hull !== lastPushedHull ||
        sim.combo !== lastPushedCombo ||
        sim.hasShield !== lastPushedShield ||
        overdriveOn !== lastPushedOverdrive ||
        chronoOn !== lastPushedChrono ||
        dashReady !== lastPushedDashReady
      ) {
        lastPushedPhase = sim.phase;
        lastPushedHull = sim.hull;
        lastPushedCombo = sim.combo;
        lastPushedShield = sim.hasShield;
        lastPushedOverdrive = overdriveOn;
        lastPushedChrono = chronoOn;
        lastPushedDashReady = dashReady;
        setSnapshot(buildSnapshot(sim));
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [syncBodyState]);

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#070913]">
      <canvas
        ref={canvasRef}
        data-testid="game-canvas"
        tabIndex={0}
        aria-label="Neon Overdrive game canvas"
        className="block w-full h-full outline-none"
      />

      {snapshot.phase === 'title' && (
        <TitleScreen
          highScore={snapshot.highScore}
          muted={muted}
          onStart={startNewRun}
          onToggleMute={toggleMute}
        />
      )}

      {snapshot.phase === 'playing' && (
        <GameHud
          snapshot={snapshot}
          hudRefs={hudRefs}
          muted={muted}
          onToggleMute={toggleMute}
          onPause={pauseRun}
          onRestart={startNewRun}
          onTouchAction={handleTouchAction}
        />
      )}

      {(snapshot.phase === 'paused' || snapshot.phase === 'gameover') && (
        <StatusModal
          mode={snapshot.phase}
          snapshot={snapshot}
          onResume={snapshot.phase === 'paused' ? resumeRun : undefined}
          onRestart={startNewRun}
          onReturnTitle={returnToTitle}
        />
      )}
    </main>
  );
}
