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
} from '@patternfly/react-core';
import { SettingsContext } from '../../utils/SettingsContext';

const SITES = [
  { key: 'all', label: 'すべてのサイト' },
  { key: 'site-a', label: 'Site A（東京）' },
  { key: 'site-b', label: 'Site B（大阪）' },
  { key: 'site-c', label: 'Site C（福岡）' },
];

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

  render() {
    const { activeSite, isOpen, saved } = this.state;
    const siteLabel = SITES.find(s => s.key === activeSite)?.label ?? activeSite;

    return (
      <React.Fragment>
        <PageSection variant={PageSectionVariants.light}>
          <TextContent>
            <Text component="h1">プロフィール設定</Text>
            <Text component="p">表示サイトの選択などユーザー固有の設定を管理します</Text>
          </TextContent>
        </PageSection>

        <Divider component="div" />

        <PageSection variant={PageSectionVariants.default}>
          {saved && (
            <Alert variant="success" title="設定を保存しました" style={{ marginBottom: '16px' }} />
          )}
          <Card>
            <CardTitle>表示対象サイト</CardTitle>
            <CardBody>
              <Form>
                <FormGroup
                  label="アクティブサイト"
                  fieldId="active-site"
                  helperText="選択したサイトのデータのみ Dashboard に表示します"
                >
                  <Select
                    id="active-site"
                    variant={SelectVariant.single}
                    isOpen={isOpen}
                    selections={siteLabel}
                    onToggle={this.onToggle}
                    onSelect={this.onSelect}
                  >
                    {SITES.map(s => (
                      <SelectOption key={s.key} value={s.key}>
                        {s.label}
                      </SelectOption>
                    ))}
                  </Select>
                </FormGroup>

                <ActionGroup>
                  <Button variant="primary" onClick={this.handleSave}>保存</Button>
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
