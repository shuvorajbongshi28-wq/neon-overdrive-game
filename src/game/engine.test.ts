import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PHYSICS,
  buildSnapshot,
  computeDifficultySpeed,
  computeSpawnInterval,
  computeTimeScale,
  createInitialSim,
  stepSimulation,
} from './engine';
import type { InputState } from './types';

function emptyInput(): InputState {
  return {
    left: false,
    right: false,
    upHeld: false,
    downHeld: false,
    jumpJustPressed: false,
    jumpJustReleased: false,
    dashJustPressed: false,
  };
}

test('difficulty speed increases progressively with elapsed time and caps below MAX_WORLD_SPEED', () => {
  const s0 = computeDifficultySpeed(0);
  const s30 = computeDifficultySpeed(30);
  const s90 = computeDifficultySpeed(90);
  assert.equal(s0, PHYSICS.BASE_WORLD_SPEED);
  assert.ok(s30 > s0);
  assert.ok(s90 > s30);
  assert.ok(s90 < PHYSICS.MAX_WORLD_SPEED);
});

test('spawn interval tightens over time', () => {
  const early = computeSpawnInterval(0, 0.5);
  const late = computeSpawnInterval(95, 0.5);
  assert.ok(late < early);
});

test('jump, double jump, and variable jump height cut work accurately', () => {
  const sim = createInitialSim(1280, 720, 0, 'playing');
  const jumpIn = { ...emptyInput(), jumpJustPressed: true, upHeld: true };
  const ev1 = stepSimulation(sim, 0.016, jumpIn);
  assert.equal(ev1.jumped, true);
  assert.equal(sim.player.grounded, false);
  assert.ok(sim.player.vy < 0);

  // Release jump early while ascending -> velocity cut
  const prevVy = sim.player.vy;
  stepSimulation(sim, 0.016, { ...emptyInput(), jumpJustReleased: true });
  assert.ok(sim.player.vy > prevVy); // less negative (cut toward 0)

  // Double jump mid-air
  const ev2 = stepSimulation(sim, 0.016, { ...emptyInput(), jumpJustPressed: true, upHeld: true });
  assert.equal(ev2.doubleJumped, true);
  assert.equal(sim.player.jumpsRemaining, 0);
});

test('coyote time allows jumping briefly after becoming airborne', () => {
  const sim = createInitialSim(1280, 720, 0, 'playing');
  sim.player.grounded = false;
  sim.player.coyoteTimer = 0.08;
  sim.player.y -= 10;

  const ev = stepSimulation(sim, 0.016, { ...emptyInput(), jumpJustPressed: true, upHeld: true });
  assert.equal(ev.jumped, true);
  assert.equal(sim.player.jumpsRemaining, 1);
});

test('collecting energy cores increments combo multiplier and score, and decays after combo window', () => {
  const sim = createInitialSim(1280, 720, 0, 'playing');
  sim.pickups.push({
    id: 99,
    kind: 'core',
    x: sim.player.x + 25,
    y: sim.player.y + 20,
    radius: 16,
    phase: 0,
    collected: false,
  });

  const ev = stepSimulation(sim, 0.016, emptyInput());
  assert.ok(ev.coreCollected);
  assert.equal(sim.coresCollected, 1);
  assert.equal(sim.combo, 2);
  assert.ok(sim.score >= 100);

  // Advance past combo window without collecting another core
  sim.comboTimer = 0.01;
  stepSimulation(sim, 0.02, emptyInput());
  assert.equal(sim.combo, 1);
});

test('shield absorbs obstacle collision without losing hull', () => {
  const sim = createInitialSim(1280, 720, 0, 'playing');
  sim.hasShield = true;
  sim.obstacles.push({
    id: 1,
    kind: 'pylon',
    x: sim.player.x + 12,
    y: sim.player.y,
    baseY: sim.player.y,
    width: 40,
    height: 50,
    vx: 0,
    phase: 0,
    telegraphTimer: 0,
    telegraphDuration: 0,
    activeAttack: false,
    destroyed: false,
    passed: false,
  });

  const ev = stepSimulation(sim, 0.016, emptyInput());
  assert.ok(ev.shieldBroken);
  assert.equal(sim.hasShield, false);
  assert.equal(sim.hull, PHYSICS.MAX_HULL);
});

test('taking 3 hits transitions simulation to gameover and resets combo', () => {
  const sim = createInitialSim(1280, 720, 0, 'playing');
  sim.combo = 5;
  sim.hull = 1;
  sim.obstacles.push({
    id: 2,
    kind: 'pylon',
    x: sim.player.x + 10,
    y: sim.player.y,
    baseY: sim.player.y,
    width: 40,
    height: 50,
    vx: 0,
    phase: 0,
    telegraphTimer: 0,
    telegraphDuration: 0,
    activeAttack: false,
    destroyed: false,
    passed: false,
  });

  const ev = stepSimulation(sim, 0.016, emptyInput());
  assert.ok(ev.playerHit);
  assert.equal(ev.gameOver, true);
  assert.equal(sim.hull, 0);
  assert.equal(sim.combo, 1);
  assert.equal(sim.phase, 'gameover');
});

test('chrono slow power-up reduces simulation timeScale while keeping snapshot crisp', () => {
  const sim = createInitialSim(1280, 720, 0, 'playing');
  assert.equal(computeTimeScale(sim), 1);
  sim.chronoTimer = 3.2;
  assert.equal(computeTimeScale(sim), 0.45);
  const snap = buildSnapshot(sim);
  assert.equal(snap.chronoTimer, 3.2);
});

test('survives opening seconds without input', () => {
  const sim = createInitialSim(1280, 720, 0, 'playing');
  for (let i = 0; i < 90; i++) {
    stepSimulation(sim, 1 / 60, emptyInput(), () => 0.5);
  }
  assert.equal(sim.phase, 'playing');
  assert.equal(sim.hull, PHYSICS.MAX_HULL);
});
