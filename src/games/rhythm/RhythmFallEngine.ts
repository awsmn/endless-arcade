import { drawHeart } from '../../engine/art';
import { getDifficulty } from '../../engine/difficulty';
import { GameEngine, GameMode, GameScoreUpdate } from '../../types/game';
import { sounds } from '../../engine/audio';
import { haptics } from '../../engine/haptics';

interface Note {
  id: number;
  lane: number; // 0, 1, 2, 3
  y: number;
  hit: boolean;
  missed: boolean;
  color: string;
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

interface HitPopup {
  text: string;
  color: string;
  x: number;
  y: number;
  alpha: number;
}

const LANE_COLORS = ['#00F0FF', '#FF2A85', '#FFE500', '#22E565'];
const LANE_FREQS = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 musical chord

export class RhythmFallEngine implements GameEngine {
  private readonly pace = getDifficulty().pace;
  private viewport = { width: 0, height: 0 };
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private container!: HTMLElement;

  private notes: Note[] = [];
  private nextNoteId = 0;
  private particles: Particle[] = [];
  private hitPopups: HitPopup[] = [];

  // Lane state
  private lanePressState = [false, false, false, false];
  private lanePressTimers = [0, 0, 0, 0];

  // Timing & Spawn
  private bpm = 135;
  private beatInterval = 60 / 135; // ~0.44s
  private beatTimer = 0;
  private noteSpeed = 380; // px/sec

  // Gameplay
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private misses = 0;
  private maxMisses = 10;
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
    this.viewport = { width: rect.width, height: rect.height };
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
    this.combo = 0;
    this.maxCombo = 0;
    this.misses = 0;
    this.notes = [];
    this.particles = [];
    this.hitPopups = [];
    this.lanePressState = [false, false, false, false];
    this.lanePressTimers = [0, 0, 0, 0];
    this.beatTimer = 0;
    this.bpm = 112;
    this.beatInterval = 60 / this.bpm;
    this.noteSpeed = 320;
    this.isGameOver = false;
    this.isPaused = false;
    this.isRunning = true;

    this.lastTime = performance.now();
    cancelAnimationFrame(this.animationFrameId);
    this.loop();
  }

