import * as React from 'react';

export interface VisibleSections {
  orderUp: boolean;
  sales: boolean;
  inventory: boolean;
}

export type ClusterName = 'a-cluster' | 'b-cluster' | 'c-cluster';

export interface ClusterDomains {
  'a-cluster': string;
  'b-cluster': string;
  'c-cluster': string;
}

/** key = REPOS key (Web, Counter, ...), value = cluster name */
export type ServiceClusterMap = Record<string, ClusterName>;

export interface AppSettings {
  pollingIntervalMs: number;
  inventoryAlertThreshold: number; // percentage (0-100)
  activeSite: string;
  visibleSections: VisibleSections;
  clusterDomains: ClusterDomains;
  serviceCluster: ServiceClusterMap;
}

const STORAGE_KEY = 'qdh_settings';

const defaultSettings: AppSettings = {
  pollingIntervalMs: 3000,
  inventoryAlertThreshold: 20,
  activeSite: 'all',
  visibleSections: { orderUp: true, sales: true, inventory: true },
  clusterDomains: {
    'a-cluster': 'apps.ocp.49dgc.sandbox1447.opentlc.com',
    'b-cluster': 'apps.ocp.hnkwm.sandbox225.opentlc.com',
    'c-cluster': '',
  },
  serviceCluster: {
    Web:         'b-cluster',
    Counter:     'b-cluster',
    QDCA10:      'b-cluster',
    QDCA10Pro:   'b-cluster',
    Inventory:   'b-cluster',
    Homeoffice:  'a-cluster',
    HomeofficUI: 'a-cluster',
  },
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      // ネストオブジェクトは deep merge: 保存値が空文字でもデフォルト値を保持する
      const clusterDomains: ClusterDomains = {
        ...defaultSettings.clusterDomains,
        ...(stored.clusterDomains ?? {}),
      };
      // 保存値が空文字の場合はデフォルト値にフォールバック
      (Object.keys(clusterDomains) as ClusterName[]).forEach(k => {
        if (!clusterDomains[k]) clusterDomains[k] = defaultSettings.clusterDomains[k];
      });
      const serviceCluster: ServiceClusterMap = {
        ...defaultSettings.serviceCluster,
        ...(stored.serviceCluster ?? {}),
      };
      return {
        ...defaultSettings,
        ...stored,
        clusterDomains,
        serviceCluster,
      };
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
