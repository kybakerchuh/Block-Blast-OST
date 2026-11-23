import { DATA_ANALYSIS_QUESTIONS } from './dataAnalysis';
import { EQUATIONS_INEQUALITIES_QUESTIONS } from './equationsInequalities';
import { EXPONENTIAL_QUESTIONS } from './exponential';
import { FUNCTIONS_QUESTIONS } from './functions';
import { LAZY_WAY_STRATEGIES_QUESTIONS } from './lazyWayStrategies';
import { LINEAR_PART_1_QUESTIONS } from './linearPart1';
import { LINEAR_PART_2_QUESTIONS } from './linearPart2';
import { POLYNOMIALS_QUESTIONS } from './polynomials';
import { QUADRATICS_QUESTIONS } from './quadratics';
import { SIMPLIFYING_EXPRESSIONS_QUESTIONS } from './simplifyingExpressions';
import { SYSTEMS_QUESTIONS } from './systems';
import { OstQuestion, OstTopicId, OstTopicMeta } from './types';

export const OST_TOPICS: OstTopicMeta[] = [
  {
    id: 'lazy-way-strategies',
    title: 'The Lazy Way Strategies',
    shortTitle: 'Strategies',
    playbookSection: 'The Lazy Way Strategies',
    description: 'Identifying problem types (linear, quadratic, exponential, systems), back solving, and Desmos graph-and-match.',
    accentColor: '#A855F7',
  },
  {
    id: 'data-analysis',
    title: 'Data Analysis',
    shortTitle: 'Data Analysis',
    playbookSection: 'Data Analysis (Box Whisker, Line of Best Fit, Data)',
    description: 'Dot plots, box-and-whisker plots, histograms, scatterplots, standard deviation, and two-way frequency tables.',
    accentColor: '#3B82F6',
  },
  {
    id: 'polynomials',
    title: 'All Things Polynomials',
    shortTitle: 'Polynomials',
    playbookSection: 'All Things Polynomials',
    description: 'Adding, subtracting, and multiplying polynomials (box method), equivalent expressions, and coefficients.',
    accentColor: '#8B5CF6',
  },
  {
    id: 'functions',
    title: 'Functions & Function Notations',
    shortTitle: 'Functions',
    playbookSection: 'Functions and Function Notations',
    description: 'Identifying functions from pairs, tables, and Vertical Line Test; evaluating f(x) and solving for x.',
    accentColor: '#06B6D4',
  },
  {
    id: 'quadratics',
    title: 'Quadratics (Factoring, Solving, Modeling)',
    shortTitle: 'Quadratics',
    playbookSection: 'Factoring, Solving, Modeling, Analyzing Quadratics',
    description: 'Vertex, axis of symmetry, projectile motion, zeros/roots, and X-method factoring.',
    accentColor: '#F59E0B',
  },
  {
    id: 'exponential',
    title: 'Exponential Functions',
    shortTitle: 'Exponential',
    playbookSection: 'Create, Analyze, Model Exponential Functions',
    description: 'Initial value, growth/decay factors, percent change equations, and exponential graphs.',
    accentColor: '#10B981',
  },
  {
    id: 'linear-part-1',
    title: 'Linear Functions (Part 1)',
    shortTitle: 'Linear Pt. 1',
    playbookSection: 'Creating, Graphing, Modeling Linear (Part 1)',
    description: 'Graphing lines, slope & intercepts, writing equations from graphs/tables/points, and point checking.',
    accentColor: '#F97316',
  },
  {
    id: 'linear-part-2',
    title: 'Linear Functions (Part 2)',
    shortTitle: 'Linear Pt. 2',
    playbookSection: 'Creating, Graphing, Modeling Linear (Part 2)',
    description: 'Slope-intercept (y = mx + b) & standard form (Ax + By = C) word problems and rate/intercept meaning.',
    accentColor: '#FB923C',
  },
  {
    id: 'systems',
    title: 'Systems of Equations & Inequalities',
    shortTitle: 'Systems',
    playbookSection: 'Creating, Solving, Modeling Systems of Equations',
    description: 'Solving systems, parallel vs. infinite solutions, shaded inequality regions, and system word problems.',
    accentColor: '#EC4899',
  },
  {
    id: 'simplifying-expressions',
    title: 'Simplifying Expressions',
    shortTitle: 'Expressions',
    playbookSection: 'Expressions, Equations, and Inequalities — Expressions',
    description: 'Distributive property, negative sign traps, combining like terms, and equivalent expression matching.',
    accentColor: '#14B8A6',
  },
  {
    id: 'equations-inequalities',
    title: 'Equations & Inequalities',
    shortTitle: 'Eq & Ineq',
    playbookSection: 'Expressions, Equations, and Inequalities — Eq & Ineq',
    description: 'Multi-step linear equations, finding student errors, fractional equations, and solving/writing inequalities.',
    accentColor: '#EF4444',
  },
];

export const QUESTIONS_BY_TOPIC: Record<OstTopicId, OstQuestion[]> = {
  'lazy-way-strategies': LAZY_WAY_STRATEGIES_QUESTIONS,
  'data-analysis': DATA_ANALYSIS_QUESTIONS,
  polynomials: POLYNOMIALS_QUESTIONS,
  functions: FUNCTIONS_QUESTIONS,
  quadratics: QUADRATICS_QUESTIONS,
  exponential: EXPONENTIAL_QUESTIONS,
  'linear-part-1': LINEAR_PART_1_QUESTIONS,
  'linear-part-2': LINEAR_PART_2_QUESTIONS,
  systems: SYSTEMS_QUESTIONS,
  'simplifying-expressions': SIMPLIFYING_EXPRESSIONS_QUESTIONS,
  'equations-inequalities': EQUATIONS_INEQUALITIES_QUESTIONS,
};

export const ALL_OST_QUESTIONS: OstQuestion[] = [
  ...LAZY_WAY_STRATEGIES_QUESTIONS,
  ...DATA_ANALYSIS_QUESTIONS,
  ...POLYNOMIALS_QUESTIONS,
  ...FUNCTIONS_QUESTIONS,
  ...QUADRATICS_QUESTIONS,
  ...EXPONENTIAL_QUESTIONS,
  ...LINEAR_PART_1_QUESTIONS,
  ...LINEAR_PART_2_QUESTIONS,
  ...SYSTEMS_QUESTIONS,
  ...SIMPLIFYING_EXPRESSIONS_QUESTIONS,
  ...EQUATIONS_INEQUALITIES_QUESTIONS,
];

export function normalizeTopicId(rawTopic: string | null | undefined): OstTopicId | 'all' {
  if (!rawTopic || rawTopic === 'all') return 'all';
  if (rawTopic === 'linear') return 'linear-part-1';
  if (rawTopic in QUESTIONS_BY_TOPIC) {
    return rawTopic as OstTopicId;
  }
  return 'all';
}

export function pickNextOstQuestion(
  selectedTopic: OstTopicId | 'all',
  recentlyAskedIds: Set<string>
): OstQuestion {
  const normalized = normalizeTopicId(selectedTopic);
  const pool =
    normalized === 'all' ? ALL_OST_QUESTIONS : QUESTIONS_BY_TOPIC[normalized];
  const unseen = pool.filter((q) => !recentlyAskedIds.has(q.id));
  const candidates = unseen.length > 0 ? unseen : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
