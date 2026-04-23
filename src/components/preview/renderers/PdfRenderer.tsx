import { convertFileSrc } from "@tauri-apps/api/core";
import type { PreviewPayload } from "../types";

type PdfPayload = Extract<PreviewPayload, { type: "pdf" }>;

export default function PdfRenderer({ payload }: { payload: PdfPayload }) {
  return (
    <iframe
      title="PDF preview"
      src={convertFileSrc(payload.path)}
      className="h-full min-h-[640px] w-full rounded-md border"
    />
  );
}
