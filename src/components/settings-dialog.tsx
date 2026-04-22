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
        className="h-9 w-9 rounded-full transition-transform hover:rotate-12 hover:bg-muted"
        aria-label="Abrir configuración"
      >
        <SettingsIcon className="h-4 w-4" strokeWidth={2.5} />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 dark:bg-black/60 px-4 py-4 backdrop-blur-md transition-all duration-300 animate-in fade-in zoom-in-95">
          <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-border/40 bg-background/90 text-foreground shadow-2xl shadow-black/10 ring-1 ring-foreground/5 backdrop-blur-2xl">
            {/* Encabezado */}
            <div className="flex items-center justify-between border-b border-border/40 px-8 py-6 bg-gradient-to-b from-muted/20 to-transparent">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Configuración</h2>
                <p className="text-sm text-muted-foreground/80 font-medium">
                  Ajusta la apariencia y el comportamiento del explorador.
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-10 w-10 rounded-full hover:bg-muted/60 transition-colors"
                aria-label="Cerrar configuración"
              >
                <X className="h-5 w-5" strokeWidth={2.5} />
              </Button>
            </div>

            {/* Contenido scrolleable */}
            <div className="space-y-8 overflow-y-auto px-8 py-8 h-full max-h-[60vh] scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              
              {/* Sección: Tema */}
              <section className="space-y-4">
                <div className="space-y-1.5 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    Apariencia
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: "light", label: "Claro", hint: "Limpio y brillante", icon: SunMedium },
                    { value: "dark", label: "Oscuro", hint: "Relajante a la vista", icon: MoonStar },
                    { value: "system", label: "Sistema", hint: "Según tu equipo", icon: SettingsIcon },
                  ].map((option) => {
                    const Icon = option.icon;
                    const active = theme === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setTheme(option.value as any)}
                        className={`group relative flex flex-col outline-none items-start overflow-hidden rounded-2xl border p-4 transition-all duration-200 active:scale-[0.98] ${
                          active
                            ? "border-primary/30 bg-primary/5 ring-1 ring-primary/30 shadow-sm"
                            : "border-border/50 bg-muted/10 hover:border-border/80 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring"
                        }`}
                      >
                        <div className="mb-4 flex w-full items-center justify-between">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                            active 
                              ? "border-primary/20 bg-primary/10 text-primary" 
                              : "border-border/50 bg-background text-muted-foreground group-hover:text-foreground"
                          }`}>
                            <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
                          </div>
                          {active && (
                            <span className="flex h-2 w-2 rounded-full bg-primary shadow-[0_0_0_4px_rgba(var(--primary),0.1)]" />
                          )}
                        </div>
                        <p className={`text-[15px] font-semibold tracking-tight ${active ? "text-primary" : "text-foreground"}`}>
                          {option.label}
                        </p>
                        <p className="mt-1 flex-1 text-left text-xs font-medium text-muted-foreground/70">
                          {option.hint}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Sección: Exploración */}
              <section className="space-y-4">
                <div className="space-y-1.5 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    Búsqueda y Exploración
                  </h3>
                </div>

                <div className="flex flex-col gap-3">
                  
                  {/* Resultados por página */}
                  <div className="group flex flex-col gap-4 sm:flex-row sm:items-center justify-between rounded-2xl border border-border/40 bg-muted/20 px-5 py-4 transition-colors hover:bg-muted/40">
                    <div className="space-y-1">
                      <label htmlFor="itemsPerPage" className="text-[15px] font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                        Resultados por página
                      </label>
                      <p className="text-[13px] font-medium text-muted-foreground/80 max-w-sm">
                        Límite de archivos motrados para no saturar la vista. 
                        Recomendado: <span className="text-foreground/70 font-semibold bg-background border px-1 rounded">30</span>
                      </p>
                    </div>

                    <div className="relative w-full sm:w-32 shrink-0">
                      <input
                        id="itemsPerPage"
                        type="number"
                        min={ITEMS_PER_PAGE_MIN}
                        max={ITEMS_PER_PAGE_MAX}
                        className="peer flex h-11 w-full rounded-xl border border-border/60 bg-background/60 px-4 py-2 text-right text-[15px] font-semibold tabular-nums shadow-sm transition-all hover:bg-background focus:border-primary/50 focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10"
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

                  {/* Hilos de búsqueda */}
                  <div className="group flex flex-col gap-4 sm:flex-row sm:items-center justify-between rounded-2xl border border-border/40 bg-muted/20 px-5 py-4 transition-colors hover:bg-muted/40">
                    <div className="space-y-1 flex-1">
                      <label htmlFor="searchThreads" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                        <Search className="h-[18px] w-[18px] text-muted-foreground/70" strokeWidth={2.5} />
                        Hilos de procesamiento
                      </label>
                      <p className="text-[13px] font-medium text-muted-foreground/80 max-w-[340px]">
                        Divide el trabajo de lectura en varios núcleos. Un número mayor consume más CPU. 
                        Recomendado: <span className="text-foreground/70 font-semibold bg-background border px-1 rounded">4</span>
                      </p>
                    </div>

                    <div className="relative w-full sm:w-32 shrink-0">
                      <input
                        id="searchThreads"
                        type="number"
                        min={SEARCH_THREADS_MIN}
                        max={SEARCH_THREADS_MAX}
                        className="peer flex h-11 w-full rounded-xl border border-border/60 bg-background/60 px-4 py-2 text-right text-[15px] font-semibold tabular-nums shadow-sm transition-all hover:bg-background focus:border-primary/50 focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10"
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

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border/40 bg-background/50 px-8 py-5 backdrop-blur-md">
              <p className="text-[13px] font-semibold tracking-tight text-muted-foreground/70">
                Los cambios se guardan instantáneamente
              </p>
              <Button 
                onClick={() => setIsOpen(false)}
                className="rounded-xl px-7 font-bold shadow-md transition-all active:scale-[0.96]"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
