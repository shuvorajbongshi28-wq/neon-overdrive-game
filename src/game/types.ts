export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type PowerUpType = 'shield' | 'overdrive' | 'chrono';

export type ObstacleKind = 'pylon' | 'sweeper' | 'charger';

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  grounded: boolean;
  jumpsRemaining: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
  sliding: boolean;
  slideTimer: number;
  dashTimer: number;
  dashCooldown: number;
  invulnTimer: number;
  hitFlashTimer: number;
  squashX: number;
  squashY: number;
  wheelPhase: number;
  afterimages: Array<{ x: number; y: number; alpha: number; sliding: boolean }>;
}

export interface Obstacle {
  id: number;
  kind: ObstacleKind;
  x: number;
  y: number;
  baseY: number;
  width: number;
  height: number;
  vx: number;
  phase: number;
  telegraphTimer: number;
  telegraphDuration: number;
  activeAttack: boolean;
  destroyed: boolean;
  passed: boolean;
}

export interface Pickup {
  id: number;
  kind: 'core' | PowerUpType;
  x: number;
  y: number;
  radius: number;
  phase: number;
  collected: boolean;
}

export interface FloatingPopup {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  drag: number;
  gravity: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  upHeld: boolean;
  downHeld: boolean;
  jumpJustPressed: boolean;
  jumpJustReleased: boolean;
  dashJustPressed: boolean;
}

export interface GameSnapshot {
  phase: GamePhase;
  score: number;
  highScore: number;
  distance: number;
  combo: number;
  comboProgress: number; // 0..1 remaining combo window
  bestCombo: number;
  coresCollected: number;
  hull: number;
  maxHull: number;
  hasShield: boolean;
  overdriveTimer: number;
  chronoTimer: number;
  dashCooldownRatio: number; // 0 = ready, 1 = full cooldown
  speedMultiplier: number;
  isNewHighScore: boolean;
  damageFlash: number;
}

export interface GameEvents {
  jumped?: boolean;
  doubleJumped?: boolean;
  landed?: boolean;
  dashed?: boolean;
  coreCollected?: { x: number; y: number; combo: number };
  powerUpCollected?: { kind: PowerUpType; x: number; y: number };
  obstacleSmashed?: { x: number; y: number; bonus: number };
  shieldBroken?: { x: number; y: number };
  playerHit?: { x: number; y: number; remainingHull: number };
  chargerTelegraph?: boolean;
  chargerLunge?: boolean;
  gameOver?: boolean;
}

export interface SimulationState {
  phase: GamePhase;
  elapsed: number;
  score: number;
  highScore: number;
  distance: number;
  combo: number;
  comboTimer: number;
  bestCombo: number;
  coresCollected: number;
  hull: number;
  maxHull: number;
  hasShield: boolean;
  overdriveTimer: number;
  chronoTimer: number;
  hitstopTimer: number;
  trauma: number;
  damageFlash: number;
  worldSpeed: number;
  baseSpeed: number;
  spawnTimer: number;
  coreSpawnTimer: number;
  powerUpSpawnTimer: number;
  nextEntityId: number;
  worldWidth: number;
  worldHeight: number;
  groundY: number;
  player: PlayerState;
  obstacles: Obstacle[];
  pickups: Pickup[];
  isNewHighScore: boolean;
}
