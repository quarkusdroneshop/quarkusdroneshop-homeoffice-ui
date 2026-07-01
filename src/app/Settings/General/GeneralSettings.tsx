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
  AlertActionCloseButton,
  Modal,
  ModalVariant,
  Spinner,
} from '@patternfly/react-core';
import ExclamationTriangleIcon from '@patternfly/react-icons/dist/js/icons/exclamation-triangle-icon';
import { gql } from '@apollo/client';
import client from 'src/apolloclient';
import { SettingsContext } from '../../utils/SettingsContext';

const RESET_DATA = gql`
  mutation ResetData {
    resetData {
      success
      message
    }
  }
`;

type State = {
  pollingInterval: number;
  alertThreshold: number;
  saved: boolean;
  resetModalOpen: boolean;
  resetting: boolean;
  resetSuccess: string | null;
  resetError: string | null;
};

class GeneralSettingsPage extends React.Component<{}, State> {
  static contextType = SettingsContext;
  context!: React.ContextType<typeof SettingsContext>;

  constructor(props: {}) {
    super(props);
    this.state = {
      pollingInterval: 3,
      alertThreshold: 20,
      saved: false,
      resetModalOpen: false,
      resetting: false,
      resetSuccess: null,
      resetError: null,
    };
    this.handleSave = this.handleSave.bind(this);
    this.handleReset = this.handleReset.bind(this);
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

  handleReset() {
    this.setState({ resetting: true, resetModalOpen: false });
    client
      .mutate({ mutation: RESET_DATA })
      .then(res => {
        const result = res?.data?.resetData;
        if (result?.success) {
          this.setState({ resetting: false, resetSuccess: result.message });
        } else {
          this.setState({ resetting: false, resetError: result?.message ?? 'リセットに失敗しました' });
        }
      })
      .catch(err => {
        this.setState({ resetting: false, resetError: String(err) });
      });
  }

  render() {
    const {
      pollingInterval, alertThreshold, saved,
      resetModalOpen, resetting, resetSuccess, resetError,
    } = this.state;

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
          {resetSuccess && (
            <Alert
              variant="success"
              title="データリセット完了"
              actionClose={<AlertActionCloseButton onClose={() => this.setState({ resetSuccess: null })} />}
              style={{ marginBottom: '16px' }}
            >
              {resetSuccess}
            </Alert>
          )}
          {resetError && (
            <Alert
              variant="danger"
              title="データリセット失敗"
              actionClose={<AlertActionCloseButton onClose={() => this.setState({ resetError: null })} />}
              style={{ marginBottom: '16px' }}
            >
              {resetError}
            </Alert>
          )}

          {/* データ取得設定 */}
          <Card style={{ marginBottom: '24px' }}>
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

          {/* データリセット */}
          <Card style={{ borderLeft: '4px solid #c9190b' }}>
            <CardTitle>
              <span style={{ color: '#c9190b', fontWeight: 700 }}>
                <ExclamationTriangleIcon style={{ marginRight: '8px' }} />
                データリセット
              </span>
            </CardTitle>
            <CardBody>
              <TextContent style={{ marginBottom: '16px' }}>
                <Text component="p">
                  データベース上の全注文データを削除します。この操作は取り消せません。
                </Text>
                <Text component="small" style={{ color: 'var(--pf-global--Color--200)' }}>
                  削除対象: orders / lineItems / storeServerSales / productSales / productItemSales / averageOrderUpTime
                </Text>
              </TextContent>
              <Button
                variant="danger"
                isLoading={resetting}
                isDisabled={resetting}
                onClick={() => this.setState({ resetModalOpen: true })}
              >
                {resetting ? 'リセット中...' : 'データをリセット'}
              </Button>
            </CardBody>
          </Card>
        </PageSection>

        {/* 確認モーダル */}
        <Modal
          variant={ModalVariant.small}
          title="データリセットの確認"
          titleIconVariant="warning"
          isOpen={resetModalOpen}
          onClose={() => this.setState({ resetModalOpen: false })}
          actions={[
            <Button
              key="confirm"
              variant="danger"
              onClick={this.handleReset}
            >
              リセットする
            </Button>,
            <Button
              key="cancel"
              variant="link"
              onClick={() => this.setState({ resetModalOpen: false })}
            >
              キャンセル
            </Button>,
          ]}
        >
          <TextContent>
            <Text component="p">
              <strong>全ての注文データが削除されます。</strong>
            </Text>
            <Text component="p">
              この操作は取り消せません。本当に実行しますか？
            </Text>
          </TextContent>
        </Modal>
      </React.Fragment>
    );
  }
}

const GeneralSettings = GeneralSettingsPage;
export { GeneralSettings };
