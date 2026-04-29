import { useEffect, useRef } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

type PdfRenderTask = {
  cancel: () => void;
  promise: Promise<unknown>;
};

interface Props {
  pdfDocument: PDFDocumentProxy;
  pageNumber: number;
  width: number;
}

export function PdfPageCanvas({ pdfDocument, pageNumber, width }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<PdfRenderTask | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0) return;

    let cancelled = false;

    void (async () => {
      try {
        const page = await pdfDocument.getPage(pageNumber);
        if (cancelled) return;

        const defaultViewport = page.getViewport({ scale: 1 });
        const scale = width / defaultViewport.width;
        const viewport = page.getViewport({ scale });

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const context = canvas.getContext('2d');
        if (!context || cancelled) return;

        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Cancel any previous render task before starting a new one
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        const task = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = task;

        await task.promise;
      } catch (err) {
        // RenderingCancelledException is expected when unmounting
        if (err instanceof Error && err.message?.includes('Rendering cancelled')) {
          return;
        }
        console.error(`Failed to render PDF page ${pageNumber}:`, err);
      }
    })();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDocument, pageNumber, width]);

  return (
    <canvas
      ref={canvasRef}
      data-testid={`pdf-page-${pageNumber}`}
      className="block"
    />
  );
}
