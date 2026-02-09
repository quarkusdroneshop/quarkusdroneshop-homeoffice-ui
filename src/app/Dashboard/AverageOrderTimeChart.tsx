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
} from '@patternfly/react-core';
import { ChartBullet } from '@patternfly/react-charts';
import { gql } from '@apollo/client';
import client from 'src/apolloclient';

type State = {
  averageOrderUpTime: number; // ms
};

/**
 * 表示専用：ms → Day / Hours / Minutes
 */
function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0m';

  const totalSeconds = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// ===== 時間定数 =====
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const MAX_7_DAYS = 7 * DAY;

export class AverageOrderTimeChart extends React.Component<{}, State> {
  private intervalId: number | null = null;

  constructor(props: {}) {
    super(props);
    this.state = {
      averageOrderUpTime: 0,
    };
    this.loadGraphqlData = this.loadGraphqlData.bind(this);
  }

  componentDidMount() {
    this.loadGraphqlData();
    this.intervalId = window.setInterval(this.loadGraphqlData, 3000);
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

    const GET_AVERAGE_ORDER_TIME = gql`
      query AverageOrderUpTime($startDate: String!, $endDate: String!) {
        averageOrderUpTime(startDate: $startDate, endDate: $endDate)
      }
    `;

    client
      .query({
        query: GET_AVERAGE_ORDER_TIME,
        variables: {
          startDate: startDateString,
          endDate: endDateString,
        },
        fetchPolicy: 'no-cache',
      })
      .then((response) => {
        const timeMs = response?.data?.averageOrderUpTime;
        if (typeof timeMs === 'number') {
          this.setState({ averageOrderUpTime: timeMs });
        }
      })
      .catch((error) => {
        console.error('GraphQL Error:', error);
      });
  }

  render() {
    const { averageOrderUpTime } = this.state;

    // ChartBullet は 0 を描画しないため
    const displayValue = averageOrderUpTime > 0 ? averageOrderUpTime : 1;
    const formattedTime = formatDuration(averageOrderUpTime);

    return (
      <Card isHoverable>
        <CardTitle>
          Average OrderUp Time: {formattedTime}
          <span style={{ marginLeft: '8px', color: '#6a6e73', fontSize: 'smaller' }}>
            ({averageOrderUpTime} ms)
          </span>
        </CardTitle>

        <CardBody>
          <div style={{ height: '172px', width: '550px' }}>
            <ChartBullet
              ariaDesc="Order processing performance"
              ariaTitle="Average OrderUp Time"
              constrainToVisibleArea
              height={172}
              width={550}

              minDomain={{ y: 0 }}
              maxDomain={{ y: MAX_7_DAYS }}

              primaryMeasureData={[
                { name: 'Current', y: displayValue },
              ]}

              comparativeWarningMeasureData={[
                { name: 'Warning', y: 3 * DAY },
              ]}

              comparativeErrorMeasureData={[
                { name: 'Critical', y: 7 * DAY },
              ]}

              qualitativeRangeData={[
                { name: 'Good', y: 1 * DAY },
                { name: 'OK', y: 3 * DAY },
                { name: 'Bad', y: 7 * DAY },
              ]}

              labels={({ datum }) =>
                `${datum.name}: ${formatDuration(datum.y)}`
              }
            />
          </div>

          <DataList aria-label="Performance Benchmarks" isCompact>
            <DataListItem>
              <DataListItemRow>
                <DataListItemCells
                  dataListCells={[
                    <DataListCell key="excellent">
                      Excellent: under 1 day
                    </DataListCell>,
                    <DataListCell key="objective">
                      Objective: under 3 days
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