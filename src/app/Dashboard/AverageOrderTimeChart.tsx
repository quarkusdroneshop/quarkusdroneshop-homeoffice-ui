import React from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  DataList,
  DataListItem,
  DataListItemRow,
  DataListItemCells,
  DataListCell,
  Badge,
} from '@patternfly/react-core';
import { ChartBullet } from '@patternfly/react-charts';
import { gql } from '@apollo/client';
import client from 'src/apolloclient';
import { SettingsContext } from '../utils/SettingsContext';

const GET_AVERAGE_ORDER_TIME = gql`
  query AverageOrderUpTime($startDate: String!, $endDate: String!) {
    averageOrderUpTime(startDate: $startDate, endDate: $endDate)
  }
`;

const GET_ORDER_PERCENTILES = gql`
  query OrderUpTimePercentiles($startDate: String!, $endDate: String!) {
    orderUpTimePercentiles(startDate: $startDate, endDate: $endDate) {
      p50
      p95
      p99
    }
  }
`;

type Percentiles = { p50: number; p95: number; p99: number };

type State = {
  averageOrderUpTime: number;
  percentiles: Percentiles | null;
};

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}m ${sec}s`;
}

export class AverageOrderTimeChart extends React.Component<{}, State> {
  static contextType = SettingsContext;
  context!: React.ContextType<typeof SettingsContext>;
  private intervalId: number | null = null;

  constructor(props: {}) {
    super(props);
    this.state = {
      averageOrderUpTime: 0,
      percentiles: null,
    };
    this.loadGraphqlData = this.loadGraphqlData.bind(this);
  }

  componentDidMount() {
    this.loadGraphqlData();
    const interval = this.context?.settings?.pollingIntervalMs ?? 3000;
    this.intervalId = window.setInterval(this.loadGraphqlData, interval);
  }

  componentWillUnmount() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
  }

  loadGraphqlData() {
    const end = new Date();
    const endDateString = end.toISOString().slice(0, 10);
    const start = new Date();
    start.setDate(start.getDate() - 6);
    const startDateString = start.toISOString().slice(0, 10);
    const vars = { variables: { startDate: startDateString, endDate: endDateString }, fetchPolicy: 'no-cache' as const };

    client
      .query({ query: GET_AVERAGE_ORDER_TIME, ...vars })
      .then(response => {
        const timeMs = response?.data?.averageOrderUpTime;
        if (typeof timeMs === 'number') {
          this.setState({ averageOrderUpTime: timeMs });
        }
      })
      .catch(error => {
        console.error('GraphQL Error (averageOrderUpTime):', error);
      });

    client
      .query({ query: GET_ORDER_PERCENTILES, ...vars })
      .then(response => {
        const p = response?.data?.orderUpTimePercentiles;
        if (p) {
          this.setState({ percentiles: p });
        }
      })
      .catch(() => {
        // percentiles query may not exist yet — silently skip
      });
  }

  render() {
    const { averageOrderUpTime, percentiles } = this.state;

    const displayValue =
      typeof averageOrderUpTime === 'number' && averageOrderUpTime > 0
        ? averageOrderUpTime
        : 1;

    const days = Math.floor(averageOrderUpTime / 60);
    const hours = Math.floor(averageOrderUpTime % 60);

    return (
      <Card isHoverable>
        <CardTitle>
          Average OrderUp Time: {days} days {hours} hours
        </CardTitle>
        <CardBody>
          <ChartBullet
            ariaDesc="Order processing performance"
            ariaTitle="Average Shipping Time"
            height={172}
            width={550}
            minDomain={{ y: 0 }}
            maxDomain={{ y: 350 }}
            primarySegmentedMeasureData={[{ name: 'Current', y: displayValue }]}
            comparativeWarningMeasureData={[{ name: 'Warning', y: 150 }]}
            comparativeErrorMeasureData={[{ name: 'Critical', y: 300 }]}
            qualitativeRangeData={[
              { name: 'Bad', y: 350 },
              { name: 'OK', y: 150 },
              { name: 'Good', y: 100 },
            ]}
            labels={({ datum }) => `${datum.name}: ${datum.x} ms`}
          />

          {/* P50 / P95 / P99 パーセンタイル表示 */}
          {percentiles && (
            <DataList aria-label="Percentile breakdown" isCompact style={{ marginTop: '12px' }}>
              <DataListItem>
                <DataListItemRow>
                  <DataListItemCells
                    dataListCells={[
                      <DataListCell key="p50">
                        <Badge>P50</Badge>&nbsp;{formatMs(percentiles.p50)}
                      </DataListCell>,
                      <DataListCell key="p95">
                        <Badge style={{ backgroundColor: 'var(--pf-global--warning-color--100)' }}>P95</Badge>&nbsp;{formatMs(percentiles.p95)}
                      </DataListCell>,
                      <DataListCell key="p99">
                        <Badge style={{ backgroundColor: 'var(--pf-global--danger-color--100)' }}>P99</Badge>&nbsp;{formatMs(percentiles.p99)}
                      </DataListCell>,
                    ]}
                  />
                </DataListItemRow>
              </DataListItem>
            </DataList>
          )}

          <DataList aria-label="Performance Benchmarks" isCompact>
            <DataListItem>
              <DataListItemRow>
                <DataListItemCells
                  dataListCells={[
                    <DataListCell key="excellent">
                      Excellent is under {Math.max(0, hours - 1)} hours
                    </DataListCell>,
                    <DataListCell key="objective">
                      Objective is under {hours + 1} hours
                    </DataListCell>,
                  ]}
                />
              </DataListItemRow>
            </DataListItem>
          </DataList>
        </CardBody>
      </Card>
    );
  }
}
