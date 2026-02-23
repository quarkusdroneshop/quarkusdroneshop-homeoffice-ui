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
  averageOrderUpTime: number;
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
    const days = Math.floor(averageOrderUpTime / 60);
    const hours = Math.floor(averageOrderUpTime % 60);

    // デバッグ用（必要なら）
    console.log('averageOrderUpTime=', averageOrderUpTime);

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

            primarySegmentedMeasureData={[
              { name: 'Current', y: displayValue }
            ]}
          
            comparativeWarningMeasureData={[
              { name: 'Warning', y: 150 }
            ]}
          
            comparativeErrorMeasureData={[
              { name: 'Critical', y: 300 }
            ]}
          
            qualitativeRangeData={[
              { name: 'Bad', y: 350 },
              { name: 'OK', y: 150 },
              { name: 'Good', y: 100 }
            ]}
          
            labels={({ datum }) => `${datum.name}: ${datum.x} ms`}
          />

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