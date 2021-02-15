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
    } from '@patternfly/react-charts';

import CaretDownIcon from '@patternfly/react-icons/dist/js/icons/caret-down-icon';

import { gql, useQuery } from '@apollo/client';
import client from 'src/apolloclient'

export class StoreSalesChart extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            data: [],
            chartData: [],
            productLegend: []
          };

          this.loadGraphqlData = this.loadGraphqlData.bind(this);

          setInterval(this.loadGraphqlData, 3 * 1000);
          this.loadGraphqlData();

    }

    loadGraphqlData(){
        const endingDate = new Date();
        endingDate.setDate(endingDate.getDate());
        const endDateString = endingDate.toISOString().slice(0,10);

        endingDate.setDate(endingDate.getDate() - 6);
        const startDateString = endingDate.toISOString().slice(0,10);
        

        const GET_STORESALES = gql`
        query StoreSales($startDate: String!, $endDate: String!){
            storeServerSalesByDate (startDate: $startDate, endDate: $endDate) {
            server
            store,
            sales{
                item,
                salesTotal,
                revenue
            }
            }
        }
        `;

        //console.log("Making GraphQL Request")
        client.query({ 
            query: GET_STORESALES , 
            variables: {startDate: startDateString, endDate: endDateString},
          })
          .then(response => {
              this.ProcessGraphqlData(response.data.storeServerSalesByDate)
          }
        )
    }

    ProcessGraphqlData(data){

        function flatten(arr) {
            return [].concat(...arr)
        }
            
        const stores = Array.from(new Set(data.map(item => item.store)))

        const allItemSales = flatten(data.map(server => server.sales));

        //calculate a unique list of products
        const products = Array.from(new Set(allItemSales.map(i => i.item))).sort();

        const productLegend = new Array();
        products.forEach(product => {
            productLegend.push({name: product})
        });

        //initialize a 2 dimensional array for product sales [product, [store sales, store sales]]
        const chartData = Array.from(Array(products.length), () => new Array())
        
        stores.forEach( function(store){
            const storeRecords = data.filter(i => i.store == store);

            //get a flat list of all sales for store
            const storeItemSales = flatten(storeRecords.map(server => server.sales));
            
            //sum the product information for each store
            for (let index = 0; index < products.length; index++) {
                const product = products[index];
                    //sum the sales and revenue
                    const itemSales = storeItemSales.filter(i => i.item == product).reduce((prev, curr) => prev + curr.salesTotal, 0);
                    const itemRevenue = storeItemSales.filter(i => i.item == product).reduce((prev, curr) => prev + curr.revenue, 0);

                    //add it to the chart data set
                    chartData[index].push({name: product, x: store, y: itemSales, revenue: itemRevenue});            
                
            }

        });
        this.setState({products:products});
        this.setState({productLegend:productLegend})
        this.setState({chartData:chartData});
    }

    componentDidMount() {

    }

    
    render() {
        //get data from state
        const products = this.state.products;
        const chartData = this.state.chartData;
        const productLegend = this.state.productLegend;

        const BasicRightAlignedLegend = (
                    <Card style={{ height: '300px', width: '500px' }}>
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
                                />}

                                    themeColor={ChartThemeColor.multiOrdered}
                                    domainPadding={{ x: [30, 25] }}
                                    legendData={productLegend}
                                    legendOrientation="vertical"
                                    legendPosition="right"
                                    height={250}
                                    padding={{
                                        bottom: 50,
                                        left: 75,
                                        right: 200, // Adjusted to accommodate legend
                                        top: 0
                                        }}
                                    width={500}
                                >
                                <ChartAxis />
                                <ChartAxis dependentAxis showGrid />
                                <ChartStack>
                                    {chartData.map((value, index) => {
                                        return <ChartBar key={index} data={value} />
                                    })}

                                </ChartStack>
                            </Chart>
                        </CardBody>
                    </Card>
        ) 
        return BasicRightAlignedLegend;
    }
}