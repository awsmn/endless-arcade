import { GameEngine, GameMode, GameScoreUpdate } from '../../types/game';
import { sounds } from '../../engine/audio';
import { haptics } from '../../engine/haptics';

export interface FruitDef {
  tier: number;
  name: string;
  emoji: string;
  radius: number;
  color: string;
  accent: string;
  score: number;
}

export const FRUIT_TIERS: FruitDef[] = [
  { tier: 0, name: 'Cherry', emoji: '🍒', radius: 15, color: '#ef4444', accent: '#fca5a5', score: 2 },
  { tier: 1, name: 'Strawberry', emoji: '🍓', radius: 20, color: '#f43f5e', accent: '#fda4af', score: 4 },
  { tier: 2, name: 'Grape', emoji: '🍇', radius: 26, color: '#a855f7', accent: '#d8b4fe', score: 8 },
  { tier: 3, name: 'Lemon', emoji: '🍋', radius: 32, color: '#eab308', accent: '#fef08a', score: 16 },
  { tier: 4, name: 'Orange', emoji: '🍊', radius: 39, color: '#f97316', accent: '#fed7aa', score: 32 },
  { tier: 5, name: 'Apple', emoji: '🍎', radius: 46, color: '#dc2626', accent: '#f87171', score: 64 },
  { tier: 6, name: 'Pear', emoji: '🍐', radius: 54, color: '#84cc16', accent: '#bef264', score: 128 },
  { tier: 7, name: 'Peach', emoji: '🍑', radius: 62, color: '#fb7185', accent: '#fecdd3', score: 256 },
  { tier: 8, name: 'Pineapple', emoji: '🍍', radius: 71, color: '#eab308', accent: '#fde047', score: 512 },
  { tier: 9, name: 'Melon', emoji: '🍈', radius: 80, color: '#22c55e', accent: '#86efac', score: 1024 },
  { tier: 10, name: 'Watermelon', emoji: '🍉', radius: 90, color: '#059669', accent: '#34d399', score: 2048 }
];

export interface FruitBody {
  id: number;
  tier: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  merged: boolean;
  scale: number; // spawn pop animation
  age: number;   // time alive in seconds
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  life: number;
  maxLife: number;
}

export class FruitFusionEngine implements GameEngine {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private container!: HTMLElement;

  private fruits: FruitBody[] = [];
  private particles: Particle[] = [];
  private nextFruitId = 1;

  public currentDropperTier = 0;
  public nextDropperTier = 0;
  public dropperX = 180;
  private canDrop = true;
  private dropCooldown = 400; // ms

  // Container dimensions
  private jarX = 20;
  private jarY = 70;
  private jarWidth = 320;
  private jarHeight = 440;
  private dangerLineY = 110;

  private score = 0;
  private isRunning = false;
  private isPaused = false;
  private isGameOver = false;
  private dangerTime = 0; // ms above danger line

  private lastTime = 0;
  private animationFrameId = 0;

  public onScoreUpdate?: (update: GameScoreUpdate) => void;
  public onGameOver?: (finalScore: number, isNewHighScore: boolean) => void;
  public onDropperChange?: (currentTier: number, nextTier: number) => void;

  public init(canvas: HTMLCanvasElement, container: HTMLElement) {
    this.canvas = canvas;
    this.container = container;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context');
    this.ctx = ctx;

    this.resize();
    this.currentDropperTier = this.getRandomDropTier();
    this.nextDropperTier = this.getRandomDropTier();
  }

