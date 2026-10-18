export interface PuzzleGridGeometry {
  left: number;
  top: number;
  cellWidth: number;
  cellHeight: number;
  pitchX: number;
  pitchY: number;
}

/** Match the dragged sprite to the actual padded board, including its cell gaps. */
export function getPuzzleDropTarget(
  x: number,
  y: number,
  rows: number,
  cols: number,
  grid: PuzzleGridGeometry,
) {
  const width = grid.cellWidth + (cols - 1) * grid.pitchX;
  const height = grid.cellHeight + (rows - 1) * grid.pitchY;
  return {
    r: Math.round((y - 60 - height / 2 - grid.top) / grid.pitchY),
    c: Math.round((x - width / 2 - grid.left) / grid.pitchX),
  };
}
