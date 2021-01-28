import React from 'react';

import {
    Card,
    CardBody,
    CardTitle,

   } from '@patternfly/react-core';

   import {  
    ChartThemeColor,  
    ChartDonut, 
    ChartLegend
} from '@patternfly/react-charts';

import { gql, useQuery } from '@apollo/client';
import client from 'src/apolloclient'

export class ItemSalesChart extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            data: []
          };
        
        this.loadGraphqlData = this.loadGraphqlData.bind(this);

        setInterval(this.loadGraphqlData, 5 * 1000);
        this.loadGraphqlData();

    }

    loadGraphqlData(){
        const endingDate = new Date();
        endingDate.setDate(endingDate.getDate());
        const endDateString = endingDate.toISOString().slice(0,10);

        endingDate.setDate(endingDate.getDate() - 6);
        const startDateString = endingDate.toISOString().slice(0,10);
        

        const GET_ITEM_SALES = gql`
        query itemSalesTotalsByDate($startDate: String!, $endDate: String!){
          itemSalesTotalsByDate (startDate: $startDate, endDate: $endDate) {
              item,
              revenue,
              salesTotal    
          }
        }
        `;

        //console.log("Making GraphQL Request")
        client.query({ 
            query: GET_ITEM_SALES , 
            variables: {startDate: startDateString, endDate: endDateString}
          })
          .then(response => {
              this.setState({data:response.data.itemSalesTotalsByDate})
          }
        )
    }

    componentDidMount() {

    }

    
    render() {
        //get data from state
        const data = this.state.data;
        let totalSales = 0;
        if (data !== undefined && data.length > 0){
            totalSales = data.reduce((a, b) => a + (b["salesTotal"] || 0), 0);
        }

        const BasicRightAlignedLegend = (
            <Card isHoverable>
                    <CardTitle>Item Sales Totals</CardTitle>
                    <CardBody>
                        <div style={{  width: '350px'}}>
                            <ChartDonut
                            ariaTitle="Relative Item Sales"
                            data={data}
                            x={"item"}
                            y={"salesTotal"}
                            labels={({ datum }) => `${datum.item}: ${datum.salesTotal}`}
                            legendData={data.map(i => {
                                return {name: i.item}
                            })}
                            legendOrientation="vertical"
                            legendPosition="right"
                            legendComponent={
                                <ChartLegend style={{labels: {fontSize: 12}}}/>
                              }
                            padding={{
                                bottom: 0,
                                left: 5,
                                right: 150, // Adjusted to accommodate legend
                                top: 0
                            }}
                            subTitle="Last 7 Days"
                            title={totalSales}
                            themeColor={ChartThemeColor.multiOrdered}
                            width={350}
                            />
                        </div>
                    </CardBody>
                </Card>

        ) 
        return BasicRightAlignedLegend;
    }
}