import { createRandomShape, SHAPE_TEMPLATES } from './shapes';
import { BlockShape, BoardGrid, GemType, TraySlot } from './types';

export const GRID_SIZE = 8;

export function createEmptyBoard(): BoardGrid {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null)
  );
}

export function cloneBoard(board: BoardGrid): BoardGrid {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function canPlaceShape(
  board: BoardGrid,
  shape: BlockShape,
  startRow: number,
  startCol: number
): boolean {
  const rows = shape.matrix.length;
  const cols = shape.matrix[0].length;
  if (
    startRow < 0 ||
    startCol < 0 ||
    startRow + rows > GRID_SIZE ||
    startCol + cols > GRID_SIZE
  ) {
    return false;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (shape.matrix[r][c] === 1 && board[startRow + r][startCol + c] !== null) {
        return false;
      }
    }
  }
  return true;
}

export function canShapeFitAnywhere(board: BoardGrid, shape: BlockShape): boolean {
  const rows = shape.matrix.length;
  const cols = shape.matrix[0].length;
  for (let r = 0; r <= GRID_SIZE - rows; r++) {
    for (let c = 0; c <= GRID_SIZE - cols; c++) {
      if (canPlaceShape(board, shape, r, c)) {
        return true;
      }
    }
  }
  return false;
}

export function hasAnyValidMove(board: BoardGrid, tray: TraySlot[]): boolean {
  for (const slot of tray) {
    if (slot.shape && canShapeFitAnywhere(board, slot.shape)) {
      return true;
    }
  }
  return false;
}

export function getPlacementClearPreview(
  board: BoardGrid,
  shape: BlockShape,
  startRow: number,
  startCol: number
): { rows: number[]; cols: number[] } {
  if (!canPlaceShape(board, shape, startRow, startCol)) {
    return { rows: [], cols: [] };
  }
  const simulated = cloneBoard(board);
  for (let r = 0; r < shape.matrix.length; r++) {
    for (let c = 0; c < shape.matrix[0].length; c++) {
      if (shape.matrix[r][c] === 1) {
        simulated[startRow + r][startCol + c] = { color: shape.color };
      }
    }
  }

  const rows: number[] = [];
  const cols: number[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    if (simulated[r].every((cell) => cell !== null)) {
      rows.push(r);
    }
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    let full = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (simulated[r][c] === null) {
        full = false;
        break;
      }
    }
    if (full) cols.push(c);
  }
  return { rows, cols };
}

export interface PlacementResult {
  nextBoard: BoardGrid;
  clearedRows: number[];
  clearedCols: number[];
  totalLinesCleared: number;
  isBoardEmpty: boolean;
  collectedGems: Partial<Record<GemType, number>>;
  basePoints: number;
  linePoints: number;
}

export function placeShapeOnBoard(
  board: BoardGrid,
  shape: BlockShape,
  startRow: number,
  startCol: number,
  comboStreak: number
): PlacementResult {
  const nextBoard = cloneBoard(board);
  for (let r = 0; r < shape.matrix.length; r++) {
    for (let c = 0; c < shape.matrix[0].length; c++) {
      if (shape.matrix[r][c] === 1) {
        nextBoard[startRow + r][startCol + c] = { color: shape.color };
      }
    }
  }

  const clearedRows: number[] = [];
  const clearedCols: number[] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    if (nextBoard[r].every((cell) => cell !== null)) {
      clearedRows.push(r);
    }
  }

  for (let c = 0; c < GRID_SIZE; c++) {
    let full = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (nextBoard[r][c] === null) {
        full = false;
        break;
      }
    }
    if (full) clearedCols.push(c);
  }

  const collectedGems: Partial<Record<GemType, number>> = {};
  const clearedCoords = new Set<string>();

  for (const r of clearedRows) {
    for (let c = 0; c < GRID_SIZE; c++) {
      clearedCoords.add(`${r},${c}`);
    }
  }
  for (const c of clearedCols) {
    for (let r = 0; r < GRID_SIZE; r++) {
      clearedCoords.add(`${r},${c}`);
    }
  }

  clearedCoords.forEach((key) => {
    const [rStr, cStr] = key.split(',');
    const r = Number(rStr);
    const c = Number(cStr);
    const cell = nextBoard[r][c];
    if (cell?.gem) {
      collectedGems[cell.gem] = (collectedGems[cell.gem] || 0) + 1;
    }
    nextBoard[r][c] = null;
  });

  const totalLinesCleared = clearedRows.length + clearedCols.length;
  let isBoardEmpty = true;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (nextBoard[r][c] !== null) {
        isBoardEmpty = false;
        break;
      }
    }
    if (!isBoardEmpty) break;
  }

  const basePoints = shape.cellCount * 10;
  let linePoints = 0;
  if (totalLinesCleared > 0) {
    // Multi-line + combo multiplier
    const lineMultiplier = totalLinesCleared * totalLinesCleared * 50;
    const comboBonus = comboStreak * 40 * totalLinesCleared;
    const boardClearBonus = isBoardEmpty ? 600 : 0;
    linePoints = lineMultiplier + comboBonus + boardClearBonus;
  }

  return {
    nextBoard,
    clearedRows,
    clearedCols,
    totalLinesCleared,
    isBoardEmpty,
    collectedGems,
    basePoints,
    linePoints,
  };
}

export function generateTray(board: BoardGrid): TraySlot[] {
  const slots: TraySlot[] = [0, 1, 2].map((idx) => ({
    slotId: `slot-${idx}-${Math.random().toString(36).slice(2, 7)}`,
    shape: createRandomShape(),
  }));

  // Ensure fairness: if none of the 3 generated pieces fit on the board,
  // try replacing one slot with a smaller shape that actually fits if any exists.
  if (!hasAnyValidMove(board, slots)) {
    const fittingTemplates = SHAPE_TEMPLATES.filter((t) => {
      const testShape = createRandomShape(t);
      return canShapeFitAnywhere(board, testShape);
    });
    if (fittingTemplates.length > 0) {
      // Pick from smaller fitting templates preferentially
      const sorted = [...fittingTemplates].sort((a, b) => {
        const aSize = a.matrix.flat().reduce((s, v) => s + v, 0);
        const bSize = b.matrix.flat().reduce((s, v) => s + v, 0);
        return aSize - bSize;
      });
      const pool = sorted.slice(0, Math.min(4, sorted.length));
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      slots[Math.floor(Math.random() * 3)].shape = createRandomShape(chosen);
    }
  }

  return slots;
}

export function reviveClearBoard(board: BoardGrid): BoardGrid {
  const next = cloneBoard(board);
  // Clear center 4x4 region (rows 2..5, cols 2..5) so remaining pieces have guaranteed room
  for (let r = 2; r <= 5; r++) {
    for (let c = 2; c <= 5; c++) {
      // Preserve adventure gems? No, if a gem is cleared on revive it counts as removed or let's keep gems safe?
      // Actually clearing non-gem cells first, or clearing center 4x4 completely gives space!
      if (!next[r][c]?.gem) {
        next[r][c] = null;
      }
    }
  }
  // If center 4x4 still had gems blocking, clear rows 3 and 4 non-gem or whole rows 0/7
  let emptyCount = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!next[r][c]) emptyCount++;
    }
  }
  if (emptyCount < 16) {
    for (let r = 2; r <= 5; r++) {
      for (let c = 2; c <= 5; c++) {
        next[r][c] = null;
      }
    }
  }
  return next;
}
