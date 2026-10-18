import { GameEngine, GameMode, GameScoreUpdate } from '../../types/game';
import { sounds } from '../../engine/audio';
import { haptics } from '../../engine/haptics';

export const CHROMA_COLORS = [
  { id: 0, name: 'Cyan', hex: '#06b6d4', glow: '#67e8f9' },
  { id: 1, name: 'Magenta', hex: '#f43f5e', glow: '#fda4af' },
  { id: 2, name: 'Yellow', hex: '#facc15', glow: '#fef08a' },
  { id: 3, name: 'Purple', hex: '#a855f7', glow: '#d8b4fe' }
];

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

type ObstacleType = 'circle' | 'cross' | 'double_circle';

interface ChromaObstacle {
  id: number;
  y: number; // world Y (ascends upwards, negative numbers or world height)
  type: ObstacleType;
  radius: number;
  angle: number;
  rotSpeed: number; // rad/s
  starCollected?: boolean;
  colorSwitcherCollected?: boolean;
}

export class ChromaJumpEngine implements GameEngine {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private container!: HTMLElement;

  // Ball state
  private ballX = 180;
  private ballY = 400; // world Y
  private ballVy = 0;
  private ballRadius = 11;
  public currentColorIndex = 0;

  // Physics constants
  private gravity = 880; // px/s^2
  private jumpForce = -330;

  // Camera tracking
  private cameraY = 400;

  // Obstacles
  private obstacles: ChromaObstacle[] = [];
  private nextObstacleId = 1;
  private nextObstacleWorldY = 220;
  private obstacleSpacing = 280;

  private particles: Particle[] = [];
  private score = 0;
  private isRunning = false;
  private isPaused = false;
  private isGameOver = false;
  private hasStarted = false;
  private hoverTimer = 0;
  private gameOverTimer: ReturnType<typeof setTimeout> | null = null;
  private screenShake = 0;

  private lastTime = 0;
  private animationFrameId = 0;

  public onScoreUpdate?: (update: GameScoreUpdate) => void;
  public onGameOver?: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
  public onColorChange?: (colorHex: string) => void;

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

