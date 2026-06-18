import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import { Component, type ReactNode } from "react";

// Fallback: strip LaTeX delimiters / common commands to readable plain text.
function latexToPlain(input: string): string {
  let s = input;
  // \frac{a}{b} -> (a / b)
  s = s.replace(/\\d?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "($1 / $2)");
  // \sqrt{x} -> sqrt(x)
  s = s.replace(/\\sqrt\s*\{([^{}]+)\}/g, "sqrt($1)");
  // ^{n}C_{r} or ^nC_r -> nCr
  s = s.replace(/\^\{?(\w+)\}?\s*C\s*_\{?(\w+)\}?/g, "$1C$2");
  s = s.replace(/\^\{?(\w+)\}?\s*P\s*_\{?(\w+)\}?/g, "$1P$2");
  // superscripts/subscripts
  s = s.replace(/\^\{([^{}]+)\}/g, "^($1)");
  s = s.replace(/_\{([^{}]+)\}/g, "_($1)");
  s = s.replace(/\^(\w)/g, "^$1");
  s = s.replace(/_(\w)/g, "_$1");
  // operators
  s = s.replace(/\\times/g, "×").replace(/\\cdot/g, "·").replace(/\\div/g, "÷");
  s = s.replace(/\\pm/g, "±").replace(/\\mp/g, "∓");
  s = s.replace(/\\leq/g, "≤").replace(/\\geq/g, "≥").replace(/\\neq/g, "≠");
  s = s.replace(/\\approx/g, "≈").replace(/\\infty/g, "∞");
  s = s.replace(/\\pi/g, "π").replace(/\\theta/g, "θ").replace(/\\alpha/g, "α").replace(/\\beta/g, "β").replace(/\\gamma/g, "γ").replace(/\\Delta/g, "Δ").replace(/\\delta/g, "δ").replace(/\\sum/g, "Σ").replace(/\\int/g, "∫");
  // \mathbf{x}, \mathrm{x}, \text{x}
  s = s.replace(/\\(?:mathbf|mathrm|mathit|text|boldsymbol)\s*\{([^{}]*)\}/g, "$1");
  // strip remaining backslash commands
  s = s.replace(/\\[a-zA-Z]+\*?/g, "");
  // strip braces
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

export function StudyMarkdown({ children }: { children: string }) {
  const source = children ?? "";
  return (
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
}
