import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { PreviewPayload } from "../types";

type MarkdownPayload = Extract<PreviewPayload, { type: "markdown" }>;

const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

function isSafeUrl(url: string | undefined): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url, "http://localhost");
    return ALLOWED_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

function SafeLink({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (!isSafeUrl(href)) {
    return <span {...props}>{children}</span>;
  }
  return <a href={href} {...props}>{children}</a>;
}

export default function MarkdownRenderer({ payload }: { payload: MarkdownPayload }) {
  return (
    <div className="space-y-3">
      {payload.truncated ? (
        <p className="text-xs text-muted-foreground">Preview truncado.</p>
      ) : null}
      <article className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: SafeLink }}>
          {payload.content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
