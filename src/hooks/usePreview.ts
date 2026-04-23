import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import type { FileItem } from "@/components/file-types";
import type { PreviewPayload } from "@/components/preview/types";

type UsePreviewArgs = {
  selectedItem: FileItem | null;
  previewOpen: boolean;
};

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

        setPayload(nextPayload);
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
