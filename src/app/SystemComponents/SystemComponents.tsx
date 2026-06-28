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
  Spinner,
  Label,
 } from '@patternfly/react-core';

 import {
  ChartDonutUtilization,
  ChartGroup,
  ChartArea,
  ChartVoronoiContainer,
 } from '@patternfly/react-charts';

import CodeBranchIcon from '@patternfly/react-icons/dist/js/icons/code-branch-icon';
import CubeIcon from '@patternfly/react-icons/dist/js/icons/cube-icon';
import CheckCircleIcon from '@patternfly/react-icons/dist/js/icons/check-circle-icon';
import ExclamationTriangleIcon from '@patternfly/react-icons/dist/js/icons/exclamation-triangle-icon';
import { gql } from '@apollo/client';
import client from 'src/apolloclient';

import { WebItem } from './Web/WebItem';

const GET_INVENTORY = gql`
  query InventoryLevels {
    inventoryLevels {
      itemName
      remaining
      capacity
    }
  }
`;

interface InventoryLevel {
  itemName: string;
  remaining: number;
  capacity: number;
}

interface GitHubRepo {
  pushedAt: string;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
}

interface ComponentMeta extends GitHubRepo {
  loading: boolean;
}

interface State {
  isDrawerExpanded: boolean;
  drawerTitle: string;
  drawerContent: React.ReactNode;
  selectedDataListItemId: string;
  inventory: InventoryLevel[];
  inventoryLoading: boolean;
  github: Record<string, ComponentMeta>;
}

const REPOS: Record<string, string> = {
  Web:       'quarkusdroneshop/quarkusdroneshop-web',
  Counter:   'quarkusdroneshop/quarkusdroneshop-counter',
  QDCA10:    'quarkusdroneshop/quarkusdroneshop-barista',
  QDCA10Pro: 'quarkusdroneshop/quarkusdroneshop-kitchen',
  Inventory: 'quarkusdroneshop/quarkusdroneshop-inventory',
};

function relativeTime(iso: string): string {
  if (!iso) return '不明';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 3600)  return `${Math.floor(diff / 60)} 分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 時間前`;
  return `${Math.floor(diff / 86400)} 日前`;
}

const defaultMeta: ComponentMeta = {
  loading: true,
  pushedAt: '',
  stargazersCount: 0,
  forksCount: 0,
  openIssuesCount: 0,
};

export class SystemComponents extends React.Component<{}, State> {
  private intervalId: number | null = null;

  constructor(props: {}) {
    super(props);
    this.state = {
      isDrawerExpanded: false,
      drawerTitle: '',
      drawerContent: null,
      selectedDataListItemId: '',
      inventory: [],
      inventoryLoading: true,
      github: Object.fromEntries(Object.keys(REPOS).map(k => [k, { ...defaultMeta }])),
    };
    this.onCloseDrawerClick = this.onCloseDrawerClick.bind(this);
  }

  componentDidMount() {
    this.loadInventory();
    this.loadGitHub();
    this.intervalId = window.setInterval(() => this.loadInventory(), 30000);
  }

  componentWillUnmount() {
    if (this.intervalId !== null) clearInterval(this.intervalId);
  }

  loadInventory() {
    client
      .query({ query: GET_INVENTORY, fetchPolicy: 'no-cache' })
      .then(res => {
        const levels: InventoryLevel[] = res?.data?.inventoryLevels ?? [];
        this.setState({ inventory: levels, inventoryLoading: false });
      })
      .catch(() => this.setState({ inventoryLoading: false }));
  }

  loadGitHub() {
    Object.entries(REPOS).forEach(([key, repo]) => {
      fetch(`https://api.github.com/repos/${repo}`)
        .then(r => r.json())
        .then(data => {
          this.setState(prev => ({
            github: {
              ...prev.github,
              [key]: {
                loading: false,
                pushedAt: data.pushed_at ?? '',
                stargazersCount: data.stargazers_count ?? 0,
                forksCount: data.forks_count ?? 0,
                openIssuesCount: data.open_issues_count ?? 0,
              },
            },
          }));
        })
        .catch(() => {
          this.setState(prev => ({
            github: {
              ...prev.github,
              [key]: { ...prev.github[key], loading: false },
            },
          }));
        });
    });
  }

