import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Diamond, Gem, Sparkles } from 'lucide-react';
import {
  canPlaceShape,
  getPlacementClearPreview,
  GRID_SIZE,
} from '../game/engine';
import { COLOR_STYLES } from '../game/shapes';
import { BlockShape, BoardGrid, FloatingPopup, GemType, TraySlot } from '../game/types';
import { soundEngine } from '../audio/soundEngine';

interface BlockBoardProps {
  board: BoardGrid;
  tray: TraySlot[];
  clearingRows: number[];
  clearingCols: number[];
  popups: FloatingPopup[];
  shaking: boolean;
  disabled: boolean;
  onPlaceShape: (slotIndex: number, row: number, col: number) => void;
}

interface DragState {
  slotIndex: number;
  shape: BlockShape;
  clientX: number;
  clientY: number;
  isTouch: boolean;
}

export function GemIcon({ gem, size = 'md' }: { gem: GemType; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4 sm:w-5 sm:h-5';
  switch (gem) {
    case 'ruby':
      return <Gem className={`${cls} text-rose-100 drop-shadow`} />;
    case 'sapphire':
      return <Diamond className={`${cls} text-sky-100 drop-shadow`} />;
    case 'emerald':
      return <Sparkles className={`${cls} text-emerald-100 drop-shadow`} />;
    case 'diamond':
      return <Diamond className={`${cls} text-white fill-white/40 drop-shadow`} />;
  }
}

const ShapePreview: React.FC<{
  shape: BlockShape;
  cellPx: number;
  dimmed?: boolean;
}> = ({ shape, cellPx, dimmed }) => {
  const colorStyle = COLOR_STYLES[shape.color];
  return (
    <div
      className={`inline-grid gap-[2px] select-none transition-opacity ${
        dimmed ? 'opacity-40' : 'opacity-100'
      }`}
      style={{
        gridTemplateColumns: `repeat(${shape.matrix[0].length}, ${cellPx}px)`,
      }}
    >
      {shape.matrix.map((row, r) =>
        row.map((val, c) =>
          val === 1 ? (
            <div
              key={`${r}-${c}`}
              style={{ width: cellPx, height: cellPx }}
              className={`rounded-[4px] ${colorStyle.bg} border-t-2 ${colorStyle.borderTop} border-b-2 ${colorStyle.borderBottom} shadow-sm`}
            />
          ) : (
            <div key={`${r}-${c}`} style={{ width: cellPx, height: cellPx }} />
          )
        )
      )}
    </div>
  );
};

export const BlockBoard: React.FC<BlockBoardProps> = ({
  board,
  tray,
  clearingRows,
  clearingCols,
  popups,
  shaking,
  disabled,
  onPlaceShape,
}) => {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  const [boardWidth, setBoardWidth] = useState<number>(360);

  useEffect(() => {
    const updateWidth = () => {
      if (boardRef.current) {
        setBoardWidth(boardRef.current.getBoundingClientRect().width);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    if (disabled) {
      setDragState(null);
    }
  }, [disabled]);

  const cellSize = useMemo(() => {
    // 8 cells + padding inside board
    return Math.max(28, (boardWidth - 16) / GRID_SIZE);
  }, [boardWidth]);

  const computeBoardTarget = useCallback(
    (clientX: number, clientY: number, shape: BlockShape, isTouch: boolean) => {
      if (!boardRef.current) return null;
      const rect = boardRef.current.getBoundingClientRect();
      const innerPad = 8;
      const cSize = (rect.width - innerPad * 2) / GRID_SIZE;
      const liftY = isTouch ? 68 : 18;
      const centerX = clientX;
      const centerY = clientY - liftY;

      const shapeW = shape.matrix[0].length * cSize;
      const shapeH = shape.matrix.length * cSize;

      const topLeftX = centerX - shapeW / 2;
      const topLeftY = centerY - shapeH / 2;

      const col = Math.round((topLeftX - (rect.left + innerPad)) / cSize);
      const row = Math.round((topLeftY - (rect.top + innerPad)) / cSize);

      if (canPlaceShape(board, shape, row, col)) {
        return { row, col };
      }
      return null;
    },
    [board]
  );

  const activeTarget = useMemo(() => {
    if (dragState) {
      return computeBoardTarget(
        dragState.clientX,
        dragState.clientY,
        dragState.shape,
        dragState.isTouch
      );
    }
    if (selectedSlot !== null && hoverCell && tray[selectedSlot]?.shape) {
      const shape = tray[selectedSlot].shape!;
      if (canPlaceShape(board, shape, hoverCell.row, hoverCell.col)) {
        return hoverCell;
      }
    }
    return null;
  }, [dragState, selectedSlot, hoverCell, tray, board, computeBoardTarget]);

  const activeShape = useMemo(() => {
    if (dragState) return dragState.shape;
    if (selectedSlot !== null) return tray[selectedSlot]?.shape || null;
    return null;
  }, [dragState, selectedSlot, tray]);

  const clearPreview = useMemo(() => {
    if (!activeTarget || !activeShape) return { rows: [], cols: [] };
    return getPlacementClearPreview(board, activeShape, activeTarget.row, activeTarget.col);
  }, [board, activeShape, activeTarget]);

  useEffect(() => {
    if (!dragState) return;

    const handleMove = (e: PointerEvent) => {
      e.preventDefault();
      setDragState((prev) =>
        prev ? { ...prev, clientX: e.clientX, clientY: e.clientY } : null
      );
    };

    const handleUp = (e: PointerEvent) => {
      const target = computeBoardTarget(
        e.clientX,
        e.clientY,
        dragState.shape,
        dragState.isTouch
      );
      if (target) {
        onPlaceShape(dragState.slotIndex, target.row, target.col);
        setSelectedSlot(null);
      }
      setDragState(null);
    };

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [dragState, computeBoardTarget, onPlaceShape]);

  const handleTrayPointerDown = (
    e: React.PointerEvent,
    slotIndex: number,
    shape: BlockShape
  ) => {
    if (disabled) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    soundEngine.playPickup();
    setSelectedSlot(slotIndex);
    setDragState({
      slotIndex,
      shape,
      clientX: e.clientX,
      clientY: e.clientY,
      isTouch: e.pointerType === 'touch',
    });
  };

  const handleCellClick = (row: number, col: number) => {
    if (disabled || selectedSlot === null) return;
    const shape = tray[selectedSlot]?.shape;
    if (!shape) return;
    if (canPlaceShape(board, shape, row, col)) {
      onPlaceShape(selectedSlot, row, col);
      setSelectedSlot(null);
      setHoverCell(null);
    }
  };

  const ghostCoords = useMemo(() => {
    const set = new Set<string>();
    if (!activeTarget || !activeShape) return set;
    for (let r = 0; r < activeShape.matrix.length; r++) {
      for (let c = 0; c < activeShape.matrix[0].length; c++) {
        if (activeShape.matrix[r][c] === 1) {
          set.add(`${activeTarget.row + r},${activeTarget.col + c}`);
        }
      }
    }
    return set;
  }, [activeTarget, activeShape]);

  const clearPreviewRowsSet = useMemo(() => new Set(clearPreview.rows), [clearPreview]);
  const clearPreviewColsSet = useMemo(() => new Set(clearPreview.cols), [clearPreview]);
  const clearingRowsSet = useMemo(() => new Set(clearingRows), [clearingRows]);
  const clearingColsSet = useMemo(() => new Set(clearingCols), [clearingCols]);

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="flex flex-col items-center w-full select-none"
    >
      {/* 8x8 Center Playfield */}
      <div
        ref={boardRef}
        onMouseLeave={() => setHoverCell(null)}
        className={`relative w-full max-w-[420px] aspect-square bg-[#131D31] border-2 border-slate-700/70 rounded-2xl p-2 shadow-2xl ${
          shaking ? 'animate-board-shake' : ''
        }`}
      >
        <div className="grid grid-cols-8 grid-rows-8 gap-1 w-full h-full">
          {board.map((rowArr, r) =>
            rowArr.map((cell, c) => {
              const key = `${r},${c}`;
              const isGhost = ghostCoords.has(key);
              const isWillClear =
                clearPreviewRowsSet.has(r) || clearPreviewColsSet.has(c);
              const isFlashingClear =
                clearingRowsSet.has(r) || clearingColsSet.has(c);

              const activeColor = activeShape
                ? COLOR_STYLES[activeShape.color]
                : null;
              const cellStyle = cell ? COLOR_STYLES[cell.color] : null;

              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onMouseEnter={() => {
                    if (selectedSlot !== null && !dragState) {
                      setHoverCell({ row: r, col: c });
                    }
                  }}
                  onClick={() => handleCellClick(r, c)}
                  aria-label={`Grid row ${r + 1} column ${c + 1}`}
                  className={`relative rounded-[6px] transition-transform duration-100 flex items-center justify-center focus-visible:outline-2 focus-visible:outline-amber-400 ${
                    cell && cellStyle
                      ? `${cellStyle.bg} border-t-2 ${cellStyle.borderTop} border-b-2 ${cellStyle.borderBottom} shadow-sm ${
                          isFlashingClear
                            ? 'animate-line-flash'
                            : isWillClear
                              ? 'brightness-125 ring-2 ring-white/75'
                              : 'animate-cell-pop'
                        }`
                      : isGhost && activeColor
                        ? `${activeColor.bg} opacity-45 border border-white/50 scale-[0.96]`
                        : isWillClear
                          ? 'bg-amber-400/20 border border-amber-300/40'
                          : 'bg-[#1D2B44]/85 border border-slate-800/70'
                  }`}
                >
                  {cell?.gem && <GemIcon gem={cell.gem} />}
                </button>
              );
            })
          )}
        </div>

        {/* Floating Score / Combo Popups */}
        {popups.map((p) => {
          const toneCls =
            p.tone === 'gold'
              ? 'text-amber-300'
              : p.tone === 'emerald'
                ? 'text-emerald-300'
                : p.tone === 'cyan'
                  ? 'text-cyan-300'
                  : 'text-rose-300';
          return (
            <div
              key={p.id}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-center animate-float-up z-20 ${toneCls}`}
            >
              <div className="font-display font-extrabold text-xl sm:text-2xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] whitespace-nowrap">
                {p.text}
              </div>
              {p.subtext && (
                <div className="text-xs font-bold uppercase tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] whitespace-nowrap">
                  {p.subtext}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3-Slot Bottom Piece Tray */}
      <div className="w-full max-w-[420px] mt-3.5 bg-[#131D31]/90 border border-slate-700/60 rounded-2xl px-3 py-3 grid grid-cols-3 gap-2 items-center min-h-[112px] touch-none">
        {tray.map((slot, idx) => {
          const isBeingDragged = dragState?.slotIndex === idx;
          const isSelected = selectedSlot === idx && !dragState;
          return (
            <div
              key={slot.slotId}
              onPointerDown={(e) => {
                if (slot.shape) handleTrayPointerDown(e, idx, slot.shape);
              }}
              className={`h-24 rounded-xl flex items-center justify-center transition-colors cursor-grab active:cursor-grabbing ${
                slot.shape
                  ? isSelected
                    ? 'bg-amber-500/15 ring-2 ring-amber-400/70'
                    : 'hover:bg-slate-800/50'
                  : 'opacity-20 pointer-events-none'
              }`}
            >
              {slot.shape && !isBeingDragged && (
                <ShapePreview shape={slot.shape} cellPx={17} />
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-400 mt-2 text-center">
        Drag a piece onto the 8×8 grid, or tap a piece then tap a square to place
      </p>

      {/* Floating Dragged Piece */}
      {dragState && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: dragState.clientX,
            top: dragState.clientY - (dragState.isTouch ? 68 : 18),
            transform: 'translate(-50%, -50%) scale(1.03)',
          }}
        >
          <ShapePreview
            shape={dragState.shape}
            cellPx={Math.max(24, cellSize * 0.9)}
          />
        </div>
      )}
    </div>
  );
};
