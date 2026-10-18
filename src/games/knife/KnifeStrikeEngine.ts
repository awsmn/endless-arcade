import { drawKnife, drawFruit, polygon } from '../../engine/art';
import { getDifficulty } from '../../engine/difficulty';
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
  private readonly pace = getDifficulty().pace;
  private viewport = { width: 0, height: 0 };
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
  private stageClearTimer: ReturnType<typeof setTimeout> | null = null;

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
    this.viewport = { width: rect.width, height: rect.height };
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
    if (this.stageClearTimer) {
      clearTimeout(this.stageClearTimer);
      this.stageClearTimer = null;
    }
  }

  private setupStage(stageNum: number) {
    this.flyingKnife = null;
    // Fair knive count progression: 5 knives at stage 1, up to 8
    this.totalKnives = 5 + Math.min(3, Math.floor((stageNum - 1) / 2));
    this.remainingKnives = this.totalKnives;
    this.embeddedKnives = [];
    this.apples = [];

    // Pre-embedded knives based on stage (max 3 hazards so wheel never gets overcrowded)
    const initialHazards = Math.min(3, Math.floor((stageNum - 1) / 3));
    for (let i = 0; i < initialHazards; i++) {
      this.embeddedKnives.push((i * Math.PI * 2) / initialHazards + 0.35);
    }

    // Apples for bonus points
    if (Math.random() < 0.7) {
      this.apples.push({ angle: Math.random() * Math.PI * 2, sliced: false });
    }

    // Smooth speed progression
    const baseSpeed = 1.3 + Math.min(10, stageNum) * 0.12;
    this.wheelSpeed = baseSpeed * (stageNum % 2 === 0 ? -1 : 1);
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
    if (this.isPaused) {
      this.animationFrameId = requestAnimationFrame(this.loop);
      return;
    }
    const now = performance.now();
    const dt = Math.min(Math.max(0, (now - this.lastTime) / 1000) * this.pace, 0.05);
    this.lastTime = now;

    if (!this.isPaused && !this.isGameOver) {
      this.update(dt);
    }

    this.render();
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    // Dynamic wheel rotation speed variation (gentle, uniform scaling)
    this.speedTimer += dt;
    if (this.stage >= 4) {
      const variationStrength = Math.min(0.35, 0.15 + (this.stage - 4) * 0.03);
      this.wheelAngle += this.wheelSpeed * (1 + variationStrength * Math.sin(this.speedTimer * 2.2)) * dt;
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
          const stars = this.stage >= 10 ? 3 : this.stage >= 5 ? 2 : this.stage >= 2 ? 1 : 0;
          this.onGameOver?.(this.score, false, stars);
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

    // Check collision with embedded knives (0.15 rad matches visual knife thickness)
    const collisionThreshold = 0.15;
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

    this.stageClearTimer = setTimeout(() => {
      this.stage++;
      this.setupStage(this.stage);
      this.stageClearTimer = null;
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
    const rect = this.viewport;

    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.save();
    // Screen shake offset
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake;
      const shakeY = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(shakeX, shakeY);
    }

    const bg = ctx.createLinearGradient(0, 0, 0, rect.height);
    bg.addColorStop(0, '#201a30'); bg.addColorStop(1, '#0a101d');
    ctx.fillStyle = bg; ctx.fillRect(0,0,rect.width,rect.height);
    ctx.strokeStyle = '#f2c69218'; ctx.lineWidth = 1;
    for(let i=0;i<7;i++){ctx.beginPath();ctx.arc(this.centerX,this.centerY,this.targetRadius+45+i*27,0,Math.PI*2);ctx.stroke();}

    // 1. Draw Rotating Target Wheel
    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(this.wheelAngle);

    // Wood / Core Disc
    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, this.targetRadius);
    grad.addColorStop(0, '#ce986e');
    grad.addColorStop(0.85, '#88573e');
    grad.addColorStop(1, '#4b3334');

    ctx.fillStyle = this.targetFlash > 0 ? '#ffffff' : grad;
    ctx.beginPath();
    ctx.arc(0, 0, this.targetRadius, 0, Math.PI * 2);
    ctx.fill();

    // Hand-cut tree rings, growth lines, and radial cracks.
    ctx.strokeStyle = '#efc09588'; ctx.lineWidth = 2;
    for (const fraction of [.25, .49, .73, .93]) {
      ctx.beginPath();
      for (let n = 0; n <= 64; n++) {
        const angle = n / 64 * Math.PI * 2;
        const radius = this.targetRadius * fraction + Math.sin(angle * 5 + fraction * 7) * 2;
        const px = Math.cos(angle) * radius, py = Math.sin(angle) * radius;
        if (n === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.stroke();
    }
    ctx.strokeStyle = '#392c32'; ctx.lineWidth = 2.5;
    for (let n=0;n<7;n++) {
      const angle = n * 2.399;
      ctx.beginPath();ctx.moveTo(Math.cos(angle)*this.targetRadius,Math.sin(angle)*this.targetRadius);
      ctx.lineTo(Math.cos(angle+.07)*this.targetRadius*.82,Math.sin(angle+.07)*this.targetRadius*.82);
      ctx.lineTo(Math.cos(angle+.03)*this.targetRadius*.7,Math.sin(angle+.03)*this.targetRadius*.7);ctx.stroke();
    }

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
        drawFruit(ctx, 0, this.targetRadius + 14, 15, 5);
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
    drawKnife(ctx, x, y);
  }
}
