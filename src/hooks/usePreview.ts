import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import type { FileItem } from "@/components/file-types";
import type { PreviewPayload } from "@/components/preview/types";

type UsePreviewArgs = {
  selectedItem: FileItem | null;
  previewOpen: boolean;
};

type PreviewPayloadRaw =
  | { type: "text"; content: string; extension?: string; truncated: boolean; size_bytes: number; reason?: string }
  | { type: "markdown"; content: string; truncated: boolean; size_bytes: number }
  | { type: "image"; path: string; mime_type: string; size_bytes: number }
  | { type: "pdf"; path: string; mime_type?: string; size_bytes: number }
  | { type: "video"; path: string; mime_type?: string; size_bytes: number }
  | { type: "audio"; path: string; mime_type?: string; size_bytes: number }
  | { type: "directory"; entry_count?: number }
  | { type: "binary"; mime_type?: string; size_bytes: number; reason?: string }
  | { type: "code"; content: string; language: string; truncated: boolean; size_bytes: number }
  | { type: "csv"; headers: string[]; rows: string[][]; truncated: boolean; size_bytes: number }
  | { type: "json"; content: string; is_array: boolean; truncated: boolean; size_bytes: number };

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || typeof value === "number";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isStringArrayArray(value: unknown): value is string[][] {
  return Array.isArray(value) && value.every(isStringArray);
}

function isPreviewPayloadRaw(value: unknown): value is PreviewPayloadRaw {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  const type = obj.type;
  if (!isString(type)) return false;

  switch (type) {
    case "text":
      return (
        isString(obj.content) &&
        isOptionalString(obj.extension) &&
        isBoolean(obj.truncated) &&
        isNumber(obj.size_bytes) &&
        isOptionalString(obj.reason)
      );
    case "markdown":
      return (
        isString(obj.content) &&
        isBoolean(obj.truncated) &&
        isNumber(obj.size_bytes)
      );
    case "image":
      return (
        isString(obj.path) &&
        isString(obj.mime_type) &&
        isNumber(obj.size_bytes)
      );
    case "pdf":
    case "video":
    case "audio":
      return (
        isString(obj.path) &&
        isOptionalString(obj.mime_type) &&
        isNumber(obj.size_bytes)
      );
    case "directory":
      return isOptionalNumber(obj.entry_count);
    case "binary":
      return (
        isOptionalString(obj.mime_type) &&
        isNumber(obj.size_bytes) &&
        isOptionalString(obj.reason)
      );
    case "code":
      return (
        isString(obj.content) &&
        isString(obj.language) &&
        isBoolean(obj.truncated) &&
        isNumber(obj.size_bytes)
      );
    case "csv":
      return (
        isStringArray(obj.headers) &&
        isStringArrayArray(obj.rows) &&
        isBoolean(obj.truncated) &&
        isNumber(obj.size_bytes)
      );
    case "json":
      return (
        isString(obj.content) &&
        isBoolean(obj.is_array) &&
        isBoolean(obj.truncated) &&
        isNumber(obj.size_bytes)
      );
    default:
      return false;
  }
}

function normalizePreviewPayload(payload: unknown): PreviewPayload {
  if (!isPreviewPayloadRaw(payload)) {
    throw new Error("Preview con formato no soportado.");
  }

  switch (payload.type) {
    case "text":
      return {
        type: "text",
        content: payload.content,
        extension: payload.extension,
        truncated: payload.truncated,
        sizeBytes: payload.size_bytes,
      };
    case "markdown":
      return {
        type: "markdown",
        content: payload.content,
        truncated: payload.truncated,
        sizeBytes: payload.size_bytes,
      };
    case "image":
      return {
        type: "image",
        path: payload.path,
        mimeType: payload.mime_type,
        sizeBytes: payload.size_bytes,
      };
    case "pdf":
      return {
        type: "pdf",
        path: payload.path,
        mimeType: payload.mime_type,
        sizeBytes: payload.size_bytes,
      };
    case "audio":
      return {
        type: "audio",
        path: payload.path,
        mimeType: payload.mime_type,
        sizeBytes: payload.size_bytes,
      };
    case "video":
      return {
        type: "video",
        path: payload.path,
        mimeType: payload.mime_type,
        sizeBytes: payload.size_bytes,
      };
    case "directory":
      return {
        type: "directory",
        entryCount: payload.entry_count,
      };
    case "binary":
      return {
        type: "binary",
        mimeType: payload.mime_type,
        sizeBytes: payload.size_bytes,
        reason: payload.reason,
      };
    case "code":
      return {
        type: "code",
        content: payload.content,
        language: payload.language,
        truncated: payload.truncated,
        sizeBytes: payload.size_bytes,
      };
    case "csv":
      return {
        type: "csv",
        headers: payload.headers,
        rows: payload.rows,
        truncated: payload.truncated,
        sizeBytes: payload.size_bytes,
      };
    case "json":
      return {
        type: "json",
        content: payload.content,
        isArray: payload.is_array,
        truncated: payload.truncated,
        sizeBytes: payload.size_bytes,
      };
    default:
      throw new Error("Preview con formato no soportado.");
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

    void invoke("read_file_preview", {
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
