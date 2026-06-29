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
  ChartBar,
  ChartGroup,
  ChartVoronoiContainer,
} from '@patternfly/react-charts';

import CodeBranchIcon from '@patternfly/react-icons/dist/js/icons/code-branch-icon';
import CubeIcon from '@patternfly/react-icons/dist/js/icons/cube-icon';
import CheckCircleIcon from '@patternfly/react-icons/dist/js/icons/check-circle-icon';
import ExclamationTriangleIcon from '@patternfly/react-icons/dist/js/icons/exclamation-triangle-icon';
import { gql } from '@apollo/client';
import client from 'src/apolloclient';

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

interface ComponentMeta {
  loading: boolean;
  pushedAt: string;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  weeklyCommits: number[];   // last 4 weeks, oldest→newest
  health: 'ok' | 'warn' | 'unknown';
}

interface State {
  isDrawerExpanded: boolean;
  drawerTitle: string;
  drawerContent: React.ReactNode;
  selectedDataListItemId: string;
  inventory: InventoryLevel[];
  inventoryLoading: boolean;
  github: Record<string, ComponentMeta>;
  backendHealth: 'ok' | 'error' | 'checking';
}

const REPOS: Record<string, { repo: string; label: string; desc: string }> = {
  Web:           { repo: 'quarkusdroneshop/quarkusdroneshop-web',           label: 'Web',             desc: '注文受付 Web フロントエンド' },
  Counter:       { repo: 'quarkusdroneshop/quarkusdroneshop-counter',       label: 'Counter',         desc: 'イベント調整・注文ルーティング' },
  QDCA10:        { repo: 'quarkusdroneshop/quarkusdroneshop-qdca10',        label: 'QDCA10',          desc: 'DroneA10シリーズ 在庫管理・発送サービス' },
  QDCA10Pro:     { repo: 'quarkusdroneshop/quarkusdroneshop-qdca10pro',     label: 'QDCA10Pro',       desc: 'DroneA10Proシリーズ 在庫管理・発送サービス' },
  Inventory:     { repo: 'quarkusdroneshop/quarkusdroneshop-inventory',     label: 'Inventory',       desc: 'Drone在庫管理・補充サービス' },
  Homeoffice:    { repo: 'quarkusdroneshop/quarkusdroneshop-homeoffice',    label: 'Homeoffice',      desc: 'バックエンド GraphQL API サービス' },
  HomeofficUI:   { repo: 'quarkusdroneshop/quarkusdroneshop-homeoffice-ui', label: 'Homeoffice UI',   desc: 'ホームオフィス管理ダッシュボード' },
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
  weeklyCommits: [0, 0, 0, 0],
  health: 'unknown',
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
      backendHealth: 'checking',
    };
    this.onCloseDrawerClick = this.onCloseDrawerClick.bind(this);
  }

  componentDidMount() {
    this.loadInventory();
    this.loadGitHub();
    this.checkBackendHealth();
    this.intervalId = window.setInterval(() => {
      this.loadInventory();
      this.checkBackendHealth();
    }, 30000);
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

  checkBackendHealth() {
    client
      .query({ query: GET_INVENTORY, fetchPolicy: 'no-cache' })
      .then(() => this.setState({ backendHealth: 'ok' }))
      .catch(() => this.setState({ backendHealth: 'error' }));
  }

  loadGitHub() {
    Object.entries(REPOS).forEach(([key, { repo }]) => {
      // fetch repo info + commit activity in parallel
      Promise.all([
        fetch(`https://api.github.com/repos/${repo}`).then(r => r.json()),
        fetch(`https://api.github.com/repos/${repo}/stats/commit_activity`).then(r => r.json()),
      ])
        .then(([repoData, activity]) => {
          // activity = array of 52 weekly objects {week, total, days[]}
          let weeklyCommits = [0, 0, 0, 0];
          if (Array.isArray(activity) && activity.length >= 4) {
            weeklyCommits = activity.slice(-4).map((w: { total: number }) => w.total);
          }
          const daysSincePush = repoData.pushed_at
            ? Math.floor((Date.now() - new Date(repoData.pushed_at).getTime()) / 86400000)
            : 999;
          const health: 'ok' | 'warn' | 'unknown' = daysSincePush < 30 ? 'ok' : daysSincePush < 180 ? 'warn' : 'unknown';

          this.setState(prev => ({
            github: {
              ...prev.github,
              [key]: {
                loading: false,
                pushedAt: repoData.pushed_at ?? '',
                stargazersCount: repoData.stargazers_count ?? 0,
                forksCount: repoData.forks_count ?? 0,
                openIssuesCount: repoData.open_issues_count ?? 0,
                weeklyCommits,
                health,
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

  // GitHub meta badges
  ghBadge(key: string) {
    const g = this.state.github[key];
    if (g.loading) return <Spinner size="sm" />;
    return (
      <Flex style={{ marginTop: 4 }}>
        <FlexItem><CodeBranchIcon /> {g.forksCount} forks</FlexItem>
        <FlexItem><CubeIcon /> {g.openIssuesCount} issues</FlexItem>
        {g.pushedAt ? (
          <FlexItem>更新: {relativeTime(g.pushedAt)}</FlexItem>
        ) : (
          <FlexItem><ExclamationTriangleIcon color="orange" /> 未取得</FlexItem>
        )}
      </Flex>
    );
  }

  // Health label
  healthLabel(key: string, overrideHealth?: 'ok' | 'error' | 'checking') {
    if (overrideHealth === 'checking') return <Label color="blue" isCompact><Spinner size="sm" /> 確認中</Label>;
    if (overrideHealth === 'error') return <Label color="red" isCompact><ExclamationTriangleIcon /> 応答なし</Label>;
    if (overrideHealth === 'ok') return <Label color="green" isCompact><CheckCircleIcon /> 正常稼働</Label>;

    const g = this.state.github[key];
    if (g.loading) return <Label color="blue" isCompact><Spinner size="sm" /></Label>;
    if (g.health === 'ok') return <Label color="green" isCompact><CheckCircleIcon /> 正常</Label>;
    if (g.health === 'warn') return <Label color="orange" isCompact><ExclamationTriangleIcon /> 要確認</Label>;
    return <Label color="grey" isCompact>不明</Label>;
  }

  // Weekly commit bar chart (last 4 weeks)
  commitChart(key: string) {
    const g = this.state.github[key];
    if (g.loading) return <Spinner size="md" />;
    const data = g.weeklyCommits.map((y, i) => ({ x: `W-${3 - i}`, y }));
    const maxY = Math.max(...g.weeklyCommits, 1);
    return (
      <div style={{ height: 110, width: 360 }}>
        <ChartGroup
          ariaDesc="Monthly commits"
          ariaTitle="直近1ヶ月コミット数"
          domainPadding={{ x: 30 }}
          height={90}
          width={360}
          padding={{ top: 8, bottom: 28, left: 36, right: 12 }}
          domain={{ y: [0, maxY + 1] }}
          containerComponent={<ChartVoronoiContainer constrainToVisibleArea />}
        >
          <ChartBar
            data={data}
            style={{ data: { fill: '#0066cc', width: 48 } }}
          />
        </ChartGroup>
        <Text component="small" style={{ display: 'block', textAlign: 'center' }}>直近4週コミット数</Text>
      </div>
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

  componentRow(key: string, chartContent: React.ReactNode, drawerBody: React.ReactNode, overrideHealth?: 'ok' | 'error' | 'checking') {
    const { repo, label, desc } = REPOS[key];
    return (
      <DataListItem key={key} id={key}>
        <DataListItemRow>
          <DataListItemCells dataListCells={[
            <DataListCell key="info" width={2}>
              <Flex direction={{ default: 'column' }}>
                <FlexItem>
                  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                    <FlexItem>
                      <Title headingLevel="h3" size="xl">{label}</Title>
                    </FlexItem>
                    <FlexItem>{this.healthLabel(key, overrideHealth)}</FlexItem>
                  </Flex>
                  <small>
                    <div>{desc}</div>
                    <a href={`https://github.com/${repo}`} target="_blank" rel="noreferrer">
                      github.com/{repo}
                    </a>
                  </small>
                </FlexItem>
                {this.ghBadge(key)}
              </Flex>
            </DataListCell>,
            <DataListCell key="chart" width={2}>{chartContent}</DataListCell>,
            <DataListAction key="action" id={`${key}-action`} aria-label={`${key} actions`} aria-labelledby={key}>
              <Stack>
                <StackItem>
                  <Button variant={ButtonVariant.secondary}
                    onClick={() => this.openDrawer(key, `${label} 詳細`, drawerBody)}>
                    Detail
                  </Button>
                </StackItem>
              </Stack>
            </DataListAction>,
          ]} />
        </DataListItemRow>
      </DataListItem>
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
      backendHealth,
    } = this.state;

    const droneItems = inventory.filter(i => ['DRONE', 'drone', 'Drone'].some(k => i.itemName.toUpperCase().includes(k.toUpperCase())));
    const foodItems  = inventory.filter(i => ['FOOD', 'food', 'BURGER', 'FRIES', 'MUFFIN'].some(k => i.itemName.toUpperCase().includes(k.toUpperCase())));

    const inventorySummary = (
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
    );

    const panelContent = (
      <DrawerPanelContent minSize="400px">
        <DrawerHead>
          <Title headingLevel="h2" size="xl">{drawerTitle}</Title>
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
        {this.componentRow('Web', this.commitChart('Web'),
          <Text>GitHub リポジトリ情報は左パネルを参照してください。</Text>)}

        {/* Counter */}
        {this.componentRow('Counter', this.commitChart('Counter'),
          <Text>GitHub リポジトリ情報は左パネルを参照してください。</Text>)}

        {/* QDCA10 */}
        {this.componentRow('QDCA10', this.commitChart('QDCA10'),
          this.inventoryDetail(droneItems))}

        {/* QDCA10Pro */}
        {this.componentRow('QDCA10Pro', this.commitChart('QDCA10Pro'),
          this.inventoryDetail(foodItems))}

        {/* Inventory */}
        {this.componentRow('Inventory',
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {inventoryLoading ? <Spinner size="md" /> : inventorySummary}
            {this.commitChart('Inventory')}
          </div>,
          this.inventoryDetail(inventory))}

        {/* Homeoffice (backend) — uses live GraphQL health */}
        {this.componentRow('Homeoffice', this.commitChart('Homeoffice'),
          <TextContent>
            <Text><strong>GraphQL エンドポイント</strong> 経由で正常性を確認しています。</Text>
            <Text>ステータス: {backendHealth === 'ok' ? '✅ 正常応答' : backendHealth === 'error' ? '❌ 応答なし' : '⏳ 確認中'}</Text>
          </TextContent>,
          backendHealth)}

        {/* Homeoffice UI */}
        {this.componentRow('HomeofficUI', this.commitChart('HomeofficUI'),
          <TextContent>
            <Text>本アプリケーション自体です。ブラウザで正常に表示されていれば稼働中です。</Text>
          </TextContent>,
          'ok')}
      </DataList>
    );

    return (
      <React.Fragment>
        <PageSection variant={PageSectionVariants.light}>
          <TextContent>
            <Text component="h1">システムコンポーネント</Text>
            <Text component="p">各マイクロサービスの状態・在庫情報・直近1ヶ月のコミット活動</Text>
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
