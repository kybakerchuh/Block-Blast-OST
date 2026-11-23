import React, { useEffect, useState } from 'react';
import { Boxes, CheckCircle2, HelpCircle, ShieldAlert, X, XCircle } from 'lucide-react';
import { OST_TOPICS } from '../data/ostQuestions';
import { OstQuestion } from '../data/ostQuestions/types';
import { soundEngine } from '../audio/soundEngine';
import { MathNumericInput } from './MathNumericInput';
import { MathText } from './MathText';
import { OstVisualRenderer } from './OstVisualRenderer';

export type QuizTriggerReason = 'blocks' | 'death-revive' | 'death-final' | 'practice';

interface OstQuizModalProps {
  question: OstQuestion;
  reason: QuizTriggerReason;
  onResult: (isCorrect: boolean) => void;
  onContinue: (isCorrect: boolean) => void;
  onNextPractice?: () => void;
  onClosePractice?: () => void;
}

function normalizeAnswer(raw: string): string {
  const supMap: Record<string, string> = {
    '⁰': '0',
    '¹': '1',
    '²': '2',
    '³': '3',
    '⁴': '4',
    '⁵': '5',
    '⁶': '6',
    '⁷': '7',
    '⁸': '8',
    '⁹': '9',
  };
  let out = raw
    .trim()
    .toLowerCase()
    .replace(/−/g, '-')
    .replace(/[$,%\s,]/g, '');
  // Convert Unicode superscript runs like 2⁻² or x² to ^-2 / ^2
  out = out.replace(/[⁺⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (run) => {
    const mapped = run
      .split('')
      .map((ch) => (ch === '⁺' ? '+' : ch === '⁻' ? '-' : supMap[ch] ?? ch))
      .join('');
    return `^(${mapped})`;
  });
  return out;
}

function evaluateNumericExpression(expr: string): number | null {
  if (!expr) return null;
  let pos = 0;

  const peek = () => expr[pos];
  const consume = () => expr[pos++];

  const parseExpr = (): number | null => {
    let val = parseTerm();
    if (val === null) return null;
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const rhs = parseTerm();
      if (rhs === null) return null;
      val = op === '+' ? val + rhs : val - rhs;
    }
    return Number.isFinite(val) ? val : null;
  };

  const parseTerm = (): number | null => {
    let val = parseUnary();
    if (val === null) return null;
    while (peek() === '*' || peek() === '/') {
      const op = consume();
      const rhs = parseUnary();
      if (rhs === null) return null;
      if (op === '/' && rhs === 0) return null;
      val = op === '*' ? val * rhs : val / rhs;
    }
    return Number.isFinite(val) ? val : null;
  };

  const parseUnary = (): number | null => {
    if (peek() === '+') {
      consume();
      return parseUnary();
    }
    if (peek() === '-') {
      consume();
      const inner = parseUnary();
      return inner === null ? null : -inner;
    }
    return parsePower();
  };

  const parsePower = (): number | null => {
    const base = parsePrimary();
    if (base === null) return null;
    if (peek() === '^') {
      consume();
      const exp = parseUnary();
      if (exp === null) return null;
      const result = Math.pow(base, exp);
      return Number.isFinite(result) ? result : null;
    }
    return base;
  };

  const parsePrimary = (): number | null => {
    if (peek() === '(') {
      consume();
      const inner = parseExpr();
      if (inner === null || peek() !== ')') return null;
      consume();
      return inner;
    }
    const start = pos;
    let sawDigit = false;
    while (pos < expr.length && (/[0-9]/.test(expr[pos]) || expr[pos] === '.')) {
      if (/[0-9]/.test(expr[pos])) sawDigit = true;
      pos++;
    }
    if (!sawDigit) return null;
    const num = Number(expr.slice(start, pos));
    return Number.isFinite(num) ? num : null;
  };

  const result = parseExpr();
  if (result === null || pos !== expr.length) return null;
  return result;
}

function isNumericAnswerCorrect(input: string, acceptable: string[]): boolean {
  const norm = normalizeAnswer(input);
  if (!norm) return false;

  for (const ans of acceptable) {
    const normAns = normalizeAnswer(ans);
    if (norm === normAns) return true;
  }

  // Compare evaluated numeric values (supports fractions like 3/2 == 1.5 and exponents like 2^3 == 8)
  const userNum = evaluateNumericExpression(norm);
  if (userNum !== null) {
    for (const ans of acceptable) {
      const ansNum = evaluateNumericExpression(normalizeAnswer(ans));
      if (ansNum !== null && Math.abs(userNum - ansNum) < 0.001) {
        return true;
      }
    }
  }

  return false;
}

