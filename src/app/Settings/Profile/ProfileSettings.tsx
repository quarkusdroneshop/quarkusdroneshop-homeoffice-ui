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
  ActionGroup,
  Button,
  Alert,
  SelectOption,
  Select,
  SelectVariant,
  SelectOptionObject,
  Label,
} from '@patternfly/react-core';
import { SettingsContext, ClusterName } from '../../utils/SettingsContext';

const CLUSTER_COLORS: Record<ClusterName, 'purple' | 'cyan' | 'orange'> = {
  'a-cluster': 'purple',
  'b-cluster': 'cyan',
  'c-cluster': 'orange',
};

/** Extract a short identifier from a domain string.
 *  e.g. "apps.ocp.49dgc.sandbox1447.opentlc.com" → "49dgc.sandbox1447" */
function shortDomain(domain: string): string {
  if (!domain) return '(not configured)';
  // Remove leading "apps.ocp." and trailing ".opentlc.com" if present
  return domain
    .replace(/^apps\.ocp\./, '')
    .replace(/\.opentlc\.com$/, '');
}

type State = {
  activeSite: string;
  isOpen: boolean;
  saved: boolean;
};

class ProfileSettingsPage extends React.Component<{}, State> {
  static contextType = SettingsContext;
  context!: React.ContextType<typeof SettingsContext>;

  constructor(props: {}) {
    super(props);
    this.state = { activeSite: 'all', isOpen: false, saved: false };
    this.handleSave = this.handleSave.bind(this);
    this.onToggle = this.onToggle.bind(this);
    this.onSelect = this.onSelect.bind(this);
  }

  componentDidMount() {
    this.setState({ activeSite: this.context.settings.activeSite });
  }

  onToggle(isOpen: boolean) {
    this.setState({ isOpen });
  }

  onSelect(_event: React.MouseEvent | React.ChangeEvent, selection: string | SelectOptionObject) {
    this.setState({ activeSite: selection as string, isOpen: false });
  }

  handleSave() {
    this.context.updateSettings({ activeSite: this.state.activeSite });
    this.setState({ saved: true });
    setTimeout(() => this.setState({ saved: false }), 3000);
  }

  buildSiteOptions() {
    const { clusterDomains } = this.context.settings;
    const clusters: ClusterName[] = ['a-cluster', 'b-cluster', 'c-cluster'];
    return [
      { key: 'all', label: 'All Sites', cluster: null as ClusterName | null },
      ...clusters.map(c => ({
        key: c,
        label: `${c} — ${shortDomain(clusterDomains[c])}`,
        cluster: c,
      })),
    ];
  }

  render() {
    const { activeSite, isOpen, saved } = this.state;
    const sites = this.buildSiteOptions();
    const selectedLabel = sites.find(s => s.key === activeSite)?.label ?? activeSite;

    return (
      <React.Fragment>
        <PageSection variant={PageSectionVariants.light}>
          <TextContent>
            <Text component="h1">Profile Settings</Text>
            <Text component="p">Manage user-specific settings such as the active site for dashboard display.</Text>
          </TextContent>
        </PageSection>

        <Divider component="div" />

        <PageSection variant={PageSectionVariants.default}>
          {saved && (
            <Alert variant="success" title="Settings saved" style={{ marginBottom: '16px' }} />
          )}
          <Card>
            <CardTitle>Active Site</CardTitle>
            <CardBody>
              <Form>
                <FormGroup
                  label="Site"
                  fieldId="active-site"
                  helperText="Only data from the selected site will be shown on the Dashboard. Sites are derived from Cluster Settings."
                >
                  <Select
                    id="active-site"
                    variant={SelectVariant.single}
                    isOpen={isOpen}
                    selections={selectedLabel}
                    onToggle={this.onToggle}
                    onSelect={this.onSelect}
                  >
                    {sites.map(s => (
                      <SelectOption key={s.key} value={s.key}>
                        {s.cluster ? (
                          <>
                            <Label
                              color={CLUSTER_COLORS[s.cluster]}
                              isCompact
                              style={{ fontFamily: 'monospace', fontSize: '0.75em', marginRight: 8 }}
                            >
                              {s.cluster}
                            </Label>
                            {shortDomain(this.context.settings.clusterDomains[s.cluster])}
                          </>
                        ) : (
                          <strong>{s.label}</strong>
                        )}
                      </SelectOption>
                    ))}
                  </Select>
                </FormGroup>

                <ActionGroup>
                  <Button variant="primary" onClick={this.handleSave}>Save</Button>
                </ActionGroup>
              </Form>
            </CardBody>
          </Card>
        </PageSection>
      </React.Fragment>
    );
  }
}

const ProfileSettings = ProfileSettingsPage;
export { ProfileSettings };
