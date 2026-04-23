import AudioRenderer from "./renderers/AudioRenderer";
import BinaryRenderer from "./renderers/BinaryRenderer";
import DirectoryRenderer from "./renderers/DirectoryRenderer";
import ErrorRenderer from "./renderers/ErrorRenderer";
import ImageRenderer from "./renderers/ImageRenderer";
import MarkdownRenderer from "./renderers/MarkdownRenderer";
import PdfRenderer from "./renderers/PdfRenderer";
import TextRenderer from "./renderers/TextRenderer";
import VideoRenderer from "./renderers/VideoRenderer";
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
    case "error":
      return <ErrorRenderer payload={payload} />;
  }
}
