import * as React from 'react';

export interface VisibleSections {
  orderUp: boolean;
  sales: boolean;
  inventory: boolean;
}

export interface AppSettings {
  pollingIntervalMs: number;
  inventoryAlertThreshold: number; // percentage (0-100)
  activeSite: string;
  visibleSections: VisibleSections;
}

const STORAGE_KEY = 'qdh_settings';

const defaultSettings: AppSettings = {
  pollingIntervalMs: 3000,
  inventoryAlertThreshold: 20,
  activeSite: 'all',
  visibleSections: { orderUp: true, sales: true, inventory: true },
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...defaultSettings, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return defaultSettings;
}

function saveSettings(s: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

export interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  toggleSection: (section: keyof VisibleSections) => void;
}

export const SettingsContext = React.createContext<SettingsContextValue>({
  settings: defaultSettings,
  updateSettings: () => undefined,
  toggleSection: () => undefined,
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = React.useState<AppSettings>(loadSettings);

  const updateSettings = React.useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const toggleSection = React.useCallback((section: keyof VisibleSections) => {
    setSettings(prev => {
      const next = {
        ...prev,
        visibleSections: {
          ...prev.visibleSections,
          [section]: !prev.visibleSections[section],
        },
      };
      saveSettings(next);
      return next;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, toggleSection }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => React.useContext(SettingsContext);
