import * as React from 'react';
import {
  PageSection,
  PageSectionVariants,
  TextContent,
  Text,
  Divider,
  Card,
  CardBody,
  CardTitle,
  Form,
  FormGroup,
  TextInput,
  ActionGroup,
  Button,
  Alert,
  Select,
  SelectOption,
  SelectVariant,
  Label,
  Flex,
  FlexItem,
  DataList,
  DataListItem,
  DataListItemRow,
  DataListItemCells,
  DataListCell,
  Spinner,
} from '@patternfly/react-core';
import { SettingsContext, ClusterName } from '../../utils/SettingsContext';

const CLUSTER_OPTIONS: ClusterName[] = ['a-cluster', 'b-cluster', 'c-cluster'];

const CLUSTER_COLORS: Record<ClusterName, 'purple' | 'cyan' | 'orange'> = {
  'a-cluster': 'purple',
  'b-cluster': 'cyan',
  'c-cluster': 'orange',
};

const SERVICE_LABELS: Record<string, string> = {
  Web:         'Web',
  Counter:     'Counter',
  QDCA10:      'QDCA10',
  QDCA10Pro:   'QDCA10Pro',
  Inventory:   'Inventory',
  Homeoffice:  'Homeoffice',
  HomeofficUI: 'Homeoffice UI',
};

const ROUTE_PREFIXES: Record<string, string> = {
  Web:         'web-quarkusdroneshop-demo',
  Counter:     'counter-quarkusdroneshop-demo',
  QDCA10:      'qdca10-quarkusdroneshop-demo',
  QDCA10Pro:   'qdca10pro-quarkusdroneshop-demo',
  Inventory:   'inventory-quarkusdroneshop-demo',
  Homeoffice:  'homeoffice-backend-quarkusdroneshop-demo',
  HomeofficUI: 'homeoffice-ui-quarkusdroneshop-demo',
};

interface State {
  domains: Record<ClusterName, string>;
  serviceCluster: Record<string, ClusterName>;
  openSelect: string | null;
  saving: boolean;
  saved: boolean;
}

class ClusterSettingsPage extends React.Component<{}, State> {
  static contextType = SettingsContext;
  context!: React.ContextType<typeof SettingsContext>;

  constructor(props: {}) {
    super(props);
    this.state = {
      domains: { 'a-cluster': '', 'b-cluster': '', 'c-cluster': '' },
      serviceCluster: {},
      openSelect: null,
      saving: false,
      saved: false,
    };
    this.handleSave = this.handleSave.bind(this);
    this.handleRevert = this.handleRevert.bind(this);
  }

  componentDidMount() {
    const { settings } = this.context;
    this.setState({
      domains: { ...settings.clusterDomains },
      serviceCluster: { ...settings.serviceCluster },
    });
  }

  // DB からのロードが完了したら state を最新値で上書き
  componentDidUpdate(_prevProps: {}, _prevState: State, prevContext?: React.ContextType<typeof SettingsContext>) {
    const wasLoading = prevContext?.dbLoading;
    const isLoading  = this.context?.dbLoading;
    if (wasLoading && !isLoading) {
      const { settings } = this.context;
      this.setState({
        domains: { ...settings.clusterDomains },
        serviceCluster: { ...settings.serviceCluster },
      });
    }
  }

  handleSave() {
    const { updateSettings } = this.context;
    const { domains, serviceCluster } = this.state;
    this.setState({ saving: true });
    updateSettings({ clusterDomains: domains, serviceCluster });
    setTimeout(() => this.setState({ saving: false, saved: true }), 300);
    setTimeout(() => this.setState({ saved: false }), 3300);
  }

  handleRevert() {
    const { settings } = this.context;
    this.setState({
      domains: { ...settings.clusterDomains },
      serviceCluster: { ...settings.serviceCluster },
    });
  }

  setDomain(cluster: ClusterName, value: string) {
    this.setState(prev => ({
      domains: { ...prev.domains, [cluster]: value },
    }));
  }

  setServiceCluster(key: string, cluster: ClusterName) {
    this.setState(prev => ({
      serviceCluster: { ...prev.serviceCluster, [key]: cluster },
      openSelect: null,
    }));
  }

  buildHealthUrl(key: string): string {
    const { domains, serviceCluster } = this.state;
    const cluster = serviceCluster[key];
    const domain = cluster ? domains[cluster] : '';
    if (!domain) return '—';
    return `http://${ROUTE_PREFIXES[key]}.${domain}/q/health`;
  }

