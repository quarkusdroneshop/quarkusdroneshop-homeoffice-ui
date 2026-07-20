import React from 'react';
import {
  PageSection,
  PageSectionVariants,
  TextContent,
  Text,
  Divider,
  Card,
  CardBody,
  CardTitle,
  Badge,
  Flex,
  FlexItem,
  Spinner,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Title,
  Alert,
  Select,
  SelectOption,
  SelectVariant,
} from '@patternfly/react-core';
import CubeIcon from '@patternfly/react-icons/dist/js/icons/cube-icon';
import { gql } from '@apollo/client';
import client from 'src/apolloclient';
import { SettingsContext } from '../utils/SettingsContext';

const GET_LIVE_ORDERS = gql`
  query LiveOrders {
    liveOrders {
      orderId
      name
      item
      status
      madeBy
      site
      createdAt
      updatedAt
    }
  }
`;

type OrderStatus = 'IN_QUEUE' | 'IN_PROGRESS' | 'FULFILLED';
type SiteKey = 'ALL' | 'A' | 'B' | 'C';

interface LiveOrder {
  orderId: string;
  name: string;
  item: string;
  status: OrderStatus;
  madeBy?: string;
  site?: string;
  createdAt: string;
  updatedAt?: string;
}

type State = {
  orders: LiveOrder[];
  loading: boolean;
  error: string | null;
  selectedSite: SiteKey;
  isSiteSelectOpen: boolean;
};

type OrderMeta = {
  queueSeenAt?: number;
  queueDelayMs?: number;
  fulfilledSeenAt?: number;
};

// デモ用の見た目遷移設定:
// - In Queue に入ってからランダムな時間（3〜10秒）で In Progress に見せかけで遷移させる
// - Order Up (FULFILLED) は表示されてから 30 秒でボードから消す
const IN_PROGRESS_DELAY_MIN_MS = 3000;
const IN_PROGRESS_DELAY_MAX_MS = 10000;
const FULFILLED_VISIBLE_MS = 30000;

function randomInProgressDelay(): number {
  return IN_PROGRESS_DELAY_MIN_MS + Math.random() * (IN_PROGRESS_DELAY_MAX_MS - IN_PROGRESS_DELAY_MIN_MS);
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  IN_QUEUE:    'In Queue',
  IN_PROGRESS: 'In Progress',
  FULFILLED:   'Order Up',
};

const STATUS_COLORS: Record<OrderStatus, 'blue' | 'orange' | 'green'> = {
  IN_QUEUE:    'blue',
  IN_PROGRESS: 'orange',
  FULFILLED:   'green',
};

const COLUMNS: OrderStatus[] = ['IN_QUEUE', 'IN_PROGRESS', 'FULFILLED'];
const MAX_ORDERS = 50;

// Site A = hnkwm, Site B = mnlq9, Site C = 49dgc
const SITE_PATTERNS: Record<SiteKey, string[]> = {
  ALL: [],
  A:   ['hnkwm', 'site-a', 'siteA', 'asite', 'A'],
  B:   ['mnlq9', 'site-b', 'siteB', 'bsite', 'B'],
  C:   ['49dgc', 'site-c', 'siteC', 'csite', 'C'],
};

const SITE_OPTIONS: { key: SiteKey; label: string }[] = [
  { key: 'ALL', label: 'All Sites' },
  { key: 'A',   label: 'Site A (hnkwm)' },
  { key: 'B',   label: 'Site B (mnlq9)' },
  { key: 'C',   label: 'Site C (49dgc)' },
];


function elapsedLabel(isoStr: string): string {
  const diffSec = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}

function matchesSite(order: LiveOrder, site: SiteKey): boolean {
  if (site === 'ALL') return true;
  const patterns = SITE_PATTERNS[site];
  const siteField = order.site ?? '';
  const madeByField = order.madeBy ?? '';
  return patterns.some(p =>
    siteField.toLowerCase().includes(p.toLowerCase()) ||
    madeByField.toLowerCase().includes(p.toLowerCase())
  );
}

