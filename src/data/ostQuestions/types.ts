export type OstTopicId =
  | 'lazy-way-strategies'
  | 'data-analysis'
  | 'polynomials'
  | 'functions'
  | 'quadratics'
  | 'exponential'
  | 'linear-part-1'
  | 'linear-part-2'
  | 'systems'
  | 'simplifying-expressions'
  | 'equations-inequalities';

export interface OstTopicMeta {
  id: OstTopicId;
  title: string;
  shortTitle: string;
  playbookSection: string;
  description: string;
  accentColor: string;
}

export type OstQuestionType = 'mcq' | 'multi-select' | 'numeric';

export interface GraphSeries {
  type: 'line' | 'parabola' | 'exponential' | 'points' | 'inequality';
  color?: string;
  dashed?: boolean;
  // line: y = m*x + b
  m?: number;
  b?: number;
  // parabola: y = a*(x - h)^2 + k OR a*x^2 + bx + c
  a?: number;
  h?: number;
  k?: number;
  coefB?: number;
  coefC?: number;
  // exponential: y = a * base^x
  base?: number;
  // points: scatter or highlight points
  points?: [number, number][];
  // inequality: 'above' | 'below' relative to y = m*x + b, or vertical 'left' | 'right'
  shade?: 'above' | 'below';
  label?: string;
}

export interface BoxPlotSpec {
  label: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  color?: string;
}

export interface DotPlotSpec {
  label: string;
  values: { x: number; count: number }[];
  color?: string;
}

export interface HistogramSpec {
  title: string;
  xLabel: string;
  yLabel: string;
  bins: { label: string; value: number }[];
  color?: string;
}

export type OstVisual =
  | {
      kind: 'graph';
      title?: string;
      xMin: number;
      xMax: number;
      yMin: number;
      yMax: number;
      xStep?: number;
      yStep?: number;
      xLabel?: string;
      yLabel?: string;
      series: GraphSeries[];
    }
  | {
      kind: 'multi-graph';
      panels: {
        label: string;
        xMin: number;
        xMax: number;
        yMin: number;
        yMax: number;
        xStep?: number;
        yStep?: number;
        series: GraphSeries[];
      }[];
    }
  | {
      kind: 'boxplot';
      title?: string;
      axisMin: number;
      axisMax: number;
      step: number;
      axisLabel?: string;
      plots: BoxPlotSpec[];
    }
  | {
      kind: 'boxplot-options';
      axisMin: number;
      axisMax: number;
      step: number;
      axisLabel?: string;
      options: {
        label: string;
        plots: BoxPlotSpec[];
      }[];
    }
  | {
      kind: 'dotplot';
      axisMin: number;
      axisMax: number;
      plots: DotPlotSpec[];
    }
  | {
      kind: 'histogram';
      charts: HistogramSpec[];
    }
  | {
      kind: 'table';
      title?: string;
      headers: string[];
      rows: (string | number)[][];
    };

export interface OstQuestion {
  id: string;
  topicId: OstTopicId;
  type: OstQuestionType;
  prompt: string;
  visual?: OstVisual;
  options?: string[];
  correctIndex?: number;
  correctIndices?: number[];
  acceptableAnswers?: string[];
  answerPrefix?: string;
  answerSuffix?: string;
  hint: string;
  explanation: string;
}
