import { getDifficulty } from '../../engine/difficulty';
import { GameEngine, GameMode, GameScoreUpdate } from '../../types/game';
import { sounds } from '../../engine/audio';
import { haptics } from '../../engine/haptics';

interface Point {
  x: number;
  y: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
}

interface BonusFood extends Point {
  timer: number;
  maxTimer: number;
  points: number;
}

export class NeonSnakeEngine implements GameEngine {
  private viewport = { width: 0, height: 0 };
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private container!: HTMLElement;

  // Grid dimensions
  private gridWidth = 20;
  private gridHeight = 20;
  private cellSize = 20;
  private offsetX = 0;
  private offsetY = 0;

  // Game state
  private snake: Point[] = [];
  private direction: Point = { x: 1, y: 0 };
  private inputQueue: Point[] = [];
  private food: Point = { x: 10, y: 10 };
  private bonusFood: BonusFood | null = null;
  private score = 0;
  private mode: GameMode = 'endless';
  private level = 1;
  private isRunning = false;
  private isPaused = false;
  private isGameOver = false;
  private hasStarted = false;

  // Timing & Speed
  private lastTick = 0;
  private readonly pace = getDifficulty().pace;
  private tickInterval = 175; // ms per step (fair starting speed)
  private minInterval = 75;   // top speed limit
  private animationFrameId = 0;
  private gameOverTimer: ReturnType<typeof setTimeout> | null = null;

  // Visual effects
  private particles: Particle[] = [];
  private screenShake = 0;

  // Callbacks
  public onScoreUpdate?: (update: GameScoreUpdate) => void;
  public onGameOver?: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;

  public init(canvas: HTMLCanvasElement, container: HTMLElement) {
    this.canvas = canvas;
    this.container = container;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context');
    this.ctx = ctx;

    this.resize();
    this.render();
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

    // Compute square grid centered between top HUD and bottom
    const topPad = 64;
    const bottomPad = 20;
    const availableWidth = rect.width - 24;
    const availableHeight = Math.max(160, rect.height - topPad - bottomPad);
    const availableSize = Math.min(availableWidth, availableHeight);

    this.gridWidth = 20;
    this.gridHeight = 20;
    this.cellSize = Math.floor(availableSize / this.gridWidth);

    const totalGridPixelWidth = this.gridWidth * this.cellSize;
    const totalGridPixelHeight = this.gridHeight * this.cellSize;

    this.offsetX = Math.floor((rect.width - totalGridPixelWidth) / 2);
    this.offsetY = topPad + Math.floor((availableHeight - totalGridPixelHeight) / 2);
  }

