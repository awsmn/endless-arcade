import { GameEngine, GameMode, GameScoreUpdate } from '../../types/game';
import { sounds } from '../../engine/audio';
import { haptics } from '../../engine/haptics';

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isEnemy: boolean;
  color: string;
}

type EnemyType = 'drone' | 'cruiser' | 'boss';

interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  radius: number;
  shootTimer: number;
  shootInterval: number;
  color: string;
}

interface PowerUp {
  x: number;
  y: number;
  vy: number;
  type: 'spread' | 'shield' | 'nuke';
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

export class GalaxiaVoidEngine implements GameEngine {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private container!: HTMLElement;

  // Player state
  private playerX = 180;
  private playerY = 480;
  private targetPlayerX = 180;
  private targetPlayerY = 480;
  private playerRadius = 16;
  private weaponLevel = 1;
  private hasShield = false;
  private autoFireTimer = 0;
  private fireInterval = 0.14; // seconds

  // World objects
  private stars: Star[] = [];
  private bullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private powerups: PowerUp[] = [];
  private particles: Particle[] = [];
  private nextEnemyId = 1;

  // Wave generator
  private spawnTimer = 0;
  private spawnInterval = 1.2;
  private waveCount = 0;
  private bossActive = false;

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
    const rect = this.container.getBoundingClientRect();
    for (let i = 0; i < 50; i++) {
      this.stars.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        size: 1 + Math.random() * 2,
        speed: 40 + Math.random() * 120,
        alpha: 0.3 + Math.random() * 0.7
      });
    }
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

    if (!this.isRunning) {
      this.playerX = rect.width / 2;
      this.playerY = rect.height - 110;
      this.targetPlayerX = this.playerX;
      this.targetPlayerY = this.playerY;
    }
  }

  public start(_mode: GameMode = 'endless', _level = 1) {
    const rect = this.container.getBoundingClientRect();
    this.playerX = rect.width / 2;
    this.playerY = rect.height - 110;
    this.targetPlayerX = this.playerX;
    this.targetPlayerY = this.playerY;
    this.weaponLevel = 1;
    this.hasShield = false;
    this.autoFireTimer = 0;

    this.bullets = [];
    this.enemies = [];
    this.powerups = [];
    this.particles = [];
    this.score = 0;
    this.waveCount = 0;
    this.bossActive = false;
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

  public setTargetPosition(x: number, y: number) {
    const rect = this.container.getBoundingClientRect();
    this.targetPlayerX = Math.max(20, Math.min(rect.width - 20, x));
    // Keep finger offset slightly so thumb doesn't cover the ship
    this.targetPlayerY = Math.max(80, Math.min(rect.height - 50, y - 30));
  }

  public shiftPosition(dx: number, dy: number) {
    const rect = this.container.getBoundingClientRect();
    this.targetPlayerX = Math.max(20, Math.min(rect.width - 20, this.targetPlayerX + dx));
    this.targetPlayerY = Math.max(80, Math.min(rect.height - 50, this.targetPlayerY + dy));
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

    // Snappy player steering interpolation
    this.playerX += (this.targetPlayerX - this.playerX) * Math.min(1, 28 * dt);
    this.playerY += (this.targetPlayerY - this.playerY) * Math.min(1, 28 * dt);

    // Scroll stars
    for (const star of this.stars) {
      star.y += star.speed * dt;
      if (star.y > rect.height) {
        star.y = 0;
        star.x = Math.random() * rect.width;
      }
    }

    // Player Continuous Auto-Fire
    this.autoFireTimer += dt;
    if (this.autoFireTimer >= this.fireInterval) {
      this.autoFireTimer = 0;
      this.firePlayerLasers();
    }

    // Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Player bullet hit enemy
      if (!b.isEnemy) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j];
          const dist = Math.hypot(b.x - enemy.x, b.y - enemy.y);
          if (dist < enemy.radius + 6) {
            enemy.hp--;
            this.spawnParticles(b.x, b.y, b.color, 4);
            sounds.playHit();
            this.bullets.splice(i, 1);

            if (enemy.hp <= 0) {
              this.destroyEnemy(j);
            }
            break;
          }
        }
      } else {
        // Enemy bullet hit player
        const dist = Math.hypot(b.x - this.playerX, b.y - this.playerY);
        if (dist < this.playerRadius + 4) {
          this.bullets.splice(i, 1);
          this.takePlayerDamage();
          if (this.isGameOver) return;
        }
      }

      // Remove off-screen bullets
      if (b.y < -30 || b.y > rect.height + 30 || b.x < -20 || b.x > rect.width + 20) {
        this.bullets.splice(i, 1);
      }
    }

    // Spawn Enemies
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval && !this.bossActive) {
      this.spawnTimer = 0;
      this.spawnEnemyWave(rect.width);
    }

    // Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;

      // Drone side oscillation
      if (enemy.type === 'drone') {
        enemy.x += Math.sin(enemy.y * 0.05) * 80 * dt;
      }

      // Enemy shooting
      enemy.shootTimer += dt;
      if (enemy.shootTimer >= enemy.shootInterval && enemy.y > 40 && enemy.y < rect.height - 100) {
        enemy.shootTimer = 0;
        this.fireEnemyBullet(enemy);
      }

      // Check collision with player
      const dist = Math.hypot(enemy.x - this.playerX, enemy.y - this.playerY);
      if (dist < enemy.radius + this.playerRadius) {
        this.destroyEnemy(i);
        this.takePlayerDamage();
        if (this.isGameOver) return;
        continue;
      }

      // Remove enemies that flew off bottom
      if (enemy.y > rect.height + 50) {
        if (enemy.type === 'boss') this.bossActive = false;
        this.enemies.splice(i, 1);
      }
    }

    // Update PowerUps
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.y += p.vy * dt;

      const dist = Math.hypot(p.x - this.playerX, p.y - this.playerY);
      if (dist < this.playerRadius + 18) {
        this.collectPowerup(p.type);
        this.powerups.splice(i, 1);
        continue;
      }

      if (p.y > rect.height + 40) {
        this.powerups.splice(i, 1);
      }
    }

    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }

    // Update Particles
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

  private firePlayerLasers() {
    sounds.playLaser();
    if (this.weaponLevel === 1) {
      this.bullets.push({
        x: this.playerX - 6,
        y: this.playerY - 14,
        vx: 0,
        vy: -750,
        isEnemy: false,
        color: '#38bdf8'
      });
      this.bullets.push({
        x: this.playerX + 6,
        y: this.playerY - 14,
        vx: 0,
        vy: -750,
        isEnemy: false,
        color: '#38bdf8'
      });
    } else if (this.weaponLevel === 2) {
      // 3-way spread
      this.bullets.push({ x: this.playerX, y: this.playerY - 16, vx: 0, vy: -750, isEnemy: false, color: '#38bdf8' });
      this.bullets.push({ x: this.playerX - 10, y: this.playerY - 10, vx: -120, vy: -720, isEnemy: false, color: '#818cf8' });
      this.bullets.push({ x: this.playerX + 10, y: this.playerY - 10, vx: 120, vy: -720, isEnemy: false, color: '#818cf8' });
    } else {
      // 5-way plasma volley
      this.bullets.push({ x: this.playerX, y: this.playerY - 16, vx: 0, vy: -780, isEnemy: false, color: '#ec4899' });
      this.bullets.push({ x: this.playerX - 8, y: this.playerY - 12, vx: -100, vy: -750, isEnemy: false, color: '#38bdf8' });
      this.bullets.push({ x: this.playerX + 8, y: this.playerY - 12, vx: 100, vy: -750, isEnemy: false, color: '#38bdf8' });
      this.bullets.push({ x: this.playerX - 16, y: this.playerY - 8, vx: -200, vy: -720, isEnemy: false, color: '#818cf8' });
      this.bullets.push({ x: this.playerX + 16, y: this.playerY - 8, vx: 200, vy: -720, isEnemy: false, color: '#818cf8' });
    }
  }

  private fireEnemyBullet(enemy: Enemy) {
    if (enemy.type === 'cruiser') {
      this.bullets.push({
        x: enemy.x,
        y: enemy.y + enemy.radius,
        vx: 0,
        vy: 240,
        isEnemy: true,
        color: '#ef4444'
      });
    } else if (enemy.type === 'boss') {
      // Boss 3-way shot
      for (const angle of [-0.3, 0, 0.3]) {
        this.bullets.push({
          x: enemy.x,
          y: enemy.y + enemy.radius,
          vx: Math.sin(angle) * 260,
          vy: Math.cos(angle) * 260,
          isEnemy: true,
          color: '#f97316'
        });
      }
    }
  }

  private spawnEnemyWave(canvasWidth: number) {
    this.waveCount++;

    // Boss spawn every 10 waves
    if (this.waveCount % 10 === 0 && !this.bossActive) {
      this.bossActive = true;
      this.enemies.push({
        id: this.nextEnemyId++,
        type: 'boss',
        x: canvasWidth / 2,
        y: -50,
        vx: 30,
        vy: 25,
        hp: 40 + this.waveCount * 2,
        maxHp: 40 + this.waveCount * 2,
        radius: 36,
        shootTimer: 0,
        shootInterval: 0.9,
        color: '#a855f7'
      });
      return;
    }

    // Standard waves: swarm of 3 to 5 drones or cruisers
    const count = 3 + Math.floor(Math.random() * 3);
    const spacing = canvasWidth / (count + 1);
    const isCruiser = Math.random() < 0.35;

    for (let i = 1; i <= count; i++) {
      this.enemies.push({
        id: this.nextEnemyId++,
        type: isCruiser ? 'cruiser' : 'drone',
        x: spacing * i + (Math.random() - 0.5) * 20,
        y: -30 - Math.random() * 60,
        vx: (Math.random() - 0.5) * 40,
        vy: isCruiser ? 60 : 110,
        hp: isCruiser ? 4 : 1,
        maxHp: isCruiser ? 4 : 1,
        radius: isCruiser ? 18 : 13,
        shootTimer: Math.random() * 0.8,
        shootInterval: isCruiser ? 1.6 : 3,
        color: isCruiser ? '#f43f5e' : '#38bdf8'
      });
    }
  }

  private destroyEnemy(idx: number) {
    const enemy = this.enemies[idx];
    this.enemies.splice(idx, 1);

    const points = enemy.type === 'boss' ? 50 : enemy.type === 'cruiser' ? 10 : 3;
    this.score += points;
    this.onScoreUpdate?.({ score: this.score });

    sounds.playCombo(enemy.type === 'boss' ? 5 : 2);
    haptics.impact();
    this.screenShake = enemy.type === 'boss' ? 14 : 5;
    this.spawnParticles(enemy.x, enemy.y, enemy.color, enemy.type === 'boss' ? 35 : 12);

    if (enemy.type === 'boss') {
      this.bossActive = false;
      // Boss always drops powerup
      this.powerups.push({
        x: enemy.x,
        y: enemy.y,
        vy: 80,
        type: Math.random() < 0.5 ? 'spread' : 'shield'
      });
    } else if (Math.random() < 0.15) {
      // Chance of normal drop
      const types: ('spread' | 'shield' | 'nuke')[] = ['spread', 'shield', 'nuke'];
      this.powerups.push({
        x: enemy.x,
        y: enemy.y,
        vy: 90,
        type: types[Math.floor(Math.random() * types.length)]
      });
    }
  }

  private collectPowerup(type: 'spread' | 'shield' | 'nuke') {
    sounds.playCollect(1.5);
    haptics.impact();

    if (type === 'spread') {
      this.weaponLevel = Math.min(3, this.weaponLevel + 1);
    } else if (type === 'shield') {
      this.hasShield = true;
    } else if (type === 'nuke') {
      // Screen nuke!
      this.screenShake = 15;
      sounds.playGameOver();
      for (const enemy of this.enemies) {
        this.spawnParticles(enemy.x, enemy.y, enemy.color, 12);
        this.score += 5;
      }
      this.enemies = [];
      this.bossActive = false;
      this.onScoreUpdate?.({ score: this.score });
    }
  }

  private takePlayerDamage() {
    if (this.hasShield) {
      this.hasShield = false;
      this.screenShake = 10;
      sounds.playBounce();
      haptics.bump();
      this.spawnParticles(this.playerX, this.playerY, '#38bdf8', 15);
      return;
    }

    // Game Over
    this.isGameOver = true;
    this.screenShake = 18;
    sounds.playHit();
    sounds.playGameOver();
    haptics.gameOver();

    this.spawnParticles(this.playerX, this.playerY, '#38bdf8', 30);
    this.spawnParticles(this.playerX, this.playerY, '#f43f5e', 20);

    const stars = this.score >= 300 ? 3 : this.score >= 150 ? 2 : this.score >= 50 ? 1 : 0;
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
        radius: 2 + Math.random() * 2.5,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.25
      });
    }
  }

  private render() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const rect = this.container.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.save();
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(sx, sy);
    }

    // 1. Deep Space Void Background
    const bg = ctx.createLinearGradient(0, 0, 0, rect.height);
    bg.addColorStop(0, '#020617');
    bg.addColorStop(1, '#090d1a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, rect.width, rect.height);

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

    // 3. Bullets (Optimized batch rendering)
    for (const b of this.bullets) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.isEnemy ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. PowerUps
    for (const p of this.powerups) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.font = '18px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icon = p.type === 'spread' ? '⚡' : p.type === 'shield' ? '🛡️' : '💣';
      ctx.fillText(icon, 0, 0);
      ctx.restore();
    }

    // 5. Enemies
    for (const enemy of this.enemies) {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);

      if (enemy.type === 'boss') {
        // Boss Flagship
        ctx.fillStyle = '#7c3aed';
        ctx.beginPath();
        ctx.moveTo(0, enemy.radius);
        ctx.lineTo(-enemy.radius, -enemy.radius * 0.8);
        ctx.lineTo(0, -enemy.radius * 0.4);
        ctx.lineTo(enemy.radius, -enemy.radius * 0.8);
        ctx.closePath();
        ctx.fill();

        // Boss Core
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        const barW = enemy.radius * 1.6;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-barW / 2, -enemy.radius - 12, barW, 4);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(-barW / 2, -enemy.radius - 12, barW * (enemy.hp / enemy.maxHp), 4);
      } else if (enemy.type === 'cruiser') {
        // Heavy Cruiser
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(0, enemy.radius);
        ctx.lineTo(-enemy.radius * 0.9, -enemy.radius * 0.6);
        ctx.lineTo(enemy.radius * 0.9, -enemy.radius * 0.6);
        ctx.closePath();
        ctx.fill();
      } else {
        // Scout Drone
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 6. Particles
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

    // 7. Player Starfighter
    ctx.save();
    ctx.translate(this.playerX, this.playerY);

    // Shield Aura
    if (this.hasShield) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.playerRadius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Fighter Wings
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(0, -18); // nose
    ctx.lineTo(16, 12);
    ctx.lineTo(0, 4);
    ctx.lineTo(-16, 12);
    ctx.closePath();
    ctx.fill();

    // Fighter Cockpit
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Twin Engine Thrusters
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(-8, 12 + Math.random() * 4, 3, 0, Math.PI * 2);
    ctx.arc(8, 12 + Math.random() * 4, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.restore(); // restore screen shake
  }
}
