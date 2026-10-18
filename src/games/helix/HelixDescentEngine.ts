import { GameEngine, GameMode, GameScoreUpdate } from '../../types/game';
import { sounds } from '../../engine/audio';
import { haptics } from '../../engine/haptics';

interface PlatformSegment {
  type: 'safe' | 'hazard' | 'gap';
  startAngle: number; // in radians (0 to 2PI)
  endAngle: number;
}

interface PlatformRing {
  id: number;
  y: number; // world Y coordinate
  segments: PlatformSegment[];
  color: string;
  isShattered?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
}

export class HelixDescentEngine implements GameEngine {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private container!: HTMLElement;

  // Tower state
  private towerRotation = 0; // in radians
  private towerRadius = 130;
  private columnRadius = 26;
  private ringSpacing = 160;
  private rings: PlatformRing[] = [];
  private nextRingId = 0;

  // Ball state
  private ballY = 0; // world Y coordinate
  private ballVy = 0;
  private ballRadius = 11;
  private ballBounceSpeed = -440;
  private gravity = 1100;

  // Drop combo & Destroyer Mode
  private tiersFallen = 0;
  private isDestroyer = false;
  private squishFactor = 1;

  // Camera scroll
  private cameraY = 0;

  // Game state
  private score = 0;
  private isRunning = false;
  private isPaused = false;
  private isGameOver = false;
  private screenShake = 0;

  // Visual effects
  private particles: Particle[] = [];
  private lastTime = 0;
  private animationFrameId = 0;

  // Callbacks
  public onScoreUpdate?: (update: GameScoreUpdate) => void;
  public onGameOver?: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;

  public init(canvas: HTMLCanvasElement, container: HTMLElement) {
    this.canvas = canvas;
    this.container = container;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not acquire 2d context');
    this.ctx = ctx;

    this.resize();
  }

  public resize() {
    if (!this.canvas || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);

    this.towerRadius = Math.min(rect.width * 0.36, 140);
  }

  public start(_mode: GameMode, _level?: number) {
    this.score = 0;
    this.towerRotation = 0;
    this.ballY = -30;
    this.ballVy = 0;
    this.cameraY = -120;
    this.tiersFallen = 0;
    this.isDestroyer = false;
    this.screenShake = 0;
    this.particles = [];
    this.rings = [];
    this.nextRingId = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.isRunning = true;

    // Generate initial set of platform rings
    for (let i = 0; i < 18; i++) {
      this.generateRing(i === 0);
    }

    this.lastTime = performance.now();
    this.loop();
  }

  private generateRing(isFirst: boolean) {
    const id = this.nextRingId++;
    const y = id * this.ringSpacing;

    const segments: PlatformSegment[] = [];
    const colors = [
      '#f97316', // orange
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#8b5cf6', // purple
      '#10b981', // emerald
      '#eab308'  // yellow
    ];
    const ringColor = colors[id % colors.length];

    if (isFirst) {
      // First ring has a wide gap in back, safe at front
      segments.push({ type: 'safe', startAngle: -Math.PI * 0.7, endAngle: Math.PI * 0.7 });
      segments.push({ type: 'gap', startAngle: Math.PI * 0.7, endAngle: Math.PI * 1.3 });
    } else {
      // Random gap of size 60deg to 100deg
      const gapAngle = (Math.PI / 180) * (65 + Math.random() * 35);
      const gapCenter = Math.random() * Math.PI * 2;
      const gapStart = (gapCenter - gapAngle / 2 + Math.PI * 2) % (Math.PI * 2);
      const gapEnd = (gapCenter + gapAngle / 2 + Math.PI * 2) % (Math.PI * 2);

      // Add hazard blocks on later rings
      const hasHazard = id > 1 && Math.random() > 0.3;
      const hazardAngle = (Math.PI / 180) * (35 + Math.random() * 25);
      let hazardCenter = (gapCenter + Math.PI + (Math.random() - 0.5) * 0.5) % (Math.PI * 2);

      // Subdivide circle into 12 slices for neat rendering
      const sliceCount = 12;
      for (let s = 0; s < sliceCount; s++) {
        const a1 = (s / sliceCount) * Math.PI * 2;
        const a2 = ((s + 1) / sliceCount) * Math.PI * 2;
        const mid = (a1 + a2) / 2;

        const inGap = this.isAngleBetween(mid, gapStart, gapEnd);
        const inHazard = hasHazard && this.isAngleBetween(mid, hazardCenter - hazardAngle / 2, hazardCenter + hazardAngle / 2);

        if (inGap) {
          segments.push({ type: 'gap', startAngle: a1, endAngle: a2 });
        } else if (inHazard) {
          segments.push({ type: 'hazard', startAngle: a1, endAngle: a2 });
        } else {
          segments.push({ type: 'safe', startAngle: a1, endAngle: a2 });
        }
      }
    }

    this.rings.push({
      id,
      y,
      segments,
      color: ringColor
    });
  }

