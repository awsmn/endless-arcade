import { GameEngine, GameMode, GameScoreUpdate } from '../../types/game';
import { sounds } from '../../engine/audio';
import { haptics } from '../../engine/haptics';

type RowType = 'grass' | 'road' | 'rail' | 'river';

interface Vehicle {
  x: number;
  width: number;
  speed: number; // positive = right, negative = left
  color: string;
}

interface Log {
  x: number;
  width: number;
  speed: number;
}

interface Coin {
  col: number;
  collected: boolean;
}

interface LaneRow {
  index: number;
  type: RowType;
  vehicles: Vehicle[];
  logs: Log[];
  coins: Coin[];
  trainWarningTimer?: number;
  trainActive?: boolean;
  trainX?: number;
  trainSpeed?: number;
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

const GRID_COLS = 9;
const TILE_SIZE = 48;

export class CrossyLaneEngine implements GameEngine {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private container!: HTMLElement;

  // Hopper Player State
  private playerCol = 4;
  private playerRow = 0;
  private maxRowReached = 0;
  private hopProgress = 1; // 0 to 1 during hop interpolation
  private prevCol = 4;
  private prevRow = 0;

  // Camera
  private cameraY = 0;

  // World Generation
  private rows: LaneRow[] = [];
  private nextRowIndex = 0;

  // Idle timer
  private idleTime = 0;
  private maxIdleTime = 8.5;

  // Particles & Game State
  private particles: Particle[] = [];
  private score = 0;
  private isRunning = false;
  private isPaused = false;
  private isGameOver = false;
  private gameOverTimer: ReturnType<typeof setTimeout> | null = null;

  private lastTime = 0;
  private animationFrameId = 0;

  public onScoreUpdate?: (update: GameScoreUpdate) => void;
  public onGameOver?: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;

  public init(canvas: HTMLCanvasElement, container: HTMLElement) {
    this.canvas = canvas;
    this.container = container;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not acquire 2D context');
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
  }

  public start(_mode: GameMode, _level?: number) {
    this.score = 0;
    this.playerCol = 4;
    this.playerRow = 0;
    this.prevCol = 4;
    this.prevRow = 0;
    this.maxRowReached = 0;
    this.hopProgress = 1;
    this.idleTime = 0;
    this.rows = [];
    this.nextRowIndex = 0;
    this.particles = [];
    this.isGameOver = false;
    this.isPaused = false;
    this.isRunning = true;

    // Generate starting lanes
    for (let r = 0; r < 20; r++) {
      this.generateLane(r < 4 ? 'grass' : undefined);
    }

    this.cameraY = this.playerRow * TILE_SIZE;
    this.lastTime = performance.now();
    this.loop();
  }

  private generateLane(forcedType?: RowType) {
    const index = this.nextRowIndex++;
    let type: RowType = forcedType || 'grass';

    if (!forcedType) {
      const rand = Math.random();
      if (rand < 0.45) type = 'road';
      else if (rand < 0.70) type = 'river';
      else if (rand < 0.85) type = 'rail';
      else type = 'grass';
    }

    const row: LaneRow = {
      index,
      type,
      vehicles: [],
      logs: [],
      coins: []
    };

    const rect = this.container.getBoundingClientRect();
    const worldWidth = Math.max(rect.width, GRID_COLS * TILE_SIZE);

    if (type === 'road') {
      const speed = (60 + Math.random() * 80) * (Math.random() > 0.5 ? 1 : -1);
      const vehicleColors = ['#FF2A85', '#FFE500', '#00F0FF', '#FF5500', '#ffffff'];
      const count = 2 + Math.floor(Math.random() * 2);
      const spacing = worldWidth / count;

      for (let i = 0; i < count; i++) {
        row.vehicles.push({
          x: i * spacing + Math.random() * 40,
          width: 52 + Math.random() * 30,
          speed,
          color: vehicleColors[Math.floor(Math.random() * vehicleColors.length)]
        });
      }
    } else if (type === 'river') {
      const speed = (45 + Math.random() * 40) * (Math.random() > 0.5 ? 1 : -1);
      const count = 2 + Math.floor(Math.random() * 2);
      const spacing = worldWidth / count;

      for (let i = 0; i < count; i++) {
        row.logs.push({
          x: i * spacing + Math.random() * 30,
          width: 75 + Math.random() * 30,
          speed
        });
      }
    } else if (type === 'rail') {
      row.trainWarningTimer = 2.5 + Math.random() * 4;
      row.trainActive = false;
      row.trainX = -600;
      row.trainSpeed = 700;
    } else if (type === 'grass') {
      // Chance of coin
      if (Math.random() < 0.4) {
        row.coins.push({
          col: Math.floor(Math.random() * GRID_COLS),
          collected: false
        });
      }
    }

    this.rows.push(row);
  }

