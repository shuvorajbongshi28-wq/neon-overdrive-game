import type {
  FloatingPopup,
  Obstacle,
  Particle,
  Pickup,
  SimulationState,
} from './types';

interface Building {
  x: number;
  width: number;
  height: number;
  layer: 0 | 1;
  accentColor: string;
  windowSeed: number;
}

const PARTICLE_POOL_SIZE = 200;
const POPUP_POOL_SIZE = 24;

export class CyberCanvasRenderer {
  private particles: Particle[] = [];
  private particleCursor = 0;
  private popups: FloatingPopup[] = [];
  private popupCursor = 0;
  private farBuildings: Building[] = [];
  private nearBuildings: Building[] = [];
  private gridOffset = 0;
  private roadGrad: CanvasGradient | null = null;
  private skyBackdropCanvas: HTMLCanvasElement | null = null;
  private lastGradientWidth = 0;
  private lastGradientHeight = 0;
  private lastGroundY = 0;
  private farSkylineCanvas: HTMLCanvasElement | null = null;
  private nearSkylineCanvas: HTMLCanvasElement | null = null;
  private skylineStripWidth = 2200;
  private farScrollX = 0;
  private nearScrollX = 0;

  constructor() {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 3,
        color: '#00F0FF',
        life: 0,
        maxLife: 0.5,
        drag: 0.95,
        gravity: 0,
      });
    }

    for (let i = 0; i < POPUP_POOL_SIZE; i++) {
      this.popups.push({
        active: false,
        x: 0,
        y: 0,
        vy: -55,
        text: '',
        color: '#00F0FF',
        life: 0,
        maxLife: 0.75,
      });
    }

    this.initCityscape();
  }

  private initCityscape(): void {
    const accents = ['#00F0FF', '#FF2A85', '#FFB800', '#8B5CF6'];
    let xFar = 0;
    let idxFar = 0;
    while (xFar < 2200) {
      const width = 58 + ((idxFar * 37) % 72);
      const height = 140 + ((idxFar * 53) % 190);
      this.farBuildings.push({
        x: xFar,
        width,
        height,
        layer: 0,
        accentColor: accents[idxFar % accents.length],
        windowSeed: idxFar * 17 + 3,
      });
      xFar += width + 10;
      idxFar++;
    }
    this.skylineStripWidth = xFar;

    let xNear = 0;
    let idxNear = 0;
    while (xNear < this.skylineStripWidth) {
      const width = 76 + ((idxNear * 41) % 90);
      const height = 95 + ((idxNear * 61) % 150);
      this.nearBuildings.push({
        x: xNear,
        width,
        height,
        layer: 1,
        accentColor: accents[(idxNear + 2) % accents.length],
        windowSeed: idxNear * 29 + 7,
      });
      xNear += width + 22;
      idxNear++;
    }
  }

  private buildSkylineCanvases(): void {
    if (typeof document === 'undefined') return;
    const stripHeight = 360;

    const createLayer = (buildings: Building[], fillColor: string, alpha: number) => {
      const off = document.createElement('canvas');
      off.width = this.skylineStripWidth;
      off.height = stripHeight;
      const octx = off.getContext('2d');
      if (!octx) return off;

      for (const b of buildings) {
        if (b.x >= this.skylineStripWidth) continue;
        const topY = stripHeight - b.height;
        octx.fillStyle = fillColor;
        octx.fillRect(b.x, topY, b.width, b.height);

        octx.globalAlpha = alpha * 0.55;
        octx.fillStyle = b.accentColor;
        octx.fillRect(b.x + 2, topY, b.width - 4, 2);

        octx.globalAlpha = alpha * 0.45;
        const cols = Math.max(2, Math.floor(b.width / 16));
        const rows = Math.max(2, Math.floor(b.height / 24));
        for (let r = 1; r < rows; r += 2) {
          for (let c = 0; c < cols; c++) {
            if (((b.windowSeed + r * 7 + c * 13) % 5) === 0) {
              octx.fillRect(b.x + 8 + c * 14, topY + 12 + r * 18, 7, 4);
            }
          }
        }
        octx.globalAlpha = 1;
      }
      return off;
    };

    this.farSkylineCanvas = createLayer(this.farBuildings, '#0E152B', 0.28);
    this.nearSkylineCanvas = createLayer(this.nearBuildings, '#131C36', 0.55);
  }

  public spawnBurst(
    x: number,
    y: number,
    color: string,
    count: number,
    speed = 240,
    gravity = 540,
    sizeBase = 3.5
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % PARTICLE_POOL_SIZE;

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.65;
      const spd = speed * (0.45 + Math.random() * 0.85);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd - 45;
      p.size = sizeBase * (0.7 + Math.random() * 0.8);
      p.color = color;
      p.maxLife = 0.28 + Math.random() * 0.34;
      p.life = p.maxLife;
      p.drag = 0.94;
      p.gravity = gravity;
    }
  }

  public spawnTrailSpark(x: number, y: number, color: string): void {
    const p = this.particles[this.particleCursor];
    this.particleCursor = (this.particleCursor + 1) % PARTICLE_POOL_SIZE;
    p.active = true;
    p.x = x;
    p.y = y + (Math.random() - 0.5) * 8;
    p.vx = -180 - Math.random() * 140;
    p.vy = (Math.random() - 0.5) * 45;
    p.size = 2.2 + Math.random() * 2;
    p.color = color;
    p.maxLife = 0.18 + Math.random() * 0.14;
    p.life = p.maxLife;
    p.drag = 0.92;
    p.gravity = 0;
  }

  public spawnPopup(x: number, y: number, text: string, color: string): void {
    const pop = this.popups[this.popupCursor];
    this.popupCursor = (this.popupCursor + 1) % POPUP_POOL_SIZE;
    pop.active = true;
    pop.x = x;
    pop.y = y;
    pop.vy = -65;
    pop.text = text;
    pop.color = color;
    pop.maxLife = 0.72;
    pop.life = pop.maxLife;
  }

  public resetEffects(): void {
    for (const p of this.particles) p.active = false;
    for (const pop of this.popups) pop.active = false;
  }

  public updateEffects(sim: SimulationState, dt: number): void {
    const scrollMult = sim.phase === 'paused' ? 0 : sim.phase === 'title' ? 0.55 : 1;
    const speed = sim.worldSpeed * (sim.chronoTimer > 0 ? 0.5 : 1) * scrollMult;

    this.gridOffset = (this.gridOffset + speed * dt) % 80;

    if (speed > 0) {
      this.farScrollX = (this.farScrollX + speed * 0.12 * dt) % this.skylineStripWidth;
      this.nearScrollX = (this.nearScrollX + speed * 0.28 * dt) % this.skylineStripWidth;

      // Ambient thruster sparks
      if (sim.phase === 'playing' || sim.phase === 'title') {
        const sparkColor =
          sim.overdriveTimer > 0 ? '#FF2A85' : sim.chronoTimer > 0 ? '#8B5CF6' : '#00F0FF';
        this.spawnTrailSpark(sim.player.x + 4, sim.player.y + sim.player.height * 0.65, sparkColor);
      }
    }

    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    for (let i = 0; i < POPUP_POOL_SIZE; i++) {
      const pop = this.popups[i];
      if (!pop.active) continue;
      pop.life -= dt;
      if (pop.life <= 0) {
        pop.active = false;
        continue;
      }
      pop.y += pop.vy * dt;
    }
  }

  public render(ctx: CanvasRenderingContext2D, sim: SimulationState): void {
    const { worldWidth: w, worldHeight: h, groundY } = sim;

    // Camera shake from squared trauma
    const shakeMag = sim.trauma * sim.trauma * 16;
    const shakeX = shakeMag > 0.2 ? (Math.random() * 2 - 1) * shakeMag : 0;
    const shakeY = shakeMag > 0.2 ? (Math.random() * 2 - 1) * shakeMag : 0;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // 1. Deep night cyber sky (60% calm negative space in upper left for title)
    if (
      !this.skyBackdropCanvas ||
      this.lastGradientWidth !== w ||
      this.lastGradientHeight !== h ||
      this.lastGroundY !== groundY
    ) {
      const off = document.createElement('canvas');
      off.width = Math.max(1, Math.ceil(w));
      off.height = Math.max(1, Math.ceil(groundY + 2));
      const octx = off.getContext('2d');
      if (octx) {
        const grad = octx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#050711');
        grad.addColorStop(0.55, '#0B1124');
        grad.addColorStop(0.85, '#141B38');
        octx.fillStyle = grad;
        octx.fillRect(0, 0, off.width, off.height);

        const hg = octx.createRadialGradient(
          w * 0.68,
          groundY - 20,
          20,
          w * 0.68,
          groundY - 20,
          w * 0.55
        );
        hg.addColorStop(0, 'rgba(0,240,255,0.12)');
        hg.addColorStop(0.6, 'rgba(139,92,246,0.06)');
        hg.addColorStop(1, 'rgba(7,9,19,0)');
        octx.fillStyle = hg;
        octx.fillRect(0, 0, off.width, off.height);
      }
      this.skyBackdropCanvas = off;

      const rg = ctx.createLinearGradient(0, groundY, 0, h);
      rg.addColorStop(0, '#10172B');
      rg.addColorStop(0.25, '#0B1020');
      rg.addColorStop(1, '#060811');
      this.roadGrad = rg;

      this.lastGradientWidth = w;
      this.lastGradientHeight = h;
      this.lastGroundY = groundY;
    }

    if (shakeX !== 0 || shakeY !== 0) {
      ctx.fillStyle = '#050711';
      ctx.fillRect(-20, -20, w + 40, h + 40);
    }
    if (this.skyBackdropCanvas) {
      ctx.drawImage(this.skyBackdropCanvas, 0, 0);
    }
    if (sim.overdriveTimer > 0) {
      ctx.fillStyle = 'rgba(255, 42, 133, 0.08)';
      ctx.fillRect(0, 0, w, groundY);
    }

    // 2. Parallax Skyline Layers (blitted from pre-rendered offscreen canvases)
    if (!this.farSkylineCanvas || !this.nearSkylineCanvas) {
      this.buildSkylineCanvases();
    }
    this.drawSkylineStrip(ctx, this.farSkylineCanvas, this.farScrollX, groundY, w);
    this.drawSkylineStrip(ctx, this.nearSkylineCanvas, this.nearScrollX, groundY, w);

    // 3. Perspective Cyber Highway Deck
    this.drawHighway(ctx, w, h, groundY, sim);

    // 4. Pickups (Energy Cores & Power-Ups)
    for (const item of sim.pickups) {
      this.drawPickup(ctx, item);
    }

    // 5. Obstacles & Charger Telegraphs
    for (const obs of sim.obstacles) {
      this.drawObstacle(ctx, obs, sim);
    }

    // 6. Player Cyber-Cycle / Runner
    this.drawPlayer(ctx, sim);

    // 7. Pooled Particles
    this.drawParticles(ctx);

    // 8. Floating Score Popups
    this.drawPopups(ctx);

    // 9. Chrono Slow / Overdrive Speed Lines & Vignette
    if (sim.overdriveTimer > 0) {
      this.drawSpeedLines(ctx, w, h, '#FF2A85', 0.3);
    } else if (sim.chronoTimer > 0) {
      this.drawChronoOverlay(ctx, w, h, sim.elapsed);
    }

    if (sim.damageFlash > 0.01) {
      ctx.fillStyle = `rgba(255, 42, 133, ${sim.damageFlash * 0.34})`;
      ctx.fillRect(-20, -20, w + 40, h + 40);
    }

    ctx.restore();
  }

  private drawSkylineStrip(
    ctx: CanvasRenderingContext2D,
    strip: HTMLCanvasElement | null,
    scrollX: number,
    groundY: number,
    viewportW: number
  ): void {
    if (!strip) return;
    const sw = strip.width;
    const sh = strip.height;
    const topY = groundY - sh;
    let drawX = -scrollX;
    while (drawX < viewportW) {
      ctx.drawImage(strip, drawX, topY);
      drawX += sw;
    }
  }

  private drawHighway(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    groundY: number,
    sim: SimulationState
  ): void {
    // Dark asphalt deck
    ctx.fillStyle = this.roadGrad ?? '#0B1020';
    ctx.fillRect(0, groundY, w, h - groundY);

    // Perspective cyber grid lines on the road
    const lineColor = sim.overdriveTimer > 0 ? 'rgba(255,42,133,0.32)' : 'rgba(0,240,255,0.22)';
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;

    // Horizontal depth lines
    const depthSteps = [14, 34, 62, 98, 145];
    ctx.beginPath();
    for (const dy of depthSteps) {
      const y = groundY + dy;
      if (y < h) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
    }
    ctx.stroke();

    // Moving diagonal grid lines
    ctx.beginPath();
    const spacing = 80;
    for (let x = -this.gridOffset; x < w + 160; x += spacing) {
      ctx.moveTo(x, groundY);
      ctx.lineTo(x - 110, h);
    }
    ctx.stroke();

    // Glowing top deck rail
    ctx.fillStyle = sim.overdriveTimer > 0 ? '#FF2A85' : '#00F0FF';
    ctx.fillRect(0, groundY - 2, w, 3);
    ctx.fillStyle = sim.overdriveTimer > 0 ? 'rgba(255,42,133,0.24)' : 'rgba(0,240,255,0.2)';
    ctx.fillRect(0, groundY + 1, w, 8);
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, sim: SimulationState): void {
    const p = sim.player;

    // Blink during invulnerability frames
    if (p.invulnTimer > 0 && Math.floor(p.invulnTimer * 20) % 2 === 0 && p.dashTimer <= 0) {
      ctx.globalAlpha = 0.45;
    }

    // Draw dash / overdrive afterimages
    for (const ghost of p.afterimages) {
      ctx.save();
      ctx.globalAlpha = ghost.alpha * 0.45;
      ctx.fillStyle = sim.overdriveTimer > 0 ? '#FF2A85' : '#00F0FF';
      const gh = ghost.sliding ? 22 : 36;
      ctx.beginPath();
      ctx.roundRect(ghost.x, ghost.y + 4, p.width - 8, gh, 6);
      ctx.fill();
      ctx.restore();
    }

    const cx = p.x + p.width * 0.5;
    const bottomY = p.y + p.height;

    // Ground shadow & neon underglow
    const heightAboveGround = Math.max(0, sim.groundY - bottomY);
    const shadowScale = Math.max(0.35, 1 - heightAboveGround / 220);
    ctx.fillStyle = sim.overdriveTimer > 0 ? 'rgba(255, 42, 133, 0.28)' : 'rgba(0, 240, 255, 0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, sim.groundY + 4, 34 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(cx, bottomY);
    const lean = p.sliding ? -0.14 : p.grounded ? 0.04 : Math.max(-0.22, Math.min(0.24, p.vy * 0.00028));
    ctx.rotate(lean);
    ctx.scale(p.squashX, p.squashY);

    const w = p.width + 12;
    const h = p.height + 6;
    const isHitFlash = p.hitFlashTimer > 0;
    const accent = sim.overdriveTimer > 0 ? '#FF2A85' : '#00F0FF';

    // Forward headlight cone
    if (!isHitFlash) {
      ctx.fillStyle = sim.overdriveTimer > 0 ? 'rgba(255, 42, 133, 0.14)' : 'rgba(0, 240, 255, 0.12)';
      ctx.beginPath();
      ctx.moveTo(w * 0.48, -h * 0.36);
      ctx.lineTo(w * 1.9, -h * 0.65);
      ctx.lineTo(w * 1.9, -2);
      ctx.closePath();
      ctx.fill();
    }

    // Hoverbike sleek angular chassis
    ctx.fillStyle = isHitFlash ? '#FFFFFF' : '#141D35';
    ctx.strokeStyle = isHitFlash ? '#FFFFFF' : accent;
    ctx.lineWidth = 2;

    ctx.beginPath();
    if (p.sliding) {
      ctx.moveTo(-w * 0.5, -4);
      ctx.lineTo(-w * 0.35, -h + 4);
      ctx.lineTo(w * 0.28, -h + 6);
      ctx.lineTo(w * 0.54, -7);
      ctx.lineTo(w * 0.35, -2);
      ctx.closePath();
    } else {
      ctx.moveTo(-w * 0.48, -10);
      ctx.lineTo(-w * 0.42, -h * 0.68);
      ctx.lineTo(-w * 0.1, -h * 0.58);
      ctx.lineTo(w * 0.18, -h * 0.78);
      ctx.lineTo(w * 0.52, -h * 0.4);
      ctx.lineTo(w * 0.38, -8);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();

    // Cyber rider helmet & visor silhouette
    if (!isHitFlash) {
      // Rider torso leaning forward
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.moveTo(-w * 0.26, -h * 0.55);
      ctx.lineTo(-w * 0.08, -h * 0.92);
      ctx.lineTo(w * 0.1, -h * 0.72);
      ctx.lineTo(-w * 0.05, -h * 0.48);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#0A0F1F';
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(-2, p.sliding ? -h * 0.64 : -h * 0.88, 10, 7.5, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Visor glow slit
      ctx.fillStyle = accent;
      ctx.fillRect(0, p.sliding ? -h * 0.68 : -h * 0.92, 9, 3);

      // Hover thruster pods
      const pulse = 0.72 + Math.sin(p.wheelPhase) * 0.28;
      ctx.fillStyle = accent;
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.ellipse(-w * 0.3, -5, 11, 4.5, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.3, -5, 11, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // Active Aegis Shield Hex Aura
    if (sim.hasShield) {
      ctx.save();
      ctx.strokeStyle = '#00F0FF';
      ctx.fillStyle = 'rgba(0, 240, 255, 0.09)';
      ctx.lineWidth = 2;
      const r = Math.max(p.width, p.height) * 0.68;
      const sy = p.y + p.height * 0.5;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI / 3) * i + sim.elapsed * 1.6;
        const hx = cx + Math.cos(ang) * r;
        const hy = sy + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }

  private drawObstacle(
    ctx: CanvasRenderingContext2D,
    obs: Obstacle,
    sim: SimulationState
  ): void {
    ctx.save();
    if (obs.kind === 'pylon') {
      // Grounded Neon Barrier Pylon
      ctx.fillStyle = '#191026';
      ctx.strokeStyle = '#FF2A85';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 4);
      ctx.fill();
      ctx.stroke();

      // Hazard diagonal stripes
      ctx.fillStyle = 'rgba(255, 42, 133, 0.38)';
      for (let sy = obs.y + 8; sy < obs.y + obs.height - 8; sy += 14) {
        ctx.fillRect(obs.x + 5, sy, obs.width - 10, 5);
      }
      // Top warning beacon
      ctx.fillStyle = '#FFB800';
      ctx.fillRect(obs.x + obs.width * 0.25, obs.y - 3, obs.width * 0.5, 4);
    } else if (obs.kind === 'sweeper') {
      // Hover-Mine Drone
      const cx = obs.x + obs.width * 0.5;
      const cy = obs.y + obs.height * 0.5;
      ctx.fillStyle = '#1B1128';
      ctx.strokeStyle = '#FF5722';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(obs.x, cy);
      ctx.lineTo(obs.x + 12, obs.y);
      ctx.lineTo(obs.x + obs.width - 12, obs.y);
      ctx.lineTo(obs.x + obs.width, cy);
      ctx.lineTo(obs.x + obs.width - 12, obs.y + obs.height);
      ctx.lineTo(obs.x + 12, obs.y + obs.height);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing core eye
      ctx.fillStyle = '#FFB800';
      ctx.beginPath();
      ctx.arc(cx - 4, cy, 5.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Hunter Charger Drone with visible laser-sight telegraph
      const cy = obs.y + obs.height * 0.5;
      if (obs.telegraphTimer > 0) {
        const progress = 1 - obs.telegraphTimer / obs.telegraphDuration;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 184, 0, ${0.35 + progress * 0.55})`;
        ctx.lineWidth = 1.5 + progress * 2;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.moveTo(obs.x, cy);
        ctx.lineTo(0, cy);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = '#240E22';
      ctx.strokeStyle = obs.telegraphTimer > 0 ? '#FFB800' : '#FF2A85';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(obs.x, cy);
      ctx.lineTo(obs.x + obs.width * 0.72, obs.y);
      ctx.lineTo(obs.x + obs.width, cy);
      ctx.lineTo(obs.x + obs.width * 0.72, obs.y + obs.height);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Thruster flare
      if (obs.activeAttack) {
        ctx.fillStyle = '#FF2A85';
        ctx.fillRect(obs.x + obs.width, cy - 4, 18 + Math.sin(sim.elapsed * 40) * 6, 8);
      }
    }
    ctx.restore();
  }

  private drawPickup(ctx: CanvasRenderingContext2D, item: Pickup): void {
    const bobY = item.y + Math.sin(item.phase) * 5;
    ctx.save();
    ctx.translate(item.x, bobY);

    if (item.kind === 'core') {
      // Diamond Energy Core
      ctx.rotate(item.phase * 0.35);
      ctx.fillStyle = 'rgba(0, 240, 255, 0.22)';
      ctx.beginPath();
      ctx.arc(0, 0, item.radius + 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#00F0FF';
      ctx.strokeStyle = '#E0FCFF';
      ctx.lineWidth = 1.5;
      const r = item.radius * 0.78;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Power-up Hex Module
      const color =
        item.kind === 'shield'
          ? '#00F0FF'
          : item.kind === 'overdrive'
            ? '#FF2A85'
            : '#8B5CF6';
      const label = item.kind === 'shield' ? 'S' : item.kind === 'overdrive' ? '⚡' : '⏱';

      ctx.fillStyle = '#0B1124';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI / 3) * i - Math.PI / 6;
        const hx = Math.cos(ang) * item.radius;
        const hy = Math.sin(ang) * item.radius;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, 1);
    }

    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawPopups(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.font = '700 14px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i < POPUP_POOL_SIZE; i++) {
      const pop = this.popups[i];
      if (!pop.active) continue;
      const alpha = Math.max(0, pop.life / pop.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#070913';
      ctx.fillText(pop.text, pop.x + 1, pop.y + 1);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, pop.x, pop.y);
    }
    ctx.restore();
  }

  private drawSpeedLines(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    color: string,
    alpha: number
  ): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 14; i++) {
      const y = ((i * 89 + Math.floor(performance.now() * 0.2)) % h);
      const len = 70 + (i % 5) * 35;
      const x = w - ((performance.now() * 1.4 + i * 210) % (w + 200));
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawChronoOverlay(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    elapsed: number
  ): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.14)';
    ctx.lineWidth = 1;
    const offset = (elapsed * 30) % 24;
    ctx.beginPath();
    for (let y = offset; y < h; y += 24) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
    ctx.restore();
  }
}