export const OstQuizModal: React.FC<OstQuizModalProps> = ({
  question,
  reason,
  onResult,
  onContinue,
  onNextPractice,
  onClosePractice,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [selectedMulti, setSelectedMulti] = useState<number[]>([]);
  const [numericInput, setNumericInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setSelectedIdx(null);
    setSelectedMulti([]);
    setNumericInput('');
    setSubmitted(false);
    setIsCorrect(false);
    setShowHint(false);
  }, [question.id]);

  const topicMeta = OST_TOPICS.find((t) => t.id === question.topicId);

  const finalizeSubmission = (correct: boolean) => {
    setSubmitted(true);
    setIsCorrect(correct);
    if (correct) {
      soundEngine.playOstCorrect();
    } else {
      soundEngine.playOstWrong();
    }
    onResult(correct);
  };

  const handleMcqClick = (idx: number) => {
    if (submitted) return;
    setSelectedIdx(idx);
    const correct = idx === question.correctIndex;
    finalizeSubmission(correct);
  };

  const toggleMultiOption = (idx: number) => {
    if (submitted) return;
    setSelectedMulti((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleMultiSubmit = () => {
    if (submitted || selectedMulti.length === 0) return;
    const expected = [...(question.correctIndices || [])].sort((a, b) => a - b);
    const actual = [...selectedMulti].sort((a, b) => a - b);
    const correct =
      expected.length === actual.length && expected.every((v, i) => v === actual[i]);
    finalizeSubmission(correct);
  };

  const handleNumericSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted || !numericInput.trim()) return;
    const correct = isNumericAnswerCorrect(numericInput, question.acceptableAnswers || []);
    finalizeSubmission(correct);
  };

  const reasonHeader = () => {
    switch (reason) {
      case 'blocks':
        return {
          icon: <Boxes className="w-4 h-4 text-amber-400" />,
          label: '6-Block OST Checkpoint',
          sub: 'Answer correctly for +150 bonus points',
        };
      case 'death-revive':
        return {
          icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
          label: 'No Valid Moves Left — Revive Chance',
          sub: 'Answer correctly to clear center blocks & continue!',
        };
      case 'death-final':
        return {
          icon: <ShieldAlert className="w-4 h-4 text-amber-400" />,
          label: 'Game Over OST Checkpoint',
          sub: 'Answer this question to complete your run',
        };
      case 'practice':
        return {
          icon: <HelpCircle className="w-4 h-4 text-cyan-400" />,
          label: 'OST Topic Practice',
          sub: 'Every correct answer counts toward your mastery & leaderboard',
        };
    }
  };

  const headerInfo = reasonHeader();

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ost-quiz-title"
    >
      <div className="w-full max-w-xl bg-[#162033] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Top bar */}
        <div className="px-5 py-3.5 bg-[#101827] border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
              {headerInfo.icon}
              <span className="truncate">{headerInfo.label}</span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="text-slate-400 truncate">{topicMeta?.shortTitle}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{headerInfo.sub}</p>
          </div>
          {reason === 'practice' && onClosePractice && (
            <button
              type="button"
              onClick={onClosePractice}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              aria-label="Close practice modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Question body */}
        <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
          <h3
            id="ost-quiz-title"
            className="text-base sm:text-lg font-semibold text-slate-100 leading-relaxed"
          >
            <MathText text={question.prompt} />
          </h3>

          {question.visual && <OstVisualRenderer visual={question.visual} />}

          {/* Hint button */}
          {!submitted && (
            <div>
              <button
                type="button"
                onClick={() => setShowHint((v) => !v)}
                className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {showHint ? 'Hide Playbook Tip' : 'Show Playbook Tip'}
              </button>
              {showHint && (
                <p className="mt-2 text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3.5 py-2.5 leading-relaxed">
                  <MathText text={question.hint} />
                </p>
              )}
            </div>
          )}

          {/* Answer Input Area */}
          {question.type === 'mcq' && question.options && (
            <div className="grid grid-cols-1 gap-2.5">
              {question.options.map((opt, idx) => {
                const isSelected = selectedIdx === idx;
                const isRightOption = idx === question.correctIndex;
                let style =
                  'bg-[#1D2B44] border-slate-700/80 hover:border-amber-400/70 hover:bg-[#233452] text-slate-100';

                if (submitted) {
                  if (isRightOption) {
                    style = 'bg-emerald-500/20 border-emerald-400 text-emerald-100';
                  } else if (isSelected && !isRightOption) {
                    style = 'bg-rose-500/20 border-rose-400 text-rose-100';
                  } else {
                    style = 'bg-[#172236] border-slate-800 text-slate-500';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={submitted}
                    onClick={() => handleMcqClick(idx)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors flex items-center justify-between gap-3 cursor-pointer disabled:cursor-default ${style}`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-md bg-slate-900/70 border border-slate-700/70 flex items-center justify-center text-xs font-mono text-slate-300 shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="break-words leading-relaxed">
                        <MathText text={opt} />
                      </span>
                    </span>
                    {submitted && isRightOption && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    {submitted && isSelected && !isRightOption && (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {question.type === 'multi-select' && question.options && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2">
                {question.options.map((opt, idx) => {
                  const checked = selectedMulti.includes(idx);
                  const isExpected = (question.correctIndices || []).includes(idx);
                  let style = checked
                    ? 'bg-amber-500/15 border-amber-400 text-slate-100'
                    : 'bg-[#1D2B44] border-slate-700/80 hover:border-slate-500 text-slate-200';

                  if (submitted) {
                    if (isExpected) {
                      style = 'bg-emerald-500/20 border-emerald-400 text-emerald-100';
                    } else if (checked && !isExpected) {
                      style = 'bg-rose-500/20 border-rose-400 text-rose-100';
                    } else {
                      style = 'bg-[#172236] border-slate-800 text-slate-500';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={submitted}
                      onClick={() => toggleMultiOption(idx)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors flex items-center gap-3 cursor-pointer disabled:cursor-default ${style}`}
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          checked
                            ? 'bg-amber-400 border-amber-400 text-slate-950'
                            : 'border-slate-500 bg-slate-900/60'
                        }`}
                      >
                        {checked && <span className="text-[11px] font-bold">✓</span>}
                      </span>
                      <span className="font-mono text-sm leading-relaxed">
                        <MathText text={opt} />
                      </span>
                    </button>
                  );
                })}
              </div>
              {!submitted && (
                <button
                  type="button"
                  disabled={selectedMulti.length === 0}
                  onClick={handleMultiSubmit}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
                >
                  Check Selected Answers
                </button>
              )}
            </div>
          )}

          {question.type === 'numeric' && (
            <form onSubmit={handleNumericSubmit} className="space-y-3">
              <MathNumericInput
                value={numericInput}
                onChange={setNumericInput}
                disabled={submitted}
                prefix={question.answerPrefix}
                suffix={question.answerSuffix}
                questionId={question.id}
              />
              {!submitted && (
                <button
                  type="submit"
                  disabled={!numericInput.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
                >
                  Submit Answer
                </button>
              )}
            </form>
          )}

          {/* Post-submission Feedback */}
          {submitted && (
            <div
              className={`rounded-xl border p-4 space-y-2 ${
                isCorrect
                  ? 'bg-emerald-500/15 border-emerald-500/40'
                  : 'bg-rose-500/15 border-rose-500/40'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="text-emerald-200">
                      Correct!{' '}
                      {reason === 'blocks'
                        ? '+150 Bonus Points'
                        : reason === 'death-revive'
                          ? 'Revive Unlocked! Center space cleared.'
                          : ''}
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    <span className="text-rose-200">
                      Not quite —{' '}
                      {question.type === 'numeric' && question.acceptableAnswers ? (
                        <>
                          Answer: <MathText text={question.acceptableAnswers[0]} />
                        </>
                      ) : (
                        'Review the solution below.'
                      )}
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                <MathText text={question.explanation} />
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {submitted && (
          <div className="px-5 py-3.5 bg-[#101827] border-t border-slate-800 flex items-center justify-end gap-3">
            {reason === 'practice' && onNextPractice ? (
              <>
                {onClosePractice && (
                  <button
                    type="button"
                    onClick={onClosePractice}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                )}
                <button
                  type="button"
                  onClick={onNextPractice}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
                >
                  Next Question
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => onContinue(isCorrect)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
              >
                {reason === 'death-revive'
                  ? isCorrect
                    ? 'Revive & Continue'
                    : 'View Final Score'
                  : reason === 'death-final'
                    ? 'View Final Score'
                    : 'Resume Game'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