  public hop(direction: 'up' | 'down' | 'left' | 'right') {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;

    this.prevCol = this.playerCol;
    this.prevRow = this.playerRow;
    this.hopProgress = 0;
    this.idleTime = 0;

    const baseCol = Math.round(this.playerCol);

    if (direction === 'up') {
      this.playerRow++;
      this.playerCol = baseCol;
      sounds.playTap();
      haptics.tap();

      if (this.playerRow > this.maxRowReached) {
        this.maxRowReached = this.playerRow;
        this.score = this.maxRowReached;
        this.onScoreUpdate?.({ score: this.score });
      }
    } else if (direction === 'down') {
      if (this.playerRow > 0 && this.playerRow > this.maxRowReached - 3) {
        this.playerRow--;
        this.playerCol = baseCol;
        sounds.playTap();
      }
    } else if (direction === 'left') {
      if (baseCol > 0) {
        this.playerCol = baseCol - 1;
        sounds.playTap();
      }
    } else if (direction === 'right') {
      if (baseCol < GRID_COLS - 1) {
        this.playerCol = baseCol + 1;
        sounds.playTap();
      }
    }

    // Check coin collection with rounded column
    const currentRow = this.rows.find(r => r.index === this.playerRow);
    if (currentRow) {
      for (const coin of currentRow.coins) {
        if (!coin.collected && coin.col === Math.round(this.playerCol)) {
          coin.collected = true;
          this.score += 5;
          sounds.playCollect(1.4);
          haptics.bump();
          this.onScoreUpdate?.({ score: this.score });
        }
      }
    }
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
    if (this.gameOverTimer) {
      clearTimeout(this.gameOverTimer);
      this.gameOverTimer = null;
    }
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
    if (this.isGameOver) {
      this.updateParticles(dt);
      return;
    }

    const rect = this.container.getBoundingClientRect();
    const worldWidth = rect.width;

    // Hop animation interpolation
    if (this.hopProgress < 1) {
      this.hopProgress = Math.min(1, this.hopProgress + dt * 10);
    }

    // Idle timer
    this.idleTime += dt;
    if (this.idleTime >= this.maxIdleTime) {
      this.triggerGameOver('Swooped away by eagle!');
      return;
    }

    // Update Vehicles & Rivers & Trains
    for (const row of this.rows) {
      if (row.type === 'road') {
        for (const v of row.vehicles) {
          v.x += v.speed * dt;
          if (v.speed > 0 && v.x > worldWidth + 50) v.x = -v.width - 20;
          if (v.speed < 0 && v.x < -v.width - 50) v.x = worldWidth + 20;
        }
      } else if (row.type === 'river') {
        for (const log of row.logs) {
          log.x += log.speed * dt;
          if (log.speed > 0 && log.x > worldWidth + 50) log.x = -log.width - 20;
          if (log.speed < 0 && log.x < -log.width - 50) log.x = worldWidth + 20;
        }
      } else if (row.type === 'rail') {
        if (row.trainWarningTimer !== undefined) {
          row.trainWarningTimer -= dt;
          if (row.trainWarningTimer <= 0) {
            row.trainActive = true;
            row.trainX = (row.trainX || -600) + (row.trainSpeed || 700) * dt;
            if (row.trainX > worldWidth + 700) {
              row.trainActive = false;
              row.trainX = -600;
              row.trainWarningTimer = 3 + Math.random() * 4;
            }
          }
        }
      }
    }

    // Check Player Collision
    const curCol = this.prevCol + (this.playerCol - this.prevCol) * this.hopProgress;
    const currentRow = this.rows.find(r => r.index === this.playerRow);
    const colWidth = rect.width / GRID_COLS;
    const playerX = curCol * colWidth + colWidth / 2;

    if (currentRow) {
      if (currentRow.type === 'road') {
        for (const v of currentRow.vehicles) {
          if (playerX + colWidth * 0.3 > v.x && playerX - colWidth * 0.3 < v.x + v.width) {
            this.triggerGameOver('Hit by traffic!');
            return;
          }
        }
      } else if (currentRow.type === 'rail' && currentRow.trainActive) {
        if (playerX > (currentRow.trainX || 0) && playerX < (currentRow.trainX || 0) + 550) {
          this.triggerGameOver('Hit by express train!');
          return;
        }
      } else if (currentRow.type === 'river') {
        // Player must be on a log
        let onLog = false;
        for (const log of currentRow.logs) {
          if (playerX > log.x && playerX < log.x + log.width) {
            onLog = true;
            // Drifts with the log!
            const colShift = (log.speed * dt) / colWidth;
            this.playerCol += colShift;
            this.prevCol += colShift;
            // Lessen idle pressure while actively riding a log
            this.idleTime = Math.max(0, this.idleTime - dt * 0.5);
            break;
          }
        }
        if (!onLog && this.hopProgress >= 0.8) {
          this.triggerGameOver('Fell in the river!');
          return;
        }
        // Check if drifted out of bounds
        if (playerX < -20 || playerX > rect.width + 20) {
          this.triggerGameOver('Swept off-screen by river!');
          return;
        }
      }
    }

    // Camera smoothly tracks player Y
    const targetCameraY = this.playerRow * TILE_SIZE;
    this.cameraY += (targetCameraY - this.cameraY) * Math.min(1, dt * 6);

    // Generate new rows ahead
    const highestRow = this.rows[this.rows.length - 1];
    if (highestRow && highestRow.index < this.playerRow + 18) {
      this.generateLane();
    }

    // Clean up rows far behind camera to prevent memory leak
    while (this.rows.length > 0 && this.rows[0].index < this.playerRow - 10) {
      this.rows.shift();
    }

    // Update Particles
    this.updateParticles(dt);
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
    }
  }