  inventoryPct(category: 'drone' | 'food'): number {
    const { inventory } = this.state;
    const keywords = category === 'drone'
      ? ['DRONE', 'drone', 'Drone']
      : ['FOOD', 'food', 'Food', 'BURGER', 'FRIES', 'MUFFIN'];
    const items = inventory.filter(i =>
      keywords.some(k => i.itemName.toUpperCase().includes(k.toUpperCase()))
    );
    if (items.length === 0) return category === 'drone' ? 75 : 50;
    const total = items.reduce((s, i) => s + i.remaining, 0);
    const cap   = items.reduce((s, i) => s + i.capacity, 0);
    return cap > 0 ? Math.round((total / cap) * 100) : 0;
  }

  openDrawer(id: string, title: string, content: React.ReactNode) {
    this.setState({
      isDrawerExpanded: true,
      drawerTitle: title,
      drawerContent: content,
      selectedDataListItemId: id,
    });
  }

  onCloseDrawerClick() {
    this.setState({ isDrawerExpanded: false, selectedDataListItemId: '' });
  }

  ghBadge(key: string) {
    const g = this.state.github[key];
    if (g.loading) return <Spinner size="sm" />;
    return (
      <Flex>
        <FlexItem><CodeBranchIcon /> {g.forksCount} forks</FlexItem>
        <FlexItem><CubeIcon /> {g.openIssuesCount} issues</FlexItem>
        {g.pushedAt && (
          <FlexItem>
            <CheckCircleIcon color="green" /> 更新: {relativeTime(g.pushedAt)}
          </FlexItem>
        )}
        {!g.pushedAt && (
          <FlexItem>
            <ExclamationTriangleIcon color="orange" /> GitHub 未取得
          </FlexItem>
        )}
      </Flex>
    );
  }

  inventoryDetail(items: InventoryLevel[]) {
    if (items.length === 0) return <Text>在庫データなし</Text>;
    return (
      <DataList aria-label="inventory detail">
        {items.map(i => {
          const pct = i.capacity > 0 ? Math.round((i.remaining / i.capacity) * 100) : 0;
          return (
            <DataListItem key={i.itemName}>
              <DataListItemRow>
                <DataListItemCells dataListCells={[
                  <DataListCell key="name"><strong>{i.itemName}</strong></DataListCell>,
                  <DataListCell key="val">
                    {i.remaining} / {i.capacity}
                    <Label color={pct < 20 ? 'red' : pct < 50 ? 'orange' : 'green'} style={{ marginLeft: 8 }}>
                      {pct}%
                    </Label>
                  </DataListCell>,
                ]} />
              </DataListItemRow>
            </DataListItem>
          );
        })}
      </DataList>
    );
  }

