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

    // デバッグ用
    console.log('averageOrderUpTime(ms)=', averageOrderUpTime);

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
              maxDomain={{ y: 300_000 }}

              primaryMeasureData={[
                { name: 'Current', y: displayValue },
              ]}

              comparativeWarningMeasureData={[
                { name: 'Warning', y: 200_000 },
              ]}

              comparativeErrorMeasureData={[
                { name: 'Critical', y: 300_000 },
              ]}

              qualitativeRangeData={[
                { name: 'Good', y: 100_000 },
                { name: 'OK', y: 200_000 },
                { name: 'Bad', y: 300_000 },
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
                      Excellent: under 1h
                    </DataListCell>,
                    <DataListCell key="objective">
                      Objective: under 2h
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