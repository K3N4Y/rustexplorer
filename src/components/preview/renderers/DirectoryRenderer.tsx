import type { PreviewPayload } from "../types";

type DirectoryPayload = Extract<PreviewPayload, { type: "directory" }>;

export default function DirectoryRenderer({ payload }: { payload: DirectoryPayload }) {
  return (
    <div className="space-y-2 text-sm">
      <p>Directorio seleccionado.</p>
      <p>
        Entradas: {payload.entryCount ?? "No disponible"}
      </p>
    </div>
  );
}
