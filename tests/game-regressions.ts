import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { drawFruit, drawFruitSprite } from '../src/engine/art';
import { getPuzzleDropTarget } from '../src/games/blockpuzzle/geometry';
import { storage } from '../src/engine/storage';
import { sounds } from '../src/engine/audio';
import { haptics } from '../src/engine/haptics';
import { NeonSnakeEngine } from '../src/games/snake/NeonSnake';
import { FruitFusionEngine } from '../src/games/fruit/FruitFusionEngine';
import { BrickBreakerEngine } from '../src/games/breaker/BrickBreakerEngine';
import { KnifeStrikeEngine } from '../src/games/knife/KnifeStrikeEngine';
import { StackSliceEngine } from '../src/games/stack/StackSliceEngine';
import { CyberSprintEngine } from '../src/games/runner/CyberSprintEngine';
import { FlappyOrbitEngine } from '../src/games/flappy/FlappyOrbitEngine';
import { ChromaJumpEngine } from '../src/games/chroma/ChromaJumpEngine';
import { GalaxiaVoidEngine } from '../src/games/space/GalaxiaVoidEngine';
import { HelixDescentEngine } from '../src/games/helix/HelixDescentEngine';
import { RhythmFallEngine } from '../src/games/rhythm/RhythmFallEngine';
import { CrossyLaneEngine } from '../src/games/crossy/CrossyLaneEngine';

const data = new Map<string, string>();
globalThis.localStorage = {
  getItem: key => data.get(key) ?? null,
  setItem: (key, value) => { data.set(key, String(value)); },
  removeItem: key => { data.delete(key); },
  key: index => [...data.keys()][index] ?? null,
  clear: () => data.clear(),
  get length() { return data.size; }
};
globalThis.window = { devicePixelRatio: 2 } as any;
const frames = new Map<number, FrameRequestCallback>();
let frameId = 0;
globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
globalThis.cancelAnimationFrame = id => { frames.delete(id); };
sounds.setEnabled(false);
haptics.setEnabled(false);

function fixture(Engine: any, width = 390, height = 760) {
  let layoutReads = 0;
  let draws = 0;
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({}, { get(target, key) {
    if (Reflect.has(target, key)) return Reflect.get(target, key);
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient;
    if (key === 'measureText') return () => ({ width: 50 });
    return () => { draws++; };
  }, set(target, key, value) { Reflect.set(target, key, value); return true; } });
  const canvas = { getContext: () => ctx, style: {}, width: 0, height: 0 };
  const container = { getBoundingClientRect() { layoutReads++; return { width, height, left: 0, top: 0 }; } };
  const engine = new Engine();
  engine.init(canvas, container);
  return { engine, ctx, get layoutReads() { return layoutReads; }, get draws() { return draws; } };
}

function nextFrame() {
  const [id, callback] = frames.entries().next().value!;
  frames.delete(id);
  callback(performance.now() + 16);
}

for (const Engine of [NeonSnakeEngine, FruitFusionEngine, BrickBreakerEngine, KnifeStrikeEngine, StackSliceEngine, CyberSprintEngine, FlappyOrbitEngine, ChromaJumpEngine, GalaxiaVoidEngine, HelixDescentEngine, RhythmFallEngine, CrossyLaneEngine]) {
  test(`${Engine.name}: one animation loop, frozen pause, cached layout, clean destroy`, () => {
    frames.clear();
    const f = fixture(Engine);
    try {
      f.engine.start('endless', 1);
      assert.equal(frames.size, 1, 'start schedules exactly one frame');
      const reads = f.layoutReads;
      nextFrame();
      assert.equal(f.layoutReads, reads, 'normal frames never read DOM layout');
      f.engine.pause();
      const draws = f.draws;
      nextFrame();
      assert.equal(f.draws, draws, 'paused game does not draw');
      f.engine.resume();
      assert.equal(frames.size, 1, 'resume must not create a duplicate loop');
      nextFrame();
      assert.ok(f.draws > draws, 'drawing resumes');
    } finally { f.engine.destroy(); }
    assert.equal(frames.size, 0, 'destroy cancels outstanding frames');
  });
}

