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
   
export class WebItem extends React.Component {
  constructor(props) {
    super(props);
  }
    public render() {
      return (
        <DataListItem key="Web" id="Web">
        <DataListItemRow>
          <DataListItemCells
            dataListCells={[
              <DataListCell key="primary content">
                <Flex direction={{ default: 'column' }}>
                  <FlexItem>
                  <Title headingLevel="h3" size="xl">Web</Title>
                    <small>
                      <div>the web front end (no way you saw that coming)</div>
                      <a>https://github.com/quarkusdroneshop/quarkusdroneshop-web</a>
                    </small>
                  </FlexItem>
                  <Flex>
                    <FlexItem>Updated 2 days ago</FlexItem>
                  </Flex>
                </Flex>
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
      )
    }
  }
