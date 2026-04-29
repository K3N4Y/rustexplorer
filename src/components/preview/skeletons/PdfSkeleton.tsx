export default function PdfSkeleton() {
  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 h-6 w-full animate-pulse rounded bg-muted" />
      <div
        className="mx-auto w-full max-w-full animate-pulse rounded-lg bg-muted"
        style={{ aspectRatio: "8.5 / 11" }}
      />
    </div>
  );
}
