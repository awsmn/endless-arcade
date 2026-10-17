import { GameEngine, GameMode, GameScoreUpdate } from '../../types/game';
import { sounds } from '../../engine/audio';
import { haptics } from '../../engine/haptics';

export type ObstacleType = 'barrier' | 'laser' | 'block' | 'coin';

interface Obstacle {
  id: number;
  lane: number; // -1, 0, 1
  z: number;    // 0 (at player) to 1 (far horizon)
  type: ObstacleType;
  collected?: boolean;
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

export class CyberSprintEngine implements GameEngine {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private container!: HTMLElement;

  // Road geometry
  private roadTopY = 100;
  private roadBottomY = 480;
  private horizonWidth = 80;
  private baseRoadWidth = 320;

  // Player state
  private playerLane = 0;       // -1 = left, 0 = mid, 1 = right
  private targetLane = 0;
  private currentLaneX = 0;     // interpolated visual lane (-1 to 1)

  public isJumping = false;
  private jumpProgress = 0;     // 0 to 1
  private jumpDuration = 0.6;   // seconds

  public isSliding = false;
  private slideTimer = 0;
  private slideDuration = 0.65; // seconds

  // World & Obstacles
  private obstacles: Obstacle[] = [];
  private nextObstacleId = 1;
  private worldSpeed = 0.55;    // z units per second
  private spawnTimer = 0;
  private spawnInterval = 1.1;  // seconds

  private distance = 0;
  private coins = 0;
  private score = 0;

  private isRunning = false;
  private isPaused = false;
  private isGameOver = false;
  private screenShake = 0;

  private roadScroll = 0;
  private particles: Particle[] = [];
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

    this.roadTopY = Math.min(130, rect.height * 0.22);
    this.roadBottomY = rect.height - 90;
    this.baseRoadWidth = Math.min(rect.width - 24, 360);
    this.horizonWidth = this.baseRoadWidth * 0.28;
  }

  public start(_mode: GameMode = 'endless', _level = 1) {
    this.obstacles = [];
    this.particles = [];
    this.playerLane = 0;
    this.targetLane = 0;
    this.currentLaneX = 0;
    this.isJumping = false;
    this.isSliding = false;
    this.jumpProgress = 0;
    this.slideTimer = 0;
    this.worldSpeed = 0.55;
    this.spawnInterval = 1.1;
    this.spawnTimer = 0;
    this.distance = 0;
    this.coins = 0;
    this.score = 0;

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

  public shiftLane(direction: -1 | 1) {
    if (this.isPaused || this.isGameOver) return;
    const next = Math.max(-1, Math.min(1, this.targetLane + direction));
    if (next !== this.targetLane) {
      this.targetLane = next;
      sounds.playTap();
      haptics.tap();
    }
  }

  public jump() {
    if (this.isPaused || this.isGameOver || this.isJumping) return;
    this.isJumping = true;
    this.isSliding = false;
    this.jumpProgress = 0;
    sounds.playBounce();
    haptics.tap();
  }

  public slide() {
    if (this.isPaused || this.isGameOver || this.isSliding) return;
    this.isSliding = true;
    this.isJumping = false;
    this.slideTimer = this.slideDuration;
    sounds.playLaser();
    haptics.tap();
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
    // Gradually scale speed
    this.worldSpeed = Math.min(1.1, 0.55 + this.distance * 0.0004);
    this.spawnInterval = Math.max(0.65, 1.1 - this.distance * 0.0003);

    this.distance += dt * 45;
    this.score = Math.floor(this.distance + this.coins * 10);
    this.onScoreUpdate?.({ score: this.score });

    // Smooth lane shift interpolation
    this.currentLaneX += (this.targetLane - this.currentLaneX) * 14 * dt;
    this.playerLane = this.targetLane;

    // Jump arc
    if (this.isJumping) {
      this.jumpProgress += dt / this.jumpDuration;
      if (this.jumpProgress >= 1) {
        this.isJumping = false;
        this.jumpProgress = 0;
      }
    }

    // Slide timer
    if (this.isSliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    }

    // Road grid texture movement
    this.roadScroll = (this.roadScroll + this.worldSpeed * dt * 2.2) % 1;

    // Shake decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 30);
    }

    // Spawn obstacles
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnObstaclePattern();
    }

    // Move obstacles towards player (z: 1 -> 0)
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.z -= this.worldSpeed * dt;