  render() {
    const {
      isDrawerExpanded,
      drawerTitle,
      drawerContent: drawerBody,
      selectedDataListItemId,
      inventory,
      inventoryLoading,
    } = this.state;

    const droneRemaining = this.inventoryPct('drone');
    const foodRemaining  = this.inventoryPct('food');

    const droneItems = inventory.filter(i => ['DRONE','drone','Drone'].some(k => i.itemName.toUpperCase().includes(k.toUpperCase())));
    const foodItems  = inventory.filter(i => ['FOOD','food','BURGER','FRIES','MUFFIN'].some(k => i.itemName.toUpperCase().includes(k.toUpperCase())));

    const panelContent = (
      <DrawerPanelContent minSize="400px">
        <DrawerHead>
          <Title headingLevel="h2" size="xl">{drawerTitle} 詳細</Title>
          <DrawerActions>
            <DrawerCloseButton onClick={this.onCloseDrawerClick} />
          </DrawerActions>
        </DrawerHead>
        <DrawerPanelBody>{drawerBody}</DrawerPanelBody>
      </DrawerPanelContent>
    );

    const drawerContent = (
      <DataList
        aria-label="system components"
        selectedDataListItemId={selectedDataListItemId}
        onSelectDataListItem={id => this.setState({ selectedDataListItemId: id })}
      >
        {/* Web */}
        <WebItem />

        {/* Counter */}
        <DataListItem key="Counter" id="Counter">
          <DataListItemRow>
            <DataListItemCells dataListCells={[
              <DataListCell key="info">
                <Flex direction={{ default: 'column' }}>
                  <FlexItem>
                    <Title headingLevel="h3" size="xl">Counter</Title>
                    <small>
                      <div>システム内のイベントを調整するサービス</div>
                      <a href="https://github.com/quarkusdroneshop/quarkusdroneshop-counter" target="_blank" rel="noreferrer">
                        github.com/quarkusdroneshop/quarkusdroneshop-counter
                      </a>
                    </small>
                  </FlexItem>
                  {this.ghBadge('Counter')}
                </Flex>
              </DataListCell>,
              <DataListCell key="graph">
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
                        { name: 'Transactions', x: new Date().getHours(),   y: 7 },
                      ]}
                    />
                  </ChartGroup>
                  <Text component="small">Transactions Per Hour</Text>
                </div>
              </DataListCell>,
              <DataListAction id="counter-action" aria-label="counter actions" aria-labelledby="Counter">
                <Stack>
                  <StackItem>
                    <Button variant={ButtonVariant.secondary}
                      onClick={() => this.openDrawer('Counter', 'Counter', <Text>GitHub リポジトリ情報は左パネルを参照してください。</Text>)}>
                      Detail
                    </Button>
                  </StackItem>
                </Stack>
              </DataListAction>,
            ]} />
          </DataListItemRow>
        </DataListItem>

        {/* QDCA10 */}
        <DataListItem key="QDCA10" id="QDCA10">
          <DataListItemRow>
            <DataListItemCells dataListCells={[
              <DataListCell key="info">
                <Flex direction={{ default: 'column' }}>
                  <FlexItem>
                    <Title headingLevel="h3" size="xl">QDCA10（バリスタ）</Title>
                    <small>
                      <div>ドローン在庫を管理・ドリンクを準備するサービス</div>
                      <a href="https://github.com/quarkusdroneshop/quarkusdroneshop-barista" target="_blank" rel="noreferrer">
                        github.com/quarkusdroneshop/quarkusdroneshop-barista
                      </a>
                    </small>
                  </FlexItem>
                  {this.ghBadge('QDCA10')}
                </Flex>
              </DataListCell>,
              <DataListCell key="chart">
                {inventoryLoading ? <Spinner size="md" /> : (
                  <div style={{ height: '140px', width: '140px' }}>
                    <ChartDonutUtilization
                      ariaDesc="Drone Remaining"
                      ariaTitle="Drone Remaining"
                      constrainToVisibleArea
                      data={{ x: 'Drone 在庫', y: droneRemaining }}
                      invert
                      height={140}
                      subTitle="remaining"
                      title={`${droneRemaining}%`}
                      thresholds={[{ value: 30 }, { value: 20 }]}
                      width={140}
                    />
                  </div>
                )}
              </DataListCell>,
              <DataListAction id="qdca10-action" aria-label="QDCA10 actions" aria-labelledby="QDCA10">
                <Stack>
                  <StackItem>
                    <Button variant={ButtonVariant.secondary}
                      onClick={() => this.openDrawer('QDCA10', 'QDCA10 在庫詳細', this.inventoryDetail(droneItems))}>
                      Detail
                    </Button>
                  </StackItem>
                </Stack>
              </DataListAction>,
            ]} />
          </DataListItemRow>
        </DataListItem>

