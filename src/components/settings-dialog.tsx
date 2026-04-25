import { useState } from "react";
import { MoonStar, Search, Settings as SettingsIcon, SunMedium, X } from "lucide-react";
import { Button } from "./ui/button";
import { useSettings } from "../lib/settings-provider";
import { useTheme } from "./theme-provider";

const ITEMS_PER_PAGE_MIN = 5;
const ITEMS_PER_PAGE_MAX = 500;
const SEARCH_THREADS_MIN = 1;
const SEARCH_THREADS_MAX = 32;

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
        className="h-9 w-9 rounded-md transition-colors duration-200"
        aria-label="Abrir configuracion"
      >
        <SettingsIcon className="h-4 w-4" strokeWidth={2.5} />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-4 transition-opacity duration-200 animate-in fade-in">
          <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-background text-foreground">
            <div className="flex items-center justify-between border-b border-border px-8 py-6">
              <div className="space-y-1">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Settings
                </p>
                <h2 className="text-2xl font-medium text-foreground">Configuracion</h2>
                <p className="text-sm font-medium text-muted-foreground">
                  Ajusta la apariencia y el comportamiento del explorador.
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-10 w-10 rounded-md transition-colors"
                aria-label="Cerrar configuracion"
              >
                <X className="h-5 w-5" strokeWidth={2.5} />
              </Button>
            </div>

            <div className="h-full max-h-[60vh] space-y-8 overflow-y-auto px-8 py-8">
              <section className="space-y-4">
                <div className="flex items-center gap-2 space-y-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    Apariencia
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { value: "light", label: "Claro", hint: "Manual tecnico", icon: SunMedium },
                    { value: "dark", label: "Oscuro", hint: "Panel OLED", icon: MoonStar },
                    { value: "system", label: "Sistema", hint: "Segun tu equipo", icon: SettingsIcon },
                  ].map((option) => {
                    const Icon = option.icon;
                    const active = theme === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setTheme(option.value as any)}
                        className={`group relative flex flex-col items-start overflow-hidden rounded-xl border p-4 outline-none transition-colors duration-200 ${
                          active
                            ? "border-t-2 border-t-accent border-foreground bg-muted"
                            : "border-border bg-transparent hover:border-border-visible hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/20"
                        }`}
                      >
                        <div className="mb-4 flex w-full items-center justify-between">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-md border transition-colors ${
                              active
                                ? "border-foreground bg-transparent text-foreground"
                                : "border-border bg-background text-muted-foreground group-hover:text-foreground"
                            }`}
                          >
                            <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
                          </div>
                          {active && <span className="flex h-2 w-2 rounded-full bg-accent" />}
                        </div>
                        <p className="text-[15px] font-medium text-foreground">{option.label}</p>
                        <p className="mt-1 flex-1 text-left text-xs font-medium text-muted-foreground">
                          {option.hint}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 space-y-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    Busqueda y exploracion
                  </h3>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="group flex flex-col justify-between gap-4 rounded-xl border border-border bg-transparent px-5 py-4 transition-colors hover:bg-muted sm:flex-row sm:items-center">
                    <div className="space-y-1">
                      <label htmlFor="itemsPerPage" className="text-[15px] font-medium text-foreground">
                        Resultados por pagina
                      </label>
                      <p className="max-w-sm text-[13px] font-medium text-muted-foreground">
                        Limite de archivos mostrados para no saturar la vista. Recomendado:{" "}
                        <span className="rounded border px-1 font-mono font-bold text-foreground">30</span>
                      </p>
                    </div>

                    <div className="relative w-full shrink-0 sm:w-32">
                      <input
                        id="itemsPerPage"
                        type="number"
                        min={ITEMS_PER_PAGE_MIN}
                        max={ITEMS_PER_PAGE_MAX}
                        className="peer flex h-11 w-full rounded-md border border-border-visible bg-transparent px-4 py-2 text-right font-mono text-[15px] font-bold tabular-nums transition-colors hover:border-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                        value={itemsPerPage}
                        onChange={(e) =>
                          updateSettings({
                            itemsPerPage: Math.min(
                              ITEMS_PER_PAGE_MAX,
                              Math.max(ITEMS_PER_PAGE_MIN, Number(e.target.value) || 30),
                            ),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="group flex flex-col justify-between gap-4 rounded-xl border border-border bg-transparent px-5 py-4 transition-colors hover:bg-muted sm:flex-row sm:items-center">
                    <div className="flex-1 space-y-1">
                      <label htmlFor="searchThreads" className="flex items-center gap-2 text-[15px] font-medium text-foreground">
                        <Search className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={2.5} />
                        Hilos de procesamiento
                      </label>
                      <p className="max-w-[340px] text-[13px] font-medium text-muted-foreground">
                        Divide la lectura en varios nucleos. Un numero mayor consume mas CPU. Recomendado:{" "}
                        <span className="rounded border px-1 font-mono font-bold text-foreground">4</span>
                      </p>
                    </div>

                    <div className="relative w-full shrink-0 sm:w-32">
                      <input
                        id="searchThreads"
                        type="number"
                        min={SEARCH_THREADS_MIN}
                        max={SEARCH_THREADS_MAX}
                        className="peer flex h-11 w-full rounded-md border border-border-visible bg-transparent px-4 py-2 text-right font-mono text-[15px] font-bold tabular-nums transition-colors hover:border-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                        value={searchThreads}
                        onChange={(e) =>
                          updateSettings({
                            searchThreads: Math.min(
                              SEARCH_THREADS_MAX,
                              Math.max(SEARCH_THREADS_MIN, Number(e.target.value) || 4),
                            ),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="flex items-center justify-between border-t border-border bg-background px-8 py-5">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Los cambios se guardan instantaneamente
              </p>
              <Button onClick={() => setIsOpen(false)} className="px-7">
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
