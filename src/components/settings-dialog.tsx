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
        aria-label="Abrir configuración"
      >
        <SettingsIcon className="h-5 w-5" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground shadow-2xl ring-1 ring-black/5 dark:ring-white/5">
            <div className="border-b border-border/60 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Preferencias
                  </p>
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">Configuración</h2>
                  <p className="text-sm text-muted-foreground">
                    Ajusta la apariencia y el comportamiento de exploración.
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 rounded-full"
                  aria-label="Cerrar configuración"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-6 px-6 py-6">
              <section className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Apariencia
                  </p>
                  <h3 className="text-base font-semibold tracking-tight text-foreground">Tema</h3>
                  <p className="text-sm text-muted-foreground">
                    Elige cómo quieres ver la aplicación.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {([
                    {
                      value: "light",
                      label: "Claro",
                      hint: "Más limpio y brillante",
                      icon: SunMedium,
                    },
                    {
                      value: "dark",
                      label: "Oscuro",
                      hint: "Más cómodo en poca luz",
                      icon: MoonStar,
                    },
                    {
                      value: "system",
                      label: "Sistema",
                      hint: "Sigue la preferencia del equipo",
                      icon: SettingsIcon,
                    },
                  ] as const).map((option) => {
                    const Icon = option.icon;
                    const active = theme === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setTheme(option.value)}
                        className={`rounded-xl border px-3 py-3 text-left transition-all ${
                          active
                            ? "border-foreground/15 bg-foreground text-background shadow-sm"
                            : "border-border bg-background hover:bg-muted/50"
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <Icon className={`h-4 w-4 ${active ? "text-background/85" : "text-muted-foreground"}`} />
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
                              active ? "text-background/70" : "text-muted-foreground"
                            }`}
                          >
                            {active ? "Activo" : "Elegir"}
                          </span>
                        </div>
                        <p className={`text-sm font-semibold tracking-tight ${active ? "text-background" : "text-foreground"}`}>
                          {option.label}
                        </p>
                        <p className={`mt-1 text-xs ${active ? "text-background/72" : "text-muted-foreground"}`}>
                          {option.hint}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Exploración
                  </p>
                  <h3 className="text-base font-semibold tracking-tight text-foreground">Rendimiento y lectura</h3>
                  <p className="text-sm text-muted-foreground">
                    Define cuánta información quieres ver y cómo se comporta la búsqueda.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-border/70 bg-background px-4 py-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <label htmlFor="itemsPerPage" className="text-sm font-semibold tracking-tight text-foreground">
                          Resultados por página
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Recomendado: `30` para una vista equilibrada.
                        </p>
                      </div>
                      <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {itemsPerPage}
                      </span>
                    </div>

                    <input
                      id="itemsPerPage"
                      type="number"
                      min={ITEMS_PER_PAGE_MIN}
                      max={ITEMS_PER_PAGE_MAX}
                      className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

                  <div className="rounded-xl border border-border/70 bg-background px-4 py-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <label
                          htmlFor="searchThreads"
                          className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground"
                        >
                          <Search className="h-4 w-4 text-muted-foreground" />
                          Hilos de búsqueda
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Recomendado: `4` para un buen balance entre velocidad y uso de CPU.
                        </p>
                      </div>
                      <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {searchThreads}
                      </span>
                    </div>

                    <input
                      id="searchThreads"
                      type="number"
                      min={SEARCH_THREADS_MIN}
                      max={SEARCH_THREADS_MAX}
                      className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

                    <p className="mt-3 text-xs text-muted-foreground">
                      Más hilos aceleran búsquedas grandes, pero también consumen más recursos.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-6 py-4">
              <p className="text-xs text-muted-foreground">
                Los cambios se guardan automáticamente.
              </p>
              <Button onClick={() => setIsOpen(false)}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
