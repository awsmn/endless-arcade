import React, { useEffect, useRef } from "react";
import { drawFruit } from "../engine/art";

export function FruitAsset({
  tier,
  size = 32,
  name,
}: {
  tier: number;
  size?: number;
  name: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, size, size);
    drawFruit(ctx, size / 2, size / 2, size * 0.47, tier);
  }, [tier, size]);
  return (
    <canvas
      ref={ref}
      width={size * 2}
      height={size * 2}
      style={{ width: size, height: size }}
      role="img"
      aria-label={name}
    />
  );
}
