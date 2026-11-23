import { BLOCK_COLORS } from './shapes';
import { AdventureLevel, BlockColor, BoardGrid, GemType } from './types';
import { createEmptyBoard, GRID_SIZE } from './engine';

function buildBoardFromPattern(
  pattern: string[],
  gemMap: Record<string, GemType> = {}
): BoardGrid {
  const board = createEmptyBoard();
  const charColorMap: Record<string, BlockColor> = {
    R: 'ruby',
    B: 'cobalt',
    G: 'emerald',
    Y: 'amber',
    P: 'violet',
    C: 'cyan',
    O: 'coral',
  };

  for (let r = 0; r < Math.min(GRID_SIZE, pattern.length); r++) {
    const rowStr = pattern[r];
    for (let c = 0; c < Math.min(GRID_SIZE, rowStr.length); c++) {
      const ch = rowStr[c];
      if (ch === '.' || ch === ' ') continue;
      const gem = gemMap[ch];
      const color = charColorMap[ch] || BLOCK_COLORS[(r + c) % BLOCK_COLORS.length];
      board[r][c] = gem ? { color, gem } : { color };
    }
  }
  return board;
}

const HANDCRAFTED_LEVELS: AdventureLevel[] = [
  {
    level: 1,
    title: 'Warm-Up Gem Hunt',
    targetScore: 400,
    gemTargets: { ruby: 3 },
    initialBoard: buildBoardFromPattern(
      [
        '........',
        '..1..B..',
        '........',
        '.B.1.B..',
        '........',
        '..B..1..',
        '........',
        '........',
      ],
      { '1': 'ruby' }
    ),
  },
  {
    level: 2,
    title: 'Sapphire Cross',
    targetScore: 650,
    gemTargets: { sapphire: 4 },
    initialBoard: buildBoardFromPattern(
      [
        '........',
        '...2....',
        '..C.C...',
        '.2...2..',
        '..C.C...',
        '...2....',
        '........',
        '........',
      ],
      { '2': 'sapphire' }
    ),
  },
  {
    level: 3,
    title: 'Emerald Corners',
    targetScore: 850,
    gemTargets: { emerald: 4 },
    initialBoard: buildBoardFromPattern(
      [
        '3......3',
        '.G....G.',
        '........',
        '...GG...',
        '...GG...',
        '........',
        '.G....G.',
        '3......3',
      ],
      { '3': 'emerald' }
    ),
  },
  {
    level: 4,
    title: 'Twin Vaults',
    targetScore: 1000,
    gemTargets: { ruby: 3, sapphire: 3 },
    initialBoard: buildBoardFromPattern(
      [
        '........',
        '.1.BB.2.',
        '.R....C.',
        '.1....2.',
        '.R....C.',
        '.1.BB.2.',
        '........',
        '........',
      ],
      { '1': 'ruby', '2': 'sapphire' }
    ),
  },
  {
    level: 5,
    title: 'Diamond Bridge',
    targetScore: 1200,
    gemTargets: { diamond: 4, emerald: 2 },
    initialBoard: buildBoardFromPattern(
      [
        '........',
        '........',
        '.P4..4P.',
        '..3..3..',
        '.P4..4P.',
        '........',
        '..OOOO..',
        '........',
      ],
      { '3': 'emerald', '4': 'diamond' }
    ),
  },
  {
    level: 6,
    title: 'Checkerboard Run',
    targetScore: 1450,
    gemTargets: { ruby: 3, diamond: 3 },
    initialBoard: buildBoardFromPattern(
      [
        '.1.B.4..',
        '........',
        '..Y.1.P.',
        '........',
        '.4.G.1..',
        '........',
        '..B.4.C.',
        '........',
      ],
      { '1': 'ruby', '4': 'diamond' }
    ),
  },
  {
    level: 7,
    title: 'The Fortress',
    targetScore: 1700,
    gemTargets: { sapphire: 4, emerald: 4 },
    initialBoard: buildBoardFromPattern(
      [
        '........',
        '.2B..B2.',
        '.B....B.',
        '..3..3..',
        '..3..3..',
        '.G....G.',
        '.2G..G2.',
        '........',
      ],
      { '2': 'sapphire', '3': 'emerald' }
    ),
  },
  {
    level: 8,
    title: 'Crown Jewel Matrix',
    targetScore: 2000,
    gemTargets: { ruby: 3, sapphire: 3, diamond: 3 },
    initialBoard: buildBoardFromPattern(
      [
        '4......4',
        '.1....2.',
        '..R..C..',
        '...12...',
        '...21...',
        '..C..R..',
        '.2....1.',
        '4......4',
      ],
      { '1': 'ruby', '2': 'sapphire', '4': 'diamond' }
    ),
  },
];

export function getAdventureLevel(levelNum: number): AdventureLevel {
  const safeLevel = Math.max(1, Math.floor(levelNum));
  if (safeLevel <= HANDCRAFTED_LEVELS.length) {
    const template = HANDCRAFTED_LEVELS[safeLevel - 1];
    return {
      ...template,
      gemTargets: { ...template.gemTargets },
      initialBoard: template.initialBoard.map((row) =>
        row.map((cell) => (cell ? { ...cell } : null))
      ),
    };
  }

  // Deterministic procedural Adventure stages for Level 9+
  const board = createEmptyBoard();
  const gemTypes: GemType[] = ['ruby', 'sapphire', 'emerald', 'diamond'];
  const gemCount = Math.min(12, 6 + Math.floor((safeLevel - 8) / 2));
  const gemTargets: Partial<Record<GemType, number>> = {};

  let placed = 0;
  let seed = safeLevel * 7919;
  const nextRand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  while (placed < gemCount) {
    const r = Math.floor(nextRand() * GRID_SIZE);
    const c = Math.floor(nextRand() * GRID_SIZE);
    if (!board[r][c]) {
      const gem = gemTypes[placed % gemTypes.length];
      const color = BLOCK_COLORS[Math.floor(nextRand() * BLOCK_COLORS.length)];
      board[r][c] = { color, gem };
      gemTargets[gem] = (gemTargets[gem] || 0) + 1;
      placed++;
    }
  }

  // Add a few filler obstacle blocks (max 10)
  const fillers = Math.min(12, 4 + (safeLevel % 6));
  for (let i = 0; i < fillers; i++) {
    const r = Math.floor(nextRand() * GRID_SIZE);
    const c = Math.floor(nextRand() * GRID_SIZE);
    if (!board[r][c]) {
      board[r][c] = { color: BLOCK_COLORS[Math.floor(nextRand() * BLOCK_COLORS.length)] };
    }
  }

  return {
    level: safeLevel,
    title: `Stage ${safeLevel} Mastery`,
    targetScore: 1800 + (safeLevel - 8) * 350,
    gemTargets,
    initialBoard: board,
  };
}