  render() {
    const { domains, serviceCluster, openSelect, saving, saved } = this.state;
    const { dbLoading } = this.context;

    return (
      <React.Fragment>
        <PageSection variant={PageSectionVariants.light}>
          <TextContent>
            <Text component="h1">Cluster Settings</Text>
            <Text component="p">
              Configure the domain for each cluster and assign each service to a cluster.
              Health check URLs are built as <code>http://&#123;route&#125;.&#123;domain&#125;/q/health</code>.
            </Text>
          </TextContent>
        </PageSection>

        <Divider component="div" />

        <PageSection variant={PageSectionVariants.default}>
          {dbLoading && (
            <Alert variant="info" title={<><Spinner size="sm" style={{ marginRight: 8 }} />Loading settings from database…</>} style={{ marginBottom: '16px' }} />
          )}
          {saved && (
            <Alert variant="success" title="Settings saved to database" style={{ marginBottom: '16px' }} />
          )}

          {/* Cluster Domains */}
          <Card style={{ marginBottom: '24px' }}>
            <CardTitle>Cluster Domains</CardTitle>
            <CardBody>
              <Form>
                {CLUSTER_OPTIONS.map(cluster => (
                  <FormGroup
                    key={cluster}
                    label={
                      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                        <FlexItem>
                          <Label color={CLUSTER_COLORS[cluster]} isCompact style={{ fontFamily: 'monospace' }}>
                            {cluster}
                          </Label>
                        </FlexItem>
                        <FlexItem>Domain</FlexItem>
                      </Flex>
                    }
                    fieldId={`${cluster}-domain`}
                    helperText={`e.g. apps.ocp.xxxxx.sandboxYYYY.opentlc.com`}
                  >
                    <TextInput
                      id={`${cluster}-domain`}
                      type="text"
                      value={domains[cluster]}
                      onChange={(val) => this.setDomain(cluster, val)}
                      placeholder="apps.ocp.xxxxx.sandboxYYYY.opentlc.com"
                    />
                  </FormGroup>
                ))}
              </Form>
            </CardBody>
          </Card>

          {/* Service Cluster Assignment */}
          <Card style={{ marginBottom: '24px' }}>
            <CardTitle>Service Cluster Assignment and Health Check URL</CardTitle>
            <CardBody>
              <DataList aria-label="service cluster assignment" isCompact>
                {Object.keys(SERVICE_LABELS).map(key => {
                  const current: ClusterName = serviceCluster[key] ?? 'b-cluster';
                  const isOpen = openSelect === key;
                  return (
                    <DataListItem key={key} id={key}>
                      <DataListItemRow>
                        <DataListItemCells dataListCells={[
                          <DataListCell key="name" width={2}>
                            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                              <FlexItem><strong>{SERVICE_LABELS[key]}</strong></FlexItem>
                              <FlexItem>
                                <Label color={CLUSTER_COLORS[current]} isCompact style={{ fontFamily: 'monospace', fontSize: '0.75em' }}>
                                  {current}
                                </Label>
                              </FlexItem>
                            </Flex>
                          </DataListCell>,
                          <DataListCell key="url" width={4}>
                            <small style={{ color: 'var(--pf-global--Color--200)', fontFamily: 'monospace' }}>
                              {this.buildHealthUrl(key)}
                            </small>
                          </DataListCell>,
                          <DataListCell key="select" width={1}>
                            <Select
                              variant={SelectVariant.single}
                              isOpen={isOpen}
                              onToggle={(open) => this.setState({ openSelect: open ? key : null })}
                              onSelect={(_e, val) => this.setServiceCluster(key, val as ClusterName)}
                              selections={current}
                              aria-label={`${key} cluster`}
                            >
                              {CLUSTER_OPTIONS.map(c => (
                                <SelectOption key={c} value={c}>
                                  <Label color={CLUSTER_COLORS[c]} isCompact style={{ fontFamily: 'monospace', fontSize: '0.75em' }}>
                                    {c}
                                  </Label>
                                </SelectOption>
                              ))}
                            </Select>
                          </DataListCell>,
                        ]} />
                      </DataListItemRow>
                    </DataListItem>
                  );
                })}
              </DataList>
            </CardBody>
          </Card>

          <ActionGroup>
            <Button
              variant={saved ? 'primary' : 'primary'}
              onClick={this.handleSave}
              isDisabled={saving || saved}
              isLoading={saving}
              style={saved ? { backgroundColor: 'var(--pf-global--success-color--100)', borderColor: 'var(--pf-global--success-color--100)' } : {}}
            >
              {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="link" onClick={this.handleRevert} isDisabled={saving}>Revert Changes</Button>
          </ActionGroup>
        </PageSection>
      </React.Fragment>
    );
  }
}

const ClusterSettings = ClusterSettingsPage;
export { ClusterSettings };
