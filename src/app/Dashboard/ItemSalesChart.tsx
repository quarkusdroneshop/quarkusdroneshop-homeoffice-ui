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

interface ItemSalesChartState { data: any[] }
export class ItemSalesChart extends React.Component<Record<string, never>, ItemSalesChartState> {
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
    // バックエンドは startDate/endDate を JST の暦日として解釈するため、
    // UTC ではなく JST 基準の日付文字列を生成する（toISOString() は UTC のため使用しない）。
    const jstDateString = (d: Date) => new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const endingDate = new Date();
    const endDateString = jstDateString(endingDate);
    endingDate.setDate(endingDate.getDate() - 6);
    const startDateString = jstDateString(endingDate);

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