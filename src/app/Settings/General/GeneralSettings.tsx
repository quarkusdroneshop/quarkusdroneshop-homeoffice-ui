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
  Slider,
  ActionGroup,
  Button,
  Alert,
} from '@patternfly/react-core';
import { SettingsContext } from '../../utils/SettingsContext';

type State = {
  pollingInterval: number;  // seconds
  alertThreshold: number;   // percent
  saved: boolean;
};

class GeneralSettingsPage extends React.Component<{}, State> {
  static contextType = SettingsContext;
  context!: React.ContextType<typeof SettingsContext>;

  constructor(props: {}) {
    super(props);
    this.state = { pollingInterval: 3, alertThreshold: 20, saved: false };
    this.handleSave = this.handleSave.bind(this);
  }

  componentDidMount() {
    const { settings } = this.context;
    this.setState({
      pollingInterval: Math.round(settings.pollingIntervalMs / 1000),
      alertThreshold: settings.inventoryAlertThreshold,
    });
  }

  handleSave() {
    const { updateSettings } = this.context;
    const { pollingInterval, alertThreshold } = this.state;
    updateSettings({
      pollingIntervalMs: pollingInterval * 1000,
      inventoryAlertThreshold: alertThreshold,
    });
    this.setState({ saved: true });
    setTimeout(() => this.setState({ saved: false }), 3000);
  }

  render() {
    const { pollingInterval, alertThreshold, saved } = this.state;

    return (
      <React.Fragment>
        <PageSection variant={PageSectionVariants.light}>
          <TextContent>
            <Text component="h1">一般設定</Text>
            <Text component="p">ポーリング間隔や在庫アラートの閾値などを設定します</Text>
          </TextContent>
        </PageSection>

        <Divider component="div" />

        <PageSection variant={PageSectionVariants.default}>
          {saved && (
            <Alert variant="success" title="設定を保存しました" style={{ marginBottom: '16px' }} />
          )}
          <Card>
            <CardTitle>データ取得設定</CardTitle>
            <CardBody>
              <Form>
                <FormGroup
                  label={`ポーリング間隔: ${pollingInterval} 秒`}
                  fieldId="polling-interval"
                  helperText="Dashboard や OrderBoard のデータ自動更新間隔（1〜60 秒）"
                >
                  <Slider
                    id="polling-interval"
                    value={pollingInterval}
                    min={1}
                    max={60}
                    step={1}
                    showBoundaries
                    isInputVisible
                    inputValue={pollingInterval as number}
                    onChange={(_e, val) => this.setState({ pollingInterval: val })}
                  />
                </FormGroup>

                <FormGroup
                  label={`在庫枯渇アラート閾値: ${alertThreshold} %`}
                  fieldId="alert-threshold"
                  helperText="在庫残量がこの割合を下回ると Dashboard にアラートを表示します（1〜50 %）"
                >
                  <Slider
                    id="alert-threshold"
                    value={alertThreshold}
                    min={1}
                    max={50}
                    step={1}
                    showBoundaries
                    isInputVisible
                    inputValue={alertThreshold as number}
                    onChange={(_e, val) => this.setState({ alertThreshold: val })}
                  />
                </FormGroup>

                <ActionGroup>
                  <Button variant="primary" onClick={this.handleSave}>保存</Button>
                  <Button
                    variant="link"
                    onClick={() => this.setState({ pollingInterval: 3, alertThreshold: 20 })}
                  >
                    デフォルトに戻す
                  </Button>
                </ActionGroup>
              </Form>
            </CardBody>
          </Card>
        </PageSection>
      </React.Fragment>
    );
  }
}

const GeneralSettings = GeneralSettingsPage;
export { GeneralSettings };