export class OrderBoard extends React.Component<{}, State> {
  static contextType = SettingsContext;
  context!: React.ContextType<typeof SettingsContext>;
  private intervalId: number | null = null;
  private tickIntervalId: number | null = null;
  private orderMeta: Map<string, OrderMeta> = new Map();

  constructor(props: {}) {
    super(props);
    this.state = { orders: [], loading: true, error: null, selectedSite: 'ALL', isSiteSelectOpen: false };
    this.loadData = this.loadData.bind(this);
  }

  componentDidMount() {
    this.loadData();
    const interval = this.context?.settings?.pollingIntervalMs ?? 3000;
    this.intervalId = window.setInterval(this.loadData, interval);
    // 見た目の遷移（In Progress への昇格 / Order Up の非表示）をポーリング間隔より
    // 滑らかに反映するための再描画専用タイマー
    this.tickIntervalId = window.setInterval(() => this.forceUpdate(), 1000);
  }

  componentWillUnmount() {
    if (this.intervalId !== null) clearInterval(this.intervalId);
    if (this.tickIntervalId !== null) clearInterval(this.tickIntervalId);
  }

  loadData() {
    client
      .query({ query: GET_LIVE_ORDERS, fetchPolicy: 'no-cache' })
      .then(res => {
        const all: LiveOrder[] = res?.data?.liveOrders ?? [];
        const orders = all
          .slice()
          .sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())
          .slice(0, MAX_ORDERS);
        this.syncOrderMeta(orders);
        this.setState({ orders, loading: false, error: null });
      })
      .catch((err) => {
        console.error('LiveOrders GraphQL error:', err);
        this.setState({ loading: false, error: String(err) });
      });
  }

  // 各注文の状態遷移タイミングを記録する。バックエンドの実際のステータスは
  // 変更せず、表示専用のメタ情報のみをローカルに保持する。
  syncOrderMeta(orders: LiveOrder[]) {
    const seenIds = new Set<string>();

    orders.forEach(order => {
      seenIds.add(order.orderId);
      let meta = this.orderMeta.get(order.orderId);
      if (!meta) {
        meta = {};
        this.orderMeta.set(order.orderId, meta);
      }

      if (order.status === 'IN_QUEUE' && meta.queueSeenAt === undefined) {
        meta.queueSeenAt = Date.now();
        meta.queueDelayMs = randomInProgressDelay();
      }

      if (order.status === 'FULFILLED' && meta.fulfilledSeenAt === undefined) {
        meta.fulfilledSeenAt = Date.now();
      }
    });

    // ボード上の対象から外れた注文のメタ情報は破棄してメモリを肥大化させない
    Array.from(this.orderMeta.keys()).forEach(id => {
      if (!seenIds.has(id)) this.orderMeta.delete(id);
    });
  }

  // バックエンドの実ステータスに、デモ用の見た目遷移を重ねた表示用ステータスを返す
  displayStatus(order: LiveOrder): OrderStatus | null {
    const meta = this.orderMeta.get(order.orderId);

    if (order.status === 'FULFILLED') {
      if (meta?.fulfilledSeenAt !== undefined && Date.now() - meta.fulfilledSeenAt >= FULFILLED_VISIBLE_MS) {
        return null; // 30秒経過したので Order Up 列から非表示にする
      }
      return 'FULFILLED';
    }

    if (order.status === 'IN_QUEUE') {
      if (meta?.queueSeenAt !== undefined && meta.queueDelayMs !== undefined
          && Date.now() - meta.queueSeenAt >= meta.queueDelayMs) {
        return 'IN_PROGRESS';
      }
      return 'IN_QUEUE';
    }

    return order.status;
  }

  render() {
    const { orders, loading, error, selectedSite, isSiteSelectOpen } = this.state;

    if (loading) {
      return (
        <PageSection>
          <Spinner aria-label="Loading orders" />
        </PageSection>
      );
    }

    const filteredOrders = orders.filter(o => matchesSite(o, selectedSite));

    return (
      <React.Fragment>
        <PageSection variant={PageSectionVariants.light}>
          <Flex alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>
              <TextContent>
                <Text component="h1">Real-Time Order Board</Text>
                <Text component="p">
                  Live order progress — polling every 3s (last {MAX_ORDERS} orders)
                </Text>
              </TextContent>
            </FlexItem>
            <FlexItem align={{ default: 'alignRight' }}>
              <Select
                variant={SelectVariant.single}
                aria-label="Site filter"
                onToggle={open => this.setState({ isSiteSelectOpen: open })}
                onSelect={(_, val) => this.setState({ selectedSite: val as SiteKey, isSiteSelectOpen: false })}
                selections={SITE_OPTIONS.find(o => o.key === selectedSite)?.label}
                isOpen={isSiteSelectOpen}
                placeholderText="Filter by site"
                style={{ minWidth: 180 }}
              >
                {SITE_OPTIONS.map(opt => (
                  <SelectOption key={opt.key} value={opt.key}>{opt.label}</SelectOption>
                ))}
              </Select>
            </FlexItem>
          </Flex>
        </PageSection>
        <Divider component="div" />
        <PageSection variant={PageSectionVariants.default}>
          {error && (
            <Alert variant="danger" title={error} style={{ marginBottom: '16px' }} />
          )}
          <Flex spaceItems={{ default: 'spaceItemsLg' }} alignItems={{ default: 'alignItemsFlexStart' }}>
            {COLUMNS.map(col => {
              const colOrders = filteredOrders.filter(o => this.displayStatus(o) === col);
              return (
                <FlexItem key={col} style={{ flex: '1 1 0', minWidth: '240px' }}>
                  <Card isHoverable>
                    <CardTitle>
                      <Flex alignItems={{ default: 'alignItemsCenter' }}>
                        <FlexItem>{STATUS_LABELS[col]}</FlexItem>
                        <FlexItem>
                          <Badge isRead={colOrders.length === 0}>{colOrders.length}</Badge>
                        </FlexItem>
                      </Flex>
                    </CardTitle>
                    <CardBody>
                      {colOrders.length === 0 ? (
                        <EmptyState variant="xs">
                          <EmptyStateIcon icon={CubeIcon} />
                          <Title headingLevel="h4" size="md">None</Title>
                          <EmptyStateBody>No orders in this column</EmptyStateBody>
                        </EmptyState>
                      ) : (
                        colOrders.map(order => (
                          <Card
                            key={order.orderId}
                            isCompact
                            style={{ marginBottom: '8px', borderLeft: `4px solid var(--pf-global--palette--${STATUS_COLORS[col]}-300)` }}
                          >
                            <CardBody>
                              <Flex direction={{ default: 'column' }}>
                                <FlexItem>
                                  <strong>{order.name}</strong>
                                </FlexItem>
                                <FlexItem>
                                  <Badge color={STATUS_COLORS[col]}>{order.item}</Badge>
                                  {order.site && (
                                    <Badge style={{ marginLeft: 4, backgroundColor: '#6a6e73', color: '#fff' }}>
                                      {order.site}
                                    </Badge>
                                  )}
                                </FlexItem>
                                {order.madeBy && (
                                  <FlexItem>
                                    <small>By: {order.madeBy}</small>
                                  </FlexItem>
                                )}
                                <FlexItem>
                                  <small style={{ color: 'var(--pf-global--Color--200)' }}>
                                    {elapsedLabel(order.updatedAt ?? order.createdAt)}
                                  </small>
                                </FlexItem>
                              </Flex>
                            </CardBody>
                          </Card>
                        ))
                      )}
                    </CardBody>
                  </Card>
                </FlexItem>
              );
            })}
          </Flex>
        </PageSection>
      </React.Fragment>
    );
  }
}
