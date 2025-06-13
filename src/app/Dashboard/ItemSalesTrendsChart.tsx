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

import { gql, useQuery } from '@apollo/client';
import client from 'src/apolloclient'

export class ItemSalesTrendsChart extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
          data: []
        };

        this.loadGraphqlData = this.loadGraphqlData.bind(this);

        setInterval(this.loadGraphqlData, 3 * 1000);
        this.loadGraphqlData();
        
      }

      loadGraphqlData(){
        const endingDate = new Date();

        endingDate.setDate(endingDate.getDate() - 1);
        const endDateString = endingDate.toISOString().slice(0,10);

        endingDate.setDate(endingDate.getDate() - 6);
        const startDateString = endingDate.toISOString().slice(0,10);
        

        const GET_PRODUCT_SALES = gql`
        query productSalesByDate($startDate: String!, $endDate: String!){
          productSalesByDate (startDate: $startDate, endDate: $endDate) {
            item
            productItemSales {
              item
              saleDate
              salesTotal
            }
          }
        }
        `;

        //console.log("Making GraphQL Request")
        client.query({ 
            query: GET_PRODUCT_SALES , 
            variables: {startDate: startDateString, endDate: endDateString}
          })
          .then(response => {
            const rawData = response.data?.productSalesByDate || [];
          
            const converted = rawData.map(item => ({
              ...item,
              productItemSales: item.productItemSales.map(sale => ({
                ...sale,
                saleDate: new Date(sale.saleDate) 
              }))
            }));
          
            this.setState({ data: converted });
          })
        }

      render() {
        const data = this.state.data;

        const CursorVoronoiContainer = createContainer("cursor", "voronoi");
        
        return (
                    <Card isHoverable>
                    <CardTitle>Item Sales Trends</CardTitle>
                        <CardBody>
                            <Chart
                                ariaDesc="Item Sales"
                                ariaTitle="Item Sales Chart"
                                containerComponent={
                                <CursorVoronoiContainer
                                    cursorDimension="x"
                                    labels={({ datum }) => `${datum.item}: ${datum.salesTotal}`}
                                    mouseFollowTooltips
                                    voronoiDimension="x"
                                    voronoiPadding={50}
                                />
                                }
                                legendData={data.map(i => {
                                  return {name: i.item}
                                })}
                                legendPosition="bottom-left"
                                legendAllowWrap={true}
                                legendComponent={
                                  <ChartLegend style={{labels: {fontSize: 10}}}/>
                                }
                                height={230}
                                padding={{
                                bottom: 75, // Adjusted to accomodate legend
                                left: 50,
                                right: 40,
                                top: 0,
                                }}
                                //maxDomain={{y: 50}}
                                themeColor={ChartThemeColor.multiOrdered}
                                width={600}
                              >
                                <ChartAxis
                                  tickFormat={(date) =>
                                    new Date(date).toLocaleDateString('ja-JP', {
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  }
                                />
                                <ChartStack>
                                  {data
                                    .filter(d => d.productItemSales.length > 0)
                                    .map((value, index) => (
                                      <ChartArea
                                        key={`${value.item}-${index}`}
                                        data={value.productItemSales}
                                        x="saleDate"
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