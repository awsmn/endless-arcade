import { drawShip, drawPowerup, drawHeart, polygon } from '../../engine/art';
import { getDifficulty } from '../../engine/difficulty';
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
  private readonly pace = getDifficulty().pace;
  private viewport = { width: 0, height: 0 };
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
  public lives = 3;
  private invulnerableTimer = 0;
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
  public onLivesChange?: (lives: number) => void;

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
    this.viewport = { width: rect.width, height: rect.height };
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
    const rect = this.viewport;
    this.playerX = rect.width / 2;
    this.playerY = rect.height - 110;
    this.targetPlayerX = this.playerX;
    this.targetPlayerY = this.playerY;
    this.weaponLevel = 1;
    this.hasShield = false;
    this.lives = 3;
    this.invulnerableTimer = 0;
    this.autoFireTimer = 0;

    this.bullets = [];
    this.enemies = [];
    this.powerups = [];
    this.particles = [];
    this.score = 0;
    this.waveCount = 0;
    this.bossActive = false;
    this.spawnTimer = 0;
    this.spawnInterval = 1.08;
    this.screenShake = 0;

    this.isRunning = true;
    this.isPaused = false;
    this.isGameOver = false;

    this.onScoreUpdate?.({ score: 0 });
    this.onLivesChange?.(this.lives);
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
    const rect = this.viewport;
    this.targetPlayerX = Math.max(20, Math.min(rect.width - 20, x));
    // Keep finger offset slightly so thumb doesn't cover the ship
    this.targetPlayerY = Math.max(80, Math.min(rect.height - 50, y - 30));
  }

  public shiftPosition(dx: number, dy: number) {
    const rect = this.viewport;
    this.targetPlayerX = Math.max(20, Math.min(rect.width - 20, this.targetPlayerX + dx));
    this.targetPlayerY = Math.max(80, Math.min(rect.height - 50, this.targetPlayerY + dy));
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

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    }

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

      let consumed = false;
      // Player bullet hit enemy
      if (!b.isEnemy) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j];
          const dist = Math.hypot(b.x - enemy.x, b.y - enemy.y);
          if (dist < enemy.radius + 6) {
            enemy.hp--;
            this.spawnParticles(b.x, b.y, b.color, 4);
            sounds.playHit();
            consumed = true;

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
          consumed = true;
          this.takePlayerDamage();
          if (this.isGameOver) return;
        }
      }

      // Remove off-screen bullets
      if (consumed || b.y < -30 || b.y > rect.height + 30 || b.x < -20 || b.x > rect.width + 20) {
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
      if (enemy.type === 'boss' && enemy.y > 145) { enemy.y = 145; enemy.vy = 0; }
      const margin = enemy.radius + 6;
      if (enemy.x < margin || enemy.x > rect.width - margin) {
        enemy.x = Math.max(margin, Math.min(rect.width - margin, enemy.x));
        enemy.vx *= -1;
      }

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
    if (this.bullets.filter(bullet => bullet.isEnemy).length >= 90) return;
    if (enemy.type === 'drone' && this.waveCount < 3) return;
    // Aim at the player's current location; movement after firing is the escape.
    const aim = Math.atan2(this.playerY - enemy.y, this.playerX - enemy.x);
    const speed = Math.min(340, 195 + this.waveCount * 4);
    const angles = enemy.type === 'boss' ? [-.46, -.23, 0, .23, .46]
      : enemy.type === 'cruiser' && this.waveCount >= 10 ? [-.16, .16] : [0];
    for (const offset of angles) {
      this.bullets.push({ x: enemy.x, y: enemy.y + enemy.radius,
        vx: Math.cos(aim + offset) * speed, vy: Math.sin(aim + offset) * speed,
        isEnemy: true, color: enemy.type === 'boss' ? '#ffb16b' : '#ff819b' });
    }
  }

  private spawnEnemyWave(canvasWidth: number) {
    this.waveCount++;
    this.spawnInterval = Math.max(0.55, 1.08 - this.waveCount * 0.018);

    // Boss spawn every 8 waves
    if (this.waveCount % 8 === 0 && !this.bossActive) {
      this.bossActive = true;
      this.enemies.push({
        id: this.nextEnemyId++,
        type: 'boss',
        x: canvasWidth / 2,
        y: -50,
        vx: 54,
        vy: 42,
        hp: 64 + this.waveCount * 3,
        maxHp: 64 + this.waveCount * 3,
        radius: 36,
        shootTimer: 0,
        shootInterval: Math.max(.45, .9 - this.waveCount * .012),
        color: '#a855f7'
      });
      return;
    }

    // Standard waves: swarm of 3 to 5 drones or cruisers
    const count = Math.min(7, 3 + Math.floor(this.waveCount / 6) + Math.floor(Math.random() * 2));
    const spacing = canvasWidth / (count + 1);


    for (let i = 1; i <= count; i++) {
      const isCruiser = (i + this.waveCount) % 3 === 0;
      const hp = isCruiser ? 5 + Math.floor(this.waveCount / 12) : 1 + Math.floor(this.waveCount / 10);
      this.enemies.push({
        id: this.nextEnemyId++,
        type: isCruiser ? 'cruiser' : 'drone',
        x: spacing * i + (Math.random() - 0.5) * 20,
        y: -30 - Math.random() * 60,
        vx: (Math.random() - 0.5) * 40,
        vy: (isCruiser ? 72 : 125) + Math.min(85, this.waveCount * 2.5),
        hp,
        maxHp: hp,
        radius: isCruiser ? 18 : 13,
        shootTimer: Math.random() * 0.8,
        shootInterval: isCruiser ? Math.max(.8, 1.65 - this.waveCount * .018) : Math.max(1.3, 2.5 - this.waveCount * .025),
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
    if (this.invulnerableTimer > 0) return;

    if (this.hasShield) {
      this.hasShield = false;
      this.invulnerableTimer = 0.8;
      this.screenShake = 10;
      sounds.playBounce();
      haptics.bump();
      this.spawnParticles(this.playerX, this.playerY, '#38bdf8', 15);
      return;
    }

    this.lives--;
    this.weaponLevel = Math.max(1, this.weaponLevel - 1);
    this.onLivesChange?.(this.lives);

    if (this.lives > 0) {
      this.invulnerableTimer = 1.8;
      this.screenShake = 12;
      sounds.playHit();
      haptics.impact();
      this.spawnParticles(this.playerX, this.playerY, '#f43f5e', 20);
      return;
    }

    // Out of lives: Game Over
    this.isGameOver = true;
    this.screenShake = 18;
    sounds.playHit();
    sounds.playGameOver();
    haptics.gameOver();

    this.spawnParticles(this.playerX, this.playerY, '#38bdf8', 30);
    this.spawnParticles(this.playerX, this.playerY, '#f43f5e', 20);

    const stars = this.score >= 400 ? 3 : this.score >= 200 ? 2 : this.score >= 60 ? 1 : 0;
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
    const rect = this.viewport;

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

    // Bright enemy plasma is visually distinct from narrow player laser bolts.
    for (const b of this.bullets) {
      ctx.fillStyle=b.color;
      if(b.isEnemy){polygon(ctx,[[b.x,b.y-6],[b.x+4,b.y],[b.x,b.y+6],[b.x-4,b.y]],b.color,'#ffe4e7');}
      else {ctx.beginPath();ctx.roundRect(b.x-1.5,b.y-8,3,13,1.5);ctx.fill();ctx.fillStyle='#edfaff';ctx.fillRect(b.x-.5,b.y-7,1,8);}
    }

    // 4. PowerUps
    for (const p of this.powerups) {
      ctx.save();
      ctx.translate(p.x, p.y);
      drawPowerup(ctx, 0, 0, p.type === 'nuke' ? 'bomb' : p.type);
      ctx.restore();
    }

    // 5. Enemies
    for (const enemy of this.enemies) {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);

      drawShip(ctx, 0, 0, enemy.radius * (enemy.type === 'boss' ? .82 : .93), enemy.type, this.lastTime / 1000);
      if (enemy.type === 'boss' || enemy.type === 'cruiser') {
        const barW = enemy.radius * 1.8;
        ctx.fillStyle = '#18243d';ctx.fillRect(-barW/2, -enemy.radius-14, barW, 4);
        ctx.fillStyle = enemy.type === 'boss' ? '#ffb1d7' : '#ffe09d';ctx.fillRect(-barW/2, -enemy.radius-14, barW * Math.max(0,enemy.hp/enemy.maxHp), 4);
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

    if (this.invulnerableTimer > 0) {
      ctx.globalAlpha = Math.floor(this.invulnerableTimer * 10) % 2 === 0 ? 0.35 : 0.95;
    }

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

    drawShip(ctx, 0, 0, this.playerRadius * 1.05, 'player', this.lastTime / 1000);

    ctx.restore();

    // Status sits below the shared score/pause HUD instead of underneath it.
    for (let l=0;l<3;l++) drawHeart(ctx, rect.width - 22 - (2-l)*21, 82, 14, l < this.lives);
    ctx.font = '600 9px system-ui';ctx.fillStyle='#a7b8d5';ctx.textAlign='right';
    ctx.fillText(`WAVE ${this.waveCount}  /  ${this.bossActive ? 'FLAGSHIP' : 'PATROL'}`, rect.width-16, 106);

    ctx.restore(); // restore screen shake
  }
}
