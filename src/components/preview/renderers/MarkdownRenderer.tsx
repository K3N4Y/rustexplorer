import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { PreviewPayload } from "../types";

type MarkdownPayload = Extract<PreviewPayload, { type: "markdown" }>;

export default function MarkdownRenderer({ payload }: { payload: MarkdownPayload }) {
  return (
    <div className="space-y-3">
      {payload.truncated ? (
        <p className="text-xs text-muted-foreground">Preview truncado.</p>
      ) : null}
      <article className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{payload.content}</ReactMarkdown>
      </article>
    </div>
  );
}
