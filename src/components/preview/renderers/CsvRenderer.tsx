import type { PreviewPayload } from "../types";

type CsvPayload = Extract<PreviewPayload, { type: "csv" }>;

export default function CsvRenderer({ payload }: { payload: CsvPayload }) {
  const { headers, rows, truncated } = payload;

  return (
    <div className="h-full flex flex-col">
      {truncated && (
        <div className="px-3 py-1.5 bg-yellow-50 border-b border-yellow-200">
          <span className="text-[10px] text-yellow-700">
            Preview truncado — mostrando primeras {rows.length} filas
          </span>
        </div>
      )}
      <div className="flex-1 overflow-auto rounded-md border border-border">
        <table className="w-full text-left">
          <thead className="bg-muted sticky top-0">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-[11px] font-mono uppercase text-muted-foreground border-b border-border whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="border-b border-border hover:bg-muted/50 transition-colors"
              >
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className="px-3 py-2 text-[12px] font-mono whitespace-nowrap"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
