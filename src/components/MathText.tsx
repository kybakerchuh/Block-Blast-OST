import React from 'react';

export type MathNode =
  | { type: 'text'; value: string }
  | { type: 'frac'; num: MathNode[]; den: MathNode[] }
  | { type: 'sup'; exp: MathNode[] };

const ALLOWED_FRAC_WORDS = new Set(['rise', 'run']);

function isAllowedMathWord(token: string): boolean {
  if (!token) return false;
  if (/^[a-zA-Z]{2,}$/.test(token)) {
    return ALLOWED_FRAC_WORDS.has(token.toLowerCase());
  }
  return true;
}

function containsProseWords(expr: string): boolean {
  const words = expr.match(/[a-zA-Z]{2,}/g);
  if (!words) return false;
  return words.some((w) => !ALLOWED_FRAC_WORDS.has(w.toLowerCase()));
}

function findMatchingCloseParen(str: string, openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < str.length; i++) {
    if (str[i] === '(') depth++;
    else if (str[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findMatchingOpenParen(str: string, closeIdx: number): number {
  let depth = 0;
  for (let i = closeIdx; i >= 0; i--) {
    if (str[i] === ')') depth++;
    else if (str[i] === '(') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

const TERM_CHAR_RE = /[A-Za-z0-9₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]/;

function isTermChar(str: string, idx: number): boolean {
  if (idx < 0 || idx >= str.length) return false;
  const ch = str[idx];
  if (TERM_CHAR_RE.test(ch)) return true;
  if (ch === '.') {
    const prevDigit = idx > 0 && /[0-9]/.test(str[idx - 1]);
    const nextDigit = idx + 1 < str.length && /[0-9]/.test(str[idx + 1]);
    return prevDigit && nextDigit;
  }
  return false;
}

interface FractionMatch {
  start: number;
  end: number;
  numRaw: string;
  denRaw: string;
  hadOuterParens: boolean;
}

function findNextFraction(str: string, fromIdx: number): FractionMatch | null {
  for (let slashIdx = fromIdx; slashIdx < str.length; slashIdx++) {
    if (str[slashIdx] !== '/') continue;

    // 1. Extract left operand (at most 1 space before '/')
    let leftEnd = slashIdx;
    if (leftEnd > 0 && str[leftEnd - 1] === ' ') {
      leftEnd -= 1;
    }
    if (leftEnd <= 0 || str[leftEnd - 1] === ' ') continue;

    let leftStart = leftEnd;
    let numRaw = '';
    let leftHadParens = false;

    if (str[leftEnd - 1] === ')') {
      const openIdx = findMatchingOpenParen(str, leftEnd - 1);
      if (openIdx === -1) continue;
      // Don't consume a parenthesized exponent like ^(t)/2 accidentally unless valid
      const inner = str.slice(openIdx + 1, leftEnd - 1);
      if (!inner.trim() || containsProseWords(inner)) continue;
      leftStart = openIdx;
      numRaw = inner;
      leftHadParens = true;
    } else if (isTermChar(str, leftEnd - 1)) {
      let ptr = leftEnd - 1;
      while (ptr > 0 && isTermChar(str, ptr - 1)) {
        ptr--;
      }
      if (ptr > 0 && str[ptr - 1] === '$') continue;
      const token = str.slice(ptr, leftEnd);
      if (!isAllowedMathWord(token)) continue;
      leftStart = ptr;
      numRaw = token;
    } else {
      continue;
    }

    // 2. Extract right operand (at most 1 space after '/')
    let rightStart = slashIdx + 1;
    if (rightStart < str.length && str[rightStart] === ' ') {
      rightStart += 1;
    }
    if (rightStart >= str.length || str[rightStart] === ' ') continue;

    let rightEnd = rightStart;
    let denRaw = '';

    if (str[rightStart] === '(') {
      const closeIdx = findMatchingCloseParen(str, rightStart);
      if (closeIdx === -1) continue;
      const inner = str.slice(rightStart + 1, closeIdx);
      if (!inner.trim() || containsProseWords(inner)) continue;
      rightEnd = closeIdx + 1;
      denRaw = inner;
    } else if (isTermChar(str, rightStart)) {
      let ptr = rightStart;
      while (ptr + 1 < str.length && isTermChar(str, ptr + 1)) {
        ptr++;
      }
      const token = str.slice(rightStart, ptr + 1);
      if (!isAllowedMathWord(token)) continue;
      rightEnd = ptr + 1;
      denRaw = token;
    } else {
      continue;
    }

    // Check if redundant grouping parens directly wrap an inline unparenthesized fraction, e.g. (2/3)(3x - 9) or (1/2)x
    let finalStart = leftStart;
    let finalEnd = rightEnd;
    let hadOuterParens = false;
    if (
      !leftHadParens &&
      leftStart > 0 &&
      str[leftStart - 1] === '(' &&
      rightEnd < str.length &&
      str[rightEnd] === ')'
    ) {
      const beforeChar = leftStart >= 2 ? str[leftStart - 2] : '';
      const afterChar = rightEnd + 1 < str.length ? str[rightEnd + 1] : '';
      const isExponentGroup = beforeChar === '^';
      const isPowerBase = afterChar === '^' || /[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(afterChar);
      const isTrailingNote = /\d/.test(beforeChar) || (beforeChar === ' ' && leftStart >= 3 && /\d/.test(str[leftStart - 3]));
      const looksLikeCoefficientOrStandalone =
        !isExponentGroup &&
        !isPowerBase &&
        !isTrailingNote &&
        (afterChar === '' ||
          afterChar === '(' ||
          /[a-zA-Z]/.test(afterChar) ||
          /[\s=+,;.)]/.test(afterChar));

      if (looksLikeCoefficientOrStandalone) {
        finalStart = leftStart - 1;
        finalEnd = rightEnd + 1;
        hadOuterParens = true;
      }
    }

    return {
      start: finalStart,
      end: finalEnd,
      numRaw,
      denRaw,
      hadOuterParens,
    };
  }
  return null;
}

function pushText(nodes: MathNode[], value: string) {
  if (!value) return;
  const last = nodes[nodes.length - 1];
  if (last && last.type === 'text') {
    last.value += value;
  } else {
    nodes.push({ type: 'text', value });
  }
}

export function parseMathNodes(input: string): MathNode[] {
  if (!input) return [];

  // First pass: split out ^(...) and ^token exponents so ^(t/3) parses cleanly inside superscript
  if (input.includes('^')) {
    const out: MathNode[] = [];
    let cursor = 0;
    for (let i = 0; i < input.length; i++) {
      if (input[i] !== '^') continue;
      if (i + 1 >= input.length) continue;

      if (input[i + 1] === '(') {
        const closeIdx = findMatchingCloseParen(input, i + 1);
        if (closeIdx !== -1) {
          const expRaw = input.slice(i + 2, closeIdx);
          if (i > cursor) {
            out.push(...parseFractionsOnly(input.slice(cursor, i)));
          }
          out.push({ type: 'sup', exp: parseMathNodes(expRaw) });
          cursor = closeIdx + 1;
          i = closeIdx;
        }
      } else if (/[-−A-Za-z0-9]/.test(input[i + 1])) {
        let end = i + 1;
        if (input[end] === '-' || input[end] === '−') end++;
        while (end < input.length && /[A-Za-z0-9.]/.test(input[end])) {
          end++;
        }
        if (end > i + 1) {
          const expRaw = input.slice(i + 1, end);
          if (i > cursor) {
            out.push(...parseFractionsOnly(input.slice(cursor, i)));
          }
          out.push({ type: 'sup', exp: [{ type: 'text', value: expRaw }] });
          cursor = end;
          i = end - 1;
        }
      }
    }
    if (cursor < input.length) {
      out.push(...parseFractionsOnly(input.slice(cursor)));
    }
    return out;
  }

  return parseFractionsOnly(input);
}

function parseFractionsOnly(input: string): MathNode[] {
  const nodes: MathNode[] = [];
  let cursor = 0;

  while (cursor < input.length) {
    const match = findNextFraction(input, cursor);
    if (!match) {
      pushText(nodes, input.slice(cursor));
      break;
    }

    if (match.start > cursor) {
      pushText(nodes, input.slice(cursor, match.start));
    }

    // Preserve a negative sign immediately inside e.g. (−3/2) when outer parens were stripped -> − (3/2)
    const numNodes = parseMathNodes(match.numRaw);
    const denNodes = parseMathNodes(match.denRaw);
    nodes.push({
      type: 'frac',
      num: numNodes,
      den: denNodes,
    });
    cursor = match.end;
  }

  return nodes;
}

const renderNodes = (nodes: MathNode[], keyPrefix = 'm'): React.ReactNode =>
  nodes.map((node, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (node.type === 'text') {
      return <React.Fragment key={key}>{node.value}</React.Fragment>;
    }
    if (node.type === 'sup') {
      return (
        <sup
          key={key}
          className="text-[0.75em] leading-none align-super font-semibold ml-[1px]"
        >
          {renderNodes(node.exp, key)}
        </sup>
      );
    }
    return (
      <span
        key={key}
        className="inline-flex flex-col items-center align-middle mx-0.5 leading-none text-[0.86em] font-mono"
      >
        <span className="px-1 pb-[2px] border-b border-current text-center whitespace-nowrap">
          {renderNodes(node.num, `${key}n`)}
        </span>
        <span className="px-1 pt-[2px] text-center whitespace-nowrap">
          {renderNodes(node.den, `${key}d`)}
        </span>
      </span>
    );
  });

export const MathText: React.FC<{
  text: string;
  className?: string;
}> = ({ text, className }) => {
  const nodes = React.useMemo(() => parseMathNodes(text), [text]);
  if (className) {
    return <span className={className}>{renderNodes(nodes)}</span>;
  }
  return <>{renderNodes(nodes)}</>;
};
