import PreviewContent from "./PreviewContent";
import type { PreviewPayload } from "./types";

type PreviewPanelProps = {
  open: boolean;
  selectedName?: string;
  payload: PreviewPayload | null;
  isLoading: boolean;
  error: string | null;
};

export default function PreviewPanel({
  open,
  selectedName,
  payload,
  isLoading,
  error,
}: PreviewPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <aside className="flex h-full w-[420px] shrink-0 flex-col border-l border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="truncate text-sm font-semibold">Preview</h2>
        {selectedName ? (
          <p className="truncate text-xs text-muted-foreground">{selectedName}</p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {isLoading ? <p>Cargando preview...</p> : null}
        {!isLoading && error ? <p>{error}</p> : null}
        {!isLoading && !error && !payload ? (
          <p>Selecciona un archivo y presiona Space para abrir el preview.</p>
        ) : null}
        {!isLoading && !error && payload ? <PreviewContent payload={payload} /> : null}
      </div>
    </aside>
  );
}
