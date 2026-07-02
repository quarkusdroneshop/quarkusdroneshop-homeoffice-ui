import React from 'react';

import {
    Card,
    CardBody,
    CardTitle,
   } from '@patternfly/react-core';

import {
    Chart,
    ChartAxis,
    ChartBar,
    ChartStack,
    ChartVoronoiContainer,
    ChartThemeColor,
    ChartLegend,
    } from '@patternfly/react-charts';

import CaretDownIcon from '@patternfly/react-icons/dist/js/icons/caret-down-icon';

import { gql, useQuery } from '@apollo/client';
import client from 'src/apolloclient'

interface StoreSalesChartState { data: any[]; chartData: any[][]; productLegend: any[]; products: string[] }
export class StoreSalesChart extends React.Component<Record<string, never>, StoreSalesChartState> {
    intervalId: ReturnType<typeof setInterval> | undefined = undefined;

    constructor(props) {
      super(props);
      this.state = {
        data: [],
        chartData: [],
        productLegend: [],
        products: []
      };
  
      this.loadGraphqlData = this.loadGraphqlData.bind(this);
    }
  
    componentDidMount() {
      this.loadGraphqlData();
      this.intervalId = setInterval(this.loadGraphqlData, 3000);
    }
  
    componentWillUnmount() {
      clearInterval(this.intervalId);
    }
  
    loadGraphqlData() {
      const endingDate = new Date();
      const endDateString = endingDate.toISOString().slice(0, 10);
  
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);
      const startDateString = startDate.toISOString().slice(0, 10);
  
      const GET_STORESALES = gql`
        query StoreSales($startDate: String!, $endDate: String!) {
          storeServerSalesByDate(startDate: $startDate, endDate: $endDate) {
            server
            store
            itemSales {
            item
            salesTotal
            revenue
            }
          }
        }
      `;
  
      client.query({
        query: GET_STORESALES,
        variables: { startDate: startDateString, endDate: endDateString },
      })
      .then(response => {
        console.log('GraphQL response:', response.data);
        this.ProcessGraphqlData(response.data.storeServerSalesByDate);
      })
      .catch(err => {
        console.error('Failed to load sales data:', err);
      });
    }
  
    ProcessGraphqlData(data) {
      const flatten = arr => arr.flat();
    
      const stores: string[] = Array.from(new Set(data.map((item: any) => item.store as string)));
      const allItemSales: any[] = flatten(data.map((server: any) => server.itemSales));

      const products: string[] = Array.from(new Set(allItemSales.map((i: any) => i.item as string))).sort();
      const productLegend = products.map(product => ({ name: product }));
      const chartData: { name: string; x: string; y: number; revenue: number }[][] = Array.from({ length: products.length }, () => []);
    
      stores.forEach(store => {
        const storeRecords = data.filter(i => i.store === store);
        const storeItemSales = flatten(storeRecords.map(server => server.itemSales));
    
        for (let index = 0; index < products.length; index++) {
          const product = products[index];
          const itemSales = storeItemSales
            .filter(i => i.item === product)
            .reduce((prev, curr) => prev + curr.salesTotal, 0);
          const itemRevenue = storeItemSales
            .filter(i => i.item === product)
            .reduce((prev, curr) => prev + curr.revenue, 0);
    
          chartData[index].push({ name: product, x: store, y: itemSales, revenue: itemRevenue });
        }
      });
    
      this.setState({
        products,
        productLegend,
        chartData
      });
    }
  
    render() {
      const products = this.state.products || [];
      const chartData = this.state.chartData || [];
      const productLegend = this.state.productLegend || [];
  
      return (
        <Card style={{ width: '100%', minWidth: '480px' }}>
          <CardTitle>Store Sales</CardTitle>
          <CardBody>
            <Chart
              ariaDesc="Store Sales"
              ariaTitle="Store Sales"
              containerComponent={
                <ChartVoronoiContainer
                  labels={({ datum }) => `${datum.name}: ${datum.y}`}
                  constrainToVisibleArea
                  disable
                />
              }
              themeColor={ChartThemeColor.multiOrdered}
              domainPadding={{ x: [30, 25] }}
              legendData={productLegend}
              legendOrientation="vertical"
              legendPosition="right"
              legendComponent={<ChartLegend style={{ labels: { fontSize: 12, fontFamily: "'Red Hat Text', RedHatText, Arial, sans-serif" } }} />}
              height={250}
              padding={{ bottom: 50, left: 75, right: 200, top: 0 }}
              width={500}
            >
              <ChartAxis />
              <ChartAxis dependentAxis showGrid />
              <ChartStack>
                {chartData.map((value, index) => (
                  <ChartBar key={index} data={value} />
                ))}
              </ChartStack>
            </Chart>
          </CardBody>
        </Card>
      );
    }
  }