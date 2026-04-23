import { convertFileSrc } from "@tauri-apps/api/core";
import type { PreviewPayload } from "../types";

type PdfPayload = Extract<PreviewPayload, { type: "pdf" }>;

export default function PdfRenderer({ payload }: { payload: PdfPayload }) {
  const normalizedPath = payload.path.replace(/\\/g, "/");
  const src = convertFileSrc(normalizedPath);

  return (
    <object
      data={src}
      type="application/pdf"
      title="PDF preview"
      className="h-full min-h-[640px] w-full rounded-md border"
    >
      <p className="text-sm text-muted-foreground">No se pudo embeber el PDF en el panel.</p>
    </object>
  );
}
