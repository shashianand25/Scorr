"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

export function MarkdownRenderer({ value }: { value: string }) {
  return (
    <div className="prose-lite max-w-none text-sm leading-6">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]}>
        {value}
      </ReactMarkdown>
    </div>
  );
}
