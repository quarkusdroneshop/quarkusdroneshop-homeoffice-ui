import * as React from 'react';
import { gql } from '@apollo/client';
import client from 'src/apolloclient';

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
  inventoryAlertThreshold: number;
  activeSite: string;
  visibleSections: VisibleSections;
  clusterDomains: ClusterDomains;
  serviceCluster: ServiceClusterMap;
}

// ---------------------------------------------------------------------------
// Defaults (used as fallback while DB is loading or unreachable)
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'qdh_settings';

export const defaultSettings: AppSettings = {
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

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------
const GET_APP_SETTINGS = gql`
  query GetAppSettings {
    getAppSettings {
      clusterDomains
      serviceCluster
    }
  }
`;

const SAVE_APP_SETTINGS = gql`
  mutation SaveAppSettings($input: AppSettingsInput!) {
    saveAppSettings(input: $input) {
      clusterDomains
      serviceCluster
    }
  }
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** localStorage に保存されている UI 設定（polling, visibleSections 等）を読み込む */
function loadLocalSettings(): Partial<AppSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveLocalSettings(s: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}

/**
 * DB から返った JSON 文字列をパースし、デフォルト値と deep merge する。
 * 空文字はデフォルト値にフォールバック。
 */
function mergeClusterDomains(json: string): ClusterDomains {
  let stored: Partial<ClusterDomains> = {};
  try { stored = JSON.parse(json); } catch { /* ignore */ }
  const merged: ClusterDomains = { ...defaultSettings.clusterDomains, ...stored };
  (Object.keys(merged) as ClusterName[]).forEach(k => {
    if (!merged[k]) merged[k] = defaultSettings.clusterDomains[k];
  });
  return merged;
}

function mergeServiceCluster(json: string): ServiceClusterMap {
  let stored: Partial<ServiceClusterMap> = {};
  try { stored = JSON.parse(json); } catch { /* ignore */ }
  const merged = { ...defaultSettings.serviceCluster };
  for (const key of Object.keys(defaultSettings.serviceCluster)) {
    const v = stored[key];
    if (v) merged[key] = v;
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
export interface SettingsContextValue {
  settings: AppSettings;
  dbLoading: boolean;
  updateSettings: (patch: Partial<AppSettings>) => void;
  toggleSection: (section: keyof VisibleSections) => void;
}

export const SettingsContext = React.createContext<SettingsContextValue>({
  settings: defaultSettings,
  dbLoading: true,
  updateSettings: () => undefined,
  toggleSection: () => undefined,
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = React.useState<AppSettings>(() => {
    // 初期値: localStorageのUI設定 + クラスタ設定はdeep mergeでデフォルト補完
    const local = loadLocalSettings();
    const clusterDomains = mergeClusterDomains(JSON.stringify(local.clusterDomains ?? {}));
    const serviceCluster = mergeServiceCluster(JSON.stringify(local.serviceCluster ?? {}));
    return { ...defaultSettings, ...local, clusterDomains, serviceCluster };
  });
  const [dbLoading, setDbLoading] = React.useState(true);

  // マウント時にDBからクラスタ設定を取得
  React.useEffect(() => {
    client.query({ query: GET_APP_SETTINGS, fetchPolicy: 'no-cache' })
      .then(res => {
        const data = res?.data?.getAppSettings;
        if (data) {
          const clusterDomains = mergeClusterDomains(data.clusterDomains ?? '{}');
          const serviceCluster = mergeServiceCluster(data.serviceCluster ?? '{}');
          setSettings(prev => {
            const next = { ...prev, clusterDomains, serviceCluster };
            saveLocalSettings(next);
            return next;
          });
        }
      })
      .catch(err => {
        console.warn('[SettingsContext] Failed to load settings from DB, using local cache:', err.message);
      })
      .finally(() => setDbLoading(false));
  }, []);

  const updateSettings = React.useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveLocalSettings(next);

      // clusterDomains / serviceCluster が含まれる場合は DB にも保存
      if (patch.clusterDomains !== undefined || patch.serviceCluster !== undefined) {
        const input = {
          clusterDomains: JSON.stringify(next.clusterDomains),
          serviceCluster: JSON.stringify(next.serviceCluster),
        };
        client.mutate({ mutation: SAVE_APP_SETTINGS, variables: { input } })
          .catch(err => console.error('[SettingsContext] Failed to save settings to DB:', err.message));
      }

      return next;
    });
  }, []);

  const toggleSection = React.useCallback((section: keyof VisibleSections) => {
    setSettings(prev => {
      const next = {
        ...prev,
        visibleSections: { ...prev.visibleSections, [section]: !prev.visibleSections[section] },
      };
      saveLocalSettings(next);
      return next;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, dbLoading, updateSettings, toggleSection }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => React.useContext(SettingsContext);
