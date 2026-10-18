import { GameEngine, GameMode, GameScoreUpdate } from '../../types/game';
import { sounds } from '../../engine/audio';
import { haptics } from '../../engine/haptics';

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
}

interface Brick {
  col: number;
  row: number;
  hp: number;
  maxHp: number;
  isBonusBall?: boolean;
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

export class BrickBreakerEngine implements GameEngine {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private container!: HTMLElement;

  // Arena geometry
  private arenaX = 20;
  private arenaY = 70;
  private arenaWidth = 320;
  private arenaHeight = 480;

  private cols = 7;
  private cellWidth = 40;
  private cellHeight = 35;
  private ballRadius = 5.5;

  // Game state
  private bricks: Brick[] = [];
  private balls: Ball[] = [];
  private totalBalls = 15;
  private ballsToLaunch = 0;
  private launchInterval = 45; // ms between ball spawns
  private lastLaunchTime = 0;

  private launchX = 180;
  private launchY = 500;
  private nextLaunchX = 180;
  private firstBallReturned = false;
  private volleyStartTime = 0;

  public isAiming = false;
  public aimAngle = -Math.PI / 2;
  public isShooting = false;
  public speedMultiplier = 1;

  private score = 0;
  private turn = 1;
  private isRunning = false;
  private isPaused = false;
  private isGameOver = false;

  private particles: Particle[] = [];
  private lastTime = 0;
  private animationFrameId = 0;

  public onScoreUpdate?: (update: GameScoreUpdate) => void;
  public onGameOver?: (finalScore: number, isNewHighScore: boolean) => void;
  public onStateChange?: (isShooting: boolean, ballsRemaining: number, totalBalls: number) => void;

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

    const padX = 16;
    this.arenaWidth = Math.min(rect.width - padX * 2, 380);
    const topPad = 70;
    const bottomPad = 60;
    this.arenaHeight = Math.min(rect.height - topPad - bottomPad, 520);
    this.arenaX = Math.floor((rect.width - this.arenaWidth) / 2);
    this.arenaY = topPad;

    this.cellWidth = Math.floor(this.arenaWidth / this.cols);
    this.cellHeight = 36;

    this.launchX = this.arenaX + this.arenaWidth / 2;
    this.launchY = this.arenaY + this.arenaHeight - 8;
    this.nextLaunchX = this.launchX;
  }

