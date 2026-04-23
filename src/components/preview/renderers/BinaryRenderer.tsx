import type { PreviewPayload } from "../types";

type BinaryPayload = Extract<PreviewPayload, { type: "binary" }>;

export default function BinaryRenderer({ payload }: { payload: BinaryPayload }) {
  return (
    <div className="space-y-2 text-sm">
      <p>No hay preview disponible para este archivo.</p>
      <p>Tamaño: {payload.sizeBytes} bytes</p>
      {payload.mimeType ? <p>MIME: {payload.mimeType}</p> : null}
      {payload.reason ? <p>{payload.reason}</p> : null}
    </div>
  );
}