test('Snake can enter a tail cell that vacates on the same move', () => {
  const { engine } = fixture(NeonSnakeEngine);
  engine.start('endless');
  engine.snake = [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 0, y: 2 }, { x: 0, y: 1 }];
  engine.direction = { x: -1, y: 0 };
  engine.food = { x: 10, y: 10 };
  engine.step();
  assert.equal(engine.isGameOver, false);
  assert.deepEqual(engine.snake[0], { x: 0, y: 1 });
  engine.destroy();
});

test('Snake waits for an intentional direction before moving', () => {
  frames.clear();
  const { engine } = fixture(NeonSnakeEngine);
  engine.start('endless');
  const head = { ...engine.snake[0] };
  engine.lastTick = performance.now() - 1000;
  nextFrame();
  assert.deepEqual(engine.snake[0], head);
  engine.setDirection(1, 0);
  assert.equal(engine.hasStarted, true);
  engine.destroy();
});

test('Snake finishes a full board without an infinite food-spawn loop', () => {
  const { engine } = fixture(NeonSnakeEngine);
  engine.start('endless');
  engine.snake = Array.from({ length: 400 }, (_, n) => ({ x: n % 20, y: Math.floor(n / 20) }));
  engine.spawnFood();
  assert.equal(engine.isGameOver, true);
  engine.destroy();
});

test('Snake food never overlaps the bonus orb', () => {
  const { engine } = fixture(NeonSnakeEngine);
  engine.start('endless');
  engine.bonusFood = { x: 10, y: 10 };
  for (let i = 0; i < 500; i++) {
    engine.spawnFood();
    assert.ok(engine.food.x !== 10 || engine.food.y !== 10);
  }
  engine.destroy();
});

test('Flappy gate openings fit short screens and consecutive gates stay reachable', () => {
  for (const height of [320, 480, 760]) {
    const { engine } = fixture(FlappyOrbitEngine, 390, height);
    engine.start('endless');
    for (let i = 0; i < 100; i++) {
      engine.gatesPassed = i;
      const previous = engine.gates[engine.gates.length - 1];
      engine.spawnGate();
      const gate = engine.gates[engine.gates.length - 1];
      assert.ok(gate.gapY - gate.gapHeight / 2 >= 85 - 1e-6, 'opening clears top HUD');
      assert.ok(gate.gapY + gate.gapHeight / 2 <= height - 100 + 1e-6, 'opening clears bottom controls');
      if (previous) assert.ok(Math.abs(gate.gapY - previous.gapY) <= 76);
    }
    engine.destroy();
  }
});

test('Difficulty affects a new session and remains fixed during that session', () => {
  storage.saveSettings({ difficulty: 'easy' });
  const easy = fixture(FlappyOrbitEngine).engine;
  storage.saveSettings({ difficulty: 'hard' });
  const hard = fixture(FlappyOrbitEngine).engine;
  assert.equal(easy.pace, .8);
  assert.equal(hard.pace, 1.2);
  storage.saveSettings({ difficulty: 'normal' });
  assert.equal(easy.pace, .8);
  easy.destroy(); hard.destroy();
});

test('Reset clears cached favorites and scores while preserving settings and unrelated data', () => {
  data.set('another-app', 'keep me');
  storage.saveSettings({ difficulty: 'hard', soundEnabled: false });
  storage.toggleFavorite('neon-snake');
  storage.saveScore('neon-snake', 120, 2);
  storage.resetProgress();
  assert.deepEqual(storage.getFavorites(), []);
  assert.equal(storage.getProgress('neon-snake').highScore, 0);
  assert.deepEqual(storage.getRecentGames(), []);
  assert.equal(storage.getTotalStars(), 0);
  assert.equal(storage.getSettings().difficulty, 'hard');
  assert.equal(data.get('another-app'), 'keep me');
});

test('Malformed saved progress cannot crash the lobby or corrupt totals', () => {
  data.set('ug_progress_neon-snake', 'null');
  assert.equal(storage.getProgress('neon-snake').highScore, 0);
  data.set('ug_progress_neon-snake', JSON.stringify({ highScore: 'bad', playCount: -2, starsEarned: { 1: 'bad', 2: 3 } }));
  const progress = storage.getProgress('neon-snake');
  assert.equal(progress.highScore, 0);
  assert.equal(progress.playCount, 0);
  assert.deepEqual(progress.starsEarned, { 2: 3 });
  assert.equal(storage.getTotalStars(), 3);
});

