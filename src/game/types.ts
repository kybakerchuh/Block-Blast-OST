export type BlockColor =
  | 'ruby'
  | 'cobalt'
  | 'emerald'
  | 'amber'
  | 'violet'
  | 'cyan'
  | 'coral';

export type GemType = 'ruby' | 'sapphire' | 'emerald' | 'diamond';

export interface GridCell {
  color: BlockColor;
  gem?: GemType;
}

export type BoardGrid = (GridCell | null)[][];

export interface BlockShape {
  id: string;
  name: string;
  matrix: number[][]; // 1 = occupied, 0 = empty
  color: BlockColor;
  cellCount: number;
}

export interface TraySlot {
  slotId: string;
  shape: BlockShape | null;
}

export type GameMode = 'classic' | 'adventure';

export interface AdventureLevel {
  level: number;
  title: string;
  targetScore: number;
  gemTargets: Partial<Record<GemType, number>>;
  initialBoard: BoardGrid;
}

export interface FloatingPopup {
  id: string;
  text: string;
  subtext?: string;
  x: number;
  y: number;
  tone: 'gold' | 'emerald' | 'cyan' | 'rose';
}
