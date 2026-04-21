import { createContext, useContext, useEffect, useState } from "react";

type Settings = {
  itemsPerPage: number;
  searchThreads: number;
};

type SettingsContextType = Settings & {
  updateSettings: (settings: Partial<Settings>) => void;
};

const defaultSettings: Settings = {
  itemsPerPage: 30,
  searchThreads: 4,
};

export const SettingsContext = createContext<SettingsContextType>({
  ...defaultSettings,
  updateSettings: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem("rustexplorer-app-settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaultSettings, ...parsed };
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem("rustexplorer-app-settings", JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...newSettings }));
  };

  return (
    <SettingsContext.Provider value={{ ...settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);