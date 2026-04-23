import { convertFileSrc } from "@tauri-apps/api/core";
import type { PreviewPayload } from "../types";

type VideoPayload = Extract<PreviewPayload, { type: "video" }>;

export default function VideoRenderer({ payload }: { payload: VideoPayload }) {
  const normalizedPath = payload.path.replace(/\\/g, "/");

  return (
    <video controls className="w-full rounded-md" src={convertFileSrc(normalizedPath)} />
  );
}
