import { useEffect, useRef, useState, useCallback } from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { openPath } from '@tauri-apps/plugin-opener';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { PreviewPayload } from '../types';
import { PdfPageCanvas } from './PdfPageCanvas';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface Props {
  payload: Extract<PreviewPayload, { type: 'pdf' }>;
}

const PAGE_GAP = 8;

export default function PdfRenderer({ payload }: Props) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [pageWidth, setPageWidth] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const pdfDocumentRef = useRef<PDFDocumentProxy | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const measureContainerRef = useRef<HTMLDivElement | null>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageAspectRatioRef = useRef<number>(792 / 612); // default US Letter
  const measuredWidthRef = useRef(0);

  // Load PDF document
  useEffect(() => {
    const fileUrl = convertFileSrc(payload.path);
    let cancelled = false;

    setLoading(true);
    setRenderError(null);
    setNumPages(null);

    const loadingTask = pdfjsLib.getDocument(fileUrl);

    void loadingTask.promise
      .then(async (doc) => {
        if (cancelled) {
          void doc.destroy();
          return;
        }

        pdfDocumentRef.current = doc;
        setNumPages(doc.numPages);

        // Get first page aspect ratio for virtualizer estimate
        try {
          const firstPage = await doc.getPage(1);
          if (!cancelled) {
            const vp = firstPage.getViewport({ scale: 1 });
            pageAspectRatioRef.current = vp.height / vp.width;
          }
        } catch {
          // fallback to default aspect ratio
        }

        if (!cancelled) {
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setRenderError(err instanceof Error ? err.message : 'Failed to load PDF');
        setLoading(false);
      });

    return () => {
      cancelled = true;
      void loadingTask.destroy();
      if (pdfDocumentRef.current) {
        void pdfDocumentRef.current.destroy();
        pdfDocumentRef.current = null;
      }
    };
  }, [payload.path]);

  // Debounced ResizeObserver for container width
  useEffect(() => {
    const container = measureContainerRef.current;
    if (!container) return;

    const syncWidth = (width: number) => {
      if (width > 0) {
        setPageWidth(Math.floor(width));
      }
    };

    syncWidth(container.clientWidth);

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(([entry]) => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      resizeTimeoutRef.current = setTimeout(() => {
        syncWidth(entry.contentRect.width);
        resizeTimeoutRef.current = null;
      }, 120);
    });

    observer.observe(container);

    return () => {
      observer.disconnect();

      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [loading]);

  const estimateSize = useCallback(() => {
    return Math.floor(pageWidth * pageAspectRatioRef.current) + PAGE_GAP;
  }, [pageWidth]);

  const virtualPageCount = pageWidth > 0 ? (numPages ?? 0) : 0;

  const virtualizer = useVirtualizer({
    count: virtualPageCount,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize,
    overscan: 2,
    gap: PAGE_GAP,
  });

  useEffect(() => {
    if (virtualPageCount > 0 && pageWidth !== measuredWidthRef.current) {
      measuredWidthRef.current = pageWidth;
      virtualizer.measure();
    }
  }, [pageWidth, virtualPageCount]);

  const openExternally = () => {
    const openablePath = /^[a-zA-Z]:\\/.test(payload.path)
      ? payload.path.replace(/\\/g, '/')
      : payload.path;

    void openPath(openablePath).catch((e) => {
      console.error('Failed to open PDF externally:', e);
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-1.5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <FileText size={11} className="text-[var(--text-muted)]" />
        {numPages ? (
          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            {numPages} {numPages === 1 ? 'page' : 'pages'}
          </span>
        ) : null}
        <button
          type="button"
          onClick={openExternally}
          className="ml-auto flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]"
          aria-label="Open PDF externally"
        >
          <ExternalLink size={10} /> Open externally
        </button>
      </div>

      <div
        ref={scrollContainerRef}
        aria-label="PDF preview"
        data-testid="pdf-viewport"
        role="region"
        className="flex flex-1 items-start justify-center overflow-auto bg-[var(--bg-secondary)] p-4"
      >
        {renderError ? (
          <div className="flex max-w-sm flex-col items-center gap-2 text-center">
            <p className="font-mono text-xs text-[var(--text-primary)]">
              Unable to render PDF preview
            </p>
            <p className="font-mono text-[10px] text-[var(--text-muted)]">{renderError}</p>
          </div>
        ) : loading ? (
          <p className="font-mono text-xs text-[var(--text-muted)]">Loading PDF preview...</p>
        ) : (
          <div ref={measureContainerRef} className="w-full max-w-full">
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {pdfDocumentRef.current && pageWidth > 0
                ? virtualizer.getVirtualItems().map((virtualItem) => (
                    <div
                      key={virtualItem.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualItem.size - PAGE_GAP}px`,
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                    >
                      <PdfPageCanvas
                        pdfDocument={pdfDocumentRef.current!}
                        pageNumber={virtualItem.index + 1}
                        width={pageWidth}
                      />
                    </div>
                  ))
                : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
