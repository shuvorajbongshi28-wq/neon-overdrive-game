import type {
  GameEvents,
  GameSnapshot,
  InputState,
  Obstacle,
  ObstacleKind,
  Pickup,
  PlayerState,
  PowerUpType,
  SimulationState,
} from './types';

export const HIGH_SCORE_STORAGE_KEY = 'neon_overdrive_high_score_v1';

export const PHYSICS = {
  GRAVITY: 2550,
  JUMP_VELOCITY: -860,
  DOUBLE_JUMP_VELOCITY: -780,
  JUMP_CUT_MULTIPLIER: 0.45,
  FAST_DROP_ACCEL: 3800,
  MOVE_SPEED: 440,
  MOVE_ACCEL: 3200,
  MOVE_FRICTION: 2600,
  COYOTE_TIME: 0.11,
  JUMP_BUFFER_TIME: 0.12,
  DASH_DURATION: 0.22,
  DASH_COOLDOWN: 2.2,
  DASH_SPEED: 720,
  PLAYER_WIDTH: 58,
  PLAYER_HEIGHT: 42,
  PLAYER_SLIDE_HEIGHT: 23,
  MAX_HULL: 3,
  COMBO_DURATION: 3.4,
  OVERDRIVE_DURATION: 5.5,
  CHRONO_DURATION: 5.5,
  BASE_WORLD_SPEED: 430,
  MAX_WORLD_SPEED: 980,
} as const;

export function createInitialPlayer(groundY: number): PlayerState {
  return {
    x: 190,
    y: groundY - PHYSICS.PLAYER_HEIGHT,
    vx: 0,
    vy: 0,
    width: PHYSICS.PLAYER_WIDTH,
    height: PHYSICS.PLAYER_HEIGHT,
    grounded: true,
    jumpsRemaining: 2,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    sliding: false,
    slideTimer: 0,
    dashTimer: 0,
    dashCooldown: 0,
    invulnTimer: 0,
    hitFlashTimer: 0,
    squashX: 1,
    squashY: 1,
    wheelPhase: 0,
    afterimages: [],
  };
}

export function createInitialSim(
  worldWidth = 1280,
  worldHeight = 720,
  highScore = 0,
  phase: SimulationState['phase'] = 'title'
): SimulationState {
  const groundY = computeGroundY(worldHeight);
  return {
    phase,
    elapsed: 0,
    score: 0,
    highScore,
    distance: 0,
    combo: 1,
    comboTimer: 0,
    bestCombo: 1,
    coresCollected: 0,
    hull: PHYSICS.MAX_HULL,
    maxHull: PHYSICS.MAX_HULL,
    hasShield: false,
    overdriveTimer: 0,
    chronoTimer: 0,
    hitstopTimer: 0,
    trauma: 0,
    damageFlash: 0,
    worldSpeed: PHYSICS.BASE_WORLD_SPEED,
    baseSpeed: PHYSICS.BASE_WORLD_SPEED,
    spawnTimer: 1.15,
    coreSpawnTimer: 0.65,
    powerUpSpawnTimer: 6.5,
    nextEntityId: 1,
    worldWidth,
    worldHeight,
    groundY,
    player: createInitialPlayer(groundY),
    obstacles: [],
    pickups: [],
    isNewHighScore: false,
  };
}

export function computeGroundY(worldHeight: number): number {
  return Math.round(Math.max(260, worldHeight * 0.78));
}

export function resizeSimViewport(sim: SimulationState, width: number, height: number): void {
  const prevGroundY = sim.groundY;
  sim.worldWidth = Math.max(320, width);
  sim.worldHeight = Math.max(320, height);
  sim.groundY = computeGroundY(sim.worldHeight);
  const deltaY = sim.groundY - prevGroundY;
  sim.player.y += deltaY;
  const maxX = Math.max(180, sim.worldWidth * 0.65);
  if (sim.player.x > maxX) sim.player.x = maxX;
  for (const obs of sim.obstacles) {
    obs.y += deltaY;
    obs.baseY += deltaY;
  }
  for (const p of sim.pickups) {
    p.y += deltaY;
  }
}

