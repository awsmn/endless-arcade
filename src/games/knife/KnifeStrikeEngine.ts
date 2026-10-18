import { GameEngine, GameMode, GameScoreUpdate } from '../../types/game';
import { sounds } from '../../engine/audio';
import { haptics } from '../../engine/haptics';

interface FlyingKnife {
  x?: number;
  y: number;
  speed: number;
  state: 'flying' | 'embedded' | 'deflected';
  deflectVx?: number;
  deflectVy?: number;
  rotation?: number;
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

export class KnifeStrikeEngine implements GameEngine {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private container!: HTMLElement;

  // Center target wheel
  private centerX = 180;
  private centerY = 190;
  private targetRadius = 76;
  private wheelAngle = 0;
  private wheelSpeed = 1.8; // rad/s
  private speedTimer = 0;

  // Embedded obstacles on wheel
  private embeddedKnives: number[] = []; // relative angles in rad
  private apples: { angle: number; sliced: boolean }[] = [];

  // Flying knife
  private flyingKnife: FlyingKnife | null = null;
  private launchY = 460;

  // Stage progression
  public stage = 1;
  public totalKnives = 7;
  public remainingKnives = 7;
  private score = 0;

  private isRunning = false;
  private isPaused = false;
  private isGameOver = false;
  private screenShake = 0;
  private targetFlash = 0;

  private particles: Particle[] = [];
  private lastTime = 0;
  private animationFrameId = 0;

  public onScoreUpdate?: (update: GameScoreUpdate) => void;
  public onGameOver?: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
  public onStageChange?: (stage: number, remaining: number, total: number) => void;

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

    this.centerX = rect.width / 2;
    this.centerY = Math.max(160, Math.min(230, rect.height * 0.32));
    this.launchY = rect.height - 95;
  }