  private triggerGameOver(_reason: string) {
    this.isGameOver = true;
    sounds.playHit();
    sounds.playGameOver();
    haptics.failure();

    const rect = this.container.getBoundingClientRect();
    const px = this.playerCol * (rect.width / GRID_COLS) + (rect.width / GRID_COLS) / 2;
    const py = rect.height * 0.65 - (this.playerRow * TILE_SIZE - this.cameraY);
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 200;
      this.particles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#FF1E44',
        radius: 3 + Math.random() * 3,
        life: 0,
        maxLife: 0.5
      });
    }

    const stars = this.score >= 100 ? 3 : this.score >= 50 ? 2 : this.score >= 20 ? 1 : 0;
    this.gameOverTimer = setTimeout(() => {
      this.onGameOver?.(this.score, false, stars);
    }, 650);
  }

  private render() {
    const rect = this.container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const colWidth = width / GRID_COLS;

    this.ctx.clearRect(0, 0, width, height);

    // Camera offset: Player sits roughly at height * 0.65
    const playerScreenBaseY = height * 0.65;

    // Draw Rows
    for (const row of this.rows) {
      const rowScreenY = playerScreenBaseY - (row.index * TILE_SIZE - this.cameraY);
      if (rowScreenY < -TILE_SIZE || rowScreenY > height + TILE_SIZE) continue;

      // Draw Row Background
      if (row.type === 'grass') {
        this.ctx.fillStyle = row.index % 2 === 0 ? '#10b981' : '#059669';
        this.ctx.fillRect(0, rowScreenY - TILE_SIZE / 2, width, TILE_SIZE);
      } else if (row.type === 'road') {
        this.ctx.fillStyle = '#1e293b';
        this.ctx.fillRect(0, rowScreenY - TILE_SIZE / 2, width, TILE_SIZE);

        // Dashed lane line
        this.ctx.strokeStyle = '#ffffff40';
        this.ctx.setLineDash([12, 12]);
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, rowScreenY);
        this.ctx.lineTo(width, rowScreenY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      } else if (row.type === 'river') {
        this.ctx.fillStyle = '#0284c7';
        this.ctx.fillRect(0, rowScreenY - TILE_SIZE / 2, width, TILE_SIZE);
      } else if (row.type === 'rail') {
        this.ctx.fillStyle = '#334155';
        this.ctx.fillRect(0, rowScreenY - TILE_SIZE / 2, width, TILE_SIZE);

        // Railway tracks
        this.ctx.strokeStyle = '#94a3b8';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(0, rowScreenY - 8);
        this.ctx.lineTo(width, rowScreenY - 8);
        this.ctx.moveTo(0, rowScreenY + 8);
        this.ctx.lineTo(width, rowScreenY + 8);
        this.ctx.stroke();

        // Warning signal light
        if (row.trainWarningTimer !== undefined && row.trainWarningTimer < 1.8) {
          const blink = Math.floor(Date.now() / 150) % 2 === 0;
          this.ctx.fillStyle = blink ? '#FF1E44' : '#64748b';
          this.ctx.beginPath();
          this.ctx.arc(20, rowScreenY, 7, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.strokeStyle = '#000000';
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
        }
      }

      // Top & Bottom border lines for each lane
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(0, rowScreenY - TILE_SIZE / 2, width, TILE_SIZE);

      // Draw Coins on Grass
      for (const coin of row.coins) {
        if (!coin.collected) {
          const cx = coin.col * colWidth + colWidth / 2;
          this.ctx.fillStyle = '#FFE500';
          this.ctx.beginPath();
          this.ctx.arc(cx, rowScreenY, 8, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.strokeStyle = '#000000';
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
        }
      }

      // Draw Logs on River
      for (const log of row.logs) {
        this.ctx.fillStyle = '#854d0e';
        this.ctx.beginPath();
        this.ctx.roundRect(log.x, rowScreenY - 14, log.width, 28, 8);
        this.ctx.fill();
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }

      // Draw Vehicles on Road
      for (const v of row.vehicles) {
        this.ctx.fillStyle = v.color;
        this.ctx.beginPath();
        this.ctx.roundRect(v.x, rowScreenY - 14, v.width, 28, 6);
        this.ctx.fill();
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Windshield
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(v.speed > 0 ? v.x + v.width - 12 : v.x + 4, rowScreenY - 10, 8, 20);
      }

      // Draw Train on Rail
      if (row.type === 'rail' && row.trainActive && row.trainX !== undefined) {
        this.ctx.fillStyle = '#e11d48';
        this.ctx.beginPath();
        this.ctx.roundRect(row.trainX, rowScreenY - 18, 550, 36, 12);
        this.ctx.fill();
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2.5;
        this.ctx.stroke();
      }
    }

    // Render Hopper Player with Hop Arc Animation
    if (!this.isGameOver) {
      const curCol = this.prevCol + (this.playerCol - this.prevCol) * this.hopProgress;
      const curRow = this.prevRow + (this.playerRow - this.prevRow) * this.hopProgress;

      const px = curCol * colWidth + colWidth / 2;
      const py = playerScreenBaseY - (curRow * TILE_SIZE - this.cameraY);

      // Hop arc jump height (sin curve)
      const jumpHeight = Math.sin(this.hopProgress * Math.PI) * 14;

      // Drop shadow on ground
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      this.ctx.beginPath();
      this.ctx.ellipse(px, py + 8, 12, 6, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Bunny / Hopper Body
      this.ctx.save();
      this.ctx.translate(px, py - jumpHeight);

      this.ctx.fillStyle = '#FFE500';
      this.ctx.beginPath();
      this.ctx.roundRect(-14, -14, 28, 28, 8);
      this.ctx.fill();
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 2.5;
      this.ctx.stroke();

      // Eyes
      this.ctx.fillStyle = '#000000';
      this.ctx.beginPath();
      this.ctx.arc(-5, -4, 3, 0, Math.PI * 2);
      this.ctx.arc(5, -4, 3, 0, Math.PI * 2);
      this.ctx.fill();

      // Cheeks
      this.ctx.fillStyle = '#FF2A85';
      this.ctx.beginPath();
      this.ctx.arc(-8, 3, 2.5, 0, Math.PI * 2);
      this.ctx.arc(8, 3, 2.5, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    }

    // Render Particles
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }
  }
}