  private getRandomDropTier(): number {
    // Only small fruits (tier 0 to 3) spawn from dropper
    const weights = [0.45, 0.3, 0.18, 0.07];
    const r = Math.random();
    let cumulative = 0;
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (r <= cumulative) return i;
    }
    return 0;
  }

  public resize() {
    if (!this.canvas || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    const padX = 16;
    this.jarWidth = Math.min(rect.width - padX * 2, 380);
    const topPad = 75;
    const bottomPad = 80;
    this.jarHeight = Math.min(rect.height - topPad - bottomPad, 520);
    this.jarX = Math.floor((rect.width - this.jarWidth) / 2);
    this.jarY = topPad;
    this.dangerLineY = this.jarY + 50;

    this.dropperX = this.jarX + this.jarWidth / 2;
  }

  public start(_mode: GameMode = 'endless', _level = 1) {
    this.fruits = [];
    this.particles = [];
    this.score = 0;
    this.dangerTime = 0;
    this.isRunning = true;
    this.isPaused = false;
    this.isGameOver = false;
    this.canDrop = true;

    this.currentDropperTier = this.getRandomDropTier();
    this.nextDropperTier = this.getRandomDropTier();
    this.onDropperChange?.(this.currentDropperTier, this.nextDropperTier);

    this.lastTime = performance.now();
    cancelAnimationFrame(this.animationFrameId);
    this.loop();
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    if (!this.isRunning || this.isGameOver) return;
    this.isPaused = false;
    this.lastTime = performance.now();
  }

  public destroy() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
  }

  public setDropperX(targetX: number) {
    const minX = this.jarX + FRUIT_TIERS[this.currentDropperTier].radius + 4;
    const maxX = this.jarX + this.jarWidth - FRUIT_TIERS[this.currentDropperTier].radius - 4;
    this.dropperX = Math.max(minX, Math.min(maxX, targetX));
  }

  public drop() {
    if (!this.canDrop || this.isPaused || this.isGameOver) return;

    const fruitDef = FRUIT_TIERS[this.currentDropperTier];
    const newFruit: FruitBody = {
      id: this.nextFruitId++,
      tier: this.currentDropperTier,
      x: this.dropperX,
      y: this.jarY + 10,
      vx: (Math.random() - 0.5) * 0.4,
      vy: 1.5,
      radius: fruitDef.radius,
      merged: false,
      scale: 1,
      age: 0
    };

    this.fruits.push(newFruit);
    sounds.playTap();
    haptics.tap();

    this.canDrop = false;
    this.currentDropperTier = this.nextDropperTier;
    this.nextDropperTier = this.getRandomDropTier();
    this.onDropperChange?.(this.currentDropperTier, this.nextDropperTier);

    setTimeout(() => {
      this.canDrop = true;
    }, this.dropCooldown);
  }

  private loop = () => {
    if (!this.isRunning) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (!this.isPaused && !this.isGameOver) {
      this.update(dt);
    }

    this.render();
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    const gravity = 550; // px/s^2
    const friction = 0.985;
    const restitution = 0.22;

    // Sub-stepping for physics stability
    const steps = 4;
    const subDt = dt / steps;

    for (let step = 0; step < steps; step++) {
      // 1. Move fruits & apply gravity
      for (const fruit of this.fruits) {
        fruit.vy += gravity * subDt;
        fruit.vx *= friction;
        fruit.vy *= friction;

        fruit.x += fruit.vx * subDt;
        fruit.y += fruit.vy * subDt;

        // Container boundary collisions
        const minX = this.jarX + fruit.radius;
        const maxX = this.jarX + this.jarWidth - fruit.radius;
        const floorY = this.jarY + this.jarHeight - fruit.radius;

        if (fruit.x < minX) {
          fruit.x = minX;
          fruit.vx = -fruit.vx * restitution;
        } else if (fruit.x > maxX) {
          fruit.x = maxX;
          fruit.vx = -fruit.vx * restitution;
        }

        if (fruit.y > floorY) {
          fruit.y = floorY;
          fruit.vy = -fruit.vy * restitution;
          fruit.vx *= 0.94; // floor friction
        }
      }

      // 2. Fruit-to-fruit collisions & merge check
      const toRemoveIds = new Set<number>();
      const newFruitsToSpawn: FruitBody[] = [];

      for (let i = 0; i < this.fruits.length; i++) {
        const a = this.fruits[i];
        if (toRemoveIds.has(a.id)) continue;

        for (let j = i + 1; j < this.fruits.length; j++) {
          const b = this.fruits[j];
          if (toRemoveIds.has(b.id)) continue;

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = dx * dx + dy * dy;
          const minDist = a.radius + b.radius;

          if (distSq < minDist * minDist && distSq > 0.001) {
            const dist = Math.sqrt(distSq);

            // Merge check
            if (a.tier === b.tier && a.tier < FRUIT_TIERS.length - 1 && !a.merged && !b.merged) {
              toRemoveIds.add(a.id);
              toRemoveIds.add(b.id);

              const nextTier = a.tier + 1;
              const nextDef = FRUIT_TIERS[nextTier];
              const midX = (a.x + b.x) / 2;
              const midY = (a.y + b.y) / 2;

              newFruitsToSpawn.push({
                id: this.nextFruitId++,
                tier: nextTier,
                x: midX,
                y: midY,
                vx: (a.vx + b.vx) * 0.3,
                vy: (a.vy + b.vy) * 0.3 - 30, // tiny pop up
                radius: nextDef.radius,
                merged: false,
                scale: 1.25, // pop scale
                age: 0
              });

              this.score += nextDef.score;
              this.onScoreUpdate?.({ score: this.score });

              sounds.playCombo(nextTier);
              haptics.impact();
              this.spawnParticles(midX, midY, nextDef.color, 12);
              break;
            }

            // Normal circle-circle elastic collision
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            // Positional resolution
            a.x -= nx * overlap * 0.5;
            a.y -= ny * overlap * 0.5;
            b.x += nx * overlap * 0.5;
            b.y += ny * overlap * 0.5;

            // Relative velocity along collision normal (from a to b)
            const relVel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (relVel < 0) { // Only apply impulse if approaching each other
              const impulse = -(1 + restitution) * relVel * 0.5;
              a.vx -= impulse * nx;
              a.vy -= impulse * ny;
              b.vx += impulse * nx;
              b.vy += impulse * ny;
            }
          }
        }
      }

      if (toRemoveIds.size > 0) {
        this.fruits = this.fruits.filter(f => !toRemoveIds.has(f.id));
        this.fruits.push(...newFruitsToSpawn);
      }
    }

    // Scale pop decay and age accumulation
    for (const f of this.fruits) {
      f.age = (f.age || 0) + dt;
      if (f.scale > 1) {
        f.scale = Math.max(1, f.scale - dt * 2);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 400 * dt; // gravity on particles
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // Danger line overflow check
    let anyAboveDanger = false;
    for (const f of this.fruits) {
      // Must be settled and inside the jar for over 1.2s (not freshly dropped)
      if (f.age > 1.2 && (f.y - f.radius) < this.dangerLineY && Math.abs(f.vy) < 40) {
        anyAboveDanger = true;
        break;
      }
    }

    if (anyAboveDanger) {
      this.dangerTime += dt * 1000;
      if (this.dangerTime > 3200) {
        this.handleGameOver();
      }
    } else {
      this.dangerTime = Math.max(0, this.dangerTime - dt * 500);
    }
  }

  private handleGameOver() {
    this.isGameOver = true;
    sounds.playGameOver();
    haptics.impact();
    this.onGameOver?.(this.score, false);
  }

  private spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = 70 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        radius: 3 + Math.random() * 3,
        life: 0,
        maxLife: 0.45 + Math.random() * 0.25
      });
    }
  }

  private render() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const rect = this.container.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw Jar Container
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.beginPath();
    ctx.roundRect(this.jarX, this.jarY, this.jarWidth, this.jarHeight, [0, 0, 24, 24]);
    ctx.fill();

    // Jar Border
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.35)'; // Pinkish neon border
    ctx.stroke();

    // Danger Line
    const isDangerWarning = this.dangerTime > 800;
    ctx.beginPath();
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = isDangerWarning ? 'rgba(239, 68, 68, 0.9)' : 'rgba(239, 68, 68, 0.4)';
    ctx.moveTo(this.jarX, this.dangerLineY);
    ctx.lineTo(this.jarX + this.jarWidth, this.dangerLineY);
    ctx.stroke();
    ctx.setLineDash([]);

    if (isDangerWarning) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'right';
      const timeLeft = Math.max(0, (3200 - this.dangerTime) / 1000).toFixed(1);
      ctx.fillText(`OVERFLOW! ${timeLeft}s`, this.jarX + this.jarWidth - 8, this.dangerLineY - 6);
    }
    ctx.restore();

    // Dropper Aim Guide & Top Preview
    if (this.canDrop && !this.isGameOver) {
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.moveTo(this.dropperX, 44);
      ctx.lineTo(this.dropperX, this.jarY + this.jarHeight);
      ctx.stroke();
      ctx.restore();

      // Dropper Fruit Preview
      const curDef = FRUIT_TIERS[this.currentDropperTier];
      this.drawFruitCircle(ctx, this.dropperX, 44, curDef.radius * 0.85, curDef, 1);
    }

    // Render Fruits
    for (const fruit of this.fruits) {
      const def = FRUIT_TIERS[fruit.tier];
      this.drawFruitCircle(ctx, fruit.x, fruit.y, fruit.radius * fruit.scale, def, fruit.scale);
    }

    // Render Particles
    for (const p of this.particles) {
      const progress = p.life / p.maxLife;
      const alpha = Math.max(0, 1 - progress);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * (1 - progress * 0.4), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawFruitCircle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    def: FruitDef,
    _scale: number
  ) {
    ctx.save();

    // Radial gradient body
    const grad = ctx.createRadialGradient(
      x - radius * 0.3,
      y - radius * 0.3,
      radius * 0.1,
      x,
      y,
      radius
    );
    grad.addColorStop(0, def.accent);
    grad.addColorStop(0.7, def.color);
    grad.addColorStop(1, '#00000044');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Outer rim highlight
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.stroke();

    // Emoji icon in center
    ctx.font = `${Math.floor(radius * 1.15)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.emoji, x, y + 2);

    ctx.restore();
  }
}
