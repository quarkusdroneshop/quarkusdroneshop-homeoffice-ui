import React from 'react';

import {
  Card,
  CardBody,
  CardTitle
} from '@patternfly/react-core';

import {
  Chart,
  ChartArea,
  ChartAxis,
  ChartStack,
  ChartLegend,
  ChartThemeColor,
  createContainer
} from '@patternfly/react-charts';

import { gql } from '@apollo/client';
import client from 'src/apolloclient';

const GET_PRODUCT_SALES = gql`
  query productSalesByDate($startDate: String!, $endDate: String!) {
    productSalesByDate(startDate: $startDate, endDate: $endDate) {
      item
      productItemSales {
        item
        date
        salesTotal
      }
    }
  }
`;

export class ItemSalesTrendsChart extends React.Component {
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
        query: GET_PRODUCT_SALES,
        variables: { startDate: startDateString, endDate: endDateString }
      })
      .then((response) => {
        this.setState({ data: response.data.productSalesByDate });
      })
      .catch((error) => {
        console.error('GraphQL query error:', error);
      });
  }

  render() {
    const data = this.state.data || [];

    if (!data.length) {
      return (
        <Card isHoverable>
          <CardTitle>Item Sales Trends</CardTitle>
          <CardBody>Loading data...</CardBody>
        </Card>
      );
    }

    const CursorVoronoiContainer = createContainer("cursor", "voronoi");

    return (
      <Card isHoverable>
        <CardTitle>Item Sales Trends</CardTitle>
        <CardBody>
          <Chart
            ariaDesc="Displays item sales trends over the last 7 days"
            ariaTitle="Item Sales Trends Chart"
            containerComponent={
              <CursorVoronoiContainer
                cursorDimension="x"
                labels={({ datum }) => `${datum.item}: ${datum.salesTotal}`}
                mouseFollowTooltips
                voronoiDimension="x"
                voronoiPadding={50}
              />
            }
            legendData={data.map(i => ({ name: i.item }))}
            legendPosition="bottom-left"
            legendAllowWrap={true}
            legendComponent={<ChartLegend style={{ labels: { fontSize: 10 } }} />}
            height={230}
            padding={{
              bottom: 75, // To accommodate legend
              left: 50,
              right: 40,
              top: 0
            }}
            themeColor={ChartThemeColor.multiOrdered}
            width={600}
          >
            <ChartAxis
              tickFormat={dateStr => {
                // dateStr is string, parse and format as YYYY-MM-DD
                const d = new Date(dateStr);
                return d.toISOString().slice(0, 10);
              }}
            />
            <ChartAxis dependentAxis showGrid />
            <ChartStack>
              {data.map((value, index) => (
                <ChartArea
                  key={`${value.item}-${index}`}
                  data={value.productItemSales}
                  x="date"
                  y="salesTotal"
                  interpolation="monotoneX"
                  name={value.item}
                />
              ))}
            </ChartStack>
          </Chart>
        </CardBody>
      </Card>
    );
  }
}