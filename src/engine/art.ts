/** Original canvas assets. All geometry is local, scalable, and independent of fonts. */
type Context = CanvasRenderingContext2D;
const fruitSprites = new Map<number, HTMLCanvasElement>();

/** Rasterize detailed fruit once per tier, then reuse it during every animation frame. */
export function drawFruitSprite(
  ctx: Context,
  x: number,
  y: number,
  radius: number,
  tier: number,
) {
  if (typeof document === "undefined") {
    drawFruit(ctx, x, y, radius, tier);
    return;
  }
  let sprite = fruitSprites.get(tier);
  if (!sprite) {
    sprite = document.createElement("canvas");
    sprite.width = 384;
    sprite.height = 384;
    const spriteContext = sprite.getContext("2d");
    if (!spriteContext) {
      drawFruit(ctx, x, y, radius, tier);
      return;
    }
    drawFruit(spriteContext, 192, 192, 185, tier);
    fruitSprites.set(tier, sprite);
  }
  const size = (radius * 384) / 185;
  ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
}

export function polygon(
  ctx: Context,
  points: number[][],
  fill: string | CanvasGradient,
  stroke?: string,
) {
  ctx.beginPath();
  points.forEach(([x, y], index) =>
    index ? ctx.lineTo(x, y) : ctx.moveTo(x, y),
  );
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

export function drawStar(
  ctx: Context,
  x: number,
  y: number,
  radius: number,
  color = "#ffe58a",
) {
  ctx.save();
  ctx.translate(x, y);
  const vertices = Array.from({ length: 10 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? radius * 0.48 : radius;
    return [Math.cos(angle) * r, Math.sin(angle) * r];
  });
  polygon(ctx, vertices, color, "#fff3ba");
  polygon(ctx, [[0, 0], vertices[0], vertices[1], vertices[2]], "#ffffff70");
  ctx.restore();
}

export function drawHeart(
  ctx: Context,
  x: number,
  y: number,
  size: number,
  active = true,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 20, size / 20);
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.bezierCurveTo(-20, -3, -8, -15, 0, -6);
  ctx.bezierCurveTo(8, -15, 20, -3, 0, 8);
  ctx.fillStyle = active ? "#fb718e" : "#33435d";
  ctx.fill();
  ctx.strokeStyle = active ? "#ffb2c4" : "#53627b";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

export function drawFruit(
  ctx: Context,
  x: number,
  y: number,
  radius: number,
  tier: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(radius / 100, radius / 100);
  const colors = [
    "#d92b54",
    "#ef4267",
    "#8657d1",
    "#edcd3d",
    "#f58b26",
    "#d8474d",
    "#a8c853",
    "#f5a098",
    "#e6ab3d",
    "#9fcf82",
    "#f1737e",
  ];
  const lights = [
    "#ff7e92",
    "#ff8e9d",
    "#c6a1f0",
    "#fff4a3",
    "#ffc66a",
    "#ff8d8b",
    "#e3ef99",
    "#ffd6b9",
    "#ffe28c",
    "#d1edac",
    "#ffa2a5",
  ];
  const color = colors[tier] ?? colors[0];
  const gradient = ctx.createLinearGradient(-45, -75, 60, 90);
  gradient.addColorStop(0, lights[tier] ?? lights[0]);
  gradient.addColorStop(1, color);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const fill = () => {
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = "#331f3540";
    ctx.lineWidth = 3;
    ctx.stroke();
  };
  const leaf = (lx: number, ly: number, angle = 0, scale = 1) => {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-8, -24, 18, -38, 36, -27);
    ctx.bezierCurveTo(32, -8, 16, 4, 0, 0);
    ctx.fillStyle = "#5b994c";
    ctx.fill();
    ctx.strokeStyle = "#b3d783";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, -2);
    ctx.lineTo(26, -23);
    ctx.stroke();
    ctx.restore();
  };
  const stem = (sx: number, sy: number, ex: number, ey: number) => {
    ctx.strokeStyle = "#637347";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx - 15, ey, ex, ey);
    ctx.stroke();
  };
  const glint = (gx: number, gy: number, width = 13) => {
    ctx.fillStyle = "#fff9";
    ctx.beginPath();
    ctx.ellipse(gx, gy, width, width * 0.42, -0.65, 0, Math.PI * 2);
    ctx.fill();
  };
  if (tier === 0) {
    stem(-34, 0, 15, -82);
    stem(36, 0, 15, -82);
    leaf(12, -69, 0.4, 0.75);
    for (const [cx, cy] of [
      [-37, 29],
      [37, 24],
    ]) {
      ctx.beginPath();
      ctx.arc(cx, cy, 41, 0, Math.PI * 2);
      fill();
      glint(cx - 13, cy - 17, 10);
    }
  } else if (tier === 1) {
    ctx.beginPath();
    ctx.moveTo(0, -66);
    ctx.bezierCurveTo(95, -87, 98, -22, 35, 65);
    ctx.quadraticCurveTo(0, 107, -35, 65);
    ctx.bezierCurveTo(-98, -22, -95, -87, 0, -66);
    fill();
    polygon(
      ctx,
      [
        [-57, -60],
        [-28, -57],
        [-23, -83],
        [0, -64],
        [20, -88],
        [29, -59],
        [59, -60],
        [31, -35],
        [0, -46],
        [-30, -34],
      ],
      "#609c53",
    );
    ctx.fillStyle = "#ffe2a1";
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 4; col++) {
        const sx = -43 + col * 28 + (row % 2) * 6,
          sy = -28 + row * 23;
        if (Math.abs(sx) < 62 - row * 9) {
          ctx.beginPath();
          ctx.ellipse(sx, sy, 3, 5, 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    glint(-44, -21, 12);
  } else if (tier === 2) {
    stem(0, -38, 8, -82);
    leaf(2, -58, -0.4);
    for (const [cx, cy] of [
      [-33, -30],
      [25, -30],
      [-53, 13],
      [1, 9],
      [50, 13],
      [-26, 51],
      [24, 50],
      [0, 78],
    ]) {
      ctx.beginPath();
      ctx.arc(cx, cy, 25, 0, Math.PI * 2);
      fill();
      glint(cx - 7, cy - 9, 6);
    }
  } else if (tier === 3) {
    ctx.save();
    ctx.rotate(-0.32);
    ctx.beginPath();
    ctx.moveTo(-96, 0);
    ctx.bezierCurveTo(-67, -78, 66, -75, 96, 0);
    ctx.bezierCurveTo(65, 78, -66, 77, -96, 0);
    fill();
    glint(-38, -29, 18);
    ctx.restore();
    leaf(48, -37, 0.1, 0.8);
  } else if (tier === 4) {
    ctx.beginPath();
    ctx.ellipse(0, 7, 88, 82, 0, 0, Math.PI * 2);
    fill();
    ctx.fillStyle = "#b861292e";
    for (let i = 0; i < 35; i++) {
      const a = i * 2.399,
        r = 15 + Math.sqrt(i) * 11;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r, Math.sin(a) * r + 10, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    stem(0, -68, 9, -85);
    leaf(1, -69, 0.6, 0.85);
    glint(-36, -29, 17);
  } else if (tier === 5 || tier === 7) {
    ctx.beginPath();
    ctx.moveTo(0, -60);
    ctx.bezierCurveTo(-69, -106, -111, -36, -78, 33);
    ctx.bezierCurveTo(-51, 97, -19, 88, 0, 76);
    ctx.bezierCurveTo(28, 96, 60, 87, 82, 29);
    ctx.bezierCurveTo(109, -39, 66, -101, 0, -60);
    fill();
    stem(0, -61, 10, -88);
    leaf(9, -68, 0.2, 0.8);
    glint(-43, -30, 15);
    if (tier === 7) {
      ctx.strokeStyle = "#d575795c";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(1, -47);
      ctx.bezierCurveTo(-19, -9, 22, 46, 0, 76);
      ctx.stroke();
    }
  } else if (tier === 6) {
    ctx.beginPath();
    ctx.moveTo(0, -79);
    ctx.bezierCurveTo(-36, -87, -31, -24, -61, 3);
    ctx.bezierCurveTo(-110, 51, -67, 90, 0, 88);
    ctx.bezierCurveTo(73, 91, 101, 47, 59, 2);
    ctx.bezierCurveTo(30, -28, 32, -86, 0, -79);
    fill();
    stem(0, -78, 19, -96);
    leaf(13, -77, 0.1, 0.7);
    glint(-32, 20, 13);
    ctx.fillStyle = "#82774755";
    for (let i = 0; i < 13; i++) {
      ctx.beginPath();
      ctx.arc(
        Math.sin(i * 2.4) * 51,
        20 + Math.cos(i * 2.4) * 45,
        1.7,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  } else if (tier === 8) {
    ctx.beginPath();
    ctx.roundRect(-67, -44, 134, 137, 46);
    fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = "#a96e365c";
    ctx.lineWidth = 3;
    for (let i = -160; i < 170; i += 27) {
      ctx.beginPath();
      ctx.moveTo(i, -60);
      ctx.lineTo(i + 150, 110);
      ctx.moveTo(i + 150, -60);
      ctx.lineTo(i, 110);
      ctx.stroke();
    }
    ctx.restore();
    polygon(
      ctx,
      [
        [-48, -41],
        [-70, -85],
        [-27, -60],
        [-22, -100],
        [0, -67],
        [23, -100],
        [30, -58],
        [70, -84],
        [47, -40],
        [0, -28],
      ],
      "#5b9754",
    );
    glint(-34, -5, 11);
  } else if (tier === 9) {
    ctx.beginPath();
    ctx.ellipse(0, 6, 88, 84, 0, 0, Math.PI * 2);
    fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = "#f2efb3a8";
    ctx.lineWidth = 2;
    for (let i = -180; i < 180; i += 22) {
      ctx.beginPath();
      ctx.moveTo(i, -95);
      ctx.lineTo(i + 185, 105);
      ctx.moveTo(i + 185, -95);
      ctx.lineTo(i, 105);
      ctx.stroke();
    }
    ctx.restore();
    leaf(0, -68, 0.5, 0.65);
    glint(-37, -29, 16);
  } else {
    ctx.beginPath();
    ctx.moveTo(-96, -33);
    ctx.arc(0, -33, 96, 0, Math.PI);
    ctx.closePath();
    ctx.fillStyle = "#42866b";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-87, -33);
    ctx.arc(0, -33, 87, 0, Math.PI);
    ctx.closePath();
    ctx.fillStyle = "#e4edb7";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-78, -33);
    ctx.arc(0, -33, 78, 0, Math.PI);
    ctx.closePath();
    fill();
    ctx.fillStyle = "#553846";
    for (const [sx, sy] of [
      [-47, -9],
      [-22, 21],
      [12, 28],
      [45, -5],
      [0, -10],
    ]) {
      ctx.beginPath();
      ctx.ellipse(sx, sy, 3.5, 6, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawShip(
  ctx: Context,
  x: number,
  y: number,
  size: number,
  kind: "player" | "drone" | "cruiser" | "boss" | "probe" = "player",
  time = 0,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  const enemy = kind === "drone" || kind === "cruiser" || kind === "boss";
  if (kind === "probe") ctx.rotate(Math.PI / 2);
  if (enemy) ctx.rotate(Math.PI);
  const main = enemy
    ? kind === "drone"
      ? "#c5a2f8"
      : kind === "cruiser"
        ? "#fb8eab"
        : "#b59bff"
    : "#c7eaff";
  const dark = enemy ? "#704b92" : "#377ea4";
  const flame = 12 + Math.sin(time * 28) * 3;
  for (const side of [-1, 1]) {
    polygon(
      ctx,
      [
        [side * 9, 9],
        [side * 13, 9],
        [side * 11, flame + 8],
      ],
      enemy ? "#ff84a8" : "#ffc87e",
    );
    polygon(
      ctx,
      [
        [side * 5, -8],
        [side * 22, 11],
        [side * 21, 18],
        [side * 5, 8],
      ],
      dark,
      "#ffffff40",
    );
    polygon(
      ctx,
      [
        [side * 8, -3],
        [side * 17, 10],
        [side * 7, 7],
      ],
      main,
    );
    ctx.fillStyle = enemy ? "#f8b8c7" : "#7df5e7";
    ctx.fillRect(side * 16 - 2, 6, 4, 8);
  }
  polygon(
    ctx,
    [
      [0, -25],
      [8, -5],
      [6, 16],
      [0, 19],
      [-6, 16],
      [-8, -5],
    ],
    main,
    "#e8f5ff90",
  );
  polygon(
    ctx,
    [
      [0, -19],
      [0, 14],
      [-5, 7],
      [-5, -3],
    ],
    "#ffffff55",
  );
  polygon(
    ctx,
    [
      [0, -11],
      [4, -1],
      [3, 7],
      [-3, 7],
      [-4, -1],
    ],
    enemy ? "#ec557e" : "#24677e",
    "#a7e5fa",
  );
  ctx.fillStyle = "#fff2c2";
  ctx.fillRect(-1, -8, 2, 6);
  if (kind === "boss") {
    polygon(
      ctx,
      [
        [-20, -2],
        [-29, 17],
        [-13, 20],
        [-8, 12],
      ],
      "#684583",
      "#e1b1fb",
    );
    polygon(
      ctx,
      [
        [20, -2],
        [29, 17],
        [13, 20],
        [8, 12],
      ],
      "#684583",
      "#e1b1fb",
    );
  }
  ctx.restore();
}

export function drawPowerup(
  ctx: Context,
  x: number,
  y: number,
  type: "spread" | "shield" | "bomb",
) {
  ctx.save();
  ctx.translate(x, y);
  polygon(
    ctx,
    [
      [0, -15],
      [13, -8],
      [13, 8],
      [0, 15],
      [-13, 8],
      [-13, -8],
    ],
    "#162941",
    type === "spread" ? "#ffe19a" : type === "shield" ? "#8ee5ff" : "#ff9fbe",
  );
  ctx.strokeStyle = "#f1f6ff";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  if (type === "spread") {
    for (const dx of [-6, 0, 6]) {
      ctx.moveTo(0, 7);
      ctx.lineTo(dx, -6);
      ctx.moveTo(dx - 2, -4);
      ctx.lineTo(dx, -7);
      ctx.lineTo(dx + 2, -4);
    }
  } else if (type === "shield") {
    ctx.moveTo(-6, -6);
    ctx.lineTo(0, -9);
    ctx.lineTo(6, -6);
    ctx.lineTo(5, 3);
    ctx.lineTo(0, 8);
    ctx.lineTo(-5, 3);
    ctx.closePath();
  } else {
    ctx.arc(0, 2, 6, 0, Math.PI * 2);
    ctx.moveTo(0, -4);
    ctx.quadraticCurveTo(0, -12, 6, -9);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawSlab(
  ctx: Context,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  active = false,
) {
  const depth = Math.min(9, width * 0.12);
  ctx.save();
  polygon(
    ctx,
    [
      [x, y],
      [x + depth, y - depth],
      [x + width - depth, y - depth],
      [x + width, y],
    ],
    color,
  );
  ctx.fillStyle = "#ffffff45";
  ctx.fill();
  const grad = ctx.createLinearGradient(x, y, x, y + height);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "#1a234e");
  polygon(
    ctx,
    [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height],
    ],
    grad,
    active ? "#e4fffa" : "#ffffff35",
  );
  ctx.strokeStyle = "#ffffff65";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 3);
  ctx.lineTo(x + width - 4, y + 3);
  ctx.stroke();
  if (width > 28) {
    ctx.strokeStyle = "#101b383f";
    ctx.beginPath();
    ctx.moveTo(x + width * 0.25, y + 7);
    ctx.lineTo(x + width * 0.25, y + height - 3);
    ctx.moveTo(x + width * 0.7, y + 7);
    ctx.lineTo(x + width * 0.7, y + height - 3);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawKnife(ctx: Context, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  const steel = ctx.createLinearGradient(-6, 0, 7, 0);
  steel.addColorStop(0, "#6c97b2");
  steel.addColorStop(0.45, "#f3fcff");
  steel.addColorStop(0.5, "#c9e5f1");
  steel.addColorStop(1, "#6b9daf");
  polygon(
    ctx,
    [
      [0, -34],
      [6, -12],
      [5, 7],
      [-5, 7],
      [-6, -12],
    ],
    steel,
    "#daeef6",
  );
  polygon(
    ctx,
    [
      [0, -29],
      [1, 4],
      [-3, 4],
    ],
    "#fff9",
  );
  ctx.fillStyle = "#e5b976";
  ctx.beginPath();
  ctx.roundRect(-9, 7, 18, 4, 2);
  ctx.fill();
  ctx.fillStyle = "#704d69";
  ctx.beginPath();
  ctx.roundRect(-4, 11, 8, 18, 2);
  ctx.fill();
  ctx.strokeStyle = "#ca93aa";
  ctx.lineWidth = 1;
  for (let i = 14; i < 28; i += 4) {
    ctx.beginPath();
    ctx.moveTo(-3, i);
    ctx.lineTo(3, i);
    ctx.stroke();
  }
  ctx.fillStyle = "#e5b976";
  ctx.beginPath();
  ctx.roundRect(-5, 28, 10, 4, 2);
  ctx.fill();
  ctx.restore();
}

export function drawRunner(ctx: Context, phase: number, sliding = false) {
  ctx.save();
  // The contact shadow stays small enough to read the player's actual lane.
  ctx.fillStyle = "#03091677";
  ctx.beginPath();
  ctx.ellipse(0, 17, 19, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  const step = Math.sin(phase) * 9;
  const limb = (points: number[][], color: string, width: number) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = "#14283c";
    ctx.lineWidth = width + 4;
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };
  if (sliding) ctx.rotate(-0.32);
  limb(
    [
      [-5, -1],
      [-9, 8 + step * 0.35],
      [-8 + step * 0.5, 18],
    ],
    "#7a96c0",
    7,
  );
  limb(
    [
      [5, -1],
      [9, 8 - step * 0.35],
      [8 - step * 0.5, 18],
    ],
    "#b4d5ee",
    7,
  );
  polygon(
    ctx,
    [
      [-9, -21],
      [9, -21],
      [11, -5],
      [5, 2],
      [-5, 2],
      [-11, -5],
    ],
    "#6ed8dc",
    "#c4f6ff",
  );
  ctx.fillStyle = "#203b58";
  ctx.fillRect(-4, -16, 8, 11);
  ctx.fillStyle = "#d2f5ff";
  ctx.fillRect(-1, -13, 2, 5);
  limb(
    [
      [-11, -18],
      [-16, -7 - step * 0.4],
      [-11, -2 - step * 0.5],
    ],
    "#8be1dc",
    5,
  );
  limb(
    [
      [11, -18],
      [16, -7 + step * 0.4],
      [11, -2 + step * 0.5],
    ],
    "#bef2e8",
    5,
  );
  ctx.fillStyle = "#dbe9fb";
  ctx.beginPath();
  ctx.roundRect(-10, -39, 20, 19, 7);
  ctx.fill();
  ctx.strokeStyle = "#7b8ead";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#263d68";
  ctx.beginPath();
  ctx.roundRect(-8, -34, 16, 7, 3);
  ctx.fill();
  ctx.fillStyle = "#78edec";
  ctx.fillRect(-6, -32, 9, 2);
  ctx.fillStyle = "#ffbc8c";
  ctx.fillRect(6, -31, 2, 3);
  ctx.fillStyle = "#314865";
  ctx.beginPath();
  ctx.roundRect(-12, -24, 5, 17, 2);
  ctx.fill();
  ctx.restore();
}

export function drawCar(
  ctx: Context,
  x: number,
  y: number,
  width: number,
  color: string,
  right: boolean,
) {
  ctx.save();
  ctx.translate(x + width / 2, y);
  if (!right) ctx.scale(-1, 1);
  const half = width / 2;
  ctx.fillStyle = "#070d1c";
  for (const wx of [-half + 12, half - 12])
    for (const wy of [-13, 13]) {
      ctx.beginPath();
      ctx.roundRect(wx - 7, wy - 4, 14, 8, 3);
      ctx.fill();
    }
  const paint = ctx.createLinearGradient(0, -14, 0, 14);
  paint.addColorStop(0, "#ffffff");
  paint.addColorStop(0.12, color);
  paint.addColorStop(1, color);
  ctx.fillStyle = paint;
  ctx.beginPath();
  ctx.roundRect(-half, -13, width, 26, 7);
  ctx.fill();
  ctx.strokeStyle = "#e7f1ff7a";
  ctx.lineWidth = 1;
  ctx.stroke();
  polygon(
    ctx,
    [
      [-half + 17, -10],
      [half - 17, -10],
      [half - 12, 10],
      [-half + 14, 10],
    ],
    "#243d57",
    "#b4dbe7",
  );
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-half + 21, -9, Math.max(8, width - 42), 18, 2);
  ctx.fill();
  ctx.fillStyle = "#fff1c0";
  ctx.fillRect(half - 4, -9, 3, 6);
  ctx.fillRect(half - 4, 3, 3, 6);
  ctx.fillStyle = "#fa8b9e";
  ctx.fillRect(-half + 1, -8, 2, 5);
  ctx.fillRect(-half + 1, 3, 2, 5);
  ctx.strokeStyle = "#fff7";
  ctx.beginPath();
  ctx.moveTo(half - 9, -8);
  ctx.lineTo(half - 6, 8);
  ctx.stroke();
  ctx.restore();
}

export function drawLog(ctx: Context, x: number, y: number, width: number) {
  ctx.save();
  const bark = ctx.createLinearGradient(0, y - 14, 0, y + 14);
  bark.addColorStop(0, "#bf9362");
  bark.addColorStop(1, "#76503c");
  ctx.fillStyle = bark;
  ctx.beginPath();
  ctx.roundRect(x, y - 13, width, 26, 10);
  ctx.fill();
  ctx.strokeStyle = "#513b3d";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 12, y - 7 + i * 7);
    ctx.bezierCurveTo(
      x + width * 0.3,
      y - 12 + i * 8,
      x + width * 0.5,
      y - 2 + i * 5,
      x + width - 12,
      y - 8 + i * 7,
    );
    ctx.stroke();
  }
  for (const cx of [x + 8, x + width - 8]) {
    ctx.fillStyle = "#d5b17b";
    ctx.beginPath();
    ctx.ellipse(cx, y, 6, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#916448";
    ctx.beginPath();
    ctx.ellipse(cx, y, 3, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
