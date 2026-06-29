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
  Checkbox,
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
  demoMode: boolean;
};

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}m ${sec}s`;
}

// デモ用スケール: 1ms の実処理時間 = DEMO_SCALE ms の配送時間として換算
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
      demoMode: true,
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
    const { averageOrderUpTime, percentiles, demoMode } = this.state;
    const hasData = typeof averageOrderUpTime === 'number' && averageOrderUpTime > 0;

    // デモモード: 日数換算 / 通常モード: ms表示
    const fmt = (ms: number) => demoMode ? formatDeliveryTime(ms) : formatMs(ms);
    const displayText = hasData ? fmt(averageOrderUpTime) : '---';

    // ChartBullet スケール
    let MAX_VAL: number, WARN_VAL: number, CRIT_VAL: number, displayValue: number;
    if (demoMode) {
      // デモ: 生ms で表現した 2日/5日/7日 の閾値
      WARN_VAL = Math.round(2 * 86_400_000 / DEMO_SCALE);
      CRIT_VAL = Math.round(5 * 86_400_000 / DEMO_SCALE);
      MAX_VAL  = Math.round(7 * 86_400_000 / DEMO_SCALE);
      displayValue = hasData ? Math.min(averageOrderUpTime, MAX_VAL) : 1;
    } else {
      // 通常: 2分/5分/10分 (ms)
      WARN_VAL = 120_000;
      CRIT_VAL = 300_000;
      MAX_VAL  = 600_000;
      displayValue = hasData ? Math.min(averageOrderUpTime, MAX_VAL) : 1;
    }

    const warnLabel = demoMode ? '警告 (2日)' : '警告 (2分)';
    const critLabel = demoMode ? '危険 (5日)' : '危険 (5分)';
    const benchGood = demoMode ? '優良: 2日以内' : '優良: 2分以内';
    const benchObj  = demoMode ? '目標: 5日以内' : '目標: 5分以内';

    return (
      <Card isHoverable>
        <CardTitle style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Average OrderUp Time: {displayText}</span>
          <Checkbox
            id="demo-mode-toggle"
            label="Only DEMO"
            isChecked={demoMode}
            onChange={(checked) => this.setState({ demoMode: checked })}
            style={{ marginLeft: '16px', fontWeight: 'normal', fontSize: '0.85rem' }}
          />
        </CardTitle>
        <CardBody>
          <ChartBullet
            ariaDesc="Order processing performance"
            ariaTitle="Average OrderUp Time"
            height={172}
            width={550}
            minDomain={{ y: 0 }}
            maxDomain={{ y: MAX_VAL }}
            primarySegmentedMeasureData={[{ name: 'Current', y: displayValue }]}
            comparativeWarningMeasureData={[{ name: warnLabel, y: WARN_VAL }]}
            comparativeErrorMeasureData={[{ name: critLabel, y: CRIT_VAL }]}
            qualitativeRangeData={[
              { name: demoMode ? '7日超' : '10分超', y: MAX_VAL },
              { name: demoMode ? '5日以内' : '5分以内', y: CRIT_VAL },
              { name: demoMode ? '2日以内' : '2分以内', y: WARN_VAL },
            ]}
            labels={({ datum }) => `${datum.name}: ${fmt(datum.y)}`}
          />

          {/* P50 / P95 / P99 パーセンタイル表示 */}
          {percentiles && (
            <DataList aria-label="Percentile breakdown" isCompact style={{ marginTop: '12px' }}>
              <DataListItem>
                <DataListItemRow>
                  <DataListItemCells
                    dataListCells={[
                      <DataListCell key="p50">
                        <Badge>P50</Badge>&nbsp;{fmt(percentiles.p50)}
                      </DataListCell>,
                      <DataListCell key="p95">
                        <Badge style={{ backgroundColor: 'var(--pf-global--warning-color--100)' }}>P95</Badge>&nbsp;{fmt(percentiles.p95)}
                      </DataListCell>,
                      <DataListCell key="p99">
                        <Badge style={{ backgroundColor: 'var(--pf-global--danger-color--100)' }}>P99</Badge>&nbsp;{fmt(percentiles.p99)}
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
                    <DataListCell key="excellent">{benchGood}</DataListCell>,
                    <DataListCell key="objective">{benchObj}</DataListCell>,
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