  public start(mode: GameMode = 'endless', level = 1) {
    this.mode = mode;
    this.level = level;
    this.score = 0;
    this.isGameOver = false;
    this.hasStarted = false;
    this.isPaused = false;
    this.isRunning = true;
    this.particles = [];
    this.screenShake = 0;
    this.bonusFood = null;

    // Reset snake
    const startX = 6;
    const startY = 10;
    this.snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY }
    ];
    this.direction = { x: 1, y: 0 };
    this.inputQueue = [];

    this.tickInterval = Math.max(this.minInterval, (175 - (level - 1) * 5) / this.pace);
    this.spawnFood();

    this.onScoreUpdate?.({ score: this.score, level: this.level });

    this.lastTick = performance.now();
    cancelAnimationFrame(this.animationFrameId);
    if (this.gameOverTimer) clearTimeout(this.gameOverTimer);
    this.loop(performance.now());
  }

  public setDirection(x: number, y: number) {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;
    if (Math.abs(x) + Math.abs(y) !== 1) return;
    
    // Compare against the latest intended direction (queued or current)
    const last = this.inputQueue.length > 0 ? this.inputQueue[this.inputQueue.length - 1] : this.direction;
    // Prevent 180-degree reversal
    if (last.x + x === 0 && last.y + y === 0) return;
    if (!this.hasStarted) {
      this.hasStarted = true;
      this.lastTick = performance.now();
    }
    // Prevent duplicate commands
    if (last.x === x && last.y === y) return;

    if (this.inputQueue.length < 2) {
      this.inputQueue.push({ x, y });
    }
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this.lastTick = performance.now();
    }
  }

  public destroy() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
    if (this.gameOverTimer) {
      clearTimeout(this.gameOverTimer);
      this.gameOverTimer = null;
    }
  }

  private loop = (timestamp: number) => {
    if (!this.isRunning) return;
    if (this.isPaused) {
      this.animationFrameId = requestAnimationFrame(this.loop);
      return;
    }

    if (!this.isPaused && !this.isGameOver && this.hasStarted) {
      // Logic tick
      if (timestamp - this.lastTick >= this.tickInterval) {
        this.step();
        this.lastTick = timestamp;
      }
    }

    // Update particle physics
    this.updateParticles();

    // Render frame
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private step() {
    if (this.inputQueue.length > 0) {
      this.direction = this.inputQueue.shift()!;
    }
    const head = { ...this.snake[0] };
    head.x += this.direction.x;
    head.y += this.direction.y;

    // Wall collision check
    if (head.x < 0 || head.x >= this.gridWidth || head.y < 0 || head.y >= this.gridHeight) {
      this.triggerGameOver();
      return;
    }

    // A non-growing move may safely enter the cell the tail is leaving.
    const willGrow = (head.x === this.food.x && head.y === this.food.y) ||
      (this.bonusFood !== null && head.x === this.bonusFood.x && head.y === this.bonusFood.y);
    const collisionLength = this.snake.length - (willGrow ? 0 : 1);
    for (let i = 0; i < collisionLength; i++) {
      if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
        this.triggerGameOver();
        return;
      }
    }

    this.snake.unshift(head);

    // Food collision check
    let ateFood = false;
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      ateFood = true;
      sounds.playCollect();
      haptics.bump();
      this.spawnExplosion(head.x, head.y, '#10b981');
      this.spawnFood();

      // Speed up gradually (smooth, uniform progression)
      this.tickInterval = Math.max(this.minInterval / this.pace, this.tickInterval - 1.2);

      // Random chance to spawn bonus gold orb
      if (!this.bonusFood && Math.random() < 0.35) {
        this.spawnBonusFood();
      }
    }

    // Bonus food collision check
    if (this.bonusFood && head.x === this.bonusFood.x && head.y === this.bonusFood.y) {
      this.score += this.bonusFood.points;
      ateFood = true;
      sounds.playCombo(3);
      haptics.combo();
      this.spawnExplosion(head.x, head.y, '#f59e0b', 24);
      this.bonusFood = null;
    }

    if (!ateFood) {
      this.snake.pop();
    }

    // Update bonus timer
    if (this.bonusFood) {
      this.bonusFood.timer -= 1;
      if (this.bonusFood.timer <= 0) {
        this.bonusFood = null;
      }
    }

    if (ateFood) this.onScoreUpdate?.({ score: this.score, level: this.level });
  }

  private triggerGameOver() {
    this.isGameOver = true;
    this.screenShake = 15;
    sounds.playHit();
    haptics.impact();
    this.spawnExplosion(this.snake[0].x, this.snake[0].y, '#f43f5e', 30);

    const stars = this.score >= 200 ? 3 : this.score >= 100 ? 2 : this.score >= 40 ? 1 : 0;
    this.gameOverTimer = setTimeout(() => {
      this.onGameOver?.(this.score, false, stars);
    }, 400);
  }

  private spawnFood() {
    const occupied = new Set(this.snake.map(segment => segment.y * this.gridWidth + segment.x));
    const free: Point[] = [];
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (!occupied.has(y * this.gridWidth + x) && !(this.bonusFood?.x === x && this.bonusFood?.y === y)) free.push({ x, y });
      }
    }
    if (free.length === 0) {
      if (this.bonusFood) { this.food = { x: this.bonusFood.x, y: this.bonusFood.y }; this.bonusFood = null; }
      else this.triggerGameOver();
      return;
    }
    this.food = free[Math.floor(Math.random() * free.length)];
  }

  private spawnBonusFood() {
    let valid = false;
    let newBonus: Point = { x: 0, y: 0 };
    let attempts = 0;
    while (!valid && attempts < 50) {
      attempts++;
      newBonus = {
        x: Math.floor(Math.random() * this.gridWidth),
        y: Math.floor(Math.random() * this.gridHeight)
      };
      const onSnake = this.snake.some(s => s.x === newBonus.x && s.y === newBonus.y);
      const onFood = this.food.x === newBonus.x && this.food.y === newBonus.y;
      valid = !onSnake && !onFood;
    }
    if (valid) {
      this.bonusFood = {
        x: newBonus.x,
        y: newBonus.y,
        timer: 45, // ticks
        maxTimer: 45,
        points: 50
      };
    }
  }

  private spawnExplosion(gridX: number, gridY: number, color: string, count = 16) {
    const px = this.offsetX + gridX * this.cellSize + this.cellSize / 2;
    const py = this.offsetY + gridY * this.cellSize + this.cellSize / 2;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = 1.5 + Math.random() * 3.5;
      this.particles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3,
        color,
        alpha: 1,
        life: 1
      });
    }
  }

  private updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= 0.04;
      p.alpha = Math.max(0, p.life);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.screenShake > 0) {
      this.screenShake *= 0.85;
      if (this.screenShake < 0.5) this.screenShake = 0;
    }
  }

  private render() {
    const rect = this.viewport;
    this.ctx.save();
    this.ctx.clearRect(0, 0, rect.width, rect.height);

    // Screen shake transform
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      this.ctx.translate(sx, sy);
    }

    const gridPixelW = this.gridWidth * this.cellSize;
    const gridPixelH = this.gridHeight * this.cellSize;

    const isLight = typeof document !== 'undefined' && document.documentElement.classList.contains('light');

    // 1. Draw Grid Arena Background
    this.ctx.fillStyle = isLight ? '#e8ecf4' : '#0f172a';
    this.ctx.strokeStyle = isLight ? '#cbd5e1' : '#1e293b';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(this.offsetX, this.offsetY, gridPixelW, gridPixelH, 16);
    this.ctx.fill();
    this.ctx.stroke();

    // Subtle Grid Lines
    this.ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.03)';
    this.ctx.lineWidth = 1;
    for (let x = 1; x < this.gridWidth; x++) {
      const lineX = this.offsetX + x * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(lineX, this.offsetY);
      this.ctx.lineTo(lineX, this.offsetY + gridPixelH);
      this.ctx.stroke();
    }
    for (let y = 1; y < this.gridHeight; y++) {
      const lineY = this.offsetY + y * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(this.offsetX, lineY);
      this.ctx.lineTo(this.offsetX + gridPixelW, lineY);
      this.ctx.stroke();
    }

    // 2. Draw Food (Glowing Orb)
    const foodPx = this.offsetX + this.food.x * this.cellSize + this.cellSize / 2;
    const foodPy = this.offsetY + this.food.y * this.cellSize + this.cellSize / 2;
    const foodRadius = this.cellSize * 0.38;

    this.ctx.save();
    this.ctx.fillStyle = '#34d399';
    this.ctx.beginPath();
    this.ctx.arc(foodPx, foodPy, foodRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Inner bright core
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(foodPx - 2, foodPy - 2, foodRadius * 0.4, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    // 3. Draw Bonus Food (if active)
    if (this.bonusFood) {
      const bPx = this.offsetX + this.bonusFood.x * this.cellSize + this.cellSize / 2;
      const bPy = this.offsetY + this.bonusFood.y * this.cellSize + this.cellSize / 2;
      const bRadius = this.cellSize * 0.42;

      this.ctx.save();
      this.ctx.fillStyle = '#fbbf24';
      this.ctx.beginPath();
      this.ctx.arc(bPx, bPy, bRadius, 0, Math.PI * 2);
      this.ctx.fill();

      // Countdown ring around bonus food
      const ratio = this.bonusFood.timer / this.bonusFood.maxTimer;
      this.ctx.strokeStyle = '#f59e0b';
      this.ctx.lineWidth = 2.5;
      this.ctx.beginPath();
      this.ctx.arc(bPx, bPy, bRadius + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
      this.ctx.stroke();
      this.ctx.restore();
    }

    // 4. Draw Snake
    for (let i = this.snake.length - 1; i >= 0; i--) {
      const segment = this.snake[i];
      const sx = this.offsetX + segment.x * this.cellSize;
      const sy = this.offsetY + segment.y * this.cellSize;
      const pad = 1.5;

      this.ctx.save();
      if (i === 0) {
        // Snake Head
        this.ctx.fillStyle = '#9df2b6';
        this.ctx.beginPath();
        this.ctx.roundRect(sx + pad, sy + pad, this.cellSize - pad * 2, this.cellSize - pad * 2, 7);
        this.ctx.fill();

        // Eyes
        const eyeOffset = this.cellSize * 0.28;
        const eyeR = this.cellSize * 0.12;
        const centerX = sx + this.cellSize / 2;
        const centerY = sy + this.cellSize / 2;

        let eye1X = centerX - eyeOffset;
        let eye1Y = centerY - eyeOffset;
        let eye2X = centerX + eyeOffset;
        let eye2Y = centerY - eyeOffset;

        if (this.direction.y !== 0) {
          eye1X = centerX - eyeOffset;
          eye2X = centerX + eyeOffset;
          eye1Y = centerY + this.direction.y * eyeOffset;
          eye2Y = centerY + this.direction.y * eyeOffset;
        } else if (this.direction.x !== 0) {
          eye1X = centerX + this.direction.x * eyeOffset;
          eye2X = centerX + this.direction.x * eyeOffset;
          eye1Y = centerY - eyeOffset;
          eye2Y = centerY + eyeOffset;
        }

        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(eye1X, eye1Y, eyeR, 0, Math.PI * 2);
        this.ctx.arc(eye2X, eye2Y, eyeR, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#090d16';
        this.ctx.beginPath();
        this.ctx.arc(eye1X, eye1Y, eyeR * 0.5, 0, Math.PI * 2);
        this.ctx.arc(eye2X, eye2Y, eyeR * 0.5, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        // Snake Body segments with gradient along tail
        const progress = i / this.snake.length;
        this.ctx.fillStyle = progress < 0.5 ? '#47c996' : '#279b80';
        this.ctx.beginPath();
        this.ctx.roundRect(
          sx + pad,
          sy + pad,
          this.cellSize - pad * 2,
          this.cellSize - pad * 2,
          5
        );
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    // 5. Draw Particles
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    if (this.isRunning && !this.hasStarted) {
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.textAlign = 'center';
      this.ctx.font = '600 13px system-ui';
      this.ctx.fillText('Swipe or press a direction to start', rect.width / 2, this.offsetY - 16);
    }
    this.ctx.restore();
  }
}
