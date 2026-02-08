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
  averageOrderUpTime: number; // 秒
};

export class AverageOrderTimeChart extends React.Component<{}, State> {

  private intervalId: number | null = null;

  constructor(props: {}) {
    super(props);
    this.state = {
      averageOrderUpTime: 0, // 秒
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
          // ★ ミリ秒 → 秒
          const timeSeconds = Math.round(timeMs / 1000);
          this.setState({ averageOrderUpTime: timeSeconds });
        }
      })
      .catch((error) => {
        console.error('GraphQL Error:', error);
      });
  }

  render() {
    const { averageOrderUpTime } = this.state;

    const minutes = Math.floor(averageOrderUpTime / 60);
    const seconds = averageOrderUpTime % 60;

    const lowerRange = Math.max(0, averageOrderUpTime - 60);
    const upperRange = averageOrderUpTime + 60;

    return (
      <Card isHoverable>
        <CardTitle>
          Average OrderUp Time: {minutes} min {seconds} sec
        </CardTitle>

        <CardBody>
          <div style={{ height: '172px', width: '550px' }}>
            <ChartBullet
              ariaDesc="Order processing performance"
              ariaTitle="Average OrderUp Time"
              constrainToVisibleArea
              height={172}
              width={550}
              maxDomain={{ y: 300 }}   {/* 300秒 = 5分 */}

              primarySegmentedMeasureData={[
                { name: 'Current', y: averageOrderUpTime },
              ]}

              comparativeWarningMeasureData={[
                { name: 'Warning', y: 200 },
              ]}

              comparativeErrorMeasureData={[
                { name: 'Critical', y: 300 },
              ]}

              qualitativeRangeData={[
                { name: 'Lower Range', y: lowerRange },
                { name: 'Upper Range', y: upperRange },
              ]}

              labels={({ datum }) => `${datum.name}: ${datum.y}s`}
            />
          </div>

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