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
  CheckCircleIcon,
  MinusCircleIcon,
} from '@patternfly/react-icons';

import { ItemSalesChart } from './ItemSalesChart';
import { ItemSalesTrendsChart } from './ItemSalesTrendsChart';
import { StoreSalesChart } from './StoreSalesChart';
import { AverageOrderTimeChart } from './AverageOrderTimeChart';
import { MockerSwitch } from './MockerSwitch';
import { InventoryAlert } from './InventoryAlert';
import { SettingsContext, VisibleSections } from '../utils/SettingsContext';

export class Dashboard extends React.Component {
  static contextType = SettingsContext;
  context!: React.ContextType<typeof SettingsContext>;

  render() {
    const { settings, toggleSection } = this.context;
    const { visibleSections } = settings;

    const sectionLabel = (
      key: keyof VisibleSections,
      display: string
    ) => {
      const on = visibleSections[key];
      return (
        <Label
          icon={on ? <CheckCircleIcon /> : <MinusCircleIcon />}
          color={on ? 'green' : 'grey'}
          onClick={() => toggleSection(key)}
          style={{ cursor: 'pointer' }}
        >
          {display}
        </Label>
      );
    };

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
              <LabelGroup categoryName="表示切替">
                {sectionLabel('orderUp', 'OrderUp')}
                {sectionLabel('sales', 'Sales')}
                {sectionLabel('inventory', 'Inventory')}
              </LabelGroup>
            </LevelItem>

            <LevelItem>
              <MockerSwitch />
            </LevelItem>
          </Level>
        </PageSection>

        <Divider component="div" />

        {/* 在庫枯渇アラート */}
        {visibleSections.inventory && (
          <PageSection variant={PageSectionVariants.default} padding={{ default: 'noPadding' }}>
            <div style={{ padding: '16px 24px 0' }}>
              <InventoryAlert />
            </div>
          </PageSection>
        )}

        {/* 注文時間・売上チャート */}
        {visibleSections.orderUp && (
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
        )}

        {visibleSections.orderUp && <Divider component="div" />}

        {/* 商品チャート */}
        {visibleSections.sales && (
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
        )}
      </React.Fragment>
    );
  }
}
