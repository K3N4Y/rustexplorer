import PdfSkeleton from "./PdfSkeleton";
import ImageSkeleton from "./ImageSkeleton";
import GenericSkeleton from "./GenericSkeleton";

function getSkeletonType(fileName: string): "pdf" | "image" | "generic" {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico"].includes(ext)) {
    return "image";
  }
  return "generic";
}

export default function PreviewSkeleton({ fileName }: { fileName: string }) {
  const type = getSkeletonType(fileName);
  switch (type) {
    case "pdf":
      return <PdfSkeleton />;
    case "image":
      return <ImageSkeleton />;
    default:
      return <GenericSkeleton />;
  }
}