      // Collision zone: z roughly between 0.04 and 0.16
      if (obs.z >= 0.04 && obs.z <= 0.16 && !obs.collected) {
        const laneDiff = Math.abs(this.currentLaneX - obs.lane);
        if (laneDiff < 0.45) {
          if (obs.type === 'coin') {
            obs.collected = true;
            this.coins++;
            sounds.playCollect(1.4);
            haptics.tap();
            const pt = this.projectLane(obs.lane, obs.z);
            this.spawnParticles(pt.x, pt.y, '#f59e0b', 8);
          } else if (obs.type === 'barrier' && this.isJumping) {
            // Jumped safely over barrier!
          } else if (obs.type === 'laser' && this.isSliding) {
            // Slid safely under laser!
          } else {
            // Crash!
            this.handleCrash(obs);
            return;
          }
        }
      }

      // Past player
      if (obs.z < 0) {
        this.obstacles.splice(i, 1);
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

  private spawnObstaclePattern() {
    const laneChoices = [-1, 0, 1];
    const occupiedLanes = new Set<number>();

    // Decide obstacle or coin
    if (Math.random() < 0.35) {
      // Spawn coin trail
      const coinLane = laneChoices[Math.floor(Math.random() * laneChoices.length)];
      this.obstacles.push({
        id: this.nextObstacleId++,
        lane: coinLane,
        z: 1.0,
        type: 'coin'
      });
      return;
    }

    // Spawn 1 or 2 obstacles (leave at least 1 lane open!)
    const numObstacles = Math.random() < 0.4 ? 2 : 1;
    for (let n = 0; n < numObstacles; n++) {
      const remaining = laneChoices.filter(l => !occupiedLanes.has(l));
      if (remaining.length === 0) break;
      const lane = remaining[Math.floor(Math.random() * remaining.length)];
      occupiedLanes.add(lane);

      const types: ObstacleType[] = ['barrier', 'laser', 'block'];
      const type = types[Math.floor(Math.random() * types.length)];

      this.obstacles.push({
        id: this.nextObstacleId++,
        lane,
        z: 1.0,
        type
      });
    }
  }

  private handleCrash(obs: Obstacle) {
    this.isGameOver = true;
    this.screenShake = 16;
    sounds.playHit();
    sounds.playGameOver();
    haptics.gameOver();

    const pt = this.projectLane(obs.lane, obs.z);
    this.spawnParticles(pt.x, pt.y, '#f43f5e', 25);
    this.spawnParticles(pt.x, pt.y, '#38bdf8', 15);

    const stars = this.score >= 500 ? 3 : this.score >= 250 ? 2 : this.score >= 100 ? 1 : 0;
    this.onGameOver?.(this.score, false, stars);
  }

  private spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 150;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        radius: 2.5 + Math.random() * 3,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.25
      });
    }
  }

  // Perspective 3D -> 2D projection
  private projectLane(laneX: number, z: number): { x: number; y: number; scale: number } {
    const rect = this.container.getBoundingClientRect();
    const centerX = rect.width / 2;

    // Depth perspective curve: t from 0 (horizon) to 1 (near bottom)
    const t = Math.pow(1 - z, 1.6);
    const y = this.roadTopY + (this.roadBottomY - this.roadTopY) * t;

    const currentRoadWidth = this.horizonWidth + (this.baseRoadWidth - this.horizonWidth) * t;
    const laneOffset = (currentRoadWidth / 3) * laneX;
    const x = centerX + laneOffset;
    const scale = 0.25 + 0.75 * t;

    return { x, y, scale };
  }

  private render() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const rect = this.container.getBoundingClientRect();
    const centerX = rect.width / 2;

    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.save();
    if (this.screenShake > 0) {
      ctx.translate((Math.random() - 0.5) * this.screenShake, (Math.random() - 0.5) * this.screenShake);
    }

    // 1. Cyber Sky & Horizon Glow
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.roadTopY);
    skyGrad.addColorStop(0, '#020617');
    skyGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, rect.width, this.roadTopY);

    // Horizon glowing neon line
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - this.horizonWidth * 1.5, this.roadTopY);
    ctx.lineTo(centerX + this.horizonWidth * 1.5, this.roadTopY);
    ctx.stroke();

    // 2. Road Trapezoid
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.moveTo(centerX - this.horizonWidth / 2, this.roadTopY);
    ctx.lineTo(centerX + this.horizonWidth / 2, this.roadTopY);
    ctx.lineTo(centerX + this.baseRoadWidth / 2, this.roadBottomY);
    ctx.lineTo(centerX - this.baseRoadWidth / 2, this.roadBottomY);
    ctx.closePath();
    ctx.fill();

    // Road outer neon rails
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX - this.horizonWidth / 2, this.roadTopY);
    ctx.lineTo(centerX - this.baseRoadWidth / 2, this.roadBottomY);
    ctx.moveTo(centerX + this.horizonWidth / 2, this.roadTopY);
    ctx.lineTo(centerX + this.baseRoadWidth / 2, this.roadBottomY);
    ctx.stroke();

    // Lane Dividers
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.lineWidth = 1.5;
    for (const laneDiv of [-0.5, 0.5]) {
      ctx.beginPath();
      ctx.moveTo(centerX + (this.horizonWidth / 3) * laneDiv, this.roadTopY);
      ctx.lineTo(centerX + (this.baseRoadWidth / 3) * laneDiv, this.roadBottomY);
      ctx.stroke();
    }

    // Receding horizontal grid lines for speed illusion
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const zLine = (i / 8 + (1 - this.roadScroll) / 8) % 1;
      const t = Math.pow(zLine, 1.8);
      const yLine = this.roadTopY + (this.roadBottomY - this.roadTopY) * t;
      const wLine = this.horizonWidth + (this.baseRoadWidth - this.horizonWidth) * t;
      ctx.beginPath();
      ctx.moveTo(centerX - wLine / 2, yLine);
      ctx.lineTo(centerX + wLine / 2, yLine);
      ctx.stroke();
    }

    // 3. Render Obstacles (sorted back to front)
    const sortedObstacles = [...this.obstacles].sort((a, b) => b.z - a.z);
    for (const obs of sortedObstacles) {
      if (obs.collected) continue;
      const pt = this.projectLane(obs.lane, obs.z);
      this.drawObstacle(ctx, obs.type, pt.x, pt.y, pt.scale);
    }

    // 4. Render Player Hovercraft
    const playerZ = 0.08;
    const playerPos = this.projectLane(this.currentLaneX, playerZ);

    // Jump height calculation (parabolic arc)
    let jumpOffsetY = 0;
    if (this.isJumping) {
      jumpOffsetY = -Math.sin(this.jumpProgress * Math.PI) * 75;
    }

    ctx.save();
    ctx.translate(playerPos.x, playerPos.y + jumpOffsetY);

    if (this.isSliding) {
      // Flattened hovercraft on slide
      ctx.scale(1.2, 0.4);
    }

    // Hovercraft thruster glow
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 18;

    // Hovercraft Body
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.moveTo(0, -22); // nose
    ctx.lineTo(18, 14);
    ctx.lineTo(0, 6);
    ctx.lineTo(-18, 14);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -6, 5, 0, Math.PI * 2);
    ctx.fill();

    // Thruster exhaust flame
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(-6, 8);
    ctx.lineTo(0, 22 + (Math.random() - 0.5) * 6);
    ctx.lineTo(6, 8);
    ctx.fill();

    ctx.restore();

    // 5. Render Particles
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

    ctx.restore();
  }

  private drawObstacle(
    ctx: CanvasRenderingContext2D,
    type: ObstacleType,
    x: number,
    y: number,
    scale: number
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    if (type === 'coin') {
      // Glowing Gold Coin Ring
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, -12, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, -12, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'barrier') {
      // Low ground barricade (jumpable)
      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(-24, -14, 48, 14, 4);
      ctx.fill();

      // Yellow warning stripes
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-16, -12, 8, 10);
      ctx.fillRect(8, -12, 8, 10);
    } else if (type === 'laser') {
      // Overhead laser gate (slideable under)
      ctx.fillStyle = '#a855f7';
      // Side posts
      ctx.fillRect(-24, -36, 6, 36);
      ctx.fillRect(18, -36, 6, 36);

      // Overhead laser beam
      ctx.fillStyle = '#e879f9';
      ctx.shadowColor = '#e879f9';
      ctx.shadowBlur = 14;
      ctx.fillRect(-22, -34, 44, 8);
    } else {
      // Solid concrete cyber cube (must switch lane)
      ctx.fillStyle = '#475569';
      ctx.fillRect(-22, -32, 44, 32);

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(-22, -32, 44, 32);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 16px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('⚠', 0, -10);
    }

    ctx.restore();
  }
}