    this.ballX = rect.width / 2;
  }

  public start(_mode: GameMode = 'endless', _level = 1) {
    if (this.gameOverTimer) {
      clearTimeout(this.gameOverTimer);
      this.gameOverTimer = null;
    }
    const rect = this.container.getBoundingClientRect();
    this.ballX = rect.width / 2;
    this.ballY = 400;
    this.ballVy = 0;
    this.hasStarted = false;
    this.hoverTimer = 0;
    this.cameraY = 400 - rect.height * 0.2;
    this.currentColorIndex = Math.floor(Math.random() * 4);
    this.obstacles = [];
    this.particles = [];
    this.score = 0;
    this.screenShake = 0;
    this.nextObstacleId = 1;
    this.nextObstacleWorldY = 220;

    // Spawn first few obstacles
    for (let i = 0; i < 4; i++) {
      this.spawnNextObstacle();
    }

    this.isRunning = true;
    this.isPaused = false;
    this.isGameOver = false;

    this.onScoreUpdate?.({ score: 0 });
    this.onColorChange?.(CHROMA_COLORS[this.currentColorIndex].hex);

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
    if (this.gameOverTimer) {
      clearTimeout(this.gameOverTimer);
      this.gameOverTimer = null;
    }
    cancelAnimationFrame(this.animationFrameId);
  }

  public jump() {
    if (this.isPaused || this.isGameOver) return;
    this.hasStarted = true;
    this.ballVy = this.jumpForce;
    sounds.playBounce();
    haptics.tap();

    // Spawn upward thrust ring particles
    const color = CHROMA_COLORS[this.currentColorIndex].hex;
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: this.ballX + (Math.random() - 0.5) * 12,
        y: this.ballY + this.ballRadius,
        vx: (Math.random() - 0.5) * 60,
        vy: 40 + Math.random() * 50,
        color,
        radius: 2 + Math.random() * 2,
        life: 0,
        maxLife: 0.3
      });
    }
  }

  private spawnNextObstacle() {
    let type: ObstacleType = 'circle';
    if (this.nextObstacleId > 2) {
      const types: ObstacleType[] = ['circle', 'cross', 'double_circle'];
      type = types[Math.floor(Math.random() * types.length)];
    }
    const dir = Math.random() < 0.5 ? 1 : -1;
    const baseSpeed = Math.min(1.5, 0.85 + Math.floor(this.score / 5) * 0.1);
    const rotSpeed = (baseSpeed + Math.random() * 0.25) * dir;
    const radius = type === 'double_circle' ? 95 : type === 'cross' ? 70 : 80;

    this.obstacles.push({
      id: this.nextObstacleId++,
      y: this.nextObstacleWorldY,
      type,
      radius,
      angle: Math.random() * Math.PI * 2,
      rotSpeed,
      starCollected: false,
      colorSwitcherCollected: false
    });

    this.nextObstacleWorldY -= this.obstacleSpacing;
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

    // Hover gracefully until player taps jump
    if (!this.hasStarted) {
      this.hoverTimer += dt;
      this.ballY = 400 + Math.sin(this.hoverTimer * 3.5) * 8;
      this.ballVy = 0;
      return;
    }

    // Apply gravity
    this.ballVy += this.gravity * dt;
    this.ballY += this.ballVy * dt;

    // Smooth camera tracking: keep ball around 60% of viewport
    const targetCameraY = this.ballY - rect.height * 0.2;
    if (targetCameraY < this.cameraY) {
      this.cameraY += (targetCameraY - this.cameraY) * 6 * dt;
    }

    // Death below bottom of screen
    if (this.ballY > this.cameraY + rect.height * 0.75) {
      this.handleGameOver();
      return;
    }

    // Obstacle rotation & dynamic spawning
    for (const obs of this.obstacles) {
      obs.angle += obs.rotSpeed * dt;

      // 1. Star Collection in center of obstacle
      if (!obs.starCollected && Math.abs(this.ballY - obs.y) < 22) {
        obs.starCollected = true;
        this.score++;
        sounds.playCollect(1.3);
        haptics.impact();
        this.spawnParticles(this.ballX, obs.y, '#f59e0b', 12);
        this.onScoreUpdate?.({ score: this.score });
      }

      // 2. Color Switcher Orb halfway between obstacles
      const switcherY = obs.y - this.obstacleSpacing / 2;
      if (!obs.colorSwitcherCollected && Math.abs(this.ballY - switcherY) < 18) {
        obs.colorSwitcherCollected = true;
        this.switchRandomColor();
        sounds.playVictory();
        haptics.tap();
        this.spawnParticles(this.ballX, switcherY, '#ffffff', 16);
      }

      // 3. Collision with Obstacle Rings
      if (this.checkObstacleCollision(obs)) {
        this.handleGameOver();
        return;
      }
    }

    // Spawn upcoming obstacles as player climbs
    const topObstacle = this.obstacles[this.obstacles.length - 1];
    if (topObstacle && topObstacle.y > this.cameraY - rect.height) {
      this.spawnNextObstacle();
    }

    // Clean up far bottom obstacles
    this.obstacles = this.obstacles.filter(obs => obs.y < this.cameraY + rect.height + 200);

    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
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

  private switchRandomColor() {
    let nextIdx = Math.floor(Math.random() * 4);
    if (nextIdx === this.currentColorIndex) {
      nextIdx = (nextIdx + 1) % 4;
    }
    this.currentColorIndex = nextIdx;
    this.onColorChange?.(CHROMA_COLORS[nextIdx].hex);
  }

  private checkObstacleCollision(obs: ChromaObstacle): boolean {
    const ringThickness = 14;
    const centerX = this.container.clientWidth / 2;

    if (obs.type === 'circle') {
      const dy = this.ballY - obs.y;
      const dx = this.ballX - centerX;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (Math.abs(dist - obs.radius) < (this.ballRadius + ringThickness / 2)) {
        const impactAngle = Math.atan2(dy, dx);
        const relAngle = ((impactAngle - obs.angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const quadrant = Math.floor(relAngle / (Math.PI / 2)) % 4;
        if (quadrant !== this.currentColorIndex) {
          return true;
        }
      }
    } else if (obs.type === 'double_circle') {
      const dy = this.ballY - obs.y;
      const dx = this.ballX - centerX;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Outer ring
      if (Math.abs(dist - obs.radius) < (this.ballRadius + ringThickness / 2)) {
        const impactAngle = Math.atan2(dy, dx);
        const relAngle = ((impactAngle - obs.angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const quadrant = Math.floor(relAngle / (Math.PI / 2)) % 4;
        if (quadrant !== this.currentColorIndex) {
          return true;
        }
      }

      // Inner ring (counter-rotating at -obs.angle * 1.1)
      const innerRadius = 46;
      if (Math.abs(dist - innerRadius) < (this.ballRadius + ringThickness / 2)) {
        const impactAngle = Math.atan2(dy, dx);
        const innerAngle = -obs.angle * 1.1;
        const relAngle = ((impactAngle - innerAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const quadrant = Math.floor(relAngle / (Math.PI / 2)) % 4;
        if (quadrant !== this.currentColorIndex) {
          return true;
        }
      }
    } else if (obs.type === 'cross') {
      const innerRadius = 24; // Safe hollow center hub allows passing between rotating blades
      for (let arm = 0; arm < 4; arm++) {
        const armAngle = obs.angle + (arm * Math.PI / 2);
        const startX = centerX + Math.cos(armAngle) * innerRadius;
        const startY = obs.y + Math.sin(armAngle) * innerRadius;
        const armEndX = centerX + Math.cos(armAngle) * obs.radius;
        const armEndY = obs.y + Math.sin(armAngle) * obs.radius;

        // Line-segment to circle distance along the colored blade
        const dist = this.distToSegment(this.ballX, this.ballY, startX, startY, armEndX, armEndY);
        if (dist < this.ballRadius + 5) {
          if (arm !== this.currentColorIndex) {
            return true; // Hit mismatched arm!
          }
        }
      }
    }

    return false;
  }

  private distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  private handleGameOver() {
    this.isGameOver = true;
    this.screenShake = 16;
    sounds.playHit();
    sounds.playGameOver();
    haptics.gameOver();

    this.spawnParticles(this.ballX, this.ballY, CHROMA_COLORS[this.currentColorIndex].hex, 25);
    this.spawnParticles(this.ballX, this.ballY, '#ffffff', 15);

    const stars = this.score >= 30 ? 3 : this.score >= 15 ? 2 : this.score >= 5 ? 1 : 0;
    this.gameOverTimer = setTimeout(() => {
      this.onGameOver?.(this.score, false, stars);
    }, 650);
  }

  private spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 160;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        radius: 2.5 + Math.random() * 3,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.25
      });
    }
  }

  private render() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const rect = this.container.getBoundingClientRect();
    const centerX = rect.width / 2;

    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.save();
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(sx, sy);
    }

    // 1. Dark Arcade Background
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Camera viewport offset
    const offsetY = rect.height * 0.55 - this.cameraY;

    ctx.save();
    ctx.translate(0, offsetY);

    // 2. Render Obstacles
    for (const obs of this.obstacles) {
      if (obs.type === 'circle') {
        const ringWidth = 14;
        ctx.save();
        ctx.translate(centerX, obs.y);
        ctx.rotate(obs.angle);

        // Draw 4 colored arcs (90 deg each)
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(0, 0, obs.radius, i * Math.PI / 2, (i + 1) * Math.PI / 2);
          ctx.strokeStyle = CHROMA_COLORS[i].hex;
          ctx.lineWidth = ringWidth;
          ctx.stroke();
        }
        ctx.restore();
      } else if (obs.type === 'double_circle') {
        const ringWidth = 12;
        // Outer ring
        ctx.save();
        ctx.translate(centerX, obs.y);
        ctx.rotate(obs.angle);
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(0, 0, obs.radius, i * Math.PI / 2, (i + 1) * Math.PI / 2);
          ctx.strokeStyle = CHROMA_COLORS[i].hex;
          ctx.lineWidth = ringWidth;
          ctx.stroke();
        }
        ctx.restore();

        // Inner counter-rotating ring
        ctx.save();
        ctx.translate(centerX, obs.y);
        ctx.rotate(-obs.angle * 1.1);
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(0, 0, 46, i * Math.PI / 2, (i + 1) * Math.PI / 2);
          ctx.strokeStyle = CHROMA_COLORS[i].hex;
          ctx.lineWidth = ringWidth;
          ctx.stroke();
        }
        ctx.restore();
      } else if (obs.type === 'cross') {
        const innerRadius = 24;
        ctx.save();
        ctx.translate(centerX, obs.y);
        ctx.rotate(obs.angle);
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          const armAngle = i * Math.PI / 2;
          ctx.moveTo(Math.cos(armAngle) * innerRadius, Math.sin(armAngle) * innerRadius);
          ctx.lineTo(Math.cos(armAngle) * obs.radius, Math.sin(armAngle) * obs.radius);
          ctx.strokeStyle = CHROMA_COLORS[i].hex;
          ctx.lineWidth = 12;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
        ctx.restore();
      }

      // Star in center
      if (!obs.starCollected) {
        ctx.save();
        ctx.fillStyle = '#f59e0b';
        ctx.font = '20px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⭐', centerX, obs.y);
        ctx.restore();
      }

      // Color Switcher Orb between obstacles
      const switcherY = obs.y - this.obstacleSpacing / 2;
      if (!obs.colorSwitcherCollected) {
        ctx.save();
        ctx.translate(centerX, switcherY);
        // Pie chart of 4 colors
        for (let c = 0; c < 4; c++) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, 14, c * Math.PI / 2, (c + 1) * Math.PI / 2);
          ctx.closePath();
          ctx.fillStyle = CHROMA_COLORS[c].hex;
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // 3. Render Particles
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

    // 4. Render Player Chroma Ball
    if (!this.isGameOver) {
      const curColor = CHROMA_COLORS[this.currentColorIndex];
      ctx.save();
      ctx.translate(this.ballX, this.ballY);

      ctx.fillStyle = curColor.hex;
      ctx.beginPath();
      ctx.arc(0, 0, this.ballRadius, 0, Math.PI * 2);
      ctx.fill();

      // Inner bright core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, this.ballRadius * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Tap to jump prompt
      if (!this.hasStarted) {
        ctx.save();
        ctx.font = 'bold 15px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = curColor.hex;
        ctx.shadowBlur = 10;
        const bounce = Math.sin(this.hoverTimer * 4) * 4;
        ctx.fillText('TAP TO JUMP', this.ballX, this.ballY + 45 + bounce);
        ctx.restore();
      }
    }

    ctx.restore(); // restore camera offset
    ctx.restore(); // restore screen shake
  }
}
