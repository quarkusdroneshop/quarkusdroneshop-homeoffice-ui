import React from 'react';
import {
  Card,
  CardBody,
  CardTitle
} from '@patternfly/react-core';

import {
  ChartThemeColor,
  ChartDonut,
  ChartLegend
} from '@patternfly/react-charts';

import { gql } from '@apollo/client';
import client from 'src/apolloclient';

const GET_ITEM_SALES = gql`
  query itemSalesTotalsByDate($startDate: String!, $endDate: String!) {
    itemSalesTotalsByDate(startDate: $startDate, endDate: $endDate) {
      item
      revenue
      salesTotal
    }
  }
`;

export class ItemSalesChart extends React.Component {
  intervalId: NodeJS.Timeout | undefined;

  constructor(props) {
    super(props);
    this.state = {
      data: []
    };
    this.loadGraphqlData = this.loadGraphqlData.bind(this);
  }

  componentDidMount() {
    this.loadGraphqlData();
    this.intervalId = setInterval(this.loadGraphqlData, 3000);
  }

  componentWillUnmount() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  loadGraphqlData() {
    const endingDate = new Date();
    const endDateString = endingDate.toISOString().slice(0, 10);
    endingDate.setDate(endingDate.getDate() - 6);
    const startDateString = endingDate.toISOString().slice(0, 10);

    client
      .query({
        query: GET_ITEM_SALES,
        variables: { startDate: startDateString, endDate: endDateString }
      })
      .then((response) => {
        this.setState({ data: response.data.itemSalesTotalsByDate });
      })
      .catch((error) => {
        console.error('GraphQL Error:', error);
      });
  }

  render() {
    const data = this.state.data || [];
    const totalSales = data.reduce((sum, item) => sum + (item.salesTotal || 0), 0);

    return (
      <Card isHoverable>
        <CardTitle>Item Sales Totals</CardTitle>
        <CardBody>
          <div style={{ width: '100%', maxWidth: '400px' }}>
            <ChartDonut
              ariaTitle="Relative Item Sales"
              data={data}
              x="item"
              y="salesTotal"
              labels={({ datum }) => `${datum.item}: ${datum.salesTotal}`}
              legendData={data.map((i) => ({ name: i.item }))}
              legendOrientation="vertical"
              legendPosition="right"
              legendComponent={<ChartLegend style={{ labels: { fontSize: 12 } }} />}
              padding={{ top: 20, bottom: 20, left: 20, right: 150 }}
              subTitle="Last 7 Days"
              title={totalSales}
              themeColor={ChartThemeColor.multiOrdered}
              width={400}
            />
          </div>
        </CardBody>
      </Card>
    );
  }
}