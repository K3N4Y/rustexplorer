import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import type { FileItem } from "@/components/file-types";
import type { PreviewPayload } from "@/components/preview/types";

type UsePreviewArgs = {
  selectedItem: FileItem | null;
  previewOpen: boolean;
};

function normalizePreviewPayload(payload: unknown): PreviewPayload {
  const value = payload as Record<string, unknown>;

  switch (value.type) {
    case "text":
      return {
        type: "text",
        content: String(value.content ?? ""),
        extension: (value.extension as string | undefined) ?? undefined,
        truncated: Boolean(value.truncated),
        sizeBytes: Number(value.sizeBytes ?? value.size_bytes ?? 0),
      };
    case "markdown":
      return {
        type: "markdown",
        content: String(value.content ?? ""),
        truncated: Boolean(value.truncated),
        sizeBytes: Number(value.sizeBytes ?? value.size_bytes ?? 0),
      };
    case "image":
      return {
        type: "image",
        path: (value.path as string | undefined) ?? undefined,
        dataUrl: (value.dataUrl as string | undefined) ?? (value.data_url as string | undefined),
        mimeType: String(value.mimeType ?? value.mime_type ?? "image/*"),
        sizeBytes: Number(value.sizeBytes ?? value.size_bytes ?? 0),
      };
    case "pdf":
      return {
        type: "pdf",
        path: String(value.path ?? ""),
        mimeType: (value.mimeType as string | undefined) ?? (value.mime_type as string | undefined),
        sizeBytes: Number(value.sizeBytes ?? value.size_bytes ?? 0),
      };
    case "audio":
      return {
        type: "audio",
        path: String(value.path ?? ""),
        mimeType: (value.mimeType as string | undefined) ?? (value.mime_type as string | undefined),
        sizeBytes: Number(value.sizeBytes ?? value.size_bytes ?? 0),
      };
    case "video":
      return {
        type: "video",
        path: String(value.path ?? ""),
        mimeType: (value.mimeType as string | undefined) ?? (value.mime_type as string | undefined),
        sizeBytes: Number(value.sizeBytes ?? value.size_bytes ?? 0),
      };
    case "directory":
      {
        const entryCount = value.entryCount ?? value.entry_count;

        return {
          type: "directory",
          entryCount: typeof entryCount === "number" ? entryCount : undefined,
        };
      }
    case "binary":
      return {
        type: "binary",
        mimeType: (value.mimeType as string | undefined) ?? (value.mime_type as string | undefined),
        sizeBytes: Number(value.sizeBytes ?? value.size_bytes ?? 0),
        reason: (value.reason as string | undefined) ?? undefined,
      };
    case "error":
      return {
        type: "error",
        message: String(value.message ?? "Error al cargar preview."),
      };
    default:
      return {
        type: "error",
        message: "Preview con formato no soportado.",
      };
  }
}

export function usePreview({ selectedItem, previewOpen }: UsePreviewArgs) {
  const [payload, setPayload] = useState<PreviewPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (!previewOpen || !selectedItem) {
      setPayload(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    requestId.current += 1;
    const currentRequestId = requestId.current;

    setIsLoading(true);
    setError(null);

    void invoke<PreviewPayload>("read_file_preview", {
      path: selectedItem.path,
      maxBytes: undefined,
    })
      .then((nextPayload) => {
        if (currentRequestId !== requestId.current) {
          return;
        }

        setPayload(normalizePreviewPayload(nextPayload));
      })
      .catch((nextError) => {
        if (currentRequestId !== requestId.current) {
          return;
        }

        setError(nextError instanceof Error ? nextError.message : "No se pudo cargar el preview.");
        setPayload(null);
      })
      .finally(() => {
        if (currentRequestId !== requestId.current) {
          return;
        }

        setIsLoading(false);
      });
  }, [selectedItem, previewOpen]);

  return { payload, isLoading, error };
}
