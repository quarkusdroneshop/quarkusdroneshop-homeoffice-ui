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
import CaretDownIcon from '@patternfly/react-icons/dist/js/icons/caret-down-icon';
import { gql } from '@apollo/client';
import client from 'src/apolloclient';


export class AverageOrderTimeChart extends React.Component {

  private intervalId: number | null = null;

  constructor(props) {
    super(props);
    this.state = {
      averageOrderUpTime: 60,
    };
    this.loadGraphqlData = this.loadGraphqlData.bind(this);
    this.intervalId = null;
  }

  componentDidMount() {
    this.loadGraphqlData();
    this.intervalId = window.setInterval(this.loadGraphqlData, 3000)
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

    // console("startDateString: " + startDateString);
    // console("ENDDateString: " + endDateString);
    // const GET_AVERAGE_ORDER_TIME = gql`
    //   query AverageOrderUpTime($startDate: String!, $endDate: String!) {
    //     averageOrderUpTime(startDate: $startDate, endDate: $endDate)
    //   }
    // `;
    const GET_AVERAGE_ORDER_TIME = gql`
    query AverageOrderUpTime($startDate: String!, $endDate: String!) {
      averageOrderUpTime(startDate: $startDate, endDate: $endDate)
    }
  `;

    client
      .query({
        query: GET_AVERAGE_ORDER_TIME,
        variables: { startDate: startDateString, endDate: endDateString },
        fetchPolicy: 'no-cache', // キャッシュを使わない
      })
      .then((response) => {
        const time = response?.data?.averageOrderUpTime;
        if (typeof time === 'number') {
          this.setState({ averageOrderUpTime: time });
        }
      })
      .catch((error) => {
        console.error('GraphQL Error:', error);
      });
      
  }

  render() {
    const { averageOrderUpTime } = this.state;
    const minutes = Math.floor(averageOrderUpTime / 60);
    const seconds = Math.round(averageOrderUpTime % 60);

    const lowerRange = (minutes - 1) * 60;
    const upperRange = (minutes + 1) * 60;

    return (
      <Card isHoverable>
        <CardTitle>
          Average OrderUp Time: {minutes} minutes {seconds} seconds
        </CardTitle>
        <CardBody>
          <div style={{ height: '172px', width: '500px' }}>
            <ChartBullet
              ariaDesc="Order processing performance"
              ariaTitle="Average OrderUp Time"
              comparativeWarningMeasureData={[{ name: 'Warning', y: 200 }]}
              comparativeErrorMeasureData={[{ name: 'Critical', y: 300 }]}
              constrainToVisibleArea
              height={172}
              labels={({ datum }) => `${datum.name}: ${datum.y}`}
              maxDomain={{ y: 360 }}
              primarySegmentedMeasureData={[{ name: 'Current', y: averageOrderUpTime }]}
              qualitativeRangeData={[
                { name: 'Lower Range', y: lowerRange },
                { name: 'Upper Range', y: upperRange },
              ]}
              width={500}
            />
          </div>

          <DataList aria-label="Performance Benchmarks" isCompact>
            <DataListItem aria-labelledby="item-excellent">
              <DataListItemRow>
                <DataListItemCells
                  dataListCells={[
                    <DataListCell key="excellent">
                      <span id="item-excellent">
                        Excellent is under {minutes - 1} minutes
                      </span>
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