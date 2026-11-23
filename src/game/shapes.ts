import { BlockColor, BlockShape } from './types';

export const BLOCK_COLORS: BlockColor[] = [
  'ruby',
  'cobalt',
  'emerald',
  'amber',
  'violet',
  'cyan',
  'coral',
];

export const COLOR_STYLES: Record<
  BlockColor,
  {
    bg: string;
    borderTop: string;
    borderBottom: string;
    glow: string;
    hex: string;
  }
> = {
  ruby: {
    bg: 'bg-rose-500',
    borderTop: 'border-t-rose-300/80',
    borderBottom: 'border-b-rose-700',
    glow: 'shadow-rose-500/35',
    hex: '#F43F5E',
  },
  cobalt: {
    bg: 'bg-blue-500',
    borderTop: 'border-t-blue-300/80',
    borderBottom: 'border-b-blue-700',
    glow: 'shadow-blue-500/35',
    hex: '#3B82F6',
  },
  emerald: {
    bg: 'bg-emerald-500',
    borderTop: 'border-t-emerald-300/80',
    borderBottom: 'border-b-emerald-700',
    glow: 'shadow-emerald-500/35',
    hex: '#10B981',
  },
  amber: {
    bg: 'bg-amber-400',
    borderTop: 'border-t-amber-200/90',
    borderBottom: 'border-b-amber-600',
    glow: 'shadow-amber-400/35',
    hex: '#FBBF24',
  },
  violet: {
    bg: 'bg-violet-500',
    borderTop: 'border-t-violet-300/80',
    borderBottom: 'border-b-violet-700',
    glow: 'shadow-violet-500/35',
    hex: '#8B5CF6',
  },
  cyan: {
    bg: 'bg-cyan-400',
    borderTop: 'border-t-cyan-200/90',
    borderBottom: 'border-b-cyan-600',
    glow: 'shadow-cyan-400/35',
    hex: '#22D3EE',
  },
  coral: {
    bg: 'bg-orange-500',
    borderTop: 'border-t-orange-300/80',
    borderBottom: 'border-b-orange-700',
    glow: 'shadow-orange-500/35',
    hex: '#F97316',
  },
};

interface ShapeTemplate {
  id: string;
  name: string;
  matrix: number[][];
  weight: number;
}

export const SHAPE_TEMPLATES: ShapeTemplate[] = [
  { id: 'dot-1', name: '1x1', matrix: [[1]], weight: 4 },
  { id: 'bar-2h', name: '1x2', matrix: [[1, 1]], weight: 7 },
  { id: 'bar-2v', name: '2x1', matrix: [[1], [1]], weight: 7 },
  { id: 'bar-3h', name: '1x3', matrix: [[1, 1, 1]], weight: 8 },
  { id: 'bar-3v', name: '3x1', matrix: [[1], [1], [1]], weight: 8 },
  { id: 'bar-4h', name: '1x4', matrix: [[1, 1, 1, 1]], weight: 6 },
  { id: 'bar-4v', name: '4x1', matrix: [[1], [1], [1], [1]], weight: 6 },
  { id: 'bar-5h', name: '1x5', matrix: [[1, 1, 1, 1, 1]], weight: 4 },
  { id: 'bar-5v', name: '5x1', matrix: [[1], [1], [1], [1], [1]], weight: 4 },
  {
    id: 'sq-2',
    name: '2x2',
    matrix: [
      [1, 1],
      [1, 1],
    ],
    weight: 9,
  },
  {
    id: 'sq-3',
    name: '3x3',
    matrix: [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ],
    weight: 4,
  },
  {
    id: 'rect-2x3',
    name: '2x3',
    matrix: [
      [1, 1, 1],
      [1, 1, 1],
    ],
    weight: 3,
  },
  {
    id: 'rect-3x2',
    name: '3x2',
    matrix: [
      [1, 1],
      [1, 1],
      [1, 1],
    ],
    weight: 3,
  },
  {
    id: 'c3-tl',
    name: 'Corner TL',
    matrix: [
      [1, 1],
      [1, 0],
    ],
    weight: 5,
  },
  {
    id: 'c3-tr',
    name: 'Corner TR',
    matrix: [
      [1, 1],
      [0, 1],
    ],
    weight: 5,
  },
  {
    id: 'c3-bl',
    name: 'Corner BL',
    matrix: [
      [1, 0],
      [1, 1],
    ],
    weight: 5,
  },
  {
    id: 'c3-br',
    name: 'Corner BR',
    matrix: [
      [0, 1],
      [1, 1],
    ],
    weight: 5,
  },
  {
    id: 'big-l1',
    name: 'Big L1',
    matrix: [
      [1, 0, 0],
      [1, 0, 0],
      [1, 1, 1],
    ],
    weight: 3,
  },
  {
    id: 'big-l2',
    name: 'Big L2',
    matrix: [
      [1, 1, 1],
      [1, 0, 0],
      [1, 0, 0],
    ],
    weight: 3,
  },
  {
    id: 'big-l3',
    name: 'Big L3',
    matrix: [
      [1, 1, 1],
      [0, 0, 1],
      [0, 0, 1],
    ],
    weight: 3,
  },
  {
    id: 'big-l4',
    name: 'Big L4',
    matrix: [
      [0, 0, 1],
      [0, 0, 1],
      [1, 1, 1],
    ],
    weight: 3,
  },
  {
    id: 'l-4a',
    name: 'L4-A',
    matrix: [
      [1, 0],
      [1, 0],
      [1, 1],
    ],
    weight: 5,
  },
  {
    id: 'l-4b',
    name: 'L4-B',
    matrix: [
      [0, 1],
      [0, 1],
      [1, 1],
    ],
    weight: 5,
  },
  {
    id: 'l-4c',
    name: 'L4-C',
    matrix: [
      [1, 1, 1],
      [1, 0, 0],
    ],
    weight: 5,
  },
  {
    id: 'l-4d',
    name: 'L4-D',
    matrix: [
      [1, 1, 1],
      [0, 0, 1],
    ],
    weight: 5,
  },
  {
    id: 't-up',
    name: 'T-Up',
    matrix: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    weight: 4,
  },
  {
    id: 't-down',
    name: 'T-Down',
    matrix: [
      [1, 1, 1],
      [0, 1, 0],
    ],
    weight: 4,
  },
  {
    id: 's-h',
    name: 'S-Shape',
    matrix: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    weight: 3,
  },
  {
    id: 'z-h',
    name: 'Z-Shape',
    matrix: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    weight: 3,
  },
];

function countCells(matrix: number[][]): number {
  let count = 0;
  for (const row of matrix) {
    for (const val of row) {
      if (val === 1) count++;
    }
  }
  return count;
}

export function createRandomShape(templateOverride?: ShapeTemplate): BlockShape {
  let template = templateOverride;
  if (!template) {
    const totalWeight = SHAPE_TEMPLATES.reduce((sum, t) => sum + t.weight, 0);
    let r = Math.random() * totalWeight;
    template = SHAPE_TEMPLATES[0];
    for (const t of SHAPE_TEMPLATES) {
      r -= t.weight;
      if (r <= 0) {
        template = t;
        break;
      }
    }
  }
  const color = BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];
  return {
    id: `${template.id}-${Math.random().toString(36).slice(2, 8)}`,
    name: template.name,
    matrix: template.matrix.map((row) => [...row]),
    color,
    cellCount: countCells(template.matrix),
  };
}
