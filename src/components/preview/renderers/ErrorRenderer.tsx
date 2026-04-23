import type { PreviewPayload } from "../types";

type ErrorPayload = Extract<PreviewPayload, { type: "error" }>;

export default function ErrorRenderer({ payload }: { payload: ErrorPayload }) {
  return <p className="text-sm text-destructive">{payload.message}</p>;
}
