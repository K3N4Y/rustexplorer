import AudioRenderer from "./renderers/AudioRenderer";
import BinaryRenderer from "./renderers/BinaryRenderer";
import DirectoryRenderer from "./renderers/DirectoryRenderer";
import ImageRenderer from "./renderers/ImageRenderer";
import MarkdownRenderer from "./renderers/MarkdownRenderer";
import PdfRenderer from "./renderers/PdfRenderer";
import TextRenderer from "./renderers/TextRenderer";
import VideoRenderer from "./renderers/VideoRenderer";
import CodeRenderer from "./renderers/CodeRenderer";
import CsvRenderer from "./renderers/CsvRenderer";
import JsonRenderer from "./renderers/JsonRenderer";
import type { PreviewPayload } from "./types";

export default function PreviewContent({ payload }: { payload: PreviewPayload }) {
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
}
