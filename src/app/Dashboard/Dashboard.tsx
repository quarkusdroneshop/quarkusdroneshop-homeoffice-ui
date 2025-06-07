import * as React from 'react';
import {
  PageSection,
  PageSectionVariants,
  Text,
  TextContent,
  Divider,
  Stack,
  StackItem,
  LabelGroup,
  Label,
  Flex,
  FlexItem,
  Level,
  LevelItem
} from '@patternfly/react-core';

import {
  CheckCircleIcon
} from '@patternfly/react-icons';

import { ItemSalesChart } from './ItemSalesChart';
import { ItemSalesTrendsChart } from './ItemSalesTrendsChart';
import { StoreSalesChart } from './StoreSalesChart';
import { AverageOrderTimeChart } from './AverageOrderTimeChart';
import { MockerSwitch } from './MockerSwitch';

export class Dashboard extends React.Component {
  render() {
    return (
      <React.Fragment>
        {/* ヘッダーセクション */}
        <PageSection variant={PageSectionVariants.light}>
          <Level hasGutter>
            <LevelItem>
              <TextContent>
                <Text component="h1">Dashboard</Text>
              </TextContent>
            </LevelItem>

            <LevelItem>
              <LabelGroup categoryName="Key Metrics">
                <Label icon={<CheckCircleIcon />} color="green">OrderUp</Label>
                <Label icon={<CheckCircleIcon />} color="green">Sales</Label>
                <Label icon={<CheckCircleIcon />} color="green">Inventory</Label>
              </LabelGroup>
            </LevelItem>

            <LevelItem>
              <MockerSwitch />
            </LevelItem>
          </Level>
        </PageSection>

        <Divider component="div" />

        {/* 売上・注文時間チャート */}
        <PageSection variant={PageSectionVariants.default}>
          <Flex gap={{ default: 'gapLg' }} wrap={{ default: 'wrap' }}>
            <FlexItem>
              <StoreSalesChart />
            </FlexItem>

            <FlexItem>
              <AverageOrderTimeChart />
            </FlexItem>
          </Flex>
        </PageSection>

        <Divider component="div" />

        {/* 商品チャート */}
        <PageSection variant={PageSectionVariants.default}>
          <Flex gap={{ default: 'gapLg' }} wrap={{ default: 'wrap' }}>
            <FlexItem>
              <ItemSalesChart />
            </FlexItem>

            <FlexItem>
              <ItemSalesTrendsChart />
            </FlexItem>
          </Flex>
        </PageSection>
      </React.Fragment>
    );
  }
}