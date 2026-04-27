import React, { Suspense } from "react";
import type { PreviewPayload } from "./types";

const AudioRenderer = React.lazy(() => import("./renderers/AudioRenderer"));
const BinaryRenderer = React.lazy(() => import("./renderers/BinaryRenderer"));
const DirectoryRenderer = React.lazy(() => import("./renderers/DirectoryRenderer"));
const ImageRenderer = React.lazy(() => import("./renderers/ImageRenderer"));
const MarkdownRenderer = React.lazy(() => import("./renderers/MarkdownRenderer"));
const PdfRenderer = React.lazy(() => import("./renderers/PdfRenderer"));
const TextRenderer = React.lazy(() => import("./renderers/TextRenderer"));
const VideoRenderer = React.lazy(() => import("./renderers/VideoRenderer"));
const CodeRenderer = React.lazy(() => import("./renderers/CodeRenderer"));
const CsvRenderer = React.lazy(() => import("./renderers/CsvRenderer"));
const JsonRenderer = React.lazy(() => import("./renderers/JsonRenderer"));

export default function PreviewContent({ payload }: { payload: PreviewPayload }) {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Cargando preview...</div>}>
      {(() => {
        switch (payload.type) {
          case "text":
            return <TextRenderer payload={payload} />;
          case "markdown":
            return <MarkdownRenderer payload={payload} />;
          case "image":
            return <ImageRenderer payload={payload} />;
          case "pdf":
            return <PdfRenderer payload={payload} />;
          case "audio":
            return <AudioRenderer payload={payload} />;
          case "video":
            return <VideoRenderer payload={payload} />;
          case "directory":
            return <DirectoryRenderer payload={payload} />;
          case "binary":
            return <BinaryRenderer payload={payload} />;
          case "code":
            return <CodeRenderer payload={payload} />;
          case "csv":
            return <CsvRenderer payload={payload} />;
          case "json":
            return <JsonRenderer payload={payload} />;
        }
      })()}
    </Suspense>
  );
}
