import { drawShip, drawStar, polygon } from '../../engine/art';
import { getDifficulty } from '../../engine/difficulty';
import { GameEngine, GameMode, GameScoreUpdate } from '../../types/game';
import { sounds } from '../../engine/audio';
import { haptics } from '../../engine/haptics';

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

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
}

interface ObstacleGate {
  id: number;
  x: number;
  gapY: number;
  gapHeight: number;
  width: number;
  passed: boolean;
  angle: number;
  starCollected?: boolean;
}

export class FlappyOrbitEngine implements GameEngine {
  private readonly pace = getDifficulty().pace;
  private viewport = { width: 0, height: 0 };
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private container!: HTMLElement;

  // Space Probe State
  private probeX = 100;
  private probeY = 250;
  private probeVy = 0;
  private probeRadius = 14;
  private probeRotation = 0;
  private hasStarted = false;
  private hoverTimer = 0;

  // Physics constants
  private gravity = 980; // px/s^2
  private impulse = -340; // upward thrust
  private terminalVelocity = 650;

  // World & Obstacles
  private gates: ObstacleGate[] = [];
  private nextGateId = 1;
  private worldSpeed = 165; // px/s
  private spawnInterval = 1.7; // seconds
  private spawnTimer = 0;
  private gatesPassed = 0;

  // Parallax background
  private stars: Star[] = [];
  private particles: Particle[] = [];

  private score = 0;
  private isRunning = false;
  private isPaused = false;
  private isGameOver = false;
  private screenShake = 0;

  private lastTime = 0;
  private animationFrameId = 0;

  public onScoreUpdate?: (update: GameScoreUpdate) => void;
  public onGameOver?: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;

  public init(canvas: HTMLCanvasElement, container: HTMLElement) {
    this.canvas = canvas;
    this.container = container;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context');
    this.ctx = ctx;

    this.resize();
    this.initStars();
  }

