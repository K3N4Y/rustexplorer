import type { PreviewPayload } from "../types";

type TextPayload = Extract<PreviewPayload, { type: "text" }>;

export default function TextRenderer({ payload }: { payload: TextPayload }) {
  return (
    <div className="space-y-3">
      {payload.truncated ? (
        <p className="text-xs text-muted-foreground">Preview truncado.</p>
      ) : null}
      <pre className="overflow-x-auto rounded-md bg-muted p-3 text-sm">
        <code>{payload.content}</code>
      </pre>
    </div>
  );
}
