import * as React from 'react';
import {
  PageSection,
  PageSectionVariants,
  Title,
  Button,
  ButtonVariant,
  Divider,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Flex,
  FlexItem,
  Progress,
  DataList,
  DataListItem,
  DataListItemRow,
  DataListItemCells,
  DataListCell,
  DataListAction,
  Stack,
  StackItem,
  Text,
  TextContent,
 } from '@patternfly/react-core';
 
 import { 
  ChartDonutUtilization,
  ChartGroup,
  ChartArea,
  ChartVoronoiContainer,
  ChartAxis,
 } from '@patternfly/react-charts';


import BellIcon from '@patternfly/react-icons/dist/js/icons/bell-icon';
import CodeBranchIcon from '@patternfly/react-icons/dist/js/icons/code-branch-icon';
import CodeIcon from '@patternfly/react-icons/dist/js/icons/code-icon';
import CogIcon from '@patternfly/react-icons/dist/js/icons/cog-icon';
import CubeIcon from '@patternfly/react-icons/dist/js/icons/cube-icon';
import CheckCircleIcon from '@patternfly/react-icons/dist/js/icons/check-circle-icon';
import ExclamationTriangleIcon from '@patternfly/react-icons/dist/js/icons/exclamation-triangle-icon';
import FilterIcon from '@patternfly/react-icons/dist/js/icons/filter-icon';
import SearchIcon from '@patternfly/react-icons/dist/js/icons/search-icon';
import TimesCircleIcon from '@patternfly/react-icons/dist/js/icons/times-circle-icon';
import droneIcon from '../images/drone-16x16.png';

import { WebItem } from './Web/WebItem';

