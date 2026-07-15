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
import { ChartBullet, ChartAxis } from '@patternfly/react-charts';
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

// Demo scale: maps real processing ms to simulated delivery time.
// DEMO_SCALE = 100 → typical ~6,000,000ms (100min) processing ≈ 7 days delivery
const DEMO_SCALE = 100;

// 実処理時間が短い注文でも「基本的に1日以上」の配送日数として見せるための下限。
const MIN_DELIVERY_MS = 24 * 3_600_000;

function formatDeliveryTime(ms: number): string {
  const scaled = Math.max(ms * DEMO_SCALE, MIN_DELIVERY_MS);
  const totalHours = Math.floor(scaled / 3_600_000);
  const days  = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  const totalMinutes = Math.floor(scaled / 60_000);
  if (totalMinutes > 0) return `${totalMinutes}m`;
  return `${Math.floor(scaled / 1000)}s`;
}

// 軸目盛り専用: 1日未満へのフロアを行わず、"Xd" のみのシンプルな形式で表示する。
function formatAxisTick(ms: number): string {
  const scaled = ms * DEMO_SCALE;
  const days = Math.round(scaled / 86_400_000);
  return `${days}d`;
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
    // バックエンドは startDate/endDate を JST の暦日として解釈するため、
    // UTC ではなく JST 基準の日付文字列を生成する（toISOString() は UTC のため使用しない）。
    const jstDateString = (d: Date) => new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const end = new Date();
    const endDateString = jstDateString(end);
    const start = new Date();
    start.setDate(start.getDate() - 6);
    const startDateString = jstDateString(start);
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
      // Demo: thresholds at 2 days (warn) / 3 days (crit) within normal range;
      // the display/gauge itself is capped at 7 days when over threshold.
      WARN_VAL = Math.round(2 * 86_400_000 / DEMO_SCALE);
      CRIT_VAL = Math.round(3 * 86_400_000 / DEMO_SCALE);
      MAX_VAL  = Math.round(7 * 86_400_000 / DEMO_SCALE);
      const MIN_VAL = Math.round(MIN_DELIVERY_MS / DEMO_SCALE);
      displayValue = hasData ? Math.max(Math.min(averageOrderUpTime, MAX_VAL), MIN_VAL) : 1;
    } else {
      // Normal: 2min / 5min / 10min (ms)
      WARN_VAL = 120_000;
      CRIT_VAL = 300_000;
      MAX_VAL  = 600_000;
      displayValue = hasData ? Math.min(averageOrderUpTime, MAX_VAL) : 1;
    }

    const warnLabel = demoMode ? 'Warning (2d)' : 'Warning (2m)';
    const critLabel = demoMode ? 'Critical (3d)' : 'Critical (5m)';
    const benchGood = demoMode ? 'Good: within 2 days' : 'Good: within 2 min';
    const benchObj  = demoMode ? 'Target: within 3 days' : 'Target: within 5 min';

    return (
      <Card isHoverable style={{ width: '100%', minWidth: '480px' }}>
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
            height={250}
            width={550}
            minDomain={{ y: 0 }}
            maxDomain={{ y: MAX_VAL }}
            primarySegmentedMeasureData={[{ name: 'Current', y: displayValue }]}
            comparativeWarningMeasureData={[{ name: warnLabel, y: WARN_VAL }]}
            comparativeErrorMeasureData={[{ name: critLabel, y: CRIT_VAL }]}
            qualitativeRangeData={[
              { name: demoMode ? 'Over 7d' : 'Over 10m', y: MAX_VAL },
              { name: demoMode ? 'Within 3d' : 'Within 5m', y: CRIT_VAL },
              { name: demoMode ? 'Within 2d' : 'Within 2m', y: WARN_VAL },
            ]}
            labels={({ datum }) => `${datum.name}: ${fmt(datum.y)}`}
            axisComponent={
              <ChartAxis
                tickFormat={(t: number) => (demoMode ? formatAxisTick(t) : fmt(t))}
                tickValues={demoMode ? [0, 1, 2, 3, 5, 7].map(d => (d * 86_400_000) / DEMO_SCALE) : undefined}
              />
            }
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
