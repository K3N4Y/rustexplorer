export default function ImageSkeleton() {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <div
        className="w-full max-w-full animate-pulse rounded-lg bg-muted"
        style={{ aspectRatio: "16 / 9" }}
      />
    </div>
  );
}
