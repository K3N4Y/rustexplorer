import { convertFileSrc } from "@tauri-apps/api/core";
import type { PreviewPayload } from "../types";

type ImagePayload = Extract<PreviewPayload, { type: "image" }>;

export default function ImageRenderer({ payload }: { payload: ImagePayload }) {
  const src = payload.path
    ? convertFileSrc(payload.path.replace(/\\/g, "/"))
    : payload.dataUrl;

  return (
    <img
      src={src}
      alt="Preview"
      className="h-auto max-h-full w-full rounded-md object-contain"
    />
  );
}
