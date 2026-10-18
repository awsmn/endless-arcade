import { GameEngine, GameMode, GameScoreUpdate } from '../../types/game';
import { sounds } from '../../engine/audio';
import { haptics } from '../../engine/haptics';

interface Block {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface DebrisBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
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

export class StackSliceEngine implements GameEngine {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private container!: HTMLElement;

  private stack: Block[] = [];
  private debris: DebrisBlock[] = [];
  private particles: Particle[] = [];

  // Active moving block
  private activeX = 0;
  private activeWidth = 180;
  private blockHeight = 24;
  private slideSpeed = 220;
  private slideDir = 1;

  // View & Camera
  private cameraY = 0;
  private targetCameraY = 0;

  // Combo & Score
  private combo = 0;
  private score = 0;
  private perfectTolerance = 3.5;

  private isRunning = false;
  private isPaused = false;
  private isGameOver = false;

  private lastTime = 0;
  private animationFrameId = 0;

  public onScoreUpdate?: (update: GameScoreUpdate) => void;
  public onGameOver?: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
  public onCombo?: (combo: number) => void;

  public init(canvas: HTMLCanvasElement, container: HTMLElement) {
    this.canvas = canvas;
    this.container = container;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context');
    this.ctx = ctx;

    this.resize();
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
  }

  public start(_mode: GameMode = 'endless', _level = 1) {
    this.stack = [];
    this.debris = [];
    this.particles = [];
    this.score = 0;
    this.combo = 0;
    this.activeWidth = 180;
    this.slideSpeed = 220;
    this.slideDir = 1;
    this.isRunning = true;
    this.isPaused = false;
    this.isGameOver = false;

    const rect = this.container.getBoundingClientRect();
    const baseY = rect.height - 110;
    const baseX = (rect.width - this.activeWidth) / 2;

    // Initial base block
    this.stack.push({
      x: baseX,
      y: baseY,
      width: this.activeWidth,
      height: this.blockHeight,
      color: this.getColorForIndex(0)
    });

    this.activeX = 10;
    this.cameraY = 0;
    this.targetCameraY = 0;

    this.onScoreUpdate?.({ score: this.score });
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

  public drop() {
    if (this.isPaused || this.isGameOver || this.stack.length === 0) return;

    const topBlock = this.stack[this.stack.length - 1];
    const diff = this.activeX - topBlock.x;
    const currentY = topBlock.y - this.blockHeight;

    // Check for Perfect Alignment
    if (Math.abs(diff) <= this.perfectTolerance) {
      this.combo++;
      sounds.playCombo(this.combo);
      haptics.impact();

      // Expand width reward if combo >= 5
      if (this.combo >= 5) {
        const bonusW = 8;
        const newW = Math.min(220, this.activeWidth + bonusW);
        const added = newW - this.activeWidth;
        this.activeWidth = newW;
        topBlock.x = Math.max(10, topBlock.x - added / 2);
      }

      this.stack.push({
        x: topBlock.x,
        y: currentY,
        width: this.activeWidth,
        height: this.blockHeight,
        color: this.getColorForIndex(this.score + 1)
      });

      this.spawnParticles(topBlock.x + this.activeWidth / 2, currentY + this.blockHeight / 2, '#38bdf8', 16);
      this.onCombo?.(this.combo);
    } else if (Math.abs(diff) < this.activeWidth) {
      // Sliced overhang!
      this.combo = 0;
      sounds.playHit();
      haptics.tap();

      const newWidth = this.activeWidth - Math.abs(diff);
      const newX = diff > 0 ? this.activeX : topBlock.x;

      // Spawn falling slice debris
      const debrisWidth = Math.abs(diff);
      const debrisX = diff > 0 ? topBlock.x + this.activeWidth : this.activeX;
      this.debris.push({
        x: debrisX,
        y: currentY,
        width: debrisWidth,
        height: this.blockHeight,
        color: this.getColorForIndex(this.score + 1),
        vx: diff > 0 ? 90 : -90,
        vy: -50,
        rotation: 0,
        vRot: (Math.random() - 0.5) * 6
      });

      this.activeWidth = newWidth;
      this.stack.push({
        x: newX,
        y: currentY,
        width: newWidth,
        height: this.blockHeight,
        color: this.getColorForIndex(this.score + 1)
      });

      this.spawnParticles(newX + newWidth / 2, currentY + this.blockHeight / 2, '#f43f5e', 8);
    } else {
      // Total miss! Game over
      this.debris.push({
        x: this.activeX,
        y: currentY,
        width: this.activeWidth,
        height: this.blockHeight,
        color: this.getColorForIndex(this.score + 1),
        vx: this.slideDir * 120,
        vy: 20,
        rotation: 0,
        vRot: this.slideDir * 4
      });

      this.isGameOver = true;
      sounds.playGameOver();
      haptics.gameOver();
      const stars = this.score >= 40 ? 3 : this.score >= 20 ? 2 : this.score >= 10 ? 1 : 0;
      this.onGameOver?.(this.score, false, stars);
      return;
    }

    this.score++;
    this.onScoreUpdate?.({ score: this.score });

    // Speed scales slightly with score
    this.slideSpeed = Math.min(480, 220 + this.score * 5);

    // Reposition active block for next drop
    const rect = this.container.getBoundingClientRect();
    this.slideDir = this.score % 2 === 0 ? 1 : -1;
    this.activeX = this.slideDir === 1 ? -this.activeWidth : rect.width;

    // Move camera up
    if (this.score > 5) {
      this.targetCameraY = (this.score - 5) * this.blockHeight;
    }
  }

  private getColorForIndex(idx: number): string {
    const hue = (idx * 16) % 360;
    return `hsl(${hue}, 85%, 60%)`;
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
    const rect = this.container.getBoundingClientRect();

    // Smooth camera tracking
    this.cameraY += (this.targetCameraY - this.cameraY) * 0.1;

    // Move active sliding block
    this.activeX += this.slideSpeed * this.slideDir * dt;
    if (this.slideDir === 1 && this.activeX > rect.width) {
      this.slideDir = -1;
    } else if (this.slideDir === -1 && this.activeX < -this.activeWidth) {
      this.slideDir = 1;
    }

    // Update falling debris
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.vy += 850 * dt; // gravity
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.rotation += d.vRot * dt;

      if (d.y - this.cameraY > rect.height + 200) {
        this.debris.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 400 * dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  private spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        radius: 2 + Math.random() * 2.5,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.2
      });
    }
  }

  private render() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const rect = this.container.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(0, this.cameraY);

    // 1. Render Tower Stack
    for (const b of this.stack) {
      ctx.save();
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.width, b.height, 4);
      ctx.fill();

      // Block rim highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // 2. Render Active Sliding Block
    if (!this.isGameOver && this.stack.length > 0) {
      const topBlock = this.stack[this.stack.length - 1];
      const activeY = topBlock.y - this.blockHeight;
      const curColor = this.getColorForIndex(this.score + 1);

      ctx.save();
      ctx.fillStyle = curColor;
      ctx.beginPath();
      ctx.roundRect(this.activeX, activeY, this.activeWidth, this.blockHeight, 4);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // 3. Render Falling Debris
    for (const d of this.debris) {
      ctx.save();
      ctx.translate(d.x + d.width / 2, d.y + d.height / 2);
      ctx.rotate(d.rotation);
      ctx.fillStyle = d.color;
      ctx.fillRect(-d.width / 2, -d.height / 2, d.width, d.height);
      ctx.restore();
    }

    // 4. Render Particles
    for (const p of this.particles) {
      const alpha = 1 - p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore(); // restore camera transform
  }
}
