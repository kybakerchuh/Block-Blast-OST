import React from 'react';
import {
  BoxPlotSpec,
  DotPlotSpec,
  GraphSeries,
  HistogramSpec,
  OstVisual,
} from '../data/ostQuestions/types';
import { MathText } from './MathText';

function SingleGraphSvg({
  xMin,
  xMax,
  yMin,
  yMax,
  xStep = 2,
  yStep = 2,
  xLabel,
  yLabel,
  title,
  series,
  compact = false,
}: {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xStep?: number;
  yStep?: number;
  xLabel?: string;
  yLabel?: string;
  title?: string;
  series: GraphSeries[];
  compact?: boolean;
}) {
  const width = compact ? 180 : 280;
  const height = compact ? 150 : 220;
  const padL = compact ? 26 : 36;
  const padR = 14;
  const padT = title ? 24 : 12;
  const padB = xLabel ? 30 : 22;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const safeXSpan = Math.max(1e-6, xMax - xMin);
  const safeYSpan = Math.max(1e-6, yMax - yMin);
  const safeXStep = Math.max(0.01, xStep);
  const safeYStep = Math.max(0.01, yStep);

  const toX = (x: number) => padL + ((x - xMin) / safeXSpan) * plotW;
  const toY = (y: number) => padT + ((yMax - y) / safeYSpan) * plotH;

  const clipId = React.useId();

  const xTicks: number[] = [];
  for (let x = Math.ceil(xMin / safeXStep) * safeXStep; x <= xMax + 1e-9; x += safeXStep) {
    xTicks.push(Number(x.toFixed(2)));
  }
  const yTicks: number[] = [];
  for (let y = Math.ceil(yMin / safeYStep) * safeYStep; y <= yMax + 1e-9; y += safeYStep) {
    yTicks.push(Number(y.toFixed(2)));
  }

  const renderSeriesPath = (s: GraphSeries, idx: number) => {
    const stroke = s.color || '#3B82F6';
    const dash = s.dashed ? '5,4' : undefined;

    if (s.type === 'line' && s.m !== undefined && s.b !== undefined) {
      const x1 = xMin;
      const y1 = s.m * x1 + s.b;
      const x2 = xMax;
      const y2 = s.m * x2 + s.b;
      return (
        <line
          key={idx}
          x1={toX(x1)}
          y1={toY(y1)}
          x2={toX(x2)}
          y2={toY(y2)}
          stroke={stroke}
          strokeWidth={2.4}
          strokeDasharray={dash}
        />
      );
    }

    if (s.type === 'inequality' && s.m !== undefined && s.b !== undefined) {
      const y1 = s.m * xMin + s.b;
      const y2 = s.m * xMax + s.b;
      const polyPoints =
        s.shade === 'above'
          ? `${toX(xMin)},${toY(y1)} ${toX(xMax)},${toY(y2)} ${toX(xMax)},${padT} ${padL},${padT}`
          : `${toX(xMin)},${toY(y1)} ${toX(xMax)},${toY(y2)} ${toX(xMax)},${padT + plotH} ${padL},${padT + plotH}`;

      return (
        <g key={idx}>
          <polygon points={polyPoints} fill={stroke} fillOpacity={0.22} />
          <line
            x1={toX(xMin)}
            y1={toY(y1)}
            x2={toX(xMax)}
            y2={toY(y2)}
            stroke={stroke}
            strokeWidth={2.2}
            strokeDasharray={dash}
          />
        </g>
      );
    }

    if (s.type === 'parabola') {
      const pts: string[] = [];
      const steps = 60;
      for (let i = 0; i <= steps; i++) {
        const x = xMin + (i / steps) * (xMax - xMin);
        let y = 0;
        if (s.h !== undefined && s.k !== undefined && s.a !== undefined) {
          y = s.a * Math.pow(x - s.h, 2) + s.k;
        } else {
          y = (s.a || 1) * x * x + (s.coefB || 0) * x + (s.coefC || 0);
        }
        pts.push(`${toX(x).toFixed(1)},${toY(y).toFixed(1)}`);
      }
      return (
        <polyline
          key={idx}
          fill="none"
          stroke={stroke}
          strokeWidth={2.4}
          points={pts.join(' ')}
        />
      );
    }

    if (s.type === 'exponential') {
      const pts: string[] = [];
      const steps = 50;
      const a = s.a ?? 1;
      const base = s.base ?? 2;
      const k = s.k ?? 0;
      for (let i = 0; i <= steps; i++) {
        const x = xMin + (i / steps) * (xMax - xMin);
        const y = a * Math.pow(base, x) + k;
        pts.push(`${toX(x).toFixed(1)},${toY(y).toFixed(1)}`);
      }
      return (
        <polyline
          key={idx}
          fill="none"
          stroke={stroke}
          strokeWidth={2.4}
          points={pts.join(' ')}
        />
      );
    }

    if (s.type === 'points' && s.points) {
      return (
        <g key={idx}>
          {s.points.map(([px, py], pIdx) => (
            <circle
              key={pIdx}
              cx={toX(px)}
              cy={toY(py)}
              r={compact ? 3 : 4}
              fill={stroke}
              stroke="#0F172A"
              strokeWidth={1.2}
            />
          ))}
        </g>
      );
    }

    return null;
  };

  const zeroX = toX(0);
  const zeroY = toY(0);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto max-h-56 bg-[#0F172A] rounded-xl border border-slate-700/60"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={padL} y={padT} width={plotW} height={plotH} />
        </clipPath>
      </defs>

      {title && (
        <text
          x={width / 2}
          y={15}
          textAnchor="middle"
          className="fill-slate-200 text-[11px] font-semibold"
        >
          {title}
        </text>
      )}

      {/* Grid lines */}
      {xTicks.map((t) => (
        <line
          key={`gx-${t}`}
          x1={toX(t)}
          y1={padT}
          x2={toX(t)}
          y2={padT + plotH}
          stroke="#1E293B"
          strokeWidth={1}
        />
      ))}
      {yTicks.map((t) => (
        <line
          key={`gy-${t}`}
          x1={padL}
          y1={toY(t)}
          x2={padL + plotW}
          y2={toY(t)}
          stroke="#1E293B"
          strokeWidth={1}
        />
      ))}

      {/* Axes */}
      {xMin <= 0 && xMax >= 0 && (
        <line
          x1={zeroX}
          y1={padT}
          x2={zeroX}
          y2={padT + plotH}
          stroke="#64748B"
          strokeWidth={1.5}
        />
      )}
      {yMin <= 0 && yMax >= 0 && (
        <line
          x1={padL}
          y1={zeroY}
          x2={padL + plotW}
          y2={zeroY}
          stroke="#64748B"
          strokeWidth={1.5}
        />
      )}

      {/* Border */}
      <rect
        x={padL}
        y={padT}
        width={plotW}
        height={plotH}
        fill="none"
        stroke="#334155"
        strokeWidth={1}
      />

      {/* Clipped series */}
      <g clipPath={`url(#${clipId})`}>
        {series.map((s, idx) => renderSeriesPath(s, idx))}
      </g>

      {/* Tick labels */}
      {xTicks.map((t) => (
        <text
          key={`tx-${t}`}
          x={toX(t)}
          y={padT + plotH + 12}
          textAnchor="middle"
          className="fill-slate-400 text-[9px] font-mono"
        >
          {t}
        </text>
      ))}
      {yTicks.map((t) => (
        <text
          key={`ty-${t}`}
          x={padL - 5}
          y={toY(t) + 3}
          textAnchor="end"
          className="fill-slate-400 text-[9px] font-mono"
        >
          {t}
        </text>
      ))}

      {xLabel && (
        <text
          x={padL + plotW / 2}
          y={height - 5}
          textAnchor="middle"
          className="fill-slate-300 text-[10px]"
        >
          {xLabel}
        </text>
      )}
      {yLabel && (
        <text
          x={11}
          y={padT + plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90 11 ${padT + plotH / 2})`}
          className="fill-slate-300 text-[10px]"
        >
          {yLabel}
        </text>
      )}
    </svg>
  );
}

function BoxPlotsSvg({
  title,
  axisMin,
  axisMax,
  step,
  axisLabel,
  plots,
}: {
  title?: string;
  axisMin: number;
  axisMax: number;
  step: number;
  axisLabel?: string;
  plots: BoxPlotSpec[];
}) {
  const rowH = 34;
  const padL = 78;
  const padR = 18;
  const padT = title ? 26 : 12;
  const padB = axisLabel ? 36 : 24;
  const width = 340;
  const height = padT + plots.length * rowH + padB;
  const plotW = width - padL - padR;

  const safeSpan = Math.max(1e-6, axisMax - axisMin);
  const safeStep = Math.max(0.01, step);
  const toX = (val: number) => padL + ((val - axisMin) / safeSpan) * plotW;

  const ticks: number[] = [];
  for (let v = axisMin; v <= axisMax + 1e-9; v += safeStep) {
    ticks.push(Number(v.toFixed(1)));
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto bg-[#0F172A] rounded-xl border border-slate-700/60"
    >
      {title && (
        <text
          x={width / 2}
          y={16}
          textAnchor="middle"
          className="fill-slate-200 text-[11px] font-semibold"
        >
          {title}
        </text>
      )}

      {ticks.map((t) => (
        <line
          key={`tick-${t}`}
          x1={toX(t)}
          y1={padT}
          x2={toX(t)}
          y2={padT + plots.length * rowH}
          stroke="#1E293B"
          strokeWidth={1}
        />
      ))}

      {plots.map((p, idx) => {
        const cy = padT + idx * rowH + rowH / 2;
        const color = p.color || '#3B82F6';
        return (
          <g key={p.label}>
            <text
              x={padL - 8}
              y={cy + 4}
              textAnchor="end"
              className="fill-slate-300 text-[10px] font-medium"
            >
              {p.label}
            </text>
            {/* Whiskers */}
            <line
              x1={toX(p.min)}
              y1={cy}
              x2={toX(p.q1)}
              y2={cy}
              stroke={color}
              strokeWidth={2}
            />
            <line
              x1={toX(p.q3)}
              y1={cy}
              x2={toX(p.max)}
              y2={cy}
              stroke={color}
              strokeWidth={2}
            />
            <line
              x1={toX(p.min)}
              y1={cy - 6}
              x2={toX(p.min)}
              y2={cy + 6}
              stroke={color}
              strokeWidth={2}
            />
            <line
              x1={toX(p.max)}
              y1={cy - 6}
              x2={toX(p.max)}
              y2={cy + 6}
              stroke={color}
              strokeWidth={2}
            />
            {/* Box */}
            <rect
              x={toX(p.q1)}
              y={cy - 9}
              width={Math.max(2, toX(p.q3) - toX(p.q1))}
              height={18}
              fill={color}
              fillOpacity={0.25}
              stroke={color}
              strokeWidth={2}
              rx={2}
            />
            {/* Median */}
            <line
              x1={toX(p.median)}
              y1={cy - 9}
              x2={toX(p.median)}
              y2={cy + 9}
              stroke="#F8FAFC"
              strokeWidth={2.2}
            />
          </g>
        );
      })}

      {/* Number line */}
      <line
        x1={padL}
        y1={padT + plots.length * rowH + 4}
        x2={padL + plotW}
        y2={padT + plots.length * rowH + 4}
        stroke="#64748B"
        strokeWidth={1.5}
      />
      {ticks.map((t) => (
        <g key={`axis-${t}`}>
          <line
            x1={toX(t)}
            y1={padT + plots.length * rowH + 1}
            x2={toX(t)}
            y2={padT + plots.length * rowH + 7}
            stroke="#94A3B8"
            strokeWidth={1.2}
          />
          <text
            x={toX(t)}
            y={padT + plots.length * rowH + 17}
            textAnchor="middle"
            className="fill-slate-400 text-[9px] font-mono"
          >
            {t}
          </text>
        </g>
      ))}
      {axisLabel && (
        <text
          x={padL + plotW / 2}
          y={height - 4}
          textAnchor="middle"
          className="fill-slate-300 text-[10px]"
        >
          {axisLabel}
        </text>
      )}
    </svg>
  );
}

function DotPlotsSvg({
  axisMin,
  axisMax,
  plots,
}: {
  axisMin: number;
  axisMax: number;
  plots: DotPlotSpec[];
}) {
  const width = 340;
  const padL = 20;
  const padR = 20;
  const plotW = width - padL - padR;
  const safeSpan = Math.max(1e-6, axisMax - axisMin);
  const toX = (val: number) => padL + ((val - axisMin) / safeSpan) * plotW;

  const ticks: number[] = [];
  for (let v = axisMin; v <= axisMax; v++) ticks.push(v);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {plots.map((plot) => {
        const maxDots = Math.max(1, ...plot.values.map((v) => v.count));
        const height = 34 + maxDots * 11 + 24;
        const baseLineY = height - 22;
        return (
          <svg
            key={plot.label}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto bg-[#0F172A] rounded-xl border border-slate-700/60"
          >
            <text
              x={width / 2}
              y={16}
              textAnchor="middle"
              className="fill-slate-200 text-[12px] font-semibold"
            >
              {plot.label}
            </text>
            <line
              x1={padL - 6}
              y1={baseLineY}
              x2={padL + plotW + 6}
              y2={baseLineY}
              stroke="#64748B"
              strokeWidth={1.5}
            />
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={toX(t)}
                  y1={baseLineY - 3}
                  x2={toX(t)}
                  y2={baseLineY + 3}
                  stroke="#94A3B8"
                />
                <text
                  x={toX(t)}
                  y={baseLineY + 14}
                  textAnchor="middle"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  {t}
                </text>
              </g>
            ))}
            {plot.values.map((item) =>
              Array.from({ length: item.count }).map((_, i) => (
                <circle
                  key={`${item.x}-${i}`}
                  cx={toX(item.x)}
                  cy={baseLineY - 9 - i * 10}
                  r={3.8}
                  fill={plot.color || '#3B82F6'}
                />
              ))
            )}
          </svg>
        );
      })}
    </div>
  );
}

function HistogramsSvg({ charts }: { charts: HistogramSpec[] }) {
  return (
    <div
      className={`grid gap-2.5 ${charts.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}
    >
      {charts.map((chart) => {
        const width = 280;
        const height = 160;
        const padL = 34;
        const padR = 12;
        const padT = 24;
        const padB = 34;
        const plotW = width - padL - padR;
        const plotH = height - padT - padB;
        const maxVal = Math.max(1, ...chart.bins.map((b) => b.value));
        const barW = plotW / chart.bins.length;

        return (
          <svg
            key={chart.title}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto bg-[#0F172A] rounded-xl border border-slate-700/60"
          >
            <text
              x={width / 2}
              y={15}
              textAnchor="middle"
              className="fill-slate-200 text-[11px] font-semibold"
            >
              {chart.title}
            </text>
            <line
              x1={padL}
              y1={padT}
              x2={padL}
              y2={padT + plotH}
              stroke="#64748B"
              strokeWidth={1.2}
            />
            <line
              x1={padL}
              y1={padT + plotH}
              x2={padL + plotW}
              y2={padT + plotH}
              stroke="#64748B"
              strokeWidth={1.2}
            />
            {chart.bins.map((bin, idx) => {
              const barH = (bin.value / maxVal) * (plotH - 6);
              const x = padL + idx * barW + 2;
              const y = padT + plotH - barH;
              return (
                <g key={bin.label}>
                  <rect
                    x={x}
                    y={y}
                    width={Math.max(4, barW - 4)}
                    height={barH}
                    fill={chart.color || '#3B82F6'}
                    fillOpacity={0.85}
                    rx={2}
                  />
                  {bin.value > 0 && (
                    <text
                      x={x + (barW - 4) / 2}
                      y={Math.max(padT + 9, y - 3)}
                      textAnchor="middle"
                      className="fill-slate-300 text-[9px] font-mono"
                    >
                      {bin.value}
                    </text>
                  )}
                  <text
                    x={x + (barW - 4) / 2}
                    y={padT + plotH + 12}
                    textAnchor="middle"
                    className="fill-slate-400 text-[8px] font-mono"
                  >
                    {bin.label}
                  </text>
                </g>
              );
            })}
            <text
              x={padL + plotW / 2}
              y={height - 5}
              textAnchor="middle"
              className="fill-slate-400 text-[9px]"
            >
              {chart.xLabel}
            </text>
          </svg>
        );
      })}
    </div>
  );
}

export const OstVisualRenderer: React.FC<{ visual: OstVisual }> = ({ visual }) => {
  if (visual.kind === 'graph') {
    return (
      <SingleGraphSvg
        xMin={visual.xMin}
        xMax={visual.xMax}
        yMin={visual.yMin}
        yMax={visual.yMax}
        xStep={visual.xStep}
        yStep={visual.yStep}
        xLabel={visual.xLabel}
        yLabel={visual.yLabel}
        title={visual.title}
        series={visual.series}
      />
    );
  }

  if (visual.kind === 'multi-graph') {
    return (
      <div className="grid grid-cols-2 gap-2.5">
        {visual.panels.map((panel) => (
          <SingleGraphSvg
            key={panel.label}
            title={`Graph ${panel.label}`}
            xMin={panel.xMin}
            xMax={panel.xMax}
            yMin={panel.yMin}
            yMax={panel.yMax}
            xStep={panel.xStep}
            yStep={panel.yStep}
            series={panel.series}
            compact
          />
        ))}
      </div>
    );
  }

  if (visual.kind === 'boxplot') {
    return (
      <BoxPlotsSvg
        title={visual.title}
        axisMin={visual.axisMin}
        axisMax={visual.axisMax}
        step={visual.step}
        axisLabel={visual.axisLabel}
        plots={visual.plots}
      />
    );
  }

  if (visual.kind === 'dotplot') {
    return (
      <DotPlotsSvg
        axisMin={visual.axisMin}
        axisMax={visual.axisMax}
        plots={visual.plots}
      />
    );
  }

  if (visual.kind === 'histogram') {
    return <HistogramsSvg charts={visual.charts} />;
  }

  if (visual.kind === 'table') {
    return (
      <div className="rounded-xl border border-slate-700/70 bg-[#0F172A] overflow-hidden">
        {visual.title && (
          <div className="px-3.5 py-2 bg-slate-800/70 border-b border-slate-700/70 text-xs font-semibold text-slate-200">
            <MathText text={visual.title} />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-700/60 bg-slate-900/60">
                {visual.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 font-semibold text-slate-300">
                    <MathText text={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {visual.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-800/30">
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className={`px-3 py-1.5 font-mono tabular-nums ${
                        cIdx === 0 ? 'text-slate-300 font-medium' : 'text-slate-100'
                      }`}
                    >
                      <MathText text={String(cell)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
};
