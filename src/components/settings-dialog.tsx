import { useState } from "react";
import { Settings as SettingsIcon, X } from "lucide-react";
import { Button } from "./ui/button";
import { useSettings } from "../lib/settings-provider";
import { useTheme } from "./theme-provider";

export function SettingsDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const { itemsPerPage, searchThreads, updateSettings } = useSettings();
  const { theme, setTheme } = useTheme();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        aria-label="Open settings"
      >
        <SettingsIcon className="h-5 w-5" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Configuración</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Theme Settings */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tema (Theme)</label>
                <div className="flex gap-2">
                  {(["light", "dark", "system"] as const).map((t) => (
                    <Button
                      key={t}
                      variant={theme === t ? "default" : "outline"}
                      onClick={() => setTheme(t)}
                      className="flex-1 capitalize"
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Items Per Page (Pagination) */}
              <div className="space-y-2">
                <label htmlFor="itemsPerPage" className="text-sm font-medium">
                  Resultados por página (Paginación)
                </label>
                <input
                  id="itemsPerPage"
                  type="number"
                  min={5}
                  max={500}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={itemsPerPage}
                  onChange={(e) =>
                    updateSettings({ itemsPerPage: Number(e.target.value) || 30 })
                  }
                />
              </div>

              {/* Search Threads */}
              <div className="space-y-2">
                <label htmlFor="searchThreads" className="text-sm font-medium">
                  Hilos para búsquedas (Threads)
                </label>
                <input
                  id="searchThreads"
                  type="number"
                  min={1}
                  max={32}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={searchThreads}
                  onChange={(e) =>
                    updateSettings({ searchThreads: Number(e.target.value) || 4 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  A mayor número de hilos, búsquedas más rápidas pero más uso de CPU.
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button onClick={() => setIsOpen(false)}>Guardar / Cerrar</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}