import React, { useEffect, useRef, useState } from 'react';
import { Delete, Sigma } from 'lucide-react';
import { MathText } from './MathText';

type InputMode = 'text' | 'fraction' | 'exponent';

interface MathNumericInputProps {
  value: string;
  onChange: (nextValue: string) => void;
  disabled?: boolean;
  prefix?: string;
  suffix?: string;
  questionId: string;
}

function buildFractionString(isNeg: boolean, num: string, den: string): string {
  const n = num.trim();
  const d = den.trim();
  if (!n && !d) return isNeg ? '-' : '';
  const sign = isNeg ? '-' : '';
  if (!d) return `${sign}${n}`;
  return `${sign}${n || '0'}/${d}`;
}

function buildExponentString(isNeg: boolean, base: string, exp: string): string {
  const b = base.trim();
  const e = exp.trim();
  if (!b && !e) return isNeg ? '-' : '';
  const sign = isNeg ? '-' : '';
  if (!e) return `${sign}${b}`;
  const formattedBase = b.includes('/') ? `(${b})` : b || '0';
  const formattedExp = /^[a-zA-Z0-9.-]+$/.test(e) ? e : `(${e})`;
  return `${sign}${formattedBase}^${formattedExp}`;
}

export const MathNumericInput: React.FC<MathNumericInputProps> = ({
  value,
  onChange,
  disabled = false,
  prefix,
  suffix,
  questionId,
}) => {
  const [mathToolbarOpen, setMathToolbarOpen] = useState(true);
  const [inputMode, setInputMode] = useState<InputMode>('text');

  // Fraction mode parts
  const [fracNeg, setFracNeg] = useState(false);
  const [fracNum, setFracNum] = useState('');
  const [fracDen, setFracDen] = useState('');

  // Exponent mode parts
  const [expNeg, setExpNeg] = useState(false);
  const [expBase, setExpBase] = useState('');
  const [expPower, setExpPower] = useState('');

  const textInputRef = useRef<HTMLInputElement | null>(null);
  const fracNumRef = useRef<HTMLInputElement | null>(null);
  const fracDenRef = useRef<HTMLInputElement | null>(null);
  const expBaseRef = useRef<HTMLInputElement | null>(null);
  const expPowerRef = useRef<HTMLInputElement | null>(null);

  // Reset editor mode when switching to a new question
  useEffect(() => {
    setInputMode('text');
    setFracNeg(false);
    setFracNum('');
    setFracDen('');
    setExpNeg(false);
    setExpBase('');
    setExpPower('');
    setTimeout(() => textInputRef.current?.focus(), 0);
  }, [questionId]);

  const switchToFraction = () => {
    if (disabled) return;
    if (inputMode === 'fraction') {
      // Convert back to plain text
      setInputMode('text');
      setTimeout(() => textInputRef.current?.focus(), 0);
      return;
    }

    const raw = value.trim().replace(/−/g, '-');
    let neg = false;
    let body = raw;
    if (body.startsWith('-')) {
      neg = true;
      body = body.slice(1);
    }

    if (body.includes('/')) {
      const [n, ...rest] = body.split('/');
      const d = rest.join('/');
      setFracNeg(neg);
      setFracNum(n);
      setFracDen(d);
      onChange(buildFractionString(neg, n, d));
      setInputMode('fraction');
      setTimeout(() => (d ? fracDenRef.current?.focus() : fracDenRef.current?.focus()), 0);
    } else {
      setFracNeg(neg);
      setFracNum(body);
      setFracDen('');
      onChange(buildFractionString(neg, body, ''));
      setInputMode('fraction');
      setTimeout(() => {
        if (body) fracDenRef.current?.focus();
        else fracNumRef.current?.focus();
      }, 0);
    }
  };

  const switchToExponent = () => {
    if (disabled) return;
    if (inputMode === 'exponent') {
      setInputMode('text');
      setTimeout(() => textInputRef.current?.focus(), 0);
      return;
    }

    const raw = value.trim().replace(/−/g, '-');
    let neg = false;
    let body = raw;
    if (body.startsWith('-')) {
      neg = true;
      body = body.slice(1);
    }

    if (body.includes('^')) {
      const caretIdx = body.indexOf('^');
      const b = body.slice(0, caretIdx).replace(/^\((.*)\)$/, '$1');
      const e = body.slice(caretIdx + 1).replace(/^\((.*)\)$/, '$1');
      setExpNeg(neg);
      setExpBase(b);
      setExpPower(e);
      onChange(buildExponentString(neg, b, e));
      setInputMode('exponent');
      setTimeout(() => expPowerRef.current?.focus(), 0);
    } else {
      setExpNeg(neg);
      setExpBase(body);
      setExpPower('');
      onChange(buildExponentString(neg, body, ''));
      setInputMode('exponent');
      setTimeout(() => {
        if (body) expPowerRef.current?.focus();
        else expBaseRef.current?.focus();
      }, 0);
    }
  };

  const toggleNegative = () => {
    if (disabled) return;
    if (inputMode === 'fraction') {
      const next = !fracNeg;
      setFracNeg(next);
      onChange(buildFractionString(next, fracNum, fracDen));
      return;
    }
    if (inputMode === 'exponent') {
      const next = !expNeg;
      setExpNeg(next);
      onChange(buildExponentString(next, expBase, expPower));
      return;
    }
    const trimmed = value.trim();
    if (trimmed.startsWith('-') || trimmed.startsWith('−')) {
      onChange(trimmed.slice(1));
    } else {
      onChange(`-${trimmed}`);
    }
    setTimeout(() => textInputRef.current?.focus(), 0);
  };

  const handleClear = () => {
    if (disabled) return;
    setFracNeg(false);
    setFracNum('');
    setFracDen('');
    setExpNeg(false);
    setExpBase('');
    setExpPower('');
    onChange('');
    if (inputMode === 'fraction') setTimeout(() => fracNumRef.current?.focus(), 0);
    else if (inputMode === 'exponent') setTimeout(() => expBaseRef.current?.focus(), 0);
    else setTimeout(() => textInputRef.current?.focus(), 0);
  };

  const showLivePreview =
    inputMode === 'text' && (value.includes('/') || value.includes('^'));

  return (
    <div className="space-y-2.5">
      {/* Main Answer Row + Math Type Trigger Button */}
      <div className="flex flex-wrap items-center gap-2">
        {prefix && (
          <span className="font-mono text-sm text-slate-300 shrink-0">
            <MathText text={prefix} />
          </span>
        )}

        {/* Mode 1: Standard Text Input */}
        {inputMode === 'text' && (
          <input
            ref={textInputRef}
            type="text"
            disabled={disabled}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type answer or use Fraction / Exponent below"
            className="flex-1 min-w-[180px] bg-[#0F172A] border border-slate-600 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-100 outline-none"
          />
        )}

        {/* Mode 2: Vertical Fraction Input */}
        {inputMode === 'fraction' && (
          <div className="flex-1 min-w-[180px] bg-[#0F172A] border border-amber-400/70 rounded-xl px-3.5 py-2 flex items-center gap-2.5">
            <button
              type="button"
              disabled={disabled}
              onClick={toggleNegative}
              title="Toggle negative sign"
              className={`w-7 h-7 rounded-lg text-base font-mono font-bold flex items-center justify-center border transition-colors cursor-pointer ${
                fracNeg
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-slate-800/70 border-slate-700 text-slate-500 hover:text-slate-200'
              }`}
            >
              −
            </button>
            <div className="flex flex-col items-center gap-1 min-w-[84px]">
              <input
                ref={fracNumRef}
                type="text"
                inputMode="decimal"
                disabled={disabled}
                value={fracNum}
                aria-label="Fraction numerator"
                placeholder="num"
                onChange={(e) => {
                  let next = e.target.value;
                  let nextNeg = fracNeg;
                  if (next.startsWith('-') || next.startsWith('−')) {
                    nextNeg = !fracNeg;
                    setFracNeg(nextNeg);
                    next = next.slice(1);
                  }
                  setFracNum(next);
                  onChange(buildFractionString(nextNeg, next, fracDen));
                }}
                onKeyDown={(e) => {
                  if (e.key === '/' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    fracDenRef.current?.focus();
                  }
                }}
                className="w-24 bg-[#162033] border border-slate-600 focus:border-amber-400 rounded-md px-2 py-1 text-center text-sm font-mono text-slate-100 outline-none"
              />
              <div className="w-full h-[2px] bg-slate-200 rounded-full" />
              <input
                ref={fracDenRef}
                type="text"
                inputMode="decimal"
                disabled={disabled}
                value={fracDen}
                aria-label="Fraction denominator"
                placeholder="den"
                onChange={(e) => {
                  const next = e.target.value;
                  setFracDen(next);
                  onChange(buildFractionString(fracNeg, fracNum, next));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    fracNumRef.current?.focus();
                  }
                }}
                className="w-24 bg-[#162033] border border-slate-600 focus:border-amber-400 rounded-md px-2 py-1 text-center text-sm font-mono text-slate-100 outline-none"
              />
            </div>
            <span className="text-[11px] text-slate-400 ml-auto hidden sm:inline">
              Vertical Fraction
            </span>
          </div>
        )}

        {/* Mode 3: Visual Exponent Input */}
        {inputMode === 'exponent' && (
          <div className="flex-1 min-w-[180px] bg-[#0F172A] border border-amber-400/70 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={toggleNegative}
              title="Toggle negative sign"
              className={`w-7 h-7 rounded-lg text-base font-mono font-bold flex items-center justify-center border transition-colors cursor-pointer ${
                expNeg
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-slate-800/70 border-slate-700 text-slate-500 hover:text-slate-200'
              }`}
            >
              −
            </button>
            <div className="flex items-start gap-1">
              <input
                ref={expBaseRef}
                type="text"
                disabled={disabled}
                value={expBase}
                aria-label="Exponent base"
                placeholder="base"
                onChange={(e) => {
                  let next = e.target.value;
                  let nextNeg = expNeg;
                  if (next.startsWith('-') || next.startsWith('−')) {
                    nextNeg = !expNeg;
                    setExpNeg(nextNeg);
                    next = next.slice(1);
                  }
                  setExpBase(next);
                  onChange(buildExponentString(nextNeg, next, expPower));
                }}
                onKeyDown={(e) => {
                  if (e.key === '^' || e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    expPowerRef.current?.focus();
                  }
                }}
                className="w-20 mt-2 bg-[#162033] border border-slate-600 focus:border-amber-400 rounded-lg px-2 py-1.5 text-center text-sm font-mono text-slate-100 outline-none"
              />
              <input
                ref={expPowerRef}
                type="text"
                disabled={disabled}
                value={expPower}
                aria-label="Exponent power"
                placeholder="exp"
                onChange={(e) => {
                  const next = e.target.value;
                  setExpPower(next);
                  onChange(buildExponentString(expNeg, expBase, next));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    expBaseRef.current?.focus();
                  }
                }}
                className="w-16 bg-[#162033] border border-amber-500/60 focus:border-amber-400 rounded-md px-1.5 py-1 text-center text-xs font-mono text-amber-200 outline-none"
              />
            </div>
            <span className="text-[11px] text-slate-400 ml-auto hidden sm:inline">
              Exponent
            </span>
          </div>
        )}

        {suffix && (
          <span className="text-sm text-slate-300 shrink-0">
            <MathText text={suffix} />
          </span>
        )}

        {!disabled && (
          <button
            type="button"
            onClick={() => setMathToolbarOpen((v) => !v)}
            aria-expanded={mathToolbarOpen}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              mathToolbarOpen || inputMode !== 'text'
                ? 'bg-amber-500/15 border-amber-400/70 text-amber-200'
                : 'bg-[#1D2B44] border-slate-700 hover:border-slate-500 text-slate-200'
            }`}
          >
            <Sigma className="w-3.5 h-3.5 text-amber-400" />
            <span>Math Type</span>
          </button>
        )}
      </div>

      {/* Live Preview when typing a/b or a^b in Standard Mode */}
      {showLivePreview && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0F172A]/80 border border-slate-800 text-xs text-slate-300">
          <span className="text-slate-400">Preview:</span>
          <span className="text-slate-100 font-mono text-sm">
            <MathText text={value} />
          </span>
        </div>
      )}

      {/* Math Type Toolbar: Fraction & Exponent Buttons */}
      {!disabled && mathToolbarOpen && (
        <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-[#0F172A] border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 px-1">
            Math Type:
          </span>

          {/* Add / Toggle Vertical Fraction */}
          <button
            type="button"
            onClick={switchToFraction}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              inputMode === 'fraction'
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-[#1D2B44] border-slate-700 hover:border-amber-400/70 text-slate-100'
            }`}
          >
            <span className="inline-flex flex-col items-center leading-none text-[9px]">
              <span className="w-2.5 h-2 border border-current rounded-[1px] mb-[1px]" />
              <span className="w-3 h-[1.5px] bg-current" />
              <span className="w-2.5 h-2 border border-current rounded-[1px] mt-[1px]" />
            </span>
            <span>Fraction</span>
          </button>

          {/* Add / Toggle Exponent */}
          <button
            type="button"
            onClick={switchToExponent}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              inputMode === 'exponent'
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-[#1D2B44] border-slate-700 hover:border-amber-400/70 text-slate-100'
            }`}
          >
            <span className="inline-flex items-start leading-none">
              <span className="w-2.5 h-2.5 border border-current rounded-[2px] mt-1" />
              <span className="w-2 h-2 border border-current rounded-[1px] -ml-0.5" />
            </span>
            <span>Exponent</span>
          </button>

          {/* Negative Sign Toggle */}
          <button
            type="button"
            onClick={toggleNegative}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-[#1D2B44] hover:border-slate-500 text-xs font-mono font-bold text-slate-200 transition-colors cursor-pointer"
          >
            −
          </button>

          {/* Standard Keyboard Mode */}
          {inputMode !== 'text' && (
            <button
              type="button"
              onClick={() => {
                setInputMode('text');
                setTimeout(() => textInputRef.current?.focus(), 0);
              }}
              className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
            >
              Standard Input
            </button>
          )}

          {value && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear answer"
              className="ml-auto inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-rose-300 hover:bg-slate-800/70 transition-colors cursor-pointer"
            >
              <Delete className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
