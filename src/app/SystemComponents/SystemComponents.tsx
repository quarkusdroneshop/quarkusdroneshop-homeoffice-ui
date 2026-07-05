import * as React from 'react';
import {
  PageSection,
  PageSectionVariants,
  Title,
  Button,
  ButtonVariant,
  Divider,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Flex,
  FlexItem,
  DataList,
  DataListItem,
  DataListItemRow,
  DataListItemCells,
  DataListCell,
  DataListAction,
  Stack,
  StackItem,
  Text,
  TextContent,
  Spinner,
  Label,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
} from '@patternfly/react-core';

import { ChartDonut } from '@patternfly/react-charts';

import CodeBranchIcon from '@patternfly/react-icons/dist/js/icons/code-branch-icon';
import CubeIcon from '@patternfly/react-icons/dist/js/icons/cube-icon';
import CheckCircleIcon from '@patternfly/react-icons/dist/js/icons/check-circle-icon';
import ExclamationTriangleIcon from '@patternfly/react-icons/dist/js/icons/exclamation-triangle-icon';
import StarIcon from '@patternfly/react-icons/dist/js/icons/star-icon';
import { gql } from '@apollo/client';
import client from 'src/apolloclient';
import { publishSystemAlerts } from '@app/utils/systemHealthStore';
import { SettingsContext, ClusterName } from '@app/utils/SettingsContext';

const GET_INVENTORY = gql`
  query InventoryLevels {
    inventoryLevels {
      itemName
      remaining
      capacity
    }
  }
`;

const GET_SERVICE_HEALTH = gql`
  query ServiceHealthChecks($inputs: [ServiceHealthInput]!) {
    serviceHealthChecks(inputs: $inputs) {
      name
      status
      detail
    }
  }
`;

const GET_SERVICE_METRICS = gql`
  query ServiceMetrics($inputs: [ServiceHealthInput]!) {
    serviceMetrics(inputs: $inputs) {
      name
      cpuUsage
      heapUsedBytes
      heapMaxBytes
      nonHeapUsedBytes
      liveThreads
      uptimeSeconds
      error
    }
  }
`;

interface InventoryLevel {
  itemName: string;
  remaining: number;
  capacity: number;
}

interface WeekData {
  week: number;   // Unix timestamp (Monday of that week)
  total: number;
}

interface ComponentMeta {
  loading: boolean;
  pushedAt: string;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  weeklyData: WeekData[];   // last 26 weeks, oldest→newest
  health: 'ok' | 'warn' | 'unknown';
  githubError?: string;
}

type ServiceStatus = 'UP' | 'DOWN' | 'UNKNOWN' | 'CHECKING';

interface ServiceMetricsData {
  cpuUsage: number;
  heapUsedBytes: number;
  heapMaxBytes: number;
  nonHeapUsedBytes: number;
  liveThreads: number;
  uptimeSeconds: number;
  error?: string;
}

interface State {
  isDrawerExpanded: boolean;
  drawerTitle: string;
  drawerContent: React.ReactNode;
  selectedDataListItemId: string;
  inventory: InventoryLevel[];
  inventoryLoading: boolean;
  github: Record<string, ComponentMeta>;
  backendHealth: 'ok' | 'error' | 'checking';
  serviceHealth: Record<string, ServiceStatus>;
  serviceHealthDetail: Record<string, string>;
  serviceMetrics: Record<string, ServiceMetricsData>;
  serviceMetricsError: string | null;
}

const REPOS: Record<string, { repo: string; label: string; desc: string; cluster: ClusterName; routePrefix: string }> = {
  Web:         { repo: 'quarkusdroneshop/quarkusdroneshop-web',           label: 'Web',           desc: 'Order intake web frontend',                   cluster: 'b-cluster', routePrefix: 'web-quarkusdroneshop-demo' },
  Counter:     { repo: 'quarkusdroneshop/quarkusdroneshop-counter',       label: 'Counter',       desc: 'Event coordination and order routing',         cluster: 'b-cluster', routePrefix: 'counter-quarkusdroneshop-demo' },
  QDCA10:      { repo: 'quarkusdroneshop/quarkusdroneshop-qdca10',        label: 'QDCA10',        desc: 'DroneA10 series inventory and dispatch',       cluster: 'b-cluster', routePrefix: 'qdca10-quarkusdroneshop-demo' },
  QDCA10Pro:   { repo: 'quarkusdroneshop/quarkusdroneshop-qdca10pro',     label: 'QDCA10Pro',     desc: 'DroneA10Pro series inventory and dispatch',    cluster: 'b-cluster', routePrefix: 'qdca10pro-quarkusdroneshop-demo' },
  Inventory:   { repo: 'quarkusdroneshop/quarkusdroneshop-inventory',     label: 'Inventory',     desc: 'Drone inventory management and replenishment', cluster: 'b-cluster', routePrefix: 'inventory-quarkusdroneshop-demo' },
  Homeoffice:  { repo: 'quarkusdroneshop/quarkusdroneshop-homeoffice',    label: 'Homeoffice',    desc: 'Backend GraphQL API service',                  cluster: 'a-cluster', routePrefix: 'homeoffice-backend-quarkusdroneshop-demo' },
  HomeofficUI: { repo: 'quarkusdroneshop/quarkusdroneshop-homeoffice-ui', label: 'Homeoffice UI', desc: 'Home office management dashboard',             cluster: 'a-cluster', routePrefix: 'homeoffice-ui-quarkusdroneshop-demo' },
};