  public start(_mode: GameMode = 'endless', _level = 1) {
    this.bricks = [];
    this.balls = [];
    this.particles = [];
    this.totalBalls = 20;
    this.turn = 1;
    this.score = 0;
    this.isShooting = false;
    this.isAiming = false;
    this.speedMultiplier = 1;
    this.isRunning = true;
    this.isPaused = false;
    this.isGameOver = false;

    this.spawnRow();
    this.onStateChange?.(false, this.totalBalls, this.totalBalls);
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

  public setAim(targetX: number, targetY: number) {
    if (this.isShooting || this.isPaused || this.isGameOver) return;
    const dx = targetX - this.launchX;
    const dy = targetY - this.launchY;
    if (dy >= -10) return; // Cannot shoot horizontally or downwards

    this.aimAngle = Math.atan2(dy, dx);
    this.isAiming = true;
  }

  public fire() {
    if (this.isShooting || this.isPaused || this.isGameOver || !this.isAiming) return;
    this.isAiming = false;
    this.isShooting = true;
    this.speedMultiplier = 1;

    this.ballsToLaunch = this.totalBalls;
    this.balls = [];
    this.firstBallReturned = false;
    this.lastLaunchTime = performance.now();
    this.volleyStartTime = performance.now();

    sounds.playTap();
    this.onStateChange?.(true, this.ballsToLaunch, this.totalBalls);
  }

  public toggleFastForward() {
    this.speedMultiplier = this.speedMultiplier === 1 ? 2.5 : 1;
  }

  private spawnRow() {
    // Generate new row of bricks at row = 0
    let bonusSpawned = false;
    const numBricks = 2 + Math.floor(Math.random() * 4);
    const availableCols = Array.from({ length: this.cols }, (_, i) => i);
    // Shuffle
    availableCols.sort(() => Math.random() - 0.5);

    for (let i = 0; i < numBricks; i++) {
      const col = availableCols[i];
      if (!bonusSpawned && Math.random() < 0.4) {
        this.bricks.push({
          col,
          row: 0,
          hp: 1,
          maxHp: 1,
          isBonusBall: true
        });
        bonusSpawned = true;
      } else {
        const hp = Math.max(1, Math.round(this.turn * (0.8 + Math.random() * 0.6)));
        this.bricks.push({
          col,
          row: 0,
          hp,
          maxHp: hp
        });
      }
    }
  }

  private loop = () => {
    if (!this.isRunning) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (!this.isPaused && !this.isGameOver) {
      this.update(dt * this.speedMultiplier);
    }

    this.render();
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    const ballSpeed = 680; // px/s

    // Watchdog for endless volley / stuck balls
    if (this.isShooting) {
      const elapsed = performance.now() - this.volleyStartTime;
      if (elapsed > 15000 && this.speedMultiplier === 1) {
        this.speedMultiplier = 2.5;
      }
      if (elapsed > 24000) {
        // Emergency turn recall
        for (const b of this.balls) {
          b.active = false;
        }
      }
    }

    // Ball streaming launcher
    if (this.isShooting && this.ballsToLaunch > 0) {
      const now = performance.now();
      if (now - this.lastLaunchTime >= this.launchInterval / this.speedMultiplier) {
        this.lastLaunchTime = now;
        this.ballsToLaunch--;
        this.balls.push({
          x: this.launchX,
          y: this.launchY,
          vx: Math.cos(this.aimAngle) * ballSpeed,
          vy: Math.sin(this.aimAngle) * ballSpeed,
          active: true
        });
      }
    }

    // Substep ball physics
    const subSteps = 3;
    const sDt = dt / subSteps;

    for (let step = 0; step < subSteps; step++) {
      for (const b of this.balls) {
        if (!b.active) continue;

        b.x += b.vx * sDt;
        b.y += b.vy * sDt;

        // Arena boundaries
        const left = this.arenaX + this.ballRadius;
        const right = this.arenaX + this.arenaWidth - this.ballRadius;
        const top = this.arenaY + this.ballRadius;
        const bottom = this.arenaY + this.arenaHeight - this.ballRadius;

        if (b.x <= left) {
          b.x = left;
          b.vx = Math.abs(b.vx);
          if (Math.abs(b.vy) < 25) b.vy += b.vy >= 0 ? 35 : -35;
          sounds.playBounce();
        } else if (b.x >= right) {
          b.x = right;
          b.vx = -Math.abs(b.vx);
          if (Math.abs(b.vy) < 25) b.vy += b.vy >= 0 ? 35 : -35;
          sounds.playBounce();
        }

        if (b.y <= top) {
          b.y = top;
          b.vy = Math.abs(b.vy);
          sounds.playBounce();
        } else if (b.y >= bottom) {
          // Ball hit the floor
          b.active = false;
          if (!this.firstBallReturned) {
            this.firstBallReturned = true;
            this.nextLaunchX = Math.max(left + 10, Math.min(right - 10, b.x));
          }
        }

        // Brick collisions
        for (let i = this.bricks.length - 1; i >= 0; i--) {
          const brick = this.bricks[i];
          const bx = this.arenaX + brick.col * this.cellWidth + 2;
          const by = this.arenaY + brick.row * this.cellHeight + 2;
          const bw = this.cellWidth - 4;
          const bh = this.cellHeight - 4;

          // Check circle vs AABB
          const nearestX = Math.max(bx, Math.min(b.x, bx + bw));
          const nearestY = Math.max(by, Math.min(b.y, by + bh));
          const dx = b.x - nearestX;
          const dy = b.y - nearestY;

          if (dx * dx + dy * dy < this.ballRadius * this.ballRadius) {
            if (brick.isBonusBall) {
              // Collected bonus ball
              this.totalBalls++;
              sounds.playCollect();
              haptics.tap();
              this.spawnParticles(bx + bw / 2, by + bh / 2, '#38bdf8', 8);
              this.bricks.splice(i, 1);
            } else {
              // Hit brick
              brick.hp--;
              sounds.playHit();

              // Reflect ball velocity
              if (Math.abs(dx) > Math.abs(dy)) {
                b.vx = -b.vx;
              } else {
                b.vy = -b.vy;
              }

              if (brick.hp <= 0) {
                this.score += brick.maxHp;
                this.onScoreUpdate?.({ score: this.score });
                sounds.playCombo(Math.min(10, Math.floor(this.turn / 2)));
                haptics.impact();
                this.spawnParticles(bx + bw / 2, by + bh / 2, this.getBrickColor(brick.maxHp), 10);
                this.bricks.splice(i, 1);
              }
            }
            break;
          }
        }
      }
    }

    // Check if turn is complete (all balls launched & returned)
    if (this.isShooting && this.ballsToLaunch === 0) {
      const activeCount = this.balls.filter(b => b.active).length;
      if (activeCount === 0) {
        this.endTurn();
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
  }

  private endTurn() {
    this.isShooting = false;
    this.launchX = this.nextLaunchX;
    this.turn++;

    // Descend all bricks
    let hitBottom = false;
    for (const b of this.bricks) {
      b.row++;
      const brickBottomY = this.arenaY + (b.row + 1) * this.cellHeight;
      if (brickBottomY >= this.launchY - 10) {
        hitBottom = true;
      }
    }

    if (hitBottom) {
      this.isGameOver = true;
      sounds.playGameOver();
      haptics.gameOver();
      this.onGameOver?.(this.score, false);
      return;
    }

    this.spawnRow();
    this.onStateChange?.(false, this.totalBalls, this.totalBalls);
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

  private getBrickColor(hp: number): string {
    const ratio = Math.min(1, hp / 25);
    if (ratio < 0.25) return '#60a5fa'; // Blue
    if (ratio < 0.5) return '#34d399';  // Emerald
    if (ratio < 0.75) return '#f59e0b'; // Amber
    return '#f43f5e';                   // Rose / Red
  }

  private render() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const rect = this.container.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);

    // Arena background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(this.arenaX, this.arenaY, this.arenaWidth, this.arenaHeight);

    // Arena boundary
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(this.arenaX, this.arenaY, this.arenaWidth, this.arenaHeight);

    // Ground line
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(this.arenaX, this.launchY);
    ctx.lineTo(this.arenaX + this.arenaWidth, this.launchY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Bricks
    for (const brick of this.bricks) {
      const bx = this.arenaX + brick.col * this.cellWidth + 2;
      const by = this.arenaY + brick.row * this.cellHeight + 2;
      const bw = this.cellWidth - 4;
      const bh = this.cellHeight - 4;

      if (brick.isBonusBall) {
        // Glowing bonus '+' orb
        ctx.save();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.beginPath();
        ctx.arc(bx + bw / 2, by + bh / 2, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 16px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', bx + bw / 2, by + bh / 2);
        ctx.restore();
      } else {
        // Numbered Brick
        ctx.save();
        const color = this.getBrickColor(brick.hp);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 6);
        ctx.fill();

        // Inner shadow
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // HP number
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(brick.hp.toString(), bx + bw / 2, by + bh / 2);
        ctx.restore();
      }
    }

    // Aiming trajectory laser line
    if (this.isAiming && !this.isShooting) {
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#a5b4fc';
      ctx.moveTo(this.launchX, this.launchY);

      // Cast ray forward
      const maxDist = 340;
      const targetX = this.launchX + Math.cos(this.aimAngle) * maxDist;
      const targetY = this.launchY + Math.sin(this.aimAngle) * maxDist;
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
      ctx.restore();
    }

    // Launch Base marker
    ctx.save();
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.arc(this.launchX, this.launchY, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`x${this.totalBalls}`, this.launchX, this.launchY + 18);
    ctx.restore();

    // Active Balls
    ctx.fillStyle = '#ffffff';
    for (const b of this.balls) {
      if (!b.active) continue;
      ctx.beginPath();
      ctx.arc(b.x, b.y, this.ballRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Particles
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
  }
}
