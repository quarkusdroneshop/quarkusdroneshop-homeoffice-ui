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
  weeklyCommits: number[];   // last 26 weeks, oldest→newest
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
  Web:           { repo: 'quarkusdroneshop/quarkusdroneshop-web',           label: 'Web',           desc: 'Order intake web frontend' },
  Counter:       { repo: 'quarkusdroneshop/quarkusdroneshop-counter',       label: 'Counter',       desc: 'Event coordination and order routing' },
  QDCA10:        { repo: 'quarkusdroneshop/quarkusdroneshop-qdca10',        label: 'QDCA10',        desc: 'DroneA10 series inventory and dispatch service' },
  QDCA10Pro:     { repo: 'quarkusdroneshop/quarkusdroneshop-qdca10pro',     label: 'QDCA10Pro',     desc: 'DroneA10Pro series inventory and dispatch service' },
  Inventory:     { repo: 'quarkusdroneshop/quarkusdroneshop-inventory',     label: 'Inventory',     desc: 'Drone inventory management and replenishment' },
  Homeoffice:    { repo: 'quarkusdroneshop/quarkusdroneshop-homeoffice',    label: 'Homeoffice',    desc: 'Backend GraphQL API service' },
  HomeofficUI:   { repo: 'quarkusdroneshop/quarkusdroneshop-homeoffice-ui', label: 'Homeoffice UI', desc: 'Home office management dashboard' },
};

function relativeTime(iso: string): string {
  if (!iso) return 'Unknown';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const defaultMeta: ComponentMeta = {
  loading: true,
  pushedAt: '',
  stargazersCount: 0,
  forksCount: 0,
  openIssuesCount: 0,
  weeklyCommits: new Array(26).fill(0),
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
      github: Object.fromEntries(Object.keys(REPOS).map(k => [k, { ...defaultMeta, weeklyCommits: new Array(26).fill(0) }])),
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
      Promise.all([
        fetch(`https://api.github.com/repos/${repo}`).then(r => r.json()),
        fetch(`https://api.github.com/repos/${repo}/stats/commit_activity`).then(r => r.json()),
      ])
        .then(([repoData, activity]) => {
          // activity = 52 weekly objects; take last 26 (≈ 6 months)
          let weeklyCommits = new Array(26).fill(0);
          if (Array.isArray(activity) && activity.length >= 26) {
            weeklyCommits = activity.slice(-26).map((w: { total: number }) => w.total);
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

  ghBadge(key: string) {
    const g = this.state.github[key];
    if (g.loading) return <Spinner size="sm" />;
    return (
      <Flex style={{ marginTop: 4 }}>
        <FlexItem><CodeBranchIcon /> {g.forksCount} forks</FlexItem>
        <FlexItem><CubeIcon /> {g.openIssuesCount} issues</FlexItem>
        {g.pushedAt ? (
          <FlexItem>Updated: {relativeTime(g.pushedAt)}</FlexItem>
        ) : (
          <FlexItem><ExclamationTriangleIcon color="orange" /> Not fetched</FlexItem>
        )}
      </Flex>
    );
  }

  healthLabel(key: string, overrideHealth?: 'ok' | 'error' | 'checking') {
    if (overrideHealth === 'checking') return <Label color="blue" isCompact><Spinner size="sm" /> Checking</Label>;
    if (overrideHealth === 'error')    return <Label color="red" isCompact><ExclamationTriangleIcon /> No Response</Label>;
    if (overrideHealth === 'ok')       return <Label color="green" isCompact><CheckCircleIcon /> Running</Label>;

    const g = this.state.github[key];
    if (g.loading)          return <Label color="blue" isCompact><Spinner size="sm" /></Label>;
    if (g.health === 'ok')   return <Label color="green" isCompact><CheckCircleIcon /> OK</Label>;
    if (g.health === 'warn') return <Label color="orange" isCompact><ExclamationTriangleIcon /> Check</Label>;
    return <Label color="grey" isCompact>Unknown</Label>;
  }

  // Commit bar chart — last 26 weeks (≈ 6 months)
  commitChart(key: string) {
    const g = this.state.github[key];
    if (g.loading) return <Spinner size="md" />;

    const weeks = g.weeklyCommits;
    // label every 4th week; others blank
    const data = weeks.map((y, i) => ({
      x: (i % 4 === 0) ? `W-${25 - i}` : '',
      y,
    }));
    const maxY = Math.max(...weeks, 1);

    return (
      <div style={{ height: 110, width: 500 }}>
        <ChartGroup
          ariaDesc="6-month commit history"
          ariaTitle="Commits (last 26 weeks)"
          domainPadding={{ x: 8 }}
          height={90}
          width={500}
          padding={{ top: 8, bottom: 28, left: 36, right: 12 }}
          domain={{ y: [0, maxY + 1] }}
          containerComponent={<ChartVoronoiContainer constrainToVisibleArea labels={({ datum }) => `W-${25 - datum.index}: ${datum.y} commits`} />}
        >
          <ChartBar
            data={data}
            style={{ data: { fill: '#0066cc', width: 12 } }}
          />
        </ChartGroup>
        <Text component="small" style={{ display: 'block', textAlign: 'center' }}>
          Commits — last 6 months (26 weeks)
        </Text>
      </div>
    );
  }

  inventoryDetail(items: InventoryLevel[]) {
    if (items.length === 0) return <Text>No inventory data</Text>;
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
                    onClick={() => this.openDrawer(key, `${label} Details`, drawerBody)}>
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
        {this.componentRow('Web', this.commitChart('Web'),
          <Text>See left panel for GitHub repository information.</Text>)}

        {this.componentRow('Counter', this.commitChart('Counter'),
          <Text>See left panel for GitHub repository information.</Text>)}

        {this.componentRow('QDCA10', this.commitChart('QDCA10'),
          this.inventoryDetail(droneItems))}

        {this.componentRow('QDCA10Pro', this.commitChart('QDCA10Pro'),
          this.inventoryDetail(foodItems))}

        {this.componentRow('Inventory',
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {inventoryLoading ? <Spinner size="md" /> : inventorySummary}
            {this.commitChart('Inventory')}
          </div>,
          this.inventoryDetail(inventory))}

        {this.componentRow('Homeoffice', this.commitChart('Homeoffice'),
          <TextContent>
            <Text><strong>GraphQL endpoint</strong> health check in progress.</Text>
            <Text>Status: {backendHealth === 'ok' ? '✅ Responding' : backendHealth === 'error' ? '❌ No response' : '⏳ Checking'}</Text>
          </TextContent>,
          backendHealth)}

        {this.componentRow('HomeofficUI', this.commitChart('HomeofficUI'),
          <TextContent>
            <Text>This application itself. If the dashboard is visible, the service is running.</Text>
          </TextContent>,
          'ok')}
      </DataList>
    );

    return (
      <React.Fragment>
        <PageSection variant={PageSectionVariants.light}>
          <TextContent>
            <Text component="h1">System Components</Text>
            <Text component="p">Status, inventory levels, and 6-month commit activity for each microservice</Text>
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