  public start(_mode: GameMode = 'levels', level = 1) {
    this.stage = level;
    this.score = 0;
    this.isRunning = true;
    this.isPaused = false;
    this.isGameOver = false;
    this.particles = [];
    this.flyingKnife = null;

    this.setupStage(this.stage);
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

  private setupStage(stageNum: number) {
    this.flyingKnife = null;
    this.totalKnives = 6 + (stageNum % 4);
    this.remainingKnives = this.totalKnives;
    this.embeddedKnives = [];
    this.apples = [];

    // Pre-embedded knives based on stage
    const initialHazards = Math.min(4, Math.floor(stageNum / 2));
    for (let i = 0; i < initialHazards; i++) {
      this.embeddedKnives.push((i * Math.PI * 2) / initialHazards + 0.3);
    }

    // Apples
    if (Math.random() < 0.7) {
      this.apples.push({ angle: Math.random() * Math.PI * 2, sliced: false });
    }

    this.wheelSpeed = (1.5 + (stageNum % 5) * 0.4) * (stageNum % 2 === 0 ? -1 : 1);
    this.onStageChange?.(this.stage, this.remainingKnives, this.totalKnives);
    this.onScoreUpdate?.({ score: this.score, level: this.stage });
  }

  public throwKnife() {
    if (this.isPaused || this.isGameOver || this.flyingKnife || this.remainingKnives <= 0) return;

    this.flyingKnife = {
      y: this.launchY,
      speed: 1800, // px/s
      state: 'flying'
    };

    this.remainingKnives--;
    sounds.playLaser();
    haptics.tap();
    this.onStageChange?.(this.stage, this.remainingKnives, this.totalKnives);
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
    // Dynamic wheel rotation speed variation
    this.speedTimer += dt;
    if (this.stage > 2) {
      // Oscillating or reversing wheel
      this.wheelAngle += this.wheelSpeed * (1 + 0.4 * Math.sin(this.speedTimer * 2.5)) * dt;
    } else {
      this.wheelAngle += this.wheelSpeed * dt;
    }

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }
    if (this.targetFlash > 0) {
      this.targetFlash = Math.max(0, this.targetFlash - dt * 4);
    }

    // Update flying knife
    if (this.flyingKnife) {
      if (this.flyingKnife.state === 'flying') {
        this.flyingKnife.y -= this.flyingKnife.speed * dt;

        // Check if tip reached wheel rim
        const targetImpactY = this.centerY + this.targetRadius;
        if (this.flyingKnife.y <= targetImpactY) {
          this.handleKnifeImpact();
        }
      } else if (this.flyingKnife.state === 'deflected') {
        const boundsHeight = this.container.clientHeight || (this.canvas.height / (window.devicePixelRatio || 1));
        this.flyingKnife.x = (this.flyingKnife.x ?? this.centerX) + (this.flyingKnife.deflectVx || 0) * dt;
        this.flyingKnife.y += (this.flyingKnife.deflectVy || 200) * dt;
        this.flyingKnife.deflectVy = (this.flyingKnife.deflectVy || 200) + 1200 * dt; // gravity
        if (this.flyingKnife.rotation !== undefined) {
          this.flyingKnife.rotation += 15 * dt;
        }

        if (this.flyingKnife.y > boundsHeight + 40) {
          // Deflected knife fell off screen
          this.isGameOver = true;
          sounds.playGameOver();
          haptics.gameOver();
          this.onGameOver?.(this.score, false, Math.min(3, Math.floor(this.stage / 2)));
        }
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 450 * dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  private handleKnifeImpact() {
    if (!this.flyingKnife) return;

    // Angle of impact relative to wheel: bottom of circle is angle PI / 2
    const hitAngle = Math.PI / 2 - this.wheelAngle;
    const normalizedHit = ((hitAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    // Check collision with embedded knives
    const collisionThreshold = 0.22; // ~12 degrees
    let collided = false;

    for (const knifeAngle of this.embeddedKnives) {
      const norm = ((knifeAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      let diff = Math.abs(normalizedHit - norm);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;

      if (diff < collisionThreshold) {
        collided = true;
        break;
      }
    }

    if (collided) {
      // Clang! Deflection
      this.flyingKnife.state = 'deflected';
      this.flyingKnife.deflectVx = (Math.random() - 0.5) * 350;
      this.flyingKnife.deflectVy = 200;
      this.flyingKnife.rotation = 0;
      this.screenShake = 12;

      sounds.playHit();
      haptics.impact();
      this.spawnParticles(this.centerX, this.centerY + this.targetRadius, '#cbd5e1', 12);
      return;
    }

    // Embed knife!
    this.embeddedKnives.push(hitAngle);
    this.flyingKnife = null;
    this.targetFlash = 1;
    this.score++;
    this.onScoreUpdate?.({ score: this.score, level: this.stage });

    sounds.playHit();
    haptics.tap();
    this.spawnParticles(this.centerX, this.centerY + this.targetRadius, '#e2e8f0', 6);

    // Check apple slice
    for (const apple of this.apples) {
      if (!apple.sliced) {
        const norm = ((apple.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        let diff = Math.abs(normalizedHit - norm);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < 0.28) {
          apple.sliced = true;
          this.score += 5;
          sounds.playCollect(1.5);
          haptics.impact();
          this.spawnParticles(this.centerX, this.centerY + this.targetRadius, '#ef4444', 15);
        }
      }
    }

    // Check if stage cleared
    if (this.remainingKnives === 0) {
      this.handleStageCleared();
    }
  }

  private handleStageCleared() {
    sounds.playVictory();
    haptics.impact();
    this.spawnParticles(this.centerX, this.centerY, '#8b5cf6', 30);
    this.spawnParticles(this.centerX, this.centerY, '#f59e0b', 20);

    setTimeout(() => {
      this.stage++;
      this.setupStage(this.stage);
    }, 600);
  }

  private spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 180;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        radius: 2.5 + Math.random() * 3,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.3
      });
    }
  }

  private render() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const rect = this.container.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.save();
    // Screen shake offset
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake;
      const shakeY = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(shakeX, shakeY);
    }

    // 1. Draw Rotating Target Wheel
    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(this.wheelAngle);

    // Wood / Core Disc
    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, this.targetRadius);
    grad.addColorStop(0, '#7c3aed');
    grad.addColorStop(0.85, '#4c1d95');
    grad.addColorStop(1, '#2e1065');

    ctx.fillStyle = this.targetFlash > 0 ? '#ffffff' : grad;
    ctx.beginPath();
    ctx.arc(0, 0, this.targetRadius, 0, Math.PI * 2);
    ctx.fill();

    // Wheel concentric rings
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, this.targetRadius * 0.55, 0, Math.PI * 2);
    ctx.stroke();

    // Embedded Knives (spinning with wheel)
    for (const angle of this.embeddedKnives) {
      ctx.save();
      ctx.rotate(angle);
      this.drawKnifeBlade(ctx, 0, this.targetRadius - 10, true);
      ctx.restore();
    }

    // Apples on wheel
    for (const apple of this.apples) {
      if (!apple.sliced) {
        ctx.save();
        ctx.rotate(apple.angle);
        ctx.font = '22px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🍎', 0, this.targetRadius + 14);
        ctx.restore();
      }
    }

    ctx.restore(); // restore wheel transform

    // 2. Draw Flying or Deflected Knife
    if (this.flyingKnife) {
      ctx.save();
      ctx.translate(this.flyingKnife.x ?? this.centerX, this.flyingKnife.y);
      if (this.flyingKnife.rotation) {
        ctx.rotate(this.flyingKnife.rotation);
      }
      this.drawKnifeBlade(ctx, 0, 0, false);
      ctx.restore();
    }

    // 3. Draw Ready Launch Knife at bottom
    if (!this.flyingKnife && this.remainingKnives > 0 && !this.isGameOver) {
      ctx.save();
      ctx.translate(this.centerX, this.launchY);
      this.drawKnifeBlade(ctx, 0, 0, false);
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

    ctx.restore(); // restore screen shake
  }

  private drawKnifeBlade(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    _embedded: boolean
  ) {
    ctx.save();
    ctx.translate(x, y);

    // Blade
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.moveTo(0, -32); // tip
    ctx.lineTo(5, -4);
    ctx.lineTo(3, 10);
    ctx.lineTo(-3, 10);
    ctx.lineTo(-5, -4);
    ctx.closePath();
    ctx.fill();

    // Blade shine highlight
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Handle / Grip
    ctx.fillStyle = '#6366f1';
    ctx.fillRect(-3, 10, 6, 18);

    // Pommel
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, 29, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