export function computeDifficultySpeed(elapsedSeconds: number): number {
  // Smooth progressive ramp: gentle for first 12s, steadily ramps to MAX_WORLD_SPEED
  const ramp = 1 - Math.exp(-elapsedSeconds / 68);
  return PHYSICS.BASE_WORLD_SPEED + (PHYSICS.MAX_WORLD_SPEED - PHYSICS.BASE_WORLD_SPEED) * ramp;
}

export function computeSpawnInterval(elapsedSeconds: number, rngValue: number): number {
  const progress = Math.min(1, elapsedSeconds / 95);
  const minGap = 1.18 - progress * 0.56; // 1.18s -> 0.62s
  const maxGap = 1.85 - progress * 0.85; // 1.85s -> 1.00s
  return minGap + (maxGap - minGap) * rngValue;
}

export function computeTimeScale(sim: SimulationState): number {
  if (sim.chronoTimer > 0) return 0.45;
  return 1;
}

export function addTrauma(sim: SimulationState, amount: number): void {
  sim.trauma = Math.min(1, sim.trauma + amount);
}

export function rectOverlaps(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function rectCircleOverlaps(
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  cx: number,
  cy: number,
  cr: number
): boolean {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= cr * cr;
}

export function spawnObstacle(
  sim: SimulationState,
  rng: () => number = Math.random
): Obstacle {
  const id = sim.nextEntityId++;
  const spawnX = sim.worldWidth + 90;
  const progress = Math.min(1, sim.elapsed / 60);

  // Keep the opening 10 seconds approachable with pylons before introducing sweepers & chargers
  let kind: ObstacleKind = 'pylon';
  const roll = rng();
  if (sim.elapsed > 14 && roll > 0.68 - progress * 0.16) {
    kind = 'charger';
  } else if (sim.elapsed > 5 && roll > 0.42 - progress * 0.1) {
    kind = 'sweeper';
  }

  if (kind === 'pylon') {
    const tall = sim.elapsed > 8 && rng() > 0.55;
    const width = tall ? 38 : 44;
    const height = tall ? 88 : 56;
    const y = sim.groundY - height;
    return {
      id,
      kind,
      x: spawnX,
      y,
      baseY: y,
      width,
      height,
      vx: 0,
      phase: rng() * Math.PI * 2,
      telegraphTimer: 0,
      telegraphDuration: 0,
      activeAttack: false,
      destroyed: false,
      passed: false,
    };
  }

  if (kind === 'sweeper') {
    // Low enough to jump over or high enough to slide under
    const highLane = rng() > 0.45;
    const height = 34;
    const width = 54;
    const baseY = highLane
      ? sim.groundY - PHYSICS.PLAYER_SLIDE_HEIGHT - height - 12 // Slide under!
      : sim.groundY - 78; // Jump over!
    return {
      id,
      kind,
      x: spawnX,
      y: baseY,
      baseY,
      width,
      height,
      vx: 45,
      phase: rng() * Math.PI * 2,
      telegraphTimer: 0,
      telegraphDuration: 0,
      activeAttack: false,
      destroyed: false,
      passed: false,
    };
  }

  // Charger: enters at right edge, telegraphs lock-on laser for 0.55s, then lunges forward fast
  const laneOffset = rng() > 0.5 ? 64 : 118;
  const height = 36;
  const width = 56;
  const y = sim.groundY - laneOffset;
  return {
    id,
    kind: 'charger',
    x: sim.worldWidth - 76,
    y,
    baseY: y,
    width,
    height,
    vx: 0,
    phase: rng() * Math.PI * 2,
    telegraphTimer: 0.58,
    telegraphDuration: 0.58,
    activeAttack: false,
    destroyed: false,
    passed: false,
  };
}

export function spawnCoreArc(
  sim: SimulationState,
  rng: () => number = Math.random
): void {
  const count = 3 + Math.floor(rng() * 3); // 3 to 5 cores
  const startX = sim.worldWidth + 60;
  const pattern = rng();
  const radius = 14;

  for (let i = 0; i < count; i++) {
    const id = sim.nextEntityId++;
    const x = startX + i * 54;
    let y = sim.groundY - 34;
    if (pattern > 0.62) {
      // Parabolic jump arc
      const t = count > 1 ? i / (count - 1) : 0.5;
      const arc = Math.sin(t * Math.PI) * 95;
      y = sim.groundY - 40 - arc;
    } else if (pattern > 0.34) {
      // Mid-air line
      y = sim.groundY - 108;
    }

    sim.pickups.push({
      id,
      kind: 'core',
      x,
      y,
      radius,
      phase: i * 0.5,
      collected: false,
    });
  }
}

export function spawnPowerUp(
  sim: SimulationState,
  rng: () => number = Math.random
): Pickup {
  const roll = rng();
  let kind: PowerUpType = 'shield';
  if (roll > 0.66) kind = 'chrono';
  else if (roll > 0.33) kind = 'overdrive';

  const id = sim.nextEntityId++;
  const heightChoice = rng() > 0.5 ? 118 : 44;
  return {
    id,
    kind,
    x: sim.worldWidth + 80,
    y: sim.groundY - heightChoice,
    radius: 19,
    phase: rng() * Math.PI * 2,
    collected: false,
  };
}

export function stepSimulation(
  sim: SimulationState,
  rawDt: number,
  input: InputState,
  rng: () => number = Math.random
): GameEvents {
  const events: GameEvents = {};
  const dt = Math.min(Math.max(rawDt, 0), 0.05);

  // Decay real-time visual feedback timers even during hitstop
  sim.trauma = Math.max(0, sim.trauma - dt * 2.1);
  sim.damageFlash = Math.max(0, sim.damageFlash - dt * 2.8);
  sim.player.hitFlashTimer = Math.max(0, sim.player.hitFlashTimer - dt);

  if (sim.phase === 'title') {
    // Ambient autopilot cruise on title screen
    sim.elapsed += dt;
    sim.player.wheelPhase += dt * 15;
    sim.player.y = sim.groundY - sim.player.height + Math.sin(sim.elapsed * 4.5) * 1.5;
    return events;
  }

  if (sim.phase !== 'playing') {
    return events;
  }

  // Hitstop freezes physics briefly on heavy collisions while shake & flash decay
  if (sim.hitstopTimer > 0) {
    sim.hitstopTimer = Math.max(0, sim.hitstopTimer - dt);
    return events;
  }

  sim.elapsed += dt;

  // Power-up timers tick in real-time so Chrono feels fair and predictable
  if (sim.overdriveTimer > 0) {
    sim.overdriveTimer = Math.max(0, sim.overdriveTimer - dt);
  }
  if (sim.chronoTimer > 0) {
    sim.chronoTimer = Math.max(0, sim.chronoTimer - dt);
  }

  // Combo timer decay
  if (sim.combo > 1) {
    sim.comboTimer -= dt;
    if (sim.comboTimer <= 0) {
      sim.combo = 1;
      sim.comboTimer = 0;
    }
  }

  const timeScale = computeTimeScale(sim);
  const simDt = dt * timeScale;

  // Compute current world speed (Overdrive gives +55% surge)
  sim.baseSpeed = computeDifficultySpeed(sim.elapsed);
  const targetSpeed = sim.overdriveTimer > 0 ? sim.baseSpeed * 1.55 : sim.baseSpeed;
  sim.worldSpeed += (targetSpeed - sim.worldSpeed) * Math.min(1, dt * 8);

  // Distance & passive survival score
  const distDelta = (sim.worldSpeed * simDt) / 38;
  sim.distance += distDelta;
  sim.score += distDelta * 2.5 * sim.combo;

  // Update Player (runs at full responsive dt even during Chrono Slow!)
  const p = sim.player;
  p.invulnTimer = Math.max(0, p.invulnTimer - dt);
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.wheelPhase += (sim.worldSpeed / 40) * dt;

  // Squash & stretch exponential spring back to (1, 1)
  p.squashX += (1 - p.squashX) * Math.min(1, dt * 14);
  p.squashY += (1 - p.squashY) * Math.min(1, dt * 14);

  // Afterimage trail during dash or overdrive
  for (let i = p.afterimages.length - 1; i >= 0; i--) {
    p.afterimages[i].x -= sim.worldSpeed * dt * 0.6;
    p.afterimages[i].alpha -= dt * 4.5;
    if (p.afterimages[i].alpha <= 0) {
      p.afterimages.splice(i, 1);
    }
  }
  if (p.dashTimer > 0 || sim.overdriveTimer > 0) {
    if (p.afterimages.length < 7) {
      p.afterimages.push({ x: p.x, y: p.y, alpha: 0.55, sliding: p.sliding });
    }
  }

  // Dash activation
  if (input.dashJustPressed && p.dashCooldown <= 0 && p.dashTimer <= 0) {
    p.dashTimer = PHYSICS.DASH_DURATION;
    p.dashCooldown = PHYSICS.DASH_COOLDOWN;
    p.invulnTimer = Math.max(p.invulnTimer, PHYSICS.DASH_DURATION + 0.06);
    p.vy = Math.min(p.vy, 0);
    p.squashX = 1.28;
    p.squashY = 0.78;
    events.dashed = true;
  }

  if (p.dashTimer > 0) {
    p.dashTimer = Math.max(0, p.dashTimer - dt);
  }

  // Horizontal thruster movement
  const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (moveDir !== 0) {
    p.vx += moveDir * PHYSICS.MOVE_ACCEL * dt;
    if (Math.abs(p.vx) > PHYSICS.MOVE_SPEED) {
      p.vx = Math.sign(p.vx) * PHYSICS.MOVE_SPEED;
    }
  } else {
    const friction = PHYSICS.MOVE_FRICTION * dt;
    if (Math.abs(p.vx) <= friction) p.vx = 0;
    else p.vx -= Math.sign(p.vx) * friction;
  }

  const dashVx = p.dashTimer > 0 ? PHYSICS.DASH_SPEED * 0.42 : 0;
  p.x += (p.vx + dashVx) * dt;
  const minX = 48;
  const maxX = Math.max(220, sim.worldWidth * 0.62);
  if (p.x < minX) {
    p.x = minX;
    p.vx = 0;
  } else if (p.x > maxX) {
    p.x = maxX;
    p.vx = 0;
  }

  // Coyote time & jump input buffer
  if (p.grounded) {
    p.coyoteTimer = PHYSICS.COYOTE_TIME;
    p.jumpsRemaining = 2;
  } else {
    p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);
  }

  if (input.jumpJustPressed) {
    p.jumpBufferTimer = PHYSICS.JUMP_BUFFER_TIME;
  } else {
    p.jumpBufferTimer = Math.max(0, p.jumpBufferTimer - dt);
  }

  // Slide / Fast-drop state
  const wasSliding = p.sliding;
  p.sliding = input.downHeld && p.grounded && p.dashTimer <= 0;
  const targetHeight = p.sliding ? PHYSICS.PLAYER_SLIDE_HEIGHT : PHYSICS.PLAYER_HEIGHT;
  if (targetHeight !== p.height) {
    const bottom = p.y + p.height;
    p.height = targetHeight;
    p.y = bottom - p.height;
    if (p.sliding && !wasSliding) {
      p.squashX = 1.24;
      p.squashY = 0.76;
    }
  }

  // Execute Jump (Ground/Coyote or Double Jump)
  if (p.jumpBufferTimer > 0) {
    if (p.coyoteTimer > 0 || p.grounded) {
      p.vy = PHYSICS.JUMP_VELOCITY;
      p.grounded = false;
      p.coyoteTimer = 0;
      p.jumpBufferTimer = 0;
      p.jumpsRemaining = 1;
      p.sliding = false;
      p.height = PHYSICS.PLAYER_HEIGHT;
      p.squashX = 0.82;
      p.squashY = 1.22;
      events.jumped = true;
    } else if (p.jumpsRemaining > 0) {
      p.vy = PHYSICS.DOUBLE_JUMP_VELOCITY;
      p.jumpBufferTimer = 0;
      p.jumpsRemaining = 0;
      p.squashX = 0.84;
      p.squashY = 1.2;
      events.doubleJumped = true;
    }
  }

  // Variable jump height cut
  if (input.jumpJustReleased && p.vy < -180) {
    p.vy *= PHYSICS.JUMP_CUT_MULTIPLIER;
  }

  // Vertical integration
  if (!p.grounded) {
    const extraDrop = input.downHeld ? PHYSICS.FAST_DROP_ACCEL : 0;
    const dashGravityFactor = p.dashTimer > 0 ? 0.2 : 1;
    p.vy += (PHYSICS.GRAVITY * dashGravityFactor + extraDrop) * dt;
    p.y += p.vy * dt;

    if (p.y + p.height >= sim.groundY) {
      p.y = sim.groundY - p.height;
      if (p.vy > 220) {
        p.squashX = 1.24;
        p.squashY = 0.76;
        events.landed = true;
      }
      p.vy = 0;
      p.grounded = true;
      p.jumpsRemaining = 2;
    }
  } else {
    p.y = sim.groundY - p.height;
  }

  // Spawn Obstacles, Cores, and PowerUps
  sim.spawnTimer -= simDt;
  if (sim.spawnTimer <= 0) {
    const obs = spawnObstacle(sim, rng);
    sim.obstacles.push(obs);
    if (obs.kind === 'charger') {
      events.chargerTelegraph = true;
    }
    sim.spawnTimer = computeSpawnInterval(sim.elapsed, rng());
  }

  sim.coreSpawnTimer -= simDt;
  if (sim.coreSpawnTimer <= 0) {
    spawnCoreArc(sim, rng);
    sim.coreSpawnTimer = 2.0 + rng() * 1.4;
  }

  sim.powerUpSpawnTimer -= dt;
  if (sim.powerUpSpawnTimer <= 0) {
    sim.pickups.push(spawnPowerUp(sim, rng));
    sim.powerUpSpawnTimer = 9.5 + rng() * 5.0;
  }

  // Slightly forgiving player hitbox for crisp arcade feel
  const hitPadX = 8;
  const hitPadY = 5;
  const px = p.x + hitPadX;
  const py = p.y + hitPadY;
  const pw = Math.max(16, p.width - hitPadX * 2);
  const ph = Math.max(12, p.height - hitPadY * 2);

  // Update Pickups & Check Collection
  for (let i = sim.pickups.length - 1; i >= 0; i--) {
    const item = sim.pickups[i];
    item.x -= sim.worldSpeed * simDt;
    item.phase += dt * 4.5;

    const bobY = item.y + Math.sin(item.phase) * 5;
    if (!item.collected && rectCircleOverlaps(px, py, pw, ph, item.x, bobY, item.radius + 6)) {
      item.collected = true;
      if (item.kind === 'core') {
        sim.coresCollected += 1;
        sim.combo = Math.min(12, sim.combo + 1);
        sim.comboTimer = PHYSICS.COMBO_DURATION;
        sim.bestCombo = Math.max(sim.bestCombo, sim.combo);
        const pts = 50 * sim.combo;
        sim.score += pts;
        // Collecting cores slightly shaves dash cooldown
        p.dashCooldown = Math.max(0, p.dashCooldown - 0.25);
        events.coreCollected = { x: item.x, y: bobY, combo: sim.combo };
      } else {
        if (item.kind === 'shield') {
          sim.hasShield = true;
        } else if (item.kind === 'overdrive') {
          sim.overdriveTimer = PHYSICS.OVERDRIVE_DURATION;
          addTrauma(sim, 0.25);
        } else if (item.kind === 'chrono') {
          sim.chronoTimer = PHYSICS.CHRONO_DURATION;
        }
        sim.score += 100 * sim.combo;
        events.powerUpCollected = { kind: item.kind, x: item.x, y: bobY };
      }
    }

    if (item.collected || item.x < -80) {
      sim.pickups.splice(i, 1);
    }
  }

  // Update Obstacles & Check Collisions
  for (let i = sim.obstacles.length - 1; i >= 0; i--) {
    const obs = sim.obstacles[i];
    obs.phase += simDt * 4.2;

    if (obs.kind === 'sweeper') {
      obs.x -= (sim.worldSpeed + obs.vx) * simDt;
      obs.y = obs.baseY + Math.sin(obs.phase) * 14;
    } else if (obs.kind === 'charger') {
      if (obs.telegraphTimer > 0) {
        // Hold on right side while tracking player slightly and flashing laser sight
        obs.telegraphTimer -= simDt;
        const targetY = Math.min(sim.groundY - obs.height - 8, Math.max(sim.groundY - 145, p.y));
        obs.y += (targetY - obs.y) * Math.min(1, simDt * 3.5);
        if (obs.telegraphTimer <= 0) {
          obs.activeAttack = true;
          events.chargerLunge = true;
        }
      } else {
        obs.x -= (sim.worldSpeed * 1.65 + 220) * simDt;
      }
    } else {
      obs.x -= sim.worldSpeed * simDt;
    }

    // Score bonus for narrowly passing an obstacle
    if (!obs.passed && obs.x + obs.width < p.x) {
      obs.passed = true;
      sim.score += 15 * sim.combo;
    }

    if (
      !obs.destroyed &&
      rectOverlaps(px, py, pw, ph, obs.x + 4, obs.y + 4, obs.width - 8, obs.height - 8)
    ) {
      if (sim.overdriveTimer > 0 || p.dashTimer > 0) {
        // Overdrive or Phase Dash smashes obstacles for bonus points!
        obs.destroyed = true;
        const bonus = 120 * sim.combo;
        sim.score += bonus;
        sim.hitstopTimer = 0.035;
        addTrauma(sim, 0.35);
        events.obstacleSmashed = {
          x: obs.x + obs.width * 0.5,
          y: obs.y + obs.height * 0.5,
          bonus,
        };
      } else if (p.invulnTimer <= 0) {
        if (sim.hasShield) {
          sim.hasShield = false;
          obs.destroyed = true;
          p.invulnTimer = 0.9;
          sim.hitstopTimer = 0.055;
          addTrauma(sim, 0.55);
          events.shieldBroken = { x: p.x + p.width * 0.5, y: p.y + p.height * 0.5 };
        } else {
          obs.destroyed = true;
          sim.hull = Math.max(0, sim.hull - 1);
          sim.combo = 1;
          sim.comboTimer = 0;
          p.invulnTimer = 1.2;
          p.hitFlashTimer = 0.14;
          p.vx = -180;
          p.vy = Math.min(p.vy, -240);
          p.grounded = false;
          sim.hitstopTimer = 0.065;
          sim.damageFlash = 0.85;
          addTrauma(sim, 0.78);
          events.playerHit = {
            x: p.x + p.width * 0.5,
            y: p.y + p.height * 0.5,
            remainingHull: sim.hull,
          };

          if (sim.hull <= 0) {
            finalizeRun(sim);
            events.gameOver = true;
            return events;
          }
        }
      }
    }

    if (obs.destroyed || obs.x + obs.width < -140) {
      sim.obstacles.splice(i, 1);
    }
  }

  // Update high score live
  const roundedScore = Math.round(sim.score);
  if (roundedScore > sim.highScore) {
    sim.highScore = roundedScore;
    sim.isNewHighScore = true;
  }

  return events;
}

