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
  onContentReadyChange?: (ready: boolean) => void;
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
  onContentReadyChange,
}: PreviewPanelProps) {
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [shouldRender, setShouldRender] = useState(open);
  const [isExpanded, setIsExpanded] = useState(open);
  const [contentVisible, setContentVisible] = useState(open);
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const animationFrameRefs = useRef<number[]>([]);
  const previousOpenRef = useRef(open);

  const cancelScheduledFrames = useCallback(() => {
    animationFrameRefs.current.forEach((frameId) => window.cancelAnimationFrame(frameId));
    animationFrameRefs.current = [];
  }, []);

  const scheduleExpansion = useCallback(() => {
    const firstFrame = window.requestAnimationFrame(() => {
      const secondFrame = window.requestAnimationFrame(() => {
        setIsExpanded(true);
        animationFrameRefs.current = [];
      });

      animationFrameRefs.current = [secondFrame];
    });

    animationFrameRefs.current = [firstFrame];
  }, []);

  const resizePanel = useCallback((nextWidth: number) => {
    setPanelWidth(clampPanelWidth(nextWidth));
  }, []);

  useEffect(() => {
    if (previousOpenRef.current === open) {
      return;
    }

    previousOpenRef.current = open;
    cancelScheduledFrames();

    if (open) {
      setShouldRender(true);
      setContentVisible(false);
      onContentReadyChange?.(false);
      scheduleExpansion();
      return;
    }

    setContentVisible(false);
    onContentReadyChange?.(false);
    setIsExpanded(false);
  }, [cancelScheduledFrames, onContentReadyChange, open, scheduleExpansion]);

  useEffect(() => {
    return cancelScheduledFrames;
  }, [cancelScheduledFrames]);

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

  if (!shouldRender) {
    return null;
  }

  return (
    <aside
      aria-hidden={!open}
      className={`relative flex h-full shrink-0 overflow-hidden bg-card transition-[width,transform] duration-500 ease-in-out ${
        isExpanded
          ? "translate-x-0 border-l border-border"
          : "pointer-events-none translate-x-full border-l-0"
      }`}
      onTransitionEnd={(event) => {
        if (event.currentTarget !== event.target) {
          return;
        }

        if (!open && !isExpanded) {
          setShouldRender(false);
          return;
        }

        if (open && isExpanded) {
          setContentVisible(true);
          onContentReadyChange?.(true);
        }
      }}
      style={{
        width: isExpanded ? panelWidth : 0,
        minWidth: 0,
        maxWidth: "60vw",
      }}
    >
      <div
        className="flex h-full shrink-0 flex-col"
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
          tabIndex={open ? 0 : -1}
          className={`absolute inset-y-0 left-0 z-10 w-2 -translate-x-1 cursor-col-resize touch-none outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/50 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onPointerDown={(event) => {
            if (!open) {
              return;
            }

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
            if (!open) {
              return;
            }

            if (event.key === "ArrowLeft") {
              resizePanel(panelWidth + RESIZE_STEP);
            }

            if (event.key === "ArrowRight") {
              resizePanel(panelWidth - RESIZE_STEP);
            }
          }}
        />

        <div className="border-b border-border px-4 py-3">
          <h2 className="truncate font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">
            Preview
          </h2>
          {selectedName ? (
            <p className="truncate text-xs text-muted-foreground">{selectedName}</p>
          ) : null}
        </div>

        <div
          data-testid="preview-content-area"
          className="scrollbar-hidden h-full min-h-0 flex-1 overflow-auto p-4"
        >
          {isLoading ? (
            <p className="font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              [LOADING PREVIEW]
            </p>
          ) : null}
          {!isLoading && error ? (
            <p className="font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-destructive">
              [ERROR] {error}
            </p>
          ) : null}
          {contentVisible && !isLoading && !error && !payload ? (
            <p className="font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              [SELECT FILE] SPACE TO PREVIEW
            </p>
          ) : null}
          {contentVisible && !isLoading && !error && payload ? (
            <PreviewContent payload={payload} />
          ) : null}
        </div>
      </div>
    </aside>
  );
}