function relativeTime(iso: string): string {
  if (!iso) return 'Unknown';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function weekLabel(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const emptyWeeklyData: WeekData[] = Array.from({ length: 26 }, (_, i) => ({ week: 0, total: 0 }));

// GitHub データのローカルキャッシュ (TTL: 1時間)
// ページリロードのたびに API を叩かないようにして 403 Rate Limit を回避する
const GH_CACHE_KEY = 'qdh_github_cache';
const GH_CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

interface GhCacheEntry {
  ts: number;
  data: any;
}

function ghCacheGet(key: string): any | null {
  try {
    const raw = localStorage.getItem(`${GH_CACHE_KEY}:${key}`);
    if (!raw) return null;
    const entry: GhCacheEntry = JSON.parse(raw);
    if (Date.now() - entry.ts > GH_CACHE_TTL_MS) return null;
    return entry.data;
  } catch { return null; }
}

function ghCacheSet(key: string, data: any) {
  try {
    const entry: GhCacheEntry = { ts: Date.now(), data };
    localStorage.setItem(`${GH_CACHE_KEY}:${key}`, JSON.stringify(entry));
  } catch { /* ignore quota errors */ }
}

// GitHub public API — CORS 許可済み (access-control-allow-origin: *) のため直接呼び出し可能
function githubUrl(path: string): string {
  return `https://api.github.com/${path}`;
}

// /stats/* は初回 202 または空配列 [] (計算中) を返すことがある。最大 maxRetries 回リトライする。
// 空配列はキャッシュしない（キャッシュされると 3時間グラフが空のままになる）。
function fetchWithRetry(url: string, maxRetries = 5, delayMs = 3000): Promise<any> {
  const cached = ghCacheGet(url);
  if (cached !== null) {
    // 空配列がキャッシュされていた場合は無視して再取得
    if (Array.isArray(cached) && cached.length === 0) {
      localStorage.removeItem(`${GH_CACHE_KEY}:${url}`);
    } else {
      return Promise.resolve(cached);
    }
  }

  const doFetch = (u: string, remaining: number): Promise<any> =>
    fetch(u).then(r => {
      if (r.status === 202 || r.status === 202) {
        if (remaining > 0) {
          return new Promise<void>(resolve => setTimeout(resolve, delayMs))
            .then(() => doFetch(u, remaining - 1));
        }
        throw new Error('GitHub stats not ready (202)');
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json().then(data => {
        // 空配列は計算中の可能性があるのでリトライ、キャッシュもしない
        if (Array.isArray(data) && data.length === 0) {
          if (remaining > 0) {
            return new Promise<void>(resolve => setTimeout(resolve, delayMs))
              .then(() => doFetch(u, remaining - 1));
          }
          throw new Error('GitHub stats returned empty array after retries');
        }
        ghCacheSet(url, data);
        return data;
      });
    });

  return doFetch(url, maxRetries);
}

const defaultMeta: ComponentMeta = {
  loading: true,
  pushedAt: '',
  stargazersCount: 0,
  forksCount: 0,
  openIssuesCount: 0,
  weeklyData: emptyWeeklyData,
  health: 'unknown',
  githubError: undefined,
};

export class SystemComponents extends React.Component<{}, State> {
  static contextType = SettingsContext;
  context!: React.ContextType<typeof SettingsContext>;
  private intervalId: number | null = null;
  private _prevSettingsKey = '';

  constructor(props: {}) {
    super(props);
    const initialServiceHealth: Record<string, ServiceStatus> =
      Object.fromEntries(Object.keys(REPOS).map(k => [k, 'CHECKING' as ServiceStatus]));

    this.state = {
      isDrawerExpanded: false,
      drawerTitle: '',
      drawerContent: null,
      selectedDataListItemId: '',
      inventory: [],
      inventoryLoading: true,
      github: Object.fromEntries(Object.keys(REPOS).map(k => [k, { ...defaultMeta }])),
      backendHealth: 'checking',
      serviceHealth: initialServiceHealth,
      serviceHealthDetail: {},
      serviceMetrics: {},
      serviceMetricsError: null,
    };
    this.onCloseDrawerClick = this.onCloseDrawerClick.bind(this);
  }

  componentDidMount() {
    const curr = this.context?.settings;
    if (curr) {
      this._prevSettingsKey = JSON.stringify({ d: curr.clusterDomains, s: curr.serviceCluster });
    }
    this.loadInventory();
    this.loadGitHub();
    this.checkBackendHealth();
    this.loadServiceHealth();
    this.loadServiceMetrics();
    this.intervalId = window.setInterval(() => {
      this.loadInventory();
      this.checkBackendHealth();
      this.loadServiceHealth();
      this.loadServiceMetrics();
    }, 30000);
  }

  componentDidUpdate() {
    const curr = this.context?.settings;
    if (!curr) return;
    const key = JSON.stringify({ d: curr.clusterDomains, s: curr.serviceCluster });
    if (key !== this._prevSettingsKey) {
      this._prevSettingsKey = key;
      const resetting: Record<string, ServiceStatus> = Object.fromEntries(
        Object.keys(REPOS).map(k => [k, 'CHECKING' as ServiceStatus])
      );
      resetting['HomeofficUI'] = 'UP';
      this.setState({ serviceHealth: resetting }, () => {
        this.loadServiceHealth();
        this.loadServiceMetrics();
      });
    }
  }

  componentWillUnmount() {
    if (this.intervalId !== null) clearInterval(this.intervalId);
  }

  loadInventory() {
    client
      .query({ query: GET_INVENTORY, fetchPolicy: 'no-cache' })
      .then(res => {
        const levels: InventoryLevel[] = res?.data?.inventoryLevels ?? [];
        this.setState({ inventory: levels, inventoryLoading: false });
      })
      .catch(() => this.setState({ inventoryLoading: false }));
  }

  checkBackendHealth() {
    client
      .query({ query: GET_INVENTORY, fetchPolicy: 'no-cache' })
      .then(() => this.setState({ backendHealth: 'ok' }))
      .catch(() => this.setState({ backendHealth: 'error' }));
  }

  buildHealthInputs(): { name: string; url: string }[] {
    const { settings } = this.context;
    const { clusterDomains, serviceCluster } = settings;
    return Object.keys(REPOS).map(key => {
      const cluster: ClusterName = (serviceCluster[key] as ClusterName) || REPOS[key].cluster;
      const domain = clusterDomains[cluster] || '';
      const routePrefix = REPOS[key].routePrefix;
      const url = domain ? `http://${routePrefix}.${domain}/q/health/live` : '';
      return { name: key, url };
    });
  }

  buildMetricsInputs(): { name: string; url: string }[] {
    const { settings } = this.context;
    const { clusterDomains, serviceCluster } = settings;
    return Object.keys(REPOS).map(key => {
      const cluster: ClusterName = (serviceCluster[key] as ClusterName) || REPOS[key].cluster;
      const domain = clusterDomains[cluster] || '';
      const routePrefix = REPOS[key].routePrefix;
      const url = domain ? `http://${routePrefix}.${domain}/q/metrics` : '';
      return { name: key, url };
    });
  }

  loadServiceMetrics() {
    const inputs = this.buildMetricsInputs();
    client
      .query({ query: GET_SERVICE_METRICS, variables: { inputs }, fetchPolicy: 'no-cache' })
      .then(res => {
        const list: (ServiceMetricsData & { name: string })[] = res?.data?.serviceMetrics ?? [];
        const map: Record<string, ServiceMetricsData> = {};
        list.forEach(m => {
          map[m.name] = {
            cpuUsage: m.cpuUsage,
            heapUsedBytes: m.heapUsedBytes,
            heapMaxBytes: m.heapMaxBytes,
            nonHeapUsedBytes: m.nonHeapUsedBytes,
            liveThreads: m.liveThreads,
            uptimeSeconds: m.uptimeSeconds,
            error: m.error,
          };
        });
        this.setState({ serviceMetrics: map, serviceMetricsError: null });
      })
      .catch(err => {
        const msg = err?.message ?? String(err);
        console.warn('[ServiceMetrics] fetch failed:', msg);
        this.setState({ serviceMetricsError: msg });
      });
  }

  loadServiceHealth() {
    const inputs = this.buildHealthInputs();
    client
      .query({ query: GET_SERVICE_HEALTH, variables: { inputs }, fetchPolicy: 'no-cache' })
      .then(res => {
        const checks: { name: string; status: string; detail: string }[] = res?.data?.serviceHealthChecks ?? [];
        const map: Record<string, ServiceStatus> = {};
        const detailMap: Record<string, string> = {};
        checks.forEach(c => {
          map[c.name] = (c.status === 'UP' ? 'UP' : c.status === 'DOWN' ? 'DOWN' : 'UNKNOWN') as ServiceStatus;
          if (c.detail) detailMap[c.name] = c.detail;
        });
        map['HomeofficUI'] = 'UP';
        this.setState({ serviceHealth: map, serviceHealthDetail: detailMap });
      })
      .catch(() => {
        const map: Record<string, ServiceStatus> =
          Object.fromEntries(Object.keys(REPOS).map(k => [k, 'UNKNOWN' as ServiceStatus]));
        map['HomeofficUI'] = 'UP';
        this.setState({ serviceHealth: map });
      });
  }

  loadGitHub() {
    const keys = Object.keys(REPOS);
    let completed = 0;

    keys.forEach(key => {
      const { repo } = REPOS[key];
      Promise.all([
        fetchWithRetry(githubUrl(`repos/${repo}`)),
        fetchWithRetry(githubUrl(`repos/${repo}/stats/commit_activity`)),
      ])
        .then(([repoData, activity]) => {
          let weeklyData: WeekData[] = emptyWeeklyData;
          if (Array.isArray(activity) && activity.length >= 26) {
            weeklyData = activity.slice(-26).map((w: { week: number; total: number }) => ({
              week: w.week,
              total: w.total,
            }));
          }
          const daysSincePush = repoData.pushed_at
            ? Math.floor((Date.now() - new Date(repoData.pushed_at).getTime()) / 86400000)
            : 999;
          const health: 'ok' | 'warn' | 'unknown' =
            daysSincePush < 30 ? 'ok' : daysSincePush < 180 ? 'warn' : 'unknown';

          this.setState(prev => {
            const updated = {
              ...prev.github,
              [key]: {
                loading: false,
                pushedAt: repoData.pushed_at ?? '',
                stargazersCount: repoData.stargazers_count ?? 0,
                forksCount: repoData.forks_count ?? 0,
                openIssuesCount: repoData.open_issues_count ?? 0,
                weeklyData,
                health,
              },
            };
            completed++;
            if (completed === keys.length) this.checkAndPublishAlerts(updated);
            return { github: updated };
          });
        })
        .catch((err) => {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(`[GitHub] ${key}: ${errMsg}`);
          this.setState(prev => {
            const updated = {
              ...prev.github,
              [key]: { ...prev.github[key], loading: false, githubError: errMsg },
            };
            completed++;
            if (completed === keys.length) this.checkAndPublishAlerts(updated);
            return { github: updated };
          });
        });
    });
  }

  checkAndPublishAlerts(github: Record<string, ComponentMeta>) {
    const alerts: string[] = [];
    Object.entries(github).forEach(([key, meta]) => {
      if (!meta.loading && !meta.pushedAt) {
        alerts.push(`${REPOS[key].label}: GitHub data not fetched`);
      }
      if (!meta.loading && meta.health === 'warn') {
        alerts.push(`${REPOS[key].label}: No recent commits (>30 days)`);
      }
    });
    if (this.state.backendHealth === 'error') {
      alerts.push('Backend GraphQL: No response');
    }
    publishSystemAlerts(alerts);
  }

  inventoryPct(category: 'drone' | 'pro'): number {
    const { inventory } = this.state;
    const keywords = category === 'drone'
      ? ['QDC_A101', 'QDC_A102', 'QDC_A103', 'QDC_A104']
      : ['QDC_A105_Pro'];
    const items = inventory.filter(i =>
      keywords.some(k => i.itemName.toUpperCase().includes(k.toUpperCase()))
    );
    if (items.length === 0) return category === 'drone' ? 75 : 50;
    const total = items.reduce((s, i) => s + i.remaining, 0);
    const cap   = items.reduce((s, i) => s + i.capacity, 0);
    return cap > 0 ? Math.round((total / cap) * 100) : 0;
  }

  openDrawer(id: string, title: string, content: React.ReactNode) {
    this.setState({
      isDrawerExpanded: true,
      drawerTitle: title,
      drawerContent: content,
      selectedDataListItemId: id,
    });
  }

  onCloseDrawerClick() {
    this.setState({ isDrawerExpanded: false, selectedDataListItemId: '' });
  }

  ghBadge(key: string) {
    const g = this.state.github[key];
    if (g.loading) return <Spinner size="sm" />;
    return (
      <Flex style={{ marginTop: 4 }}>
        <FlexItem><CodeBranchIcon /> {g.forksCount} forks</FlexItem>
        <FlexItem><CubeIcon /> {g.openIssuesCount} issues</FlexItem>
        {g.pushedAt ? (
          <FlexItem>Updated: {relativeTime(g.pushedAt)}</FlexItem>
        ) : (
          <FlexItem><ExclamationTriangleIcon color="orange" /> Not fetched</FlexItem>
        )}
      </Flex>
    );
  }

  healthLabel(key: string) {
    const status: ServiceStatus = this.state.serviceHealth[key] ?? 'CHECKING';
    if (status === 'CHECKING') return <Label color="blue" isCompact><Spinner size="sm" /> Checking</Label>;
    if (status === 'UP')       return <Label color="green" isCompact><CheckCircleIcon /> Running</Label>;
    if (status === 'DOWN')     return <Label color="red" isCompact><ExclamationTriangleIcon /> Down</Label>;
    return <Label color="grey" isCompact>Unknown</Label>;
  }

  // Commit bar chart — pure SVG, last 26 weeks
  commitChart(key: string) {
    const g = this.state.github[key];
    if (g.loading) return <Spinner size="md" />;
    if (g.githubError) return (
      <span style={{ fontSize: 11, color: '#c9190b' }}>GitHub API error: {g.githubError}</span>
    );

    const weeks = g.weeklyData;
    const maxY = Math.max(...weeks.map(w => w.total), 1);

    const W = 420, H = 90, padL = 28, padB = 22, padT = 4, padR = 4;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const barW = Math.floor(chartW / weeks.length) - 1;

    // month boundary labels
    const labels: { x: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((w, i) => {
      if (w.week > 0) {
        const d = new Date(w.week * 1000);
        const m = d.getMonth();
        if (m !== lastMonth) {
          labels.push({ x: padL + i * (chartW / weeks.length), label: weekLabel(w.week) });
          lastMonth = m;
        }
      }
    });

    // y-axis ticks (3 steps)
    const yTicks = [0, Math.round(maxY / 2), maxY];

    return (
      <svg width={W} height={H} aria-label="Commits last 26 weeks" style={{ display: 'block' }}>
        {/* y-axis grid lines + labels */}
        {yTicks.map(v => {
          const y = padT + chartH - (v / maxY) * chartH;
          return (
            <g key={v}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#e0e0e0" strokeWidth={1} />
              <text x={padL - 3} y={y + 3} textAnchor="end" fontSize={8} fill="#666">{v}</text>
            </g>
          );
        })}
        {/* bars */}
        {weeks.map((w, i) => {
          const barH = maxY > 0 ? (w.total / maxY) * chartH : 0;
          const x = padL + i * (chartW / weeks.length) + 1;
          const y = padT + chartH - barH;
          return (
            <rect key={i} x={x} y={y} width={barW} height={barH} fill="#0066cc" opacity={0.85}>
              <title>{w.week > 0 ? weekLabel(w.week) : `W${i + 1}`}: {w.total} commits</title>
            </rect>
          );
        })}
        {/* x-axis line */}
        <line x1={padL} x2={W - padR} y1={padT + chartH} y2={padT + chartH} stroke="#666" strokeWidth={1} />
        {/* x-axis month labels */}
        {labels.map((l, i) => (
          <text key={i} x={l.x} y={H - 4} fontSize={8} fill="#666">{l.label}</text>
        ))}
      </svg>
    );
  }

  // Detail panel: GitHub stats + inventory
  repoDetail(key: string, extraContent?: React.ReactNode) {
    const g = this.state.github[key];
    const { repo } = REPOS[key];
    const totalCommits6m = g.weeklyData.reduce((s, w) => s + w.total, 0);
    const avgPerWeek = (totalCommits6m / 26).toFixed(1);

    return (
      <Stack hasGutter>
        <StackItem>
          <TextContent>
            <Text component="h3">Repository Info</Text>
          </TextContent>
          {g.loading ? <Spinner size="sm" /> : (
            <DescriptionList isCompact isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm>Repository</DescriptionListTerm>
                <DescriptionListDescription>
                  <a href={`https://github.com/${repo}`} target="_blank" rel="noreferrer">
                    github.com/{repo}
                  </a>
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Last Push</DescriptionListTerm>
                <DescriptionListDescription>
                  {g.pushedAt
                    ? `${new Date(g.pushedAt).toLocaleDateString('en-US')} (${relativeTime(g.pushedAt)})`
                    : <span style={{ color: '#c9190b' }}>Not fetched — GitHub API may be rate-limited</span>}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm><StarIcon /> Stars</DescriptionListTerm>
                <DescriptionListDescription>{g.stargazersCount}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm><CodeBranchIcon /> Forks</DescriptionListTerm>
                <DescriptionListDescription>{g.forksCount}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Open Issues</DescriptionListTerm>
                <DescriptionListDescription>{g.openIssuesCount}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Commits (6 months)</DescriptionListTerm>
                <DescriptionListDescription>{totalCommits6m} total / {avgPerWeek} avg/week</DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          )}
        </StackItem>

        {extraContent && (
          <StackItem>
            <Divider component="div" style={{ margin: '8px 0' }} />
            {extraContent}
          </StackItem>
        )}

        <StackItem>
          <Divider component="div" style={{ margin: '8px 0' }} />
          {this.healthDetailPanel(key)}
        </StackItem>

        <StackItem>
          <Divider component="div" style={{ margin: '8px 0' }} />
          {this.resourceMetricsPanel(key)}
        </StackItem>
      </Stack>
    );
  }

  inventoryDetail(items: InventoryLevel[]) {
    if (items.length === 0) return (
      <TextContent>
        <Text component="h3">Inventory</Text>
        <Text>No inventory data</Text>
      </TextContent>
    );
    return (
      <Stack>
        <StackItem>
          <TextContent><Text component="h3">Inventory Levels</Text></TextContent>
        </StackItem>
        <StackItem>
          <DataList aria-label="inventory detail" isCompact>
            {items.map(i => {
              const pct = i.capacity > 0 ? Math.round((i.remaining / i.capacity) * 100) : 0;
              return (
                <DataListItem key={i.itemName}>
                  <DataListItemRow>
                    <DataListItemCells dataListCells={[
                      <DataListCell key="name"><strong>{i.itemName}</strong></DataListCell>,
                      <DataListCell key="val">
                        {i.remaining} / {i.capacity}
                        <Label color={pct < 20 ? 'red' : pct < 50 ? 'orange' : 'green'} style={{ marginLeft: 8 }}>
                          {pct}%
                        </Label>
                      </DataListCell>,
                    ]} />
                  </DataListItemRow>
                </DataListItem>
              );
            })}
          </DataList>
        </StackItem>
      </Stack>
    );
  }

  healthDetailPanel(key: string) {
    const raw = this.state.serviceHealthDetail[key];
    const status = this.state.serviceHealth[key] ?? 'CHECKING';

    if (status === 'CHECKING') {
      return (
        <TextContent>
          <Text component="h3">Health Checks</Text>
          <Spinner size="sm" />
        </TextContent>
      );
    }

    if (status === 'UNKNOWN') {
      return (
        <TextContent>
          <Text component="h3">Health Checks</Text>
          <Text><span style={{ color: 'var(--pf-global--Color--200)' }}>URL not configured — set cluster domain in Cluster Settings.</span></Text>
        </TextContent>
      );
    }

    let checks: { name: string; status: string; data?: Record<string, string> }[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.checks)) checks = parsed.checks;
      } catch {
        // not JSON (e.g. error message)
      }
    }

    const statusLabel = (s: string) => {
      const up = s === 'UP';
      return (
        <Label color={up ? 'green' : 'red'} isCompact>
          {up ? <CheckCircleIcon /> : <ExclamationTriangleIcon />} {s}
        </Label>
      );
    };

    if (checks.length === 0) {
      return (
        <TextContent>
          <Text component="h3">Health Checks</Text>
          <Text>{status === 'DOWN' ? <Label color="red" isCompact><ExclamationTriangleIcon /> DOWN</Label> : raw || 'No data'}</Text>
        </TextContent>
      );
    }

    const isLiveness = (name: string) => name.toLowerCase().includes('liveness');

    return (
      <Stack hasGutter>
        <StackItem>
          <TextContent><Text component="h3">Health Checks</Text></TextContent>
        </StackItem>
        <StackItem>
          <DataList aria-label="health checks" isCompact>
            {checks.map(check => (
              <DataListItem key={check.name}>
                <DataListItemRow>
                  <DataListItemCells dataListCells={[
                    <DataListCell key="name" width={3}>
                      <strong>{check.name}</strong>
                    </DataListCell>,
                    <DataListCell key="status" width={1}>
                      {statusLabel(check.status)}
                    </DataListCell>,
                  ]} />
                </DataListItemRow>
                {isLiveness(check.name) && check.data && Object.keys(check.data).length > 0 && (
                  <DataListItemRow>
                    <DataListItemCells dataListCells={[
                      <DataListCell key="sub" style={{ paddingLeft: 24, paddingTop: 0 }}>
                        <DataList aria-label={`${check.name} details`} isCompact style={{ border: 'none' }}>
                          {Object.entries(check.data).map(([ch, val]) => (
                            <DataListItem key={ch}>
                              <DataListItemRow>
                                <DataListItemCells dataListCells={[
                                  <DataListCell key="ch" width={3}>
                                    <span style={{ color: 'var(--pf-global--Color--200)', paddingLeft: 16 }}>
                                      {ch}
                                    </span>
                                  </DataListCell>,
                                  <DataListCell key="val" width={1}>
                                    <Label color={val === '[OK]' ? 'green' : 'red'} isCompact>
                                      {val}
                                    </Label>
                                  </DataListCell>,
                                ]} />
                              </DataListItemRow>
                            </DataListItem>
                          ))}
                        </DataList>
                      </DataListCell>,
                    ]} />
                  </DataListItemRow>
                )}
              </DataListItem>
            ))}
          </DataList>
        </StackItem>
      </Stack>
    );
  }

  resourceMetricsPanel(key: string) {
    const m = this.state.serviceMetrics[key];
    const healthStatus = this.state.serviceHealth[key] ?? 'CHECKING';

    const fmtBytes = (b: number) => {
      if (b >= 1073741824) return `${(b / 1073741824).toFixed(1)} GB`;
      if (b >= 1048576) return `${(b / 1048576).toFixed(0)} MB`;
      return `${(b / 1024).toFixed(0)} KB`;
    };
    const fmtUptime = (s: number) => {
      if (s < 60) return `${Math.floor(s)}s`;
      if (s < 3600) return `${Math.floor(s / 60)}m`;
      return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
    };

    if (healthStatus === 'CHECKING') {
      return (
        <TextContent>
          <Text component="h3">Resource Metrics</Text>
          <Spinner size="sm" />
        </TextContent>
      );
    }

    if (healthStatus === 'UNKNOWN' || !m) {
      const { serviceMetricsError } = this.state;
      return (
        <TextContent>
          <Text component="h3">Resource Metrics</Text>
          <Text><span style={{ color: 'var(--pf-global--Color--200)' }}>
            {healthStatus === 'UNKNOWN'
              ? 'URL not configured — set cluster domain in Cluster Settings.'
              : serviceMetricsError
              ? `Query error: ${serviceMetricsError}`
              : 'No metrics data available.'}
          </span></Text>
        </TextContent>
      );
    }

    if (m.error) {
      return (
        <TextContent>
          <Text component="h3">Resource Metrics</Text>
          <Text><span style={{ color: 'var(--pf-global--Color--200)' }}>{m.error}</span></Text>
        </TextContent>
      );
    }

    const cpuPct = Math.round(m.cpuUsage * 100 * 10) / 10;
    const cpuFree = Math.round((100 - cpuPct) * 10) / 10;
    const cpuColor = cpuPct > 80 ? '#c9190b' : cpuPct > 50 ? '#f0ab00' : '#3e8635';

    const heapUsedMB = Math.round(m.heapUsedBytes / 1048576);
    const nonHeapUsedMB = Math.round((m.nonHeapUsedBytes || 0) / 1048576);
    const memTotal = heapUsedMB + nonHeapUsedMB;

    return (
      <Stack hasGutter>
        <StackItem>
          <TextContent><Text component="h3">Resource Metrics</Text></TextContent>
        </StackItem>
        <StackItem>
          <DescriptionList isHorizontal isCompact>
            <DescriptionListGroup>
              <DescriptionListTerm>Pod Status</DescriptionListTerm>
              <DescriptionListDescription>
                <Label color="green" isCompact><CheckCircleIcon /> Running</Label>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Uptime</DescriptionListTerm>
              <DescriptionListDescription>{fmtUptime(m.uptimeSeconds)}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Threads</DescriptionListTerm>
              <DescriptionListDescription>{m.liveThreads}</DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </StackItem>

        {/* Charts row */}
        <StackItem>
          <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

            {/* CPU Donut */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ height: 160, width: 200 }}>
                <ChartDonut
                  ariaDesc="CPU Usage"
                  ariaTitle="CPU"
                  data={[
                    { x: 'Used', y: cpuPct },
                    { x: 'Free', y: cpuFree },
                  ]}
                  labels={({ datum }) => `${datum.x}: ${datum.y}%`}
                  colorScale={[cpuColor, '#d2d2d2']}
                  title={`${cpuPct}%`}
                  subTitle="CPU"
                  height={160}
                  width={200}
                  padding={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ data: { stroke: 'none' } }}
                />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--pf-global--Color--200)', marginTop: 4 }}>
                System CPU Usage
              </div>
            </div>

            {/* Memory Donut */}
            {memTotal > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ height: 160, width: 200 }}>
                  <ChartDonut
                    ariaDesc="Memory Usage"
                    ariaTitle="Memory"
                    data={[
                      { x: 'Heap', y: heapUsedMB },
                      { x: 'NonHeap', y: nonHeapUsedMB },
                    ]}
                    labels={({ datum }) => `${datum.x}: ${datum.y} MB`}
                    colorScale={['#0066cc', '#8476d1']}
                    title={fmtBytes(m.heapUsedBytes + (m.nonHeapUsedBytes || 0))}
                    subTitle="Used"
                    height={160}
                    width={200}
                    padding={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ data: { stroke: 'none' } }}
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--pf-global--Color--200)', marginTop: 4 }}>
                  <span style={{ color: '#0066cc' }}>■</span> Heap {heapUsedMB}MB &nbsp;
                  <span style={{ color: '#8476d1' }}>■</span> NonHeap {nonHeapUsedMB}MB
                </div>
              </div>
            )}
          </div>
        </StackItem>
      </Stack>
    );
  }

  clusterBadge(cluster: ClusterName) {
    const color = cluster === 'a-cluster' ? 'purple' : cluster === 'c-cluster' ? 'orange' : 'cyan';
    return (
      <Label color={color} isCompact style={{ fontFamily: 'monospace', fontSize: '0.7em' }}>
        {cluster}
      </Label>
    );
  }

  componentRow(key: string, chartContent: React.ReactNode, detailContent: React.ReactNode) {
    const { label } = REPOS[key];
    // Cluster Settings の serviceCluster を優先し、未設定時は REPOS のデフォルト値を使う
    const cluster: ClusterName =
      (this.context?.settings?.serviceCluster?.[key] as ClusterName) ?? REPOS[key].cluster;
    return (
      <DataListItem key={key} id={key}>
        <DataListItemRow>
          <DataListItemCells dataListCells={[
            <DataListCell key="info" width={2}>
              <Flex direction={{ default: 'column' }}>
                <FlexItem>
                  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                    <FlexItem>
                      <Title headingLevel="h3" size="xl">{label}</Title>
                    </FlexItem>
                    <FlexItem>{this.clusterBadge(cluster)}</FlexItem>
                    <FlexItem>{this.healthLabel(key)}</FlexItem>
                  </Flex>
                  <small style={{ color: 'var(--pf-global--Color--200)' }}>
                    {REPOS[key].desc}
                  </small>
                </FlexItem>
                {this.ghBadge(key)}
              </Flex>
            </DataListCell>,
            <DataListCell key="chart" width={3}>{chartContent}</DataListCell>,
            <DataListAction key="action" id={`${key}-action`} aria-label={`${key} actions`} aria-labelledby={key}>
              <Stack>
                <StackItem>
                  <Button variant={ButtonVariant.secondary}
                    onClick={() => this.openDrawer(key, `${label} Details`, detailContent)}>
                    Detail
                  </Button>
                </StackItem>
              </Stack>
            </DataListAction>,
          ]} />
        </DataListItemRow>
      </DataListItem>
    );
  }

  render() {
    const {
      isDrawerExpanded,
      drawerTitle,
      drawerContent: drawerBody,
      selectedDataListItemId,
      inventory,
      inventoryLoading,
      backendHealth,
    } = this.state;

    const droneItems = inventory.filter(i =>
      ['DRONE', 'drone', 'Drone'].some(k => i.itemName.toUpperCase().includes(k.toUpperCase()))
    );

    const inventorySummary = (
      <Flex direction={{ default: 'column' }}>
        {inventory.slice(0, 4).map(i => {
          const pct = i.capacity > 0 ? Math.round((i.remaining / i.capacity) * 100) : 0;
          return (
            <FlexItem key={i.itemName}>
              <Label color={pct < 20 ? 'red' : pct < 50 ? 'orange' : 'green'} isCompact>
                {i.itemName}: {pct}%
              </Label>
            </FlexItem>
          );
        })}
      </Flex>
    );

    const panelContent = (
      <DrawerPanelContent minSize="420px">
        <DrawerHead>
          <Title headingLevel="h2" size="xl">{drawerTitle}</Title>
          <DrawerActions>
            <DrawerCloseButton onClick={this.onCloseDrawerClick} />
          </DrawerActions>
        </DrawerHead>
        <DrawerPanelBody>{drawerBody}</DrawerPanelBody>
      </DrawerPanelContent>
    );

    const drawerContent = (
      <DataList
        aria-label="system components"
        selectedDataListItemId={selectedDataListItemId}
        onSelectDataListItem={id => this.setState({ selectedDataListItemId: id })}
      >
        {this.componentRow('Web',
          this.commitChart('Web'),
          this.repoDetail('Web'))}

        {this.componentRow('Counter',
          this.commitChart('Counter'),
          this.repoDetail('Counter'))}

        {this.componentRow('QDCA10',
          this.commitChart('QDCA10'),
          this.repoDetail('QDCA10', this.inventoryDetail(droneItems)))}

        {this.componentRow('QDCA10Pro',
          this.commitChart('QDCA10Pro'),
          this.repoDetail('QDCA10Pro', this.inventoryDetail(droneItems)))}

        {this.componentRow('Inventory',
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {inventoryLoading ? <Spinner size="md" /> : inventorySummary}
            {this.commitChart('Inventory')}
          </div>,
          this.repoDetail('Inventory', this.inventoryDetail(inventory)))}

        {this.componentRow('Homeoffice',
          this.commitChart('Homeoffice'),
          this.repoDetail('Homeoffice',
            <TextContent>
              <Text component="h3">GraphQL Backend</Text>
              <Text>Status: {backendHealth === 'ok' ? '✅ Responding' : backendHealth === 'error' ? '❌ No response' : '⏳ Checking'}</Text>
            </TextContent>
          ))}

        {this.componentRow('HomeofficUI',
          this.commitChart('HomeofficUI'),
          this.repoDetail('HomeofficUI',
            <TextContent>
              <Text component="h3">This Application</Text>
              <Text>The dashboard is visible — service is running.</Text>
            </TextContent>
          ))}
      </DataList>
    );

    return (
      <React.Fragment>
        <PageSection variant={PageSectionVariants.light}>
          <TextContent>
            <Text component="h1">System Components</Text>
            <Text component="p">Status, inventory levels, and 6-month commit activity per microservice</Text>
          </TextContent>
        </PageSection>
        <Divider component="div" />
        <PageSection variant={PageSectionVariants.light} padding={{ default: 'noPadding' }}>
          <Drawer isExpanded={isDrawerExpanded} isInline>
            <DrawerContent panelContent={panelContent}>
              <DrawerContentBody>{drawerContent}</DrawerContentBody>
            </DrawerContent>
          </Drawer>
        </PageSection>
      </React.Fragment>
    );
  }
}
