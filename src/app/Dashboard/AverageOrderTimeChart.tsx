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

    // 0ms 対策（ChartBullet は 0 を描画しない）
    const displayValue =
      typeof averageOrderUpTime === 'number' && averageOrderUpTime > 0
        ? averageOrderUpTime
        : 1;

    // 表示用
    const minutes = Math.floor(averageOrderUpTime / 1000 / 60);
    const seconds = Math.floor((averageOrderUpTime / 1000) % 60);

    // デバッグ用（必要なら）
    console.log('averageOrderUpTime(ms)=', averageOrderUpTime);

    return (
    <Card isHoverable>
      <CardTitle>
        Average OrderUp Time: {minutes} min {seconds} sec（{averageOrderUpTime} ms）
      </CardTitle>
      <CardBody>
        <ChartBullet
          ariaDesc="Order processing performance"
          ariaTitle="Average OrderUp Time (ms)"
          height={172}
          width={550}

          domain={{ x: [0, 300_000] }}

          primaryMeasureData={[
            { name: 'Current', x: displayValue },
          ]}

          comparativeWarningMeasureData={[
            { name: 'Warning', x: 200_000 },
          ]}

          comparativeErrorMeasureData={[
            { name: 'Critical', x: 300_000 },
          ]}

          qualitativeRangeData={[
            { name: 'Bad', x: 300_000 },
            { name: 'OK', x: 200_000 },
            { name: 'Good', x: 100_000 },
          ]}

          labels={({ datum }) => `${datum.name}: ${datum.x} ms`}
        />

          <DataList aria-label="Performance Benchmarks" isCompact>
            <DataListItem>
              <DataListItemRow>
                <DataListItemCells
                  dataListCells={[
                    <DataListCell key="excellent">
                      Excellent is under {Math.max(0, minutes - 1)} minutes
                    </DataListCell>,
                    <DataListCell key="objective">
                      Objective is under {minutes + 1} minutes
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