  public hitLane(lane: number) {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;
    if (lane < 0 || lane > 3) return;

    this.lanePressState[lane] = true;
    this.lanePressTimers[lane] = 0.12;

    const rect = this.viewport;
    const judgmentY = rect.height - 80;
    const laneWidth = rect.width / 4;
    const hitX = lane * laneWidth + laneWidth / 2;

    // Find the closest active unhit note in this lane
    let closestNote: Note | null = null;
    let minDistance = Infinity;

    for (const note of this.notes) {
      if (note.lane === lane && !note.hit && !note.missed) {
        const dist = Math.abs(note.y - judgmentY);
        if (dist < minDistance && dist < 120) {
          minDistance = dist;
          closestNote = note;
        }
      }
    }

    if (closestNote) {
      closestNote.hit = true;
      const freq = LANE_FREQS[lane] * (1 + Math.min(this.combo, 20) * 0.02);
      sounds.playTone(freq, 0.15, 'sine');
      haptics.tap();

      if (minDistance <= 30) {
        // PERFECT
        this.combo++;
        this.score += 100 * Math.min(this.combo, 4);
        this.addPopup('PERFECT!', '#FFE500', hitX, judgmentY - 20);
        this.spawnBurst(hitX, judgmentY, LANE_COLORS[lane], 20);
      } else if (minDistance <= 65) {
        // GREAT
        this.combo++;
        this.score += 60 * Math.min(this.combo, 3);
        this.addPopup('GREAT!', '#00F0FF', hitX, judgmentY - 20);
        this.spawnBurst(hitX, judgmentY, LANE_COLORS[lane], 12);
      } else {
        // OK
        this.score += 30;
        this.addPopup('OK', '#ffffff', hitX, judgmentY - 20);
        this.spawnBurst(hitX, judgmentY, LANE_COLORS[lane], 6);
      }

      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }
      this.onScoreUpdate?.({ score: this.score });
    } else {
      // Empty lane tap
      sounds.playTap();
      haptics.tap();
    }
  }

  public releaseLane(lane: number) {
    if (lane >= 0 && lane <= 3) {
      this.lanePressState[lane] = false;
    }
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.lastTime = performance.now();
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
    if (!this.isRunning) return;
    if (this.isPaused) {
      this.animationFrameId = requestAnimationFrame(this.loop);
      return;
    }
    const dt = Math.min(Math.max(0, (time - this.lastTime) / 1000) * this.pace, 0.05);
    this.lastTime = time;

    this.update(dt);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    const rect = this.viewport;
    const judgmentY = rect.height - 80;

    // Decay lane press visual feedback
    for (let i = 0; i < 4; i++) {
      if (this.lanePressTimers[i] > 0) {
        this.lanePressTimers[i] -= dt;
        if (this.lanePressTimers[i] <= 0) {
          this.lanePressState[i] = false;
        }
      }
    }

    // Spawn notes rhythmically
    this.beatTimer += dt;
    if (this.beatTimer >= this.beatInterval) {
      this.beatTimer -= this.beatInterval;
      this.spawnRhythmBeat();

      // Smooth, fair tempo ramp-up over time
      if (this.bpm < 185) {
        this.bpm += 0.12;
        this.beatInterval = 60 / this.bpm;
        this.noteSpeed += 0.25;
      }
    }

    // Update notes positions & check misses
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const note = this.notes[i];
      note.y += this.noteSpeed * dt;

      // Note passed judgment line without being hit -> MISS
      if (!note.hit && !note.missed && note.y > judgmentY + 60) {
        note.missed = true;
        this.combo = 0;
        this.misses++;
        const laneWidth = rect.width / 4;
        const hitX = note.lane * laneWidth + laneWidth / 2;
        this.addPopup('MISS', '#FF1E44', hitX, judgmentY);
        sounds.playHit();
        haptics.failure();

        if (this.misses >= this.maxMisses) {
          this.triggerGameOver();
          return;
        }
      }

      // Cleanup offscreen notes
      if (note.y > rect.height + 60) {
        this.notes.splice(i, 1);
      }
    }

    // Update Particles
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

    // Update Hit Popups
    for (let i = this.hitPopups.length - 1; i >= 0; i--) {
      const popup = this.hitPopups[i];
      popup.y -= dt * 35;
      popup.alpha -= dt * 1.8;
      if (popup.alpha <= 0) {
        this.hitPopups.splice(i, 1);
      }
    }
  }

  private spawnRhythmBeat() {
    // Generate 1 or 2 notes across 4 lanes
    const lane1 = Math.floor(Math.random() * 4);
    this.notes.push({
      id: this.nextNoteId++,
      lane: lane1,
      y: -30,
      hit: false,
      missed: false,
      color: LANE_COLORS[lane1]
    });

    // 25% chance for a simultaneous second note
    if (Math.random() < 0.25) {
      let lane2 = (lane1 + 1 + Math.floor(Math.random() * 3)) % 4;
      this.notes.push({
        id: this.nextNoteId++,
        lane: lane2,
        y: -30,
        hit: false,
        missed: false,
        color: LANE_COLORS[lane2]
      });
    }
  }

  private addPopup(text: string, color: string, x: number, y: number) {
    this.hitPopups.push({ text, color, x, y, alpha: 1 });
  }

  private spawnBurst(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 200;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        radius: 2 + Math.random() * 3,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.25
      });
    }
  }

  private triggerGameOver() {
    this.isGameOver = true;
    sounds.playGameOver();
    haptics.failure();

    const stars = this.score >= 3500 ? 3 : this.score >= 1800 ? 2 : this.score >= 600 ? 1 : 0;
    this.gameOverTimer = setTimeout(() => {
      this.onGameOver?.(this.score, false, stars);
    }, 600);
  }

  private render() {
    const rect = this.viewport;
    const width = rect.width;
    const height = rect.height;
    const laneWidth = width / 4;
    const judgmentY = height - 80;

    this.ctx.clearRect(0, 0, width, height);

    // Background Cyber Grid
    this.ctx.fillStyle = '#0a0d1a';
    this.ctx.fillRect(0, 0, width, height);

    // Lane separator lines
    for (let i = 0; i <= 4; i++) {
      const lx = i * laneWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(lx, 0);
      this.ctx.lineTo(lx, height);
      this.ctx.strokeStyle = '#18213e';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    // Lane press glow
    for (let i = 0; i < 4; i++) {
      if (this.lanePressState[i]) {
        this.ctx.fillStyle = LANE_COLORS[i] + '18';
        this.ctx.fillRect(i * laneWidth, 0, laneWidth, height);
      }
    }

    // Judgment Line (Glowing neon strip with black neo-brutalist border)
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, judgmentY - 3, width, 6);
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(0, judgmentY - 3, width, 6);

    // Target receptors for each lane at judgment line
    for (let i = 0; i < 4; i++) {
      const lx = i * laneWidth;
      const pressed = this.lanePressState[i];

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(lx + laneWidth / 2, judgmentY, pressed ? 26 : 22, 0, Math.PI * 2);
      this.ctx.fillStyle = pressed ? LANE_COLORS[i] : '#141a30';
      this.ctx.fill();
      this.ctx.lineWidth = 2.5;
      this.ctx.strokeStyle = '#000000';
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.arc(lx + laneWidth / 2, judgmentY, pressed ? 12 : 9, 0, Math.PI * 2);
      this.ctx.fillStyle = pressed ? '#ffffff' : LANE_COLORS[i];
      this.ctx.fill();
      this.ctx.restore();
    }

    // Render Notes
    for (const note of this.notes) {
      if (note.hit) continue;

      const nx = note.lane * laneWidth + laneWidth / 2;
      const ny = note.y;

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.roundRect(nx - laneWidth * 0.38, ny - 14, laneWidth * 0.76, 28, 14);
      this.ctx.fillStyle = note.missed ? '#475569' : note.color;
      this.ctx.fill();

      this.ctx.lineWidth = 2.5;
      this.ctx.strokeStyle = '#000000';
      this.ctx.stroke();

      // Top pop shine
      this.ctx.beginPath();
      this.ctx.roundRect(nx - laneWidth * 0.28, ny - 10, laneWidth * 0.56, 8, 4);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      this.ctx.fill();

      this.ctx.restore();
    }

    // Render Particles
    for (const p of this.particles) {
      const alpha = 1 - p.life / p.maxLife;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.lineWidth = 1;
      this.ctx.strokeStyle = '#000000';
      this.ctx.stroke();
      this.ctx.restore();
    }

    // Render Hit Popups
    for (const popup of this.hitPopups) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, popup.alpha);
      this.ctx.font = '900 16px Righteous, Outfit, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      // Pop text shadow
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 3;
      this.ctx.strokeText(popup.text, popup.x, popup.y);
      this.ctx.fillStyle = popup.color;
      this.ctx.fillText(popup.text, popup.x, popup.y);

      this.ctx.restore();
    }

    // Combo Counter Overlay
    if (this.combo >= 2) {
      this.ctx.save();
      this.ctx.textAlign = 'center';
      this.ctx.font = '900 28px Bungee, Impact, sans-serif';
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 4;
      this.ctx.strokeText(`${this.combo} COMBO!`, width / 2, 90);
      this.ctx.fillStyle = '#FFE500';
      this.ctx.fillText(`${this.combo} COMBO!`, width / 2, 90);
      this.ctx.restore();
    }

    // Miss Health indicator (Hearts / lives remaining)
    const livesLeft = Math.max(0, this.maxMisses - this.misses);
    this.ctx.save();
    this.ctx.font = '700 12px Outfit, sans-serif';
    this.ctx.fillStyle = '#94a3b8';
    for(let i=0;i<5;i++) drawHeart(this.ctx, 22+i*21, 85, 13, i<Math.ceil(livesLeft/2));
    this.ctx.restore();
  }
}