export class SystemComponents extends React.Component{
  constructor(props) {
    super(props);
    
    this.state = {
      isDrawerExpanded: false,
      drawerPanelBodyContent: '',
      isDropdownOpen: false,
      activeItem: 0,
      inputValue: '',
      statusIsExpanded: false,
      statusSelected: null,
      selectedDataListItemId: '',
      droneRemaining: 75,
      foodRemaining: 50
    };

    this.onSelectDataListItem = id => {
      this.setState({
        selectedDataListItemId: id,
        isDrawerExpanded: true,
        drawerPanelBodyContent: id
      });
    };

    this.onCloseDrawerClick = () => {
      this.setState({
        isDrawerExpanded: false,
        selectedDataListItemId: ''
      });
    };

  }

  
  render(){
    const {
      isDrawerExpanded,
      drawerPanelBodyContent,
      isDropdownOpen,
      activeItem,
      inputValue,
      statusIsExpanded,
      statusSelected,
      selectedDataListItemId,
      droneRemaining,
      foodRemaining
    } = this.state;

    const panelContent = (
      <DrawerPanelContent>
        <DrawerHead>
          <Title headingLevel="h2" size="xl">
            {drawerPanelBodyContent} Details
          </Title>
          <DrawerActions>
            <DrawerCloseButton onClick={this.onCloseDrawerClick} />
          </DrawerActions>
        </DrawerHead>
        <DrawerPanelBody>
          <Flex spaceItems={{ default: 'spaceItemsLg' }} direction={{ default: 'column' }}>
            <FlexItem>
              <p>
                The content of the drawer really is up to you. It could have form fields, definition lists, text lists,
                labels, charts, progress bars, etc. Spacing recommendation is 24px margins. You can put tabs in here,
                and can also make the drawer scrollable.
              </p>
            </FlexItem>
            <FlexItem>
              <Progress value={drawerPanelBodyContent * 10} title="Title" />
            </FlexItem>
            <FlexItem>
              <Progress value={drawerPanelBodyContent * 5} title="Title" />
            </FlexItem>
          </Flex>
        </DrawerPanelBody>
      </DrawerPanelContent>
    );
    const drawerContent = (
      <React.Fragment>
        <DataList
          aria-label="data list"
          selectedDataListItemId={selectedDataListItemId}
          onSelectDataListItem={this.onSelectDataListItem}
        >
          <WebItem />
          <DataListItem key="Counter" id="Counter">
            <DataListItemRow>
              <DataListItemCells
                dataListCells={[
                  <DataListCell key="primary content">
                    <Flex direction={{ default: 'column' }}>
                      <FlexItem>
                      <Title headingLevel="h3" size="xl">Counter</Title>
                        <small>
                          <div>coordinates events in the system</div>
                          <a>https://github.com/quarkusdroneshop/quarkusdroneshop-counter</a>
                        </small>
                      </FlexItem>
                      <Flex>
                        <FlexItem>
                          <CodeBranchIcon /> 10
                        </FlexItem>
                        <FlexItem>
                          <CodeIcon /> 4
                        </FlexItem>
                        <FlexItem>
                          <CubeIcon /> 5
                        </FlexItem>
                        <FlexItem>Updated 2 days ago</FlexItem>
                      </Flex>
                    </Flex>
                  </DataListCell>,
                  <DataListCell key="counter transaction graph">
                    <div style={{height: '100px', marginTop: '5px' }}>
                        <div style={{ height: '100px', width: '250px' }}>
                          <ChartGroup
                            ariaDesc="Transactions per hour"
                            ariaTitle="Transactions per hour"
                            padding={0}
                            height={100}
                            width={250}
                            containerComponent={<ChartVoronoiContainer constrainToVisibleArea />}
                          >
                            <ChartArea
                              data={[
                                { name: 'Transactions', x: new Date().getHours()-4, y: 3 },
                                { name: 'Transactions', x: new Date().getHours()-3, y: 4 },
                                { name: 'Transactions', x: new Date().getHours()-2, y: 8 },
                                { name: 'Transactions', x: new Date().getHours()-1, y: 6 },
                                { name: 'Transactions', x: new Date().getHours(), y: 7 }
                              ]}
                            />
                          </ChartGroup>
                        </div>
                        <Text>Transactions Per Hour</Text>
                      </div>                    
                  </DataListCell>,
                  <DataListAction alignright="true">
                    <Stack>
                      <StackItem>
                        <Button variant={ButtonVariant.secondary}>Detail</Button>
                      </StackItem>
                    </Stack>
                  </DataListAction>
                ]}
              />
            </DataListItemRow>
          </DataListItem>
          <DataListItem key="QDCA10" id="QDCA10">
            <DataListItemRow>
              <DataListItemCells
                dataListCells={[
                  <DataListCell key="primary content">
                    <Flex direction={{ default: 'column' }}>
                      <FlexItem>
                      <Title headingLevel="h3" size="xl">QDCA10</Title>
                        <small>
                          <div>makes drinks</div>
                          <a>https://github.com/quarkusdroneshop/quarkusdroneshop-qdca10</a>
                        </small>
                      </FlexItem>
                      <Flex>
                        <FlexItem>
                          <CodeBranchIcon /> 10
                        </FlexItem>
                        <FlexItem>
                          <CodeIcon /> 4
                        </FlexItem>
                        <FlexItem>
                          <CubeIcon /> 5
                        </FlexItem>
                        <FlexItem>Updated 2 days ago</FlexItem>
                      </Flex>
                    </Flex>
                  </DataListCell>,
                  <DataListCell key="QDCA10 inventory graph">
                    <div style={{ height: '140px', width: '140px' }}>
                      <ChartDonutUtilization
                        ariaDesc="Coffee Remaining"
                        ariaTitle="Coffee Remaining"
                        constrainToVisibleArea={true}
                        data={{ x: 'Coffee Remaining', y: droneRemaining }}
                        invert
                        height={140}
                        subTitle="remaining"
                        title={`${droneRemaining}%`}
                        thresholds={[{ value: 30 }, { value: 20 }]}
                        width={140}
                      />
                    </div>
                </DataListCell>,                  
                  <DataListAction alignright="true">
                    <Stack>
                      <StackItem>
                        <Button variant={ButtonVariant.secondary}>Detail</Button>
                      </StackItem>
                    </Stack>
                  </DataListAction>
                ]}
              />
            </DataListItemRow>
          </DataListItem>
          <DataListItem key="QDCA10Pro" id="QDCA10Pro">
            <DataListItemRow>
              <DataListItemCells
                dataListCells={[
                  <DataListCell key="primary content">
                    <Flex direction={{ default: 'column' }}>
                      <FlexItem>
                      <Title headingLevel="h3" size="xl">QDCA10Pro</Title>
                        <small>
                          <div>makes food</div>
                          <a>https://github.com/quarkusdroneshop/quarkusdroneshop-qdca10pro</a>
                        </small>
                      </FlexItem>
                      <Flex>
                        <FlexItem>
                          <CodeBranchIcon /> 10
                        </FlexItem>
                        <FlexItem>
                          <CodeIcon /> 4
                        </FlexItem>
                        <FlexItem>
                          <CubeIcon /> 5
                        </FlexItem>
                        <FlexItem>
                          <CheckCircleIcon /> 7
                        </FlexItem>
                        <FlexItem>
                          <ExclamationTriangleIcon /> 5
                        </FlexItem>
                        <FlexItem>
                          <TimesCircleIcon /> 5
                        </FlexItem>
                        <FlexItem>Updated 2 days ago</FlexItem>
                      </Flex>
                    </Flex>
                  </DataListCell>,
                  <DataListCell key="QDCA10Pro inventory graph">
                  <div style={{ height: '140px', width: '140px'}}>
                    <ChartDonutUtilization
                      ariaDesc="Food Remaining"
                      ariaTitle="Food Remaining"
                      constrainToVisibleArea={true}
                      data={{ x: 'Food Remaining', y: foodRemaining }}
                      invert
                      height={140}
                      subTitle="remaining"
                      title={`${foodRemaining}%`}
                      thresholds={[{ value: 50 }, { value: 25 }]}
                      width={140}
                    />
                  </div>
                  </DataListCell>,
                  <DataListAction alignright="true">
                    <Stack>
                      <StackItem>
                        <Button variant={ButtonVariant.secondary}>Detail</Button>
                      </StackItem>
                    </Stack>
                  </DataListAction>
                ]}
              />
            </DataListItemRow>
          </DataListItem>
          <DataListItem key="Inventory" id="Inventory">
            <DataListItemRow>
              <DataListItemCells
                dataListCells={[
                  <DataListCell key="primary content">
                    <Flex direction={{ default: 'column' }}>
                      <FlexItem>
                      <Title headingLevel="h3" size="xl">Inventory</Title>
                        <small>
                          <div>stores and restocks the inventory for the QDCA10 and QDCA10Pro microservices</div>
                          <a>https://github.com/quarkusdroneshop/quarkusdroneshop-inventory</a>
                        </small>
                      </FlexItem>
                      <Flex>
                        <FlexItem>
                        <img alt="drone" src={droneIcon} /> 10
                        </FlexItem>
                        <FlexItem>
                          <CodeIcon /> 4
                        </FlexItem>
                        <FlexItem>
                          <CubeIcon /> 5
                        </FlexItem>
                        <FlexItem>
                          <CheckCircleIcon /> 7
                        </FlexItem>
                        <FlexItem>
                          <ExclamationTriangleIcon /> 5
                        </FlexItem>
                        <FlexItem>
                          <TimesCircleIcon /> 5
                        </FlexItem>
                        <FlexItem>Updated 2 days ago</FlexItem>
                      </Flex>
                    </Flex>
                  </DataListCell>,
                  <DataListAction alignright="true">
                    <Stack>
                      <StackItem>
                        <Button variant={ButtonVariant.secondary}>Detail</Button>
                      </StackItem>
                      <StackItem>
                        <Button variant={ButtonVariant.secondary}>Re-Stock</Button>
                      </StackItem>
                    </Stack>
                  </DataListAction>
                ]}
              />
            </DataListItemRow>
          </DataListItem>
        </DataList>
      </React.Fragment>
    );


    return (
          <React.Fragment>
            <PageSection variant={PageSectionVariants.light}>
              <TextContent>
                <Text component="h1">Home Office</Text>
                <Text component="p">
                  Here is the status of each part of the system
                </Text>
              </TextContent>
            </PageSection>
            <Divider component="div" />
            <PageSection variant={PageSectionVariants.light} padding={{ default: 'noPadding' }}>
              <Drawer isExpanded={isDrawerExpanded} isInline>
                <DrawerContent panelContent={panelContent}>
                  <DrawerContentBody>{drawerContent}</DrawerContentBody>
                </DrawerContent>
              </Drawer>
            </PageSection>
        </React.Fragment>     
    );
  }

}