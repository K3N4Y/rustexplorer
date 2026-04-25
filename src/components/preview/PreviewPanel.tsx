import { useCallback, useEffect, useRef, useState } from "react";
import PreviewContent from "./PreviewContent";
import type { PreviewPayload } from "./types";

const DEFAULT_PANEL_WIDTH = 420;
const MIN_PANEL_WIDTH = 280;
const MAX_PANEL_WIDTH_RATIO = 0.6;
const RESIZE_STEP = 24;

type PreviewPanelProps = {
  open: boolean;
  selectedName?: string;
  payload: PreviewPayload | null;
  isLoading: boolean;
  error: string | null;
};

function getMaxPanelWidth() {
  return Math.floor(window.innerWidth * MAX_PANEL_WIDTH_RATIO);
}

function clampPanelWidth(width: number) {
  return Math.min(Math.max(width, MIN_PANEL_WIDTH), getMaxPanelWidth());
}

export default function PreviewPanel({
  open,
  selectedName,
  payload,
  isLoading,
  error,
}: PreviewPanelProps) {
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const resizePanel = useCallback((nextWidth: number) => {
    setPanelWidth(clampPanelWidth(nextWidth));
  }, []);

  useEffect(() => {
    const handleWindowResize = () => {
      resizePanel(panelWidth);
    };

    window.addEventListener("resize", handleWindowResize);

    return () => {
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [panelWidth, resizePanel]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;

      if (!dragState) {
        return;
      }

      const nextWidth = dragState.startWidth + dragState.startX - event.clientX;
      resizePanel(nextWidth);
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [resizePanel]);

  if (!open) {
    return null;
  }

  return (
    <aside
      className="relative flex h-full shrink-0 flex-col border-l border-border bg-card"
      style={{
        width: panelWidth,
        minWidth: MIN_PANEL_WIDTH,
        maxWidth: "60vw",
      }}
    >
      <div
        role="separator"
        aria-label="Resize preview panel"
        aria-orientation="vertical"
        tabIndex={0}
        className="absolute inset-y-0 left-0 z-10 w-2 -translate-x-1 cursor-col-resize touch-none outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/50"
        onPointerDown={(event) => {
          dragStateRef.current = {
            startX: event.clientX,
            startWidth: panelWidth,
          };
          document.body.style.cursor = "col-resize";
          document.body.style.userSelect = "none";
          event.currentTarget.setPointerCapture?.(event.pointerId);
          event.preventDefault();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            resizePanel(panelWidth + RESIZE_STEP);
          }

          if (event.key === "ArrowRight") {
            resizePanel(panelWidth - RESIZE_STEP);
          }
        }}
      />

      <div className="border-b border-border px-4 py-3">
        <h2 className="truncate font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">Preview</h2>
        {selectedName ? (
          <p className="truncate text-xs text-muted-foreground">{selectedName}</p>
        ) : null}
      </div>

      <div
        data-testid="preview-content-area"
        className="scrollbar-hidden h-full min-h-0 flex-1 overflow-auto p-4"
      >
        {isLoading ? <p className="font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-muted-foreground">[LOADING PREVIEW]</p> : null}
        {!isLoading && error ? <p className="font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-destructive">[ERROR] {error}</p> : null}
        {!isLoading && !error && !payload ? (
          <p className="font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            [SELECT FILE] SPACE TO PREVIEW
          </p>
        ) : null}
        {!isLoading && !error && payload ? <PreviewContent payload={payload} /> : null}
      </div>
    </aside>
  );
}