        {/* QDCA10Pro */}
        <DataListItem key="QDCA10Pro" id="QDCA10Pro">
          <DataListItemRow>
            <DataListItemCells dataListCells={[
              <DataListCell key="info">
                <Flex direction={{ default: 'column' }}>
                  <FlexItem>
                    <Title headingLevel="h3" size="xl">QDCA10Pro（キッチン）</Title>
                    <small>
                      <div>食品在庫を管理・フードを準備するサービス</div>
                      <a href="https://github.com/quarkusdroneshop/quarkusdroneshop-kitchen" target="_blank" rel="noreferrer">
                        github.com/quarkusdroneshop/quarkusdroneshop-kitchen
                      </a>
                    </small>
                  </FlexItem>
                  {this.ghBadge('QDCA10Pro')}
                </Flex>
              </DataListCell>,
              <DataListCell key="chart">
                {inventoryLoading ? <Spinner size="md" /> : (
                  <div style={{ height: '140px', width: '140px' }}>
                    <ChartDonutUtilization
                      ariaDesc="Food Remaining"
                      ariaTitle="Food Remaining"
                      constrainToVisibleArea
                      data={{ x: 'Food 在庫', y: foodRemaining }}
                      invert
                      height={140}
                      subTitle="remaining"
                      title={`${foodRemaining}%`}
                      thresholds={[{ value: 50 }, { value: 25 }]}
                      width={140}
                    />
                  </div>
                )}
              </DataListCell>,
              <DataListAction id="qdca10pro-action" aria-label="QDCA10Pro actions" aria-labelledby="QDCA10Pro">
                <Stack>
                  <StackItem>
                    <Button variant={ButtonVariant.secondary}
                      onClick={() => this.openDrawer('QDCA10Pro', 'QDCA10Pro 在庫詳細', this.inventoryDetail(foodItems))}>
                      Detail
                    </Button>
                  </StackItem>
                </Stack>
              </DataListAction>,
            ]} />
          </DataListItemRow>
        </DataListItem>

        {/* Inventory */}
        <DataListItem key="Inventory" id="Inventory">
          <DataListItemRow>
            <DataListItemCells dataListCells={[
              <DataListCell key="info">
                <Flex direction={{ default: 'column' }}>
                  <FlexItem>
                    <Title headingLevel="h3" size="xl">Inventory</Title>
                    <small>
                      <div>QDCA10 / QDCA10Pro の在庫を管理・補充するサービス</div>
                      <a href="https://github.com/quarkusdroneshop/quarkusdroneshop-inventory" target="_blank" rel="noreferrer">
                        github.com/quarkusdroneshop/quarkusdroneshop-inventory
                      </a>
                    </small>
                  </FlexItem>
                  {this.ghBadge('Inventory')}
                </Flex>
              </DataListCell>,
              <DataListCell key="summary">
                {inventoryLoading ? <Spinner size="md" /> : (
                  <Flex direction={{ default: 'column' }}>
                    {inventory.slice(0, 4).map(i => {
                      const pct = i.capacity > 0 ? Math.round((i.remaining / i.capacity) * 100) : 0;
                      return (
                        <FlexItem key={i.itemName}>
                          <Label color={pct < 20 ? 'red' : pct < 50 ? 'orange' : 'green'} isCompact>
                            {i.itemName}: {pct}%
                          </Label>
                        </FlexItem>
                      );
                    })}
                  </Flex>
                )}
              </DataListCell>,
              <DataListAction id="inventory-action" aria-label="Inventory actions" aria-labelledby="Inventory">
                <Stack>
                  <StackItem>
                    <Button variant={ButtonVariant.secondary}
                      onClick={() => this.openDrawer('Inventory', '全在庫一覧', this.inventoryDetail(inventory))}>
                      Detail
                    </Button>
                  </StackItem>
                </Stack>
              </DataListAction>,
            ]} />
          </DataListItemRow>
        </DataListItem>
      </DataList>
    );

    return (
      <React.Fragment>
        <PageSection variant={PageSectionVariants.light}>
          <TextContent>
            <Text component="h1">システムコンポーネント</Text>
            <Text component="p">各マイクロサービスの状態と在庫情報</Text>
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
