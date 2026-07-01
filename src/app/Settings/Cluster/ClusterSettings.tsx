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
} from '@patternfly/react-core';
import { SettingsContext, ClusterName } from '../../utils/SettingsContext';

const CLUSTER_OPTIONS: ClusterName[] = ['a-cluster', 'b-cluster'];

const SERVICE_LABELS: Record<string, string> = {
  Web:         'Web',
  Counter:     'Counter',
  QDCA10:      'QDCA10',
  QDCA10Pro:   'QDCA10Pro',
  Inventory:   'Inventory',
  Homeoffice:  'Homeoffice',
  HomeofficUI: 'Homeoffice UI',
};

const CLUSTER_COLORS: Record<ClusterName, 'purple' | 'cyan'> = {
  'a-cluster': 'purple',
  'b-cluster': 'cyan',
};

interface State {
  aDomain: string;
  bDomain: string;
  serviceCluster: Record<string, ClusterName>;
  openSelect: string | null;
  saved: boolean;
}

class ClusterSettingsPage extends React.Component<{}, State> {
  static contextType = SettingsContext;
  context!: React.ContextType<typeof SettingsContext>;

  constructor(props: {}) {
    super(props);
    this.state = {
      aDomain: '',
      bDomain: '',
      serviceCluster: {},
      openSelect: null,
      saved: false,
    };
    this.handleSave = this.handleSave.bind(this);
  }

  componentDidMount() {
    const { settings } = this.context;
    this.setState({
      aDomain: settings.clusterDomains['a-cluster'],
      bDomain: settings.clusterDomains['b-cluster'],
      serviceCluster: { ...settings.serviceCluster },
    });
  }

  handleSave() {
    const { updateSettings } = this.context;
    const { aDomain, bDomain, serviceCluster } = this.state;
    updateSettings({
      clusterDomains: {
        'a-cluster': aDomain.trim(),
        'b-cluster': bDomain.trim(),
      },
      serviceCluster,
    });
    this.setState({ saved: true });
    setTimeout(() => this.setState({ saved: false }), 3000);
  }

  setServiceCluster(key: string, cluster: ClusterName) {
    this.setState(prev => ({
      serviceCluster: { ...prev.serviceCluster, [key]: cluster },
      openSelect: null,
    }));
  }

  render() {
    const { aDomain, bDomain, serviceCluster, openSelect, saved } = this.state;

    return (
      <React.Fragment>
        <PageSection variant={PageSectionVariants.light}>
          <TextContent>
            <Text component="h1">クラスタ設定</Text>
            <Text component="p">
              クラスタのドメインと、各サービスの所属クラスタを設定します。
              Health Check URL は <code>http://&#123;route&#125;.&#123;domain&#125;/q/health</code> の形式で構築されます。
            </Text>
          </TextContent>
        </PageSection>

        <Divider component="div" />

        <PageSection variant={PageSectionVariants.default}>
          {saved && (
            <Alert variant="success" title="設定を保存しました" style={{ marginBottom: '16px' }} />
          )}

          {/* クラスタドメイン設定 */}
          <Card style={{ marginBottom: '24px' }}>
            <CardTitle>クラスタドメイン</CardTitle>
            <CardBody>
              <Form>
                <FormGroup
                  label={<><Label color="purple" isCompact style={{ marginRight: 8 }}>a-cluster</Label>ドメイン</>}
                  fieldId="a-cluster-domain"
                  helperText="例: apps.ocp.49dgc.sandbox1447.opentlc.com"
                >
                  <TextInput
                    id="a-cluster-domain"
                    type="text"
                    value={aDomain}
                    onChange={(_e, val) => this.setState({ aDomain: val })}
                    placeholder="apps.ocp.xxxxx.sandboxYYYY.opentlc.com"
                  />
                </FormGroup>

                <FormGroup
                  label={<><Label color="cyan" isCompact style={{ marginRight: 8 }}>b-cluster</Label>ドメイン</>}
                  fieldId="b-cluster-domain"
                  helperText="例: apps.ocp.hnkwm.sandbox225.opentlc.com"
                >
                  <TextInput
                    id="b-cluster-domain"
                    type="text"
                    value={bDomain}
                    onChange={(_e, val) => this.setState({ bDomain: val })}
                    placeholder="apps.ocp.xxxxx.sandboxYYYY.opentlc.com"
                  />
                </FormGroup>
              </Form>
            </CardBody>
          </Card>

          {/* サービス所属クラスタ設定 */}
          <Card style={{ marginBottom: '24px' }}>
            <CardTitle>サービス所属クラスタ</CardTitle>
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
                              <FlexItem>
                                <strong>{SERVICE_LABELS[key]}</strong>
                              </FlexItem>
                              <FlexItem>
                                <Label color={CLUSTER_COLORS[current]} isCompact style={{ fontFamily: 'monospace', fontSize: '0.75em' }}>
                                  {current}
                                </Label>
                              </FlexItem>
                            </Flex>
                          </DataListCell>,
                          <DataListCell key="url" width={3}>
                            <small style={{ color: 'var(--pf-global--Color--200)', fontFamily: 'monospace' }}>
                              {current && serviceCluster[key]
                                ? `http://${key.toLowerCase()}-quarkusdroneshop-demo.${current === 'a-cluster' ? aDomain : bDomain}/q/health`
                                : '—'}
                            </small>
                          </DataListCell>,
                          <DataListCell key="select" width={1}>
                            <Select
                              variant={SelectVariant.single}
                              isOpen={isOpen}
                              onToggle={(_e, v) => this.setState({ openSelect: v ? key : null })}
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
            <Button variant="primary" onClick={this.handleSave}>保存</Button>
            <Button
              variant="link"
              onClick={() => {
                const { settings } = this.context;
                this.setState({
                  aDomain: settings.clusterDomains['a-cluster'],
                  bDomain: settings.clusterDomains['b-cluster'],
                  serviceCluster: { ...settings.serviceCluster },
                });
              }}
            >
              変更を元に戻す
            </Button>
          </ActionGroup>
        </PageSection>
      </React.Fragment>
    );
  }
}

const ClusterSettings = ClusterSettingsPage;
export { ClusterSettings };
