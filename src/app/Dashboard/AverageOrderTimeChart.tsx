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

// デモ用: バックエンドの実処理時間 (ms) をドローン配送日数に換算して表示する。
// 1ms の処理時間 = DEMO_SCALE ms の配送時間として扱う。
// DEMO_SCALE = 86_400 → 1秒の処理 ≈ 1日の配送時間
const DEMO_SCALE = 86_400;

function formatDeliveryTime(ms: number): string {
  const scaled = ms * DEMO_SCALE;
  const totalHours = Math.floor(scaled / 3_600_000);
  const days  = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days}日 ${hours}時間`;
  return `${hours}時間`;
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

    const hasData = typeof averageOrderUpTime === 'number' && averageOrderUpTime > 0;
    const displayText = hasData ? formatDeliveryTime(averageOrderUpTime) : '---';

    // ChartBullet 用スケール: デモ配送日数で正規化 (ms単位、DEMO_SCALE 適用後)
    // 警告: 2日、危険: 5日、上限: 7日
    const WARN_RAW = Math.round(2 * 86_400_000 / DEMO_SCALE);   // 2日相当の生ms
    const CRIT_RAW = Math.round(5 * 86_400_000 / DEMO_SCALE);   // 5日相当の生ms
    const MAX_RAW  = Math.round(7 * 86_400_000 / DEMO_SCALE);   // 7日相当の生ms
    const displayValue = hasData ? Math.min(averageOrderUpTime, MAX_RAW) : 1;

    return (
      <Card isHoverable>
        <CardTitle>
          平均配送時間 (デモ): {displayText}
        </CardTitle>
        <CardBody>
          <ChartBullet
            ariaDesc="ドローン配送パフォーマンス"
            ariaTitle="平均配送時間"
            height={172}
            width={550}
            minDomain={{ y: 0 }}
            maxDomain={{ y: MAX_RAW }}
            primarySegmentedMeasureData={[{ name: '現在', y: displayValue }]}
            comparativeWarningMeasureData={[{ name: '警告 (2日)', y: WARN_RAW }]}
            comparativeErrorMeasureData={[{ name: '危険 (5日)', y: CRIT_RAW }]}
            qualitativeRangeData={[
              { name: '7日超', y: MAX_RAW },
              { name: '5日以内', y: CRIT_RAW },
              { name: '2日以内', y: WARN_RAW },
            ]}
            labels={({ datum }) => `${datum.name}: ${formatDeliveryTime(datum.y)}`}
          />

          {/* P50 / P95 / P99 パーセンタイル表示 */}
          {percentiles && (
            <DataList aria-label="Percentile breakdown" isCompact style={{ marginTop: '12px' }}>
              <DataListItem>
                <DataListItemRow>
                  <DataListItemCells
                    dataListCells={[
                      <DataListCell key="p50">
                        <Badge>P50</Badge>&nbsp;{formatDeliveryTime(percentiles.p50)}
                      </DataListCell>,
                      <DataListCell key="p95">
                        <Badge style={{ backgroundColor: 'var(--pf-global--warning-color--100)' }}>P95</Badge>&nbsp;{formatDeliveryTime(percentiles.p95)}
                      </DataListCell>,
                      <DataListCell key="p99">
                        <Badge style={{ backgroundColor: 'var(--pf-global--danger-color--100)' }}>P99</Badge>&nbsp;{formatDeliveryTime(percentiles.p99)}
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
                      優良: 2日以内
                    </DataListCell>,
                    <DataListCell key="objective">
                      目標: 5日以内
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
