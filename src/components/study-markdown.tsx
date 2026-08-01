import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import { Component, useMemo, useState, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Plain-text math -> LaTeX normalizer
// Converts student-facing raw syntax like  sqrt(2),  x^2,  i*sqrt(5),  (a+b)/(c)
// into proper $...$ LaTeX so KaTeX renders textbook-style notation.
// ---------------------------------------------------------------------------

// Find matching closing paren starting AT s[start] === '('
function balancedParen(s: string, start: number): number {
  if (s[start] !== "(") return -1;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

const FUNCS = ["sqrt", "sin", "cos", "tan", "cot", "sec", "csc", "log", "ln", "exp", "abs"];

function plainToLatex(input: string): string {
  let s = input;

  // 0) Binomial coefficients — ONLY for compact tokens like 5C2, nC2, nC(r+1).
  //    Never for English words ("the Center", "of Conservation").
  s = s.replace(/(?<![A-Za-z0-9])\^?([A-Za-z]|\d+)\s*C\s*_?\(([^()]+)\)/g, "\\binom{$1}{$2}");
  s = s.replace(/(?<![A-Za-z0-9])\^?([A-Za-z]|\d+)\s*C\s*_?([A-Za-z]|\d+)(?![A-Za-z0-9])/g, "\\binom{$1}{$2}");
  // Permutations: nPr -> P^{n}_{r}
  s = s.replace(/(?<![A-Za-z0-9])\^?([A-Za-z]|\d+)\s*P\s*_?([A-Za-z]|\d+)(?![A-Za-z0-9])/g, "{}^{$1}P_{$2}");


  // 1) Function calls — handle balanced parens, recursively (single left-to-right pass).
  //    sqrt(x+1) -> \sqrt{x+1},   sin(x) -> \sin(x)
  const funcRe = new RegExp(`\\b(${FUNCS.join("|")})\\s*\\(`, "g");
  let out = "";
  let cursor = 0;
  let mm: RegExpExecArray | null;
  funcRe.lastIndex = 0;
  while ((mm = funcRe.exec(s)) !== null) {
    const start = mm.index;
    if (start < cursor) continue;
    const openIdx = start + mm[0].length - 1;
    const closeIdx = balancedParen(s, openIdx);
    if (closeIdx < 0) continue;
    const name = mm[1];
    const innerLtx = plainToLatex(s.slice(openIdx + 1, closeIdx));
    const replacement =
      name === "sqrt"
        ? `\\sqrt{${innerLtx}}`
        : name === "abs"
          ? `\\left|${innerLtx}\\right|`
          : `\\${name}\\left(${innerLtx}\\right)`;
    out += s.slice(cursor, start) + replacement;
    cursor = closeIdx + 1;
    funcRe.lastIndex = cursor;
  }
  s = out + s.slice(cursor);


  // 2) Exponents:  x^2 -> x^{2},  x^(n+1) -> x^{n+1},  x^-3 -> x^{-3}
  s = s.replace(/\^\(([^()]+)\)/g, "^{$1}");
  s = s.replace(/\^(-?[A-Za-z0-9.]+)/g, "^{$1}");

  // 3) Subscripts:  x_1 -> x_{1}
  s = s.replace(/_\(([^()]+)\)/g, "_{$1}");
  s = s.replace(/_(-?[A-Za-z0-9.]+)/g, "_{$1}");

  // 4) Fractions:  (a)/(b) -> \frac{a}{b},   3/4 -> \frac{3}{4}
  s = s.replace(/\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g, "\\frac{$1}{$2}");
  s = s.replace(/(?<![A-Za-z0-9_}])(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)(?![A-Za-z0-9_])/g, "\\frac{$1}{$2}");

  // 5) Multiplication & operators — drop markdown bold markers, never emit them as \cdot
  s = s.replace(/\*{2,}/g, "");
  s = s.replace(/\*/g, " \\cdot ");
  s = s.replace(/<=/g, "\\leq ").replace(/>=/g, "\\geq ").replace(/!=/g, "\\neq ");
  s = s.replace(/\+\-/g, "\\pm ").replace(/-\+/g, "\\mp ");

  // 6) Greek / constants (whole-word, lowercase)
  const greek: Record<string, string> = {
    pi: "\\pi", theta: "\\theta", alpha: "\\alpha", beta: "\\beta",
    gamma: "\\gamma", delta: "\\delta", lambda: "\\lambda", mu: "\\mu",
    omega: "\\omega", phi: "\\phi", sigma: "\\sigma", infinity: "\\infty",
  };
  s = s.replace(/\b(pi|theta|alpha|beta|gamma|delta|lambda|mu|omega|phi|sigma|infinity)\b/gi, (_, w) => {
    const key = w.toLowerCase();
    return greek[key] ?? w;
  });

  return s;
}

// Detect chunks of plain-text that look like math expressions and wrap with $...$.
// Triggers: sqrt(, ^, _{, function(..), fraction patterns like (..)/(..).
const TRIGGER_RE = new RegExp(
  // chunk = run of math-ish chars containing at least one trigger
  `(?<![\\w$])` +
    `(?=[A-Za-z0-9(\\\\.\\-+])` +
    `[A-Za-z0-9_+\\-*/^().,!=<>]*?` +
    `(?:` +
      `\\b(?:${FUNCS.join("|")})\\([^)]*\\)` +
      `|[A-Za-z0-9)]\\^[A-Za-z0-9(\\-]` +
      `|(?<![A-Za-z0-9])(?:[A-Za-z]|\\d+)[CP](?:[A-Za-z]|\\d+)(?![A-Za-z0-9])` +
      `|\\([^()]+\\)\\/\\([^()]+\\)` +
    `)` +
    `[A-Za-z0-9_+\\-*/^().,!=<>]*?` +
    `(?=[\\s.,;:!?)]|$)`,
  "g",
);

// Words of 3+ letters that aren't math function names mean this is prose, not an equation.
const PROSE_WORD_RE = new RegExp(`\\b(?!(?:${FUNCS.join("|")})\\b)[A-Za-z]{3,}\\b`);

function wrapInlineMath(text: string): string {
  return text.replace(TRIGGER_RE, (match) => {
    const trimmed = match.trim();
    if (!trimmed) return match;
    // Never turn ordinary sentences into math — that mangles spacing and words.
    if (PROSE_WORD_RE.test(trimmed)) return match;
    const leading = match.slice(0, match.length - match.trimStart().length);
    const trailing = match.slice(match.trimEnd().length);
    return `${leading}$${plainToLatex(trimmed)}$${trailing}`;
  });
}

// Skip code blocks, inline code, and already-delimited math.
const PROTECTED_RE = /(```[\s\S]*?```|`[^`\n]*`|\$\$[\s\S]*?\$\$|\$[^$\n]+?\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g;

// Repair artifacts already present in stored/generated content.
function repairArtifacts(md: string): string {
  let s = md;
  // \binom{the}{enter}, \binom{the}{M}... -> plain words again
  s = s.replace(/\\binom\{([A-Za-z]{2,})\}\{([A-Za-z]*)\}/g, (_, a: string, b: string) => {
    if (/^the$/i.test(a) && b === "M") return `${a} Center of Mass`;
    return `${a} C${b}`;
  });
  s = s.replace(/\bthe\s+Center of Mass\b/g, "the Center of Mass");
  s = s.replace(/\bthe\s+Center\b/g, "the Center");
  // stray literal \cdot runs used as word separators
  s = s.replace(/(?:\s*\\cdot\s*){2,}/g, " ");
  s = s.replace(/(?<![\w)\]}])\s*\\cdot\s*(?![\w(])/g, " ");
  // stray bold markers / lone dollar signs surviving as literal characters
  s = s.replace(/\*{2,}(?=\s|$)/g, "").replace(/(?:^|\s)\*{2,}(?=\s)/g, " ");
  const dollars = (s.match(/\$/g) ?? []).length;
  if (dollars % 2 === 1) s = s.replace(/\$/g, "");
  return s;
}

export function normalizeMath(md: string): string {
  if (!md) return md;
  md = repairArtifacts(md);

  const out: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = PROTECTED_RE.exec(md)) !== null) {
    out.push(wrapInlineMath(md.slice(last, m.index)));
    out.push(m[0]);
    last = m.index + m[0].length;
  }
  out.push(wrapInlineMath(md.slice(last)));
  return out.join("");
}

// ---------------------------------------------------------------------------
// Fallback: render LaTeX as readable plain text when KaTeX itself throws.
// ---------------------------------------------------------------------------
function latexToPlain(input: string): string {
  let s = input;
  s = s.replace(/\\d?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "($1 / $2)");
  s = s.replace(/\\sqrt\s*\{([^{}]+)\}/g, "√($1)");
  s = s.replace(/\^\{([^{}]+)\}/g, "^($1)");
  s = s.replace(/_\{([^{}]+)\}/g, "_($1)");
  s = s.replace(/\\left|\\right/g, "");
  s = s.replace(/\\cdot/g, "·").replace(/\\times/g, "×").replace(/\\div/g, "÷");
  s = s.replace(/\\pm/g, "±").replace(/\\mp/g, "∓");
  s = s.replace(/\\leq/g, "≤").replace(/\\geq/g, "≥").replace(/\\neq/g, "≠");
  s = s.replace(/\\approx/g, "≈").replace(/\\infty/g, "∞");
  s = s.replace(/\\pi/g, "π").replace(/\\theta/g, "θ").replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β").replace(/\\gamma/g, "γ").replace(/\\Delta/g, "Δ")
    .replace(/\\delta/g, "δ").replace(/\\lambda/g, "λ").replace(/\\mu/g, "μ")
    .replace(/\\omega/g, "ω").replace(/\\phi/g, "φ").replace(/\\sigma/g, "σ")
    .replace(/\\sum/g, "Σ").replace(/\\int/g, "∫");
  s = s.replace(/\\(?:mathbf|mathrm|mathit|text|boldsymbol|operatorname)\s*\{([^{}]*)\}/g, "$1");
  s = s.replace(/\\[a-zA-Z]+\*?/g, "");
  s = s.replace(/[{}]/g, "");
  return s;
}

function stripMathDelimiters(md: string): string {
  return md
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, x) => `\n\n${latexToPlain(x).trim()}\n\n`)
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, x) => `\n\n${latexToPlain(x).trim()}\n\n`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, x) => latexToPlain(x))
    .replace(/\$([^$\n]+?)\$/g, (_, x) => latexToPlain(x));
}

class KatexErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

interface StudyMarkdownProps {
  children: string;
  /** When the source is longer than this many chars, collapse with an "Expand Expression" toggle. */
  collapseAt?: number;
}

export function StudyMarkdown({ children, collapseAt = 700 }: StudyMarkdownProps) {
  const raw = children ?? "";
  const source = useMemo(() => normalizeMath(raw), [raw]);
  const [expanded, setExpanded] = useState(false);
  const canCollapse = raw.length > collapseAt;
  const showCollapsed = canCollapse && !expanded;

  const body = (
    <KatexErrorBoundary
      fallback={
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {stripMathDelimiters(source)}
        </ReactMarkdown>
      }
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore", output: "html" }]]}
      >
        {source}
      </ReactMarkdown>
    </KatexErrorBoundary>
  );

  return (
    <div className="study-md-wrap max-w-full overflow-x-auto break-words">
      <div
        className={showCollapsed ? "relative max-h-48 overflow-hidden" : "relative"}
      >
        {body}
        {showCollapsed && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent"
          />
        )}
      </div>
      {canCollapse && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
        >
          {expanded ? "Collapse" : "Expand Expression"}
        </button>
      )}
    </div>
  );
}
