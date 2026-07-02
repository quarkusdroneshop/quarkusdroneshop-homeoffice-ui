import * as React from 'react';
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
  Button,
  Spinner,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Title,
  Alert,
  AlertActionCloseButton,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import ExclamationTriangleIcon from '@patternfly/react-icons/dist/js/icons/exclamation-triangle-icon';
import CheckCircleIcon from '@patternfly/react-icons/dist/js/icons/check-circle-icon';
import { gql } from '@apollo/client';
import client from 'src/apolloclient';

const GET_FAILED_ORDERS = gql`
  query FailedOrders {
    failedOrders {
      orderId
      name
      item
      failureReason
      failedAt
      retryCount
    }
  }
`;

const RETRY_ORDER = gql`
  mutation RetryOrder($orderId: String!) {
    retryOrder(orderId: $orderId) {
      success
      message
    }
  }
`;

interface FailedOrder {
  orderId: string;
  name: string;
  item: string;
  failureReason: string;
  failedAt: string;
  retryCount: number;
}

export interface ISupportProps {
  sampleProp?: string;
}

type State = {
  orders: FailedOrder[];
  loading: boolean;
  retrying: Set<string>;
  successMsg: string | null;
  errorMsg: string | null;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US');
}

function reasonLabel(code: string): string {
  const map: Record<string, string> = {
    INVENTORY_DEPLETED: 'Inventory Depleted',
    PAYMENT_TIMEOUT:    'Payment Timeout',
    DRONE_MALFUNCTION:  'Drone Malfunction',
    NETWORK_ERROR:      'Network Error',
    UNKNOWN:            'Unknown Error',
  };
  return map[code] ?? code;
}

class SupportPage extends React.Component<ISupportProps, State> {
  constructor(props: ISupportProps) {
    super(props);
    this.state = { orders: [], loading: true, retrying: new Set(), successMsg: null, errorMsg: null };
    this.loadData = this.loadData.bind(this);
    this.retryOrder = this.retryOrder.bind(this);
  }

  componentDidMount() {
    this.loadData();
  }

  loadData() {
    this.setState({ loading: true });
    client
      .query({ query: GET_FAILED_ORDERS, fetchPolicy: 'no-cache' })
      .then(res => {
        const orders: FailedOrder[] = res?.data?.failedOrders ?? [];
        this.setState({ orders, loading: false });
      })
      .catch((err) => {
        console.error('FailedOrders GraphQL error:', err);
        this.setState({
          loading: false,
          errorMsg: 'Failed to connect to backend. Please wait and click Refresh.',
        });
      });
  }

  retryOrder(orderId: string) {
    this.setState(prev => ({ retrying: new Set([...Array.from(prev.retrying), orderId]) }));
    client
      .mutate({ mutation: RETRY_ORDER, variables: { orderId } })
      .then(res => {
        const result = res?.data?.retryOrder;
        this.setState(prev => {
          const retrying = new Set(prev.retrying);
          retrying.delete(orderId);
          return {
            retrying,
            successMsg: result?.message ?? `Retry submitted for order ${orderId}`,
            orders: prev.orders.filter(o => o.orderId !== orderId),
          };
        });
      })
      .catch(() => {
        this.setState(prev => {
          const retrying = new Set(prev.retrying);
          retrying.delete(orderId);
          return { retrying, errorMsg: `Failed to retry order ${orderId}` };
        });
      });
  }

  render() {
    const { orders, loading, retrying, successMsg, errorMsg } = this.state;

    return (
      <React.Fragment>
        <PageSection variant={PageSectionVariants.light}>
          <TextContent>
            <Text component="h1">Support</Text>
            <Text component="p">Manage failed orders in the Dead Letter Queue (DLQ) and review failure history</Text>
          </TextContent>
        </PageSection>

        <Divider component="div" />

        <PageSection variant={PageSectionVariants.default}>
          {successMsg && (
            <Alert
              variant="success"
              title={successMsg}
              actionClose={<AlertActionCloseButton onClose={() => this.setState({ successMsg: null })} />}
              style={{ marginBottom: '16px' }}
            />
          )}
          {errorMsg && (
            <Alert
              variant="danger"
              title={errorMsg}
              actionClose={<AlertActionCloseButton onClose={() => this.setState({ errorMsg: null })} />}
              style={{ marginBottom: '16px' }}
            />
          )}

          <Card style={orders.length > 0 ? { borderLeft: '4px solid #c9190b' } : {}}>
            <CardTitle>
              <Flex alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem>
                  {orders.length > 0 ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        backgroundColor: '#c9190b',
                        borderRadius: '50%',
                        animation: 'dlq-pulse 1.5s ease-in-out infinite',
                      }}>
                        <ExclamationTriangleIcon style={{ color: '#fff', fontSize: '16px' }} />
                      </span>
                      <span style={{ color: '#c9190b', fontWeight: 700, fontSize: '1.1rem' }}>
                        Failed Orders (DLQ) — Action Required
                      </span>
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircleIcon style={{ color: '#3e8635', fontSize: '18px' }} />
                      <span>Failed Orders (DLQ)</span>
                    </span>
                  )}
                </FlexItem>
                <FlexItem>
                  <Badge
                    isRead={orders.length === 0}
                    style={orders.length > 0 ? { backgroundColor: '#c9190b', color: '#fff' } : {}}
                  >
                    {loading ? '...' : orders.length}
                  </Badge>
                </FlexItem>
                <FlexItem align={{ default: 'alignRight' }}>
                  <Button variant="secondary" onClick={this.loadData} isDisabled={loading}>
                    Refresh
                  </Button>
                </FlexItem>
              </Flex>
            </CardTitle>
            <CardBody>
              {loading ? (
                <Spinner aria-label="Loading failed orders" />
              ) : orders.length === 0 ? (
                <EmptyState>
                  <EmptyStateIcon icon={CheckCircleIcon} />
                  <Title headingLevel="h2" size="lg">No Failed Orders</Title>
                  <EmptyStateBody>There are currently no orders queued in the DLQ</EmptyStateBody>
                </EmptyState>
              ) : (
                orders.map(order => (
                  <Card key={order.orderId} isCompact style={{ marginBottom: '8px' }}>
                    <CardBody>
                      <Flex alignItems={{ default: 'alignItemsCenter' }} style={{ gap: '16px' }}>
                        <FlexItem flex={{ default: 'flex_1' }}>
                          <strong>{order.orderId}</strong> — {order.name}
                          <br />
                          <small>Item: {order.item}</small>
                          <br />
                          <Badge>{reasonLabel(order.failureReason)}</Badge>
                          <small style={{ marginLeft: '8px', color: 'var(--pf-global--Color--200)' }}>
                            {formatTime(order.failedAt)} / Retries: {order.retryCount}
                          </small>
                        </FlexItem>
                        <FlexItem>
                          <Button
                            variant="primary"
                            isSmall
                            isLoading={retrying.has(order.orderId)}
                            isDisabled={retrying.has(order.orderId)}
                            onClick={() => this.retryOrder(order.orderId)}
                          >
                            Retry
                          </Button>
                        </FlexItem>
                      </Flex>
                    </CardBody>
                  </Card>
                ))
              )}
            </CardBody>
          </Card>
        </PageSection>
      </React.Fragment>
    );
  }
}

const Support = SupportPage;
export { Support };
