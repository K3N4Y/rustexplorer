import type { PreviewPayload } from "../types";

type ImagePayload = Extract<PreviewPayload, { type: "image" }>;

export default function ImageRenderer({ payload }: { payload: ImagePayload }) {
  return (
    <img
      src={payload.dataUrl}
      alt="Preview"
      className="max-h-full w-full rounded-md object-contain"
    />
  );
}