  private initStars() {
    this.stars = [];
    const rect = this.viewport;
    for (let i = 0; i < 45; i++) {
      this.stars.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        size: 1 + Math.random() * 2,
        speed: 15 + Math.random() * 35,
        alpha: 0.3 + Math.random() * 0.7
      });
    }
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

    this.probeX = Math.min(100, rect.width * 0.28);
  }

  public start(_mode: GameMode = 'endless', _level = 1) {
    const rect = this.viewport;
    this.probeY = rect.height * 0.45;
    this.probeVy = 0;
    this.probeRotation = 0;
    this.hasStarted = false;
    this.hoverTimer = 0;
    this.gates = [];
    this.particles = [];
    this.score = 0;
    this.gatesPassed = 0;
    this.worldSpeed = 165;
    this.spawnTimer = 0;
    this.screenShake = 0;

    this.isRunning = true;
    this.isPaused = false;
    this.isGameOver = false;

    this.onScoreUpdate?.({ score: 0 });
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

  public flap() {
    if (this.isPaused || this.isGameOver) return;
    if (!this.hasStarted) {
      this.hasStarted = true;
      this.spawnTimer = 0.6; // first gate appears smoothly
    }
    this.probeVy = this.impulse;
    sounds.playLaser();
    haptics.tap();

    // Thruster exhaust particles
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: this.probeX - 10,
        y: this.probeY + 4 + (Math.random() - 0.5) * 6,
        vx: -80 - Math.random() * 60,
        vy: 30 + (Math.random() - 0.5) * 40,
        color: Math.random() < 0.5 ? '#38bdf8' : '#818cf8',
        radius: 2 + Math.random() * 2.5,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.2
      });
    }
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
    const rect = this.viewport;

    // Scroll stars
    for (const star of this.stars) {
      star.x -= star.speed * (this.hasStarted ? dt : dt * 0.4);
      if (star.x < -10) {
        star.x = rect.width + 10;
        star.y = Math.random() * rect.height;
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // Gentle hover before player's first tap
    if (!this.hasStarted) {
      this.hoverTimer += dt;
      this.probeY = rect.height * 0.45 + Math.sin(this.hoverTimer * 3.5) * 12;
      this.probeRotation = Math.sin(this.hoverTimer * 3.5) * 0.08;
      return;
    }

    // Gradually scale speed
    this.worldSpeed = Math.min(260, 145 + this.gatesPassed * 2);

    // Physics on probe
    this.probeVy += this.gravity * dt;
    if (this.probeVy > this.terminalVelocity) {
      this.probeVy = this.terminalVelocity;
    }
    this.probeY += this.probeVy * dt;

    // Pitch rotation follows vertical velocity
    const targetRot = Math.max(-0.55, Math.min(0.9, this.probeVy * 0.002));
    this.probeRotation += (targetRot - this.probeRotation) * 8 * dt;

    // Boundary check (top ceiling and bottom floor)
    const topPad = 60;
    const bottomPad = rect.height - 30;

    if (this.probeY - this.probeRadius < topPad) {
      this.probeY = topPad + this.probeRadius;
      this.probeVy = 0;
    }

    if (this.probeY + this.probeRadius > bottomPad) {
      this.handleCrash();
      return;
    }

    // Gate spawner
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnGate();
    }

    // Gates movement & collision
    const gapCheckWidth = 36;
    for (let i = this.gates.length - 1; i >= 0; i--) {
      const g = this.gates[i];
      g.x -= this.worldSpeed * dt;
      g.angle += dt * 1.5;

      // Score check when passing center
      if (!g.passed && g.x < this.probeX) {
        g.passed = true;
        this.score++;
        this.gatesPassed++;
        sounds.playCollect(1.2);
        haptics.impact();
        this.onScoreUpdate?.({ score: this.score });
      }

      // Collectible energy star in the center of the gap
      if (!g.starCollected && Math.abs(g.x - this.probeX) < 20) {
        const distToCenter = Math.abs(this.probeY - g.gapY);
        if (distToCenter < 24) {
          g.starCollected = true;
          this.score += 3;
          sounds.playCollect(1.8);
          haptics.tap();
          this.spawnParticles(this.probeX, g.gapY, '#f59e0b', 10);
          this.onScoreUpdate?.({ score: this.score });
        }
      }

      // Collision check with upper/lower barriers
      const inX = Math.abs(this.probeX - g.x) < (this.probeRadius + gapCheckWidth / 2);
      if (inX) {
        const upperLimit = g.gapY - g.gapHeight / 2;
        const lowerLimit = g.gapY + g.gapHeight / 2;

        if (this.probeY - this.probeRadius < upperLimit || this.probeY + this.probeRadius > lowerLimit) {
          this.handleCrash();
          return;
        }
      }

      // Remove off-screen gates
      if (g.x < -80) {
        this.gates.splice(i, 1);
      }
    }

    // Decay screen shake
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }
  }

  private spawnGate() {
    const rect = this.viewport;
    const topPad = 85;
    const bottomPad = Math.max(topPad + 80, rect.height - 100);
    const availableHeight = bottomPad - topPad;
    const gapHeight = Math.min(availableHeight, Math.max(130, 185 - this.gatesPassed * 1.2));
    const minY = topPad + gapHeight / 2;
    const maxY = bottomPad - gapHeight / 2;
    // Bound consecutive height changes so every opening is reachable.
    const lastY = this.gates[this.gates.length - 1]?.gapY ?? rect.height * 0.45;
    const gapY = Math.max(minY, Math.min(maxY, lastY + (Math.random() - 0.5) * 150));

    this.gates.push({
      id: this.nextGateId++,
      x: rect.width + 50,
      gapY,
      gapHeight,
      width: 44,
      passed: false,
      angle: 0,
      starCollected: false
    });
  }

  private handleCrash() {
    this.isGameOver = true;
    this.screenShake = 16;
    sounds.playHit();
    sounds.playGameOver();
    haptics.gameOver();

    this.spawnParticles(this.probeX, this.probeY, '#38bdf8', 25);
    this.spawnParticles(this.probeX, this.probeY, '#f43f5e', 20);

    const stars = this.score >= 30 ? 3 : this.score >= 15 ? 2 : this.score >= 5 ? 1 : 0;
    this.onGameOver?.(this.score, false, stars);
  }

  private spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 160;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        radius: 2 + Math.random() * 2.5,
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
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(sx, sy);
    }

    // 1. Space background gradient & nebula
    const bgGrad = ctx.createLinearGradient(0, 0, 0, rect.height);
    bgGrad.addColorStop(0, '#040714');
    bgGrad.addColorStop(0.5, '#0b1329');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(rect.width * .72, rect.height * .22);
    ctx.fillStyle = '#243353'; ctx.beginPath(); ctx.arc(0, 0, 49, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0b1329'; ctx.beginPath(); ctx.arc(-14, -12, 46, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8b99c03f'; ctx.lineWidth = 5; ctx.beginPath();ctx.ellipse(0,0,72,17,-.45,0,Math.PI*2);ctx.stroke();
    ctx.restore();

    // 2. Stars
    for (const star of this.stars) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = star.alpha;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Obstacle Gates (Neon Planetary Rings / Asteroids)
    for (const g of this.gates) {
      const topH = g.gapY - g.gapHeight / 2;
      const bottomY = g.gapY + g.gapHeight / 2;
      const bottomH = rect.height - bottomY;

      // Top Pylon
      ctx.save();
      const gradTop = ctx.createLinearGradient(g.x - g.width / 2, 0, g.x + g.width / 2, 0);
      gradTop.addColorStop(0, '#1e293b');
      gradTop.addColorStop(0.5, '#3b82f6');
      gradTop.addColorStop(1, '#1e293b');
      ctx.fillStyle = gradTop;
      ctx.beginPath();
      ctx.roundRect(g.x - g.width / 2, 0, g.width, topH, [0, 0, 12, 12]);
      ctx.fill();

      // Top Pylon Laser Rim
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Bottom Pylon
      const gradBottom = ctx.createLinearGradient(g.x - g.width / 2, 0, g.x + g.width / 2, 0);
      gradBottom.addColorStop(0, '#1e293b');
      gradBottom.addColorStop(0.5, '#3b82f6');
      gradBottom.addColorStop(1, '#1e293b');
      ctx.fillStyle = gradBottom;
      ctx.beginPath();
      ctx.roundRect(g.x - g.width / 2, bottomY, g.width, bottomH, [12, 12, 0, 0]);
      ctx.fill();

      // Bottom Pylon Laser Rim
      ctx.strokeStyle = '#38bdf8';
      ctx.stroke();
      for (const [edgeY, direction] of [[topH, -1], [bottomY, 1]]) {
        const capY = direction < 0 ? edgeY - 16 : edgeY;
        const gx = g.x - g.width / 2;
        ctx.fillStyle = '#131f3c'; ctx.fillRect(gx - 4, capY, g.width + 8, 16);
        ctx.fillStyle = '#9af2ef'; ctx.fillRect(gx - 2, direction < 0 ? edgeY - 5 : edgeY + 2, g.width + 4, 3);
        ctx.fillStyle = '#d4b5fa';
        for (let n = 0; n < 3; n++) ctx.fillRect(gx + 6 + n * 11, capY + 5, 5, 5);
        const length = direction < 0 ? topH : bottomH;
        for (let offset = 30; offset < length - 16; offset += 38) {
          const py = edgeY + direction * offset;
          polygon(ctx, [[gx + 4,py],[gx + g.width - 4,py],[gx + g.width - 8,py + 17],[gx + 8,py + 17]], '#1c3555', '#54789a');
          ctx.fillStyle = '#7de1ed'; ctx.fillRect(g.x - 2, py + 5, 4, 7);
        }
      }
      ctx.restore();

      // Floating Cosmic Energy Star in gap
      if (!g.starCollected) {
        ctx.save();
        ctx.translate(g.x, g.gapY);
        ctx.rotate(g.angle);
        ctx.fillStyle = '#f59e0b';
        drawStar(ctx, 0, 0, 11);
        ctx.restore();
      }
    }

    // 4. Render Probe Thruster Particles
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

    // 5. Space Probe Ship
    ctx.save();
    ctx.translate(this.probeX, this.probeY);
    ctx.rotate(this.probeRotation);

    drawShip(ctx, 0, 0, this.probeRadius * 1.05, 'probe', this.hoverTimer);
    ctx.restore();

    // Tap to thrust prompt before game begins
    if (!this.hasStarted) {
      ctx.save();
      ctx.font = 'bold 16px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 10;
      const bounce = Math.sin(this.hoverTimer * 4) * 4;
      ctx.fillText('TAP TO THRUST', rect.width / 2, this.probeY + 50 + bounce);
      ctx.restore();
    }

    ctx.restore(); // restore screen shake
  }
}
