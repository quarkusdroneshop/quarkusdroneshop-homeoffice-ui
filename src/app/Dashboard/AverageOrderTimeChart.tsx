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

import { 

    ChartBullet
    } from '@patternfly/react-charts';

import CaretDownIcon from '@patternfly/react-icons/dist/js/icons/caret-down-icon';

import { gql, useQuery } from '@apollo/client';
import client from 'src/apolloclient'

export class AverageOrderTimeChart extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            averageOrderUpTime: 60
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
        

        const GET_AVERAGE_ORDER_TIME = gql`
        query AverageOrderUpTime($startDate: String!, $endDate: String!){
          averageOrderUpTime (startDate: $startDate, endDate: $endDate)
        }
        `;

        //console.log("Making GraphQL Request")
        client.query({ 
            query: GET_AVERAGE_ORDER_TIME , 
            variables: {startDate: startDateString, endDate: endDateString}
          })
          .then(response => {
              //console.log("Processing GraphQL Response")
              this.setState({averageOrderUpTime:response.data.averageOrderUpTime})
          }
        )
    }

    componentDidMount() {

    }

    
    render() {
        //get data from state
        const averageOrderUpTime = this.state.averageOrderUpTime;

        const BasicRightAlignedLegend = (
            <Card isHoverable>
                <CardTitle>Average OrderUp Time: {parseInt(averageOrderUpTime / 60)} minutes {averageOrderUpTime % 60} seconds</CardTitle>
                <CardBody>
                    <div style={{ height: '172px', width: '500px' }}>
                        <ChartBullet
                        ariaDesc="Storage capacity"
                        ariaTitle="Average OrderUp Time"
                        comparativeWarningMeasureData={[{ name: 'Warning', y: 200 }]}
                        comparativeErrorMeasureData={[{name: 'Terrible', y: 300}]}
                        constrainToVisibleArea
                        height={172}
                        labels={({ datum }) => `${datum.name}: ${datum.y}`}
                        maxDomain={{y: 360}}
                        primarySegmentedMeasureData={[{ name: 'Measure', y: averageOrderUpTime }]}
                        qualitativeRangeData={[{ name: 'Range', y: ((parseInt(averageOrderUpTime/60)-1)*60) }, { name: 'Range', y: ((parseInt(averageOrderUpTime/60)+1)*60) }]}
                        width={500}
                        />
                </div>
                <DataList aria-label="Objectives" isCompact="true">
                    <DataListItem aria-labelledby="simple-item1">
                    <DataListItemRow>
                        <DataListItemCells
                        dataListCells={[
                            <DataListCell key="primary content">
                            <span id="simple-item1">Excellent is under {((parseInt(averageOrderUpTime/60)-1))} minutes</span>
                            </DataListCell>,
                            <DataListCell key="secondary content">Objective is under {parseInt(averageOrderUpTime / 60) + 1} minutes</DataListCell>
                        ]}
                        />
                    </DataListItemRow>
                    </DataListItem>
                </DataList>
                </CardBody>
            </Card>

        ) 
        return BasicRightAlignedLegend;
    }
}