  private isAngleBetween(target: number, start: number, end: number): boolean {
    const t = (target % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const s = (start % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const e = (end % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

    if (s <= e) {
      return t >= s && t <= e;
    }
    return t >= s || t <= e;
  }

  public rotateTower(deltaRadians: number) {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;
    this.towerRotation = (this.towerRotation + deltaRadians + Math.PI * 2) % (Math.PI * 2);
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.loop();
  }

  public destroy() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private loop = (time = performance.now()) => {
    if (!this.isRunning || this.isPaused) return;
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    this.update(dt);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    // Screen shake decay (always decay, even during game over)
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }

    if (this.isGameOver) {
      this.updateParticles(dt);
      return;
    }

    // Apply gravity
    this.ballVy += this.gravity * dt;
    this.ballY += this.ballVy * dt;

    // Squish recovery
    if (this.squishFactor < 1) {
      this.squishFactor = Math.min(1, this.squishFactor + dt * 5);
    }

    // Check collisions with rings
    for (const ring of this.rings) {
      if (ring.isShattered) continue;

      // Platform vertical impact zone
      const ballBottom = this.ballY + this.ballRadius;
      const prevBallBottom = ballBottom - this.ballVy * dt;

      if (this.ballVy > 0 && prevBallBottom <= ring.y && ballBottom >= ring.y) {
        // Ball intersects platform plane! Check segment at front angle
        // Front view is angle = Math.PI / 2 (bottom/facing player in 3D projection)
        const frontAngle = Math.PI / 2;
        // Adjusted for tower rotation
        const testAngle = (frontAngle - this.towerRotation + Math.PI * 4) % (Math.PI * 2);

        // Find which segment covers testAngle
        const segment = ring.segments.find(s => this.isAngleBetween(testAngle, s.startAngle, s.endAngle));

        if (!segment || segment.type === 'gap') {
          // Ball fell through gap!
          this.tiersFallen++;
          this.score += 10 * Math.max(1, this.tiersFallen);
          this.onScoreUpdate?.({ score: this.score });
          sounds.playCollect(Math.min(2.2, 1 + this.tiersFallen * 0.15));

          if (this.tiersFallen >= 3 && !this.isDestroyer) {
            this.isDestroyer = true;
            this.screenShake = 6;
            haptics.bump();
          }
        } else if (segment.type === 'hazard') {
          if (this.isDestroyer) {
            // Smash hazard in destroyer mode!
            this.shatterRing(ring);
          } else {
            // Hit hazard - Game Over!
            this.triggerGameOver();
            return;
          }
        } else {
          // Safe segment hit
          if (this.isDestroyer) {
            // Smash platform in destroyer mode!
            this.shatterRing(ring);
          } else {
            // Normal elastic bounce!
            this.ballY = ring.y - this.ballRadius;
            this.ballVy = this.ballBounceSpeed;
            this.tiersFallen = 0;
            this.squishFactor = 0.65;
            this.screenShake = 3;
            sounds.playBounce();
            haptics.bump();
            this.spawnBounceSparks(ring.y, ring.color);
          }
        }
      }
    }

    // Camera smoothly tracks ball down
    const targetCameraY = this.ballY - 140;
    this.cameraY += (targetCameraY - this.cameraY) * Math.min(1, dt * 9);

    // Recycle rings: remove rings above camera, generate new rings below
    while (this.rings.length > 0 && this.rings[0].y < this.cameraY - 260) {
      this.rings.shift();
    }
    const lowestRing = this.rings[this.rings.length - 1];
    if (lowestRing && lowestRing.y < this.cameraY + 900) {
      this.generateRing(false);
    }

    // Update particles
    this.updateParticles(dt);
  }

  private shatterRing(ring: PlatformRing) {
    ring.isShattered = true;
    this.score += 50;
    this.tiersFallen = 0;
    this.isDestroyer = false;
    this.screenShake = 10;
    this.ballVy = this.ballBounceSpeed * 0.75;
    this.onScoreUpdate?.({ score: this.score });
    sounds.playHit();
    haptics.failure();

    // Spawn massive shatter explosion
    const rect = this.container.getBoundingClientRect();
    const cx = rect.width / 2;
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 260;
      this.particles.push({
        x: cx + Math.cos(angle) * (this.towerRadius * 0.6),
        y: ring.y,
        vx: Math.cos(angle) * speed,
        vy: -100 + (Math.random() - 0.5) * 200,
        radius: 3 + Math.random() * 4,
        color: ring.color,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.4
      });
    }
  }

  private spawnBounceSparks(y: number, color: string) {
    const rect = this.container.getBoundingClientRect();
    const cx = rect.width / 2;
    const platformFrontOffset = (this.columnRadius + (this.towerRadius - this.columnRadius) * 0.45) * 0.35;
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 16,
        y: y + platformFrontOffset,
        vx: (Math.random() - 0.5) * 140,
        vy: -40 - Math.random() * 90,
        radius: 2 + Math.random() * 2,
        color,
        life: 0,
        maxLife: 0.3 + Math.random() * 0.2
      });
    }
  }

  private triggerGameOver() {
    this.isGameOver = true;
    this.screenShake = 15;
    sounds.playGameOver();
    haptics.failure();

    // Splatter ball particles
    const rect = this.container.getBoundingClientRect();
    const cx = rect.width / 2;
    const platformFrontOffset = (this.columnRadius + (this.towerRadius - this.columnRadius) * 0.45) * 0.35;
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 320;
      this.particles.push({
        x: cx,
        y: this.ballY + platformFrontOffset,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 4,
        color: '#FF1E44',
        life: 0,
        maxLife: 0.7 + Math.random() * 0.4
      });
    }

    setTimeout(() => {
      this.onGameOver?.(this.score, false);
    }, 650);
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 380 * dt; // gravity
    }
  }

  private render() {
    const rect = this.container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const cx = width / 2;

    this.ctx.save();
    this.ctx.clearRect(0, 0, width, height);

    // Apply Screen Shake
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      this.ctx.translate(sx, sy);
    }

    // Background Cyber Gradients
    const bgGrad = this.ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0c1020');
    bgGrad.addColorStop(1, '#050711');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, width, height);

    // Draw central cylinder core pillar
    const coreGrad = this.ctx.createLinearGradient(cx - this.columnRadius, 0, cx + this.columnRadius, 0);
    coreGrad.addColorStop(0, '#151b32');
    coreGrad.addColorStop(0.5, '#2e3a66');
    coreGrad.addColorStop(1, '#111628');
    this.ctx.fillStyle = coreGrad;
    this.ctx.fillRect(cx - this.columnRadius, 0, this.columnRadius * 2, height);

    // Pillar outer black borders (pop neo-brutalist style)
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeRect(cx - this.columnRadius, -10, this.columnRadius * 2, height + 20);

    // Draw Platform Rings with isometric elliptical projection
    for (const ring of this.rings) {
      if (ring.isShattered) continue;
      const screenY = ring.y - this.cameraY;
      // Skip rings outside viewport
      if (screenY < -100 || screenY > height + 100) continue;

      this.renderRing(cx, screenY, ring);
    }

    // Render Ball (Centered horizontally, at ball screen Y)
    if (!this.isGameOver) {
      const platformFrontOffset = (this.columnRadius + (this.towerRadius - this.columnRadius) * 0.45) * 0.35;
      const ballScreenY = this.ballY - this.cameraY + platformFrontOffset;

      // Ball Destroyer Fire Aura
      if (this.isDestroyer) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(cx, ballScreenY, this.ballRadius * 1.8, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 85, 0, 0.45)';
        this.ctx.fill();
        this.ctx.restore();
      }

      // Ball Body with Squish
      this.ctx.save();
      this.ctx.translate(cx, ballScreenY);
      this.ctx.scale(1 / this.squishFactor, this.squishFactor);

      this.ctx.beginPath();
      this.ctx.arc(0, 0, this.ballRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = this.isDestroyer ? '#FFE500' : '#00F0FF';
      this.ctx.fill();
      this.ctx.lineWidth = 2.5;
      this.ctx.strokeStyle = '#000000';
      this.ctx.stroke();

      // Ball Pop Glint
      this.ctx.beginPath();
      this.ctx.arc(-this.ballRadius * 0.35, -this.ballRadius * 0.35, this.ballRadius * 0.3, 0, Math.PI * 2);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fill();

      this.ctx.restore();
    }

    // Render Particles
    for (const p of this.particles) {
      const screenY = p.y - this.cameraY;
      const progress = p.life / p.maxLife;
      const alpha = 1 - progress;

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, screenY, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  private renderRing(cx: number, cy: number, ring: PlatformRing) {
    const rx = this.towerRadius;
    const ry = this.towerRadius * 0.35; // perspective flattening

    // Draw each segment of the ring
    for (const seg of ring.segments) {
      if (seg.type === 'gap') continue;

      // Project segment onto elliptical arc
      const start = seg.startAngle + this.towerRotation;
      const end = seg.endAngle + this.towerRotation;

      this.ctx.save();
      this.ctx.beginPath();

      // Draw thick outer ring slab
      this.ctx.ellipse(cx, cy, rx, ry, 0, start, end);
      this.ctx.ellipse(cx, cy, this.columnRadius + 2, (this.columnRadius + 2) * 0.35, 0, end, start, true);
      this.ctx.closePath();

      // Colors
      if (seg.type === 'hazard') {
        this.ctx.fillStyle = '#FF1E44';
      } else {
        this.ctx.fillStyle = ring.color;
      }
      this.ctx.fill();

      // Neo-brutalist border
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.restore();
    }
  }
}