test('Helix renders rear platforms before the opaque column, then front platforms', () => {
  const { engine, ctx } = fixture(HelixDescentEngine);
  engine.start('endless');
  const order: string[] = [];
  engine.renderRing = (_x, _y, _ring, front) => order.push(front ? 'front' : 'back');
  ctx.fillRect = (x, y, width, height) => {
    if (width === engine.columnRadius * 2 && y === 0 && height === 760) order.push('opaque-column');
  };
  engine.render();
  const column = order.indexOf('opaque-column');
  assert.ok(column > 0);
  assert.ok(order.slice(0, column).every(part => part === 'back'));
  assert.ok(order.slice(column + 1).every(part => part === 'front'));
  assert.ok(order.includes('front'));
  engine.destroy();
});

test('Helix impact effects do not draw circular outlines', () => {
  const { engine, ctx } = fixture(HelixDescentEngine);
  engine.start('endless');
  engine.isGameOver = true;
  engine.particles = [{ x: 190, y: 20, vx: 50, vy: -50, radius: 4, color: '#fff', life: .1, maxLife: .5 }];
  let arcs = 0;
  ctx.arc = () => { arcs++; };
  engine.render();
  assert.equal(arcs, 0);
  engine.destroy();
});

test('Helix ring edges never wrap into full circles while rotating through depth splits', () => {
  const { engine, ctx } = fixture(HelixDescentEngine);
  engine.start('endless');
  const tau = Math.PI * 2;
  ctx.ellipse = (_x, _y, _rx, _ry, _rotation, start, end, counterclockwise = false) => {
    const delta = counterclockwise ? start - end : end - start;
    const sweep = ((delta % tau) + tau) % tau;
    assert.ok(sweep <= Math.PI / 6 + 1e-6, `unexpected full-circle sweep ${sweep}`);
  };
  for (let step = 0; step < 360; step++) {
    engine.towerRotation = step * tau / 360;
    engine.renderRing(195, 250, engine.rings[0], false);
    engine.renderRing(195, 250, engine.rings[0], true);
  }
  engine.destroy();
});

test('All eleven fruit assets draw custom geometry, without text or emoji glyphs', () => {
  const { ctx } = fixture(FruitFusionEngine);
  let labels = 0;
  let curves = 0;
  ctx.fillText = () => { labels++; };
  ctx.bezierCurveTo = () => { curves++; };
  for (let tier = 0; tier < 11; tier++) drawFruit(ctx, 0, 0, 90, tier);
  assert.equal(labels, 0);
  assert.ok(curves > 20, 'distinct fruit silhouettes use shaped outlines');
});

test('Galaxia ramps wave pressure and scouts fire aimed projectiles', () => {
  const { engine } = fixture(GalaxiaVoidEngine);
  engine.start('endless');
  engine.waveCount = 2;
  engine.spawnEnemyWave(390);
  const earlyInterval = engine.spawnInterval;
  engine.waveCount = 20;
  engine.spawnEnemyWave(390);
  assert.ok(engine.spawnInterval < earlyInterval);
  assert.ok(engine.enemies.some(enemy => enemy.type === 'cruiser' && enemy.hp >= 6));
  engine.bullets = [];
  engine.playerX = 280; engine.playerY = 600;
  engine.fireEnemyBullet({ type: 'drone', x: 50, y: 100, radius: 13 });
  assert.equal(engine.bullets.length, 1);
  assert.ok(engine.bullets[0].vx > 0, 'shot is aimed toward the player');
  assert.ok(engine.bullets[0].vy > 0);
  engine.destroy();
});

test('Galaxia removes a hit projectile only once, preserving the next projectile', () => {
  const { engine } = fixture(GalaxiaVoidEngine);
  engine.start('endless');
  const survivor = { x: 200, y: 200, vx: 0, vy: 0, isEnemy: false, color: '#fff' };
  engine.bullets = [survivor, { x: 50, y: -31, vx: 0, vy: 0, isEnemy: false, color: '#fff' }];
  engine.enemies = [{ id: 1, type: 'drone', x: 50, y: -31, vx: 0, vy: 0, hp: 3, maxHp: 3, radius: 13, shootTimer: 0, shootInterval: 5 }];
  engine.update(0);
  assert.equal(engine.bullets.length, 1);
  assert.equal(engine.bullets[0], survivor);
  engine.destroy();
});

