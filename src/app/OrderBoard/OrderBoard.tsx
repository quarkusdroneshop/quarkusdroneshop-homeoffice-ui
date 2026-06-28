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
      createdAt
      updatedAt
    }
  }
`;

type OrderStatus = 'IN_QUEUE' | 'IN_PROGRESS' | 'FULFILLED';

interface LiveOrder {
  orderId: string;
  name: string;
  item: string;
  status: OrderStatus;
  madeBy?: string;
  createdAt: string;
  updatedAt?: string;
}

type State = {
  orders: LiveOrder[];
  loading: boolean;
  error: string | null;
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  IN_QUEUE: '注文受付',
  IN_PROGRESS: '処理中',
  FULFILLED: 'OrderUp',
};

const STATUS_COLORS: Record<OrderStatus, 'blue' | 'orange' | 'green'> = {
  IN_QUEUE: 'blue',
  IN_PROGRESS: 'orange',
  FULFILLED: 'green',
};

const COLUMNS: OrderStatus[] = ['IN_QUEUE', 'IN_PROGRESS', 'FULFILLED'];

function elapsedLabel(isoStr: string): string {
  const diffSec = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}秒前`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}分前`;
  return `${Math.floor(diffMin / 60)}時間前`;
}

export class OrderBoard extends React.Component<{}, State> {
  static contextType = SettingsContext;
  context!: React.ContextType<typeof SettingsContext>;
  private intervalId: number | null = null;

  constructor(props: {}) {
    super(props);
    this.state = { orders: [], loading: true, error: null };
    this.loadData = this.loadData.bind(this);
  }

  componentDidMount() {
    this.loadData();
    const interval = this.context?.settings?.pollingIntervalMs ?? 3000;
    this.intervalId = window.setInterval(this.loadData, interval);
  }

  componentWillUnmount() {
    if (this.intervalId !== null) clearInterval(this.intervalId);
  }

  loadData() {
    client
      .query({ query: GET_LIVE_ORDERS, fetchPolicy: 'no-cache' })
      .then(res => {
        const orders: LiveOrder[] = res?.data?.liveOrders ?? [];
        this.setState({ orders, loading: false, error: null });
      })
      .catch((err) => {
        console.error('LiveOrders GraphQL error:', err);
        this.setState({ loading: false, error: 'バックエンドに接続できません。しばらく待ってから更新してください。' });
      });
  }

  render() {
    const { orders, loading, error } = this.state;

    if (loading) {
      return (
        <PageSection>
          <Spinner aria-label="Loading orders" />
        </PageSection>
      );
    }

    return (
      <React.Fragment>
        <PageSection variant={PageSectionVariants.light}>
          <TextContent>
            <Text component="h1">リアルタイム注文ボード</Text>
            <Text component="p">注文の進捗状況をリアルタイムで表示します（3秒ポーリング）</Text>
          </TextContent>
        </PageSection>
        <Divider component="div" />
        <PageSection variant={PageSectionVariants.default}>
          {error && (
            <Alert variant="danger" title={error} style={{ marginBottom: '16px' }} />
          )}
          <Flex spaceItems={{ default: 'spaceItemsLg' }} alignItems={{ default: 'alignItemsFlexStart' }}>
            {COLUMNS.map(col => {
              const colOrders = orders.filter(o => o.status === col);
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
                          <Title headingLevel="h4" size="md">なし</Title>
                          <EmptyStateBody>この列に注文はありません</EmptyStateBody>
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
                                </FlexItem>
                                {order.madeBy && (
                                  <FlexItem>
                                    <small>担当: {order.madeBy}</small>
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
