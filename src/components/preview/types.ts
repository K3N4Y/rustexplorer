export type PreviewPayload =
  | {
      type: "text";
      content: string;
      extension?: string;
      truncated: boolean;
      sizeBytes: number;
    }
  | {
      type: "markdown";
      content: string;
      truncated: boolean;
      sizeBytes: number;
    }
  | {
      type: "image";
      path?: string;
      dataUrl?: string;
      mimeType: string;
      sizeBytes: number;
    }
  | {
      type: "pdf";
      path: string;
      mimeType?: string;
      sizeBytes: number;
    }
  | {
      type: "video";
      path: string;
      mimeType?: string;
      sizeBytes: number;
    }
  | {
      type: "audio";
      path: string;
      mimeType?: string;
      sizeBytes: number;
    }
  | {
      type: "directory";
      entryCount?: number;
    }
  | {
      type: "binary";
      mimeType?: string;
      sizeBytes: number;
      reason?: string;
    };