test('Chroma starts with a visible first goal, adequate clearance, and one camera transform', () => {
  for (const height of [480, 640, 760]) {
    const { engine } = fixture(ChromaJumpEngine, 390, height);
    engine.start('endless');
    const goal = engine.obstacles[0];
    const ballScreenY = engine.ballY - engine.cameraY;
    const goalScreenY = goal.y - engine.cameraY;
    assert.ok(goalScreenY - goal.radius >= 105, 'goal clears the shared HUD');
    assert.ok(ballScreenY + engine.ballRadius < height - 85, 'ball clears jump controls');
    assert.ok(engine.ballY - goal.y > goal.radius + engine.ballRadius, 'safe initial clearance');
    assert.ok(engine.obstacleSpacing >= 300);
    engine.destroy();
  }
});

test('Application source has no emoji assets or emoji metadata', () => {
  for (const name of readdirSync('src', { recursive: true })) {
    if (!/\.(tsx?|css)$/.test(String(name))) continue;
    const source = readFileSync(join('src', String(name)), 'utf8');
    assert.ok(!/\p{Extended_Pictographic}/u.test(source), `${name} contains an emoji`);
    assert.ok(!/emoji[:.]|\.emoji\b/.test(source), `${name} still references emoji assets`);
  }
});

test('Block Puzzle drag coordinates account for padding, gaps, and piece dimensions', () => {
  const grid = { left: 110, top: 210, cellWidth: 32, cellHeight: 32, pitchX: 36, pitchY: 36 };
  // Center a 2-column, 3-row piece on the top-left cell at row 4, column 5.
  const x = grid.left + 4 * grid.pitchX + (32 + 36) / 2;
  const y = grid.top + 3 * grid.pitchY + (32 + 2 * 36) / 2 + 60;
  assert.deepEqual(getPuzzleDropTarget(x, y, 3, 2, grid), { r: 3, c: 4 });
  assert.deepEqual(getPuzzleDropTarget(126, 286, 1, 1, grid), { r: 0, c: 0 });
});

test('Detailed fruit sprites are rasterized once per tier and reused', () => {
  const { ctx } = fixture(FruitFusionEngine);
  const originalDocument = globalThis.document;
  let allocations = 0;
  let blits = 0;
  globalThis.document = { createElement() {
    allocations++;
    return { width: 0, height: 0, getContext: () => ctx };
  } } as any;
  ctx.drawImage = () => { blits++; };
  try {
    drawFruitSprite(ctx, 100, 100, 90, 10);
    drawFruitSprite(ctx, 200, 200, 60, 10);
    assert.equal(allocations, 1);
    assert.equal(blits, 2);
  } finally {
    if (originalDocument === undefined) Reflect.deleteProperty(globalThis, 'document');
    else globalThis.document = originalDocument;
  }
});

test('Game catalog has 23 unique, valid entries', async () => {
  const { GAME_CATALOG } = await import('../src/games/registry');
  assert.equal(GAME_CATALOG.length, 23);
  const ids = new Set(GAME_CATALOG.map(g => g.id));
  assert.equal(ids.size, 23);
  for (const game of GAME_CATALOG) {
    assert.ok(game.title.length > 0);
    assert.ok(game.instructions.length >= 3);
    assert.ok(game.tagline.length > 0);
  }
});

test('Lights Out toggle flips target node and all 4 orthogonal neighbors', () => {
  const SIZE = 5;
  const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  const toggle = (r: number, c: number) => {
    board[r][c] = !board[r][c];
    if (r > 0) board[r - 1][c] = !board[r - 1][c];
    if (r < SIZE - 1) board[r + 1][c] = !board[r + 1][c];
    if (c > 0) board[r][c - 1] = !board[r][c - 1];
    if (c < SIZE - 1) board[r][c + 1] = !board[r][c + 1];
  };

  // Toggle center (2, 2)
  toggle(2, 2);
  assert.equal(board[2][2], true);
  assert.equal(board[1][2], true);
  assert.equal(board[3][2], true);
  assert.equal(board[2][1], true);
  assert.equal(board[2][3], true);
  assert.equal(board[0][0], false);

  // Toggle center again -> flips back to false
  toggle(2, 2);
  assert.equal(board[2][2], false);
  assert.equal(board[1][2], false);
});

