import { convertFileSrc } from "@tauri-apps/api/core";
import type { PreviewPayload } from "../types";

type AudioPayload = Extract<PreviewPayload, { type: "audio" }>;

export default function AudioRenderer({ payload }: { payload: AudioPayload }) {
  const normalizedPath = payload.path.replace(/\\/g, "/");
  return <audio controls className="w-full" src={convertFileSrc(normalizedPath)} />;
}