export function finalizeRun(sim: SimulationState): void {
  sim.phase = 'gameover';
  const roundedScore = Math.round(sim.score);
  if (roundedScore >= sim.highScore && roundedScore > 0) {
    sim.highScore = roundedScore;
  }
}

export function buildSnapshot(sim: SimulationState): GameSnapshot {
  return {
    phase: sim.phase,
    score: Math.round(sim.score),
    highScore: Math.max(sim.highScore, Math.round(sim.score)),
    distance: Math.round(sim.distance),
    combo: sim.combo,
    comboProgress: sim.combo > 1 ? Math.max(0, Math.min(1, sim.comboTimer / PHYSICS.COMBO_DURATION)) : 0,
    bestCombo: sim.bestCombo,
    coresCollected: sim.coresCollected,
    hull: sim.hull,
    maxHull: sim.maxHull,
    hasShield: sim.hasShield,
    overdriveTimer: Number(sim.overdriveTimer.toFixed(1)),
    chronoTimer: Number(sim.chronoTimer.toFixed(1)),
    dashCooldownRatio: Math.max(0, Math.min(1, sim.player.dashCooldown / PHYSICS.DASH_COOLDOWN)),
    speedMultiplier: Number((sim.worldSpeed / PHYSICS.BASE_WORLD_SPEED).toFixed(1)),
    isNewHighScore: sim.isNewHighScore,
    damageFlash: sim.damageFlash,
  };
}

export function loadHighScore(): number {
  try {
    const raw = window.localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export function saveHighScore(score: number): void {
  try {
    const rounded = Math.max(0, Math.round(score));
    const current = loadHighScore();
    if (rounded > current) {
      window.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(rounded));
    }
  } catch {
    // Ignore storage errors in private browsing or restricted iframes
  }
}
