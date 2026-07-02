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
            <Text component="h1">General Settings</Text>
            <Text component="p">Configure polling interval, inventory alert threshold, and data management.</Text>
          </TextContent>
        </PageSection>

        <Divider component="div" />

        <PageSection variant={PageSectionVariants.default}>
          {saved && (
            <Alert variant="success" title="Settings saved" style={{ marginBottom: '16px' }} />
          )}
          {resetSuccess && (
            <Alert
              variant="success"
              title="Data Reset Complete"
              actionClose={<AlertActionCloseButton onClose={() => this.setState({ resetSuccess: null })} />}
              style={{ marginBottom: '16px' }}
            >
              {resetSuccess}
            </Alert>
          )}
          {resetError && (
            <Alert
              variant="danger"
              title="Data Reset Failed"
              actionClose={<AlertActionCloseButton onClose={() => this.setState({ resetError: null })} />}
              style={{ marginBottom: '16px' }}
            >
              {resetError}
            </Alert>
          )}

          {/* Data Fetching */}
          <Card style={{ marginBottom: '24px' }}>
            <CardTitle>Data Fetching</CardTitle>
            <CardBody>
              <Form>
                <FormGroup
                  label={`Polling Interval: ${pollingInterval} sec`}
                  fieldId="polling-interval"
                  helperText="Auto-refresh interval for Dashboard and Order Board data (1–60 sec)"
                >
                  <Slider
                    id="polling-interval"
                    value={pollingInterval}
                    min={1}
                    max={60}
                    step={1}
                    showBoundaries
                    isInputVisible
                    inputValue={pollingInterval ?? 0}
                    onChange={(_e, val) => this.setState({ pollingInterval: val ?? pollingInterval })}
                  />
                </FormGroup>

                <FormGroup
                  label={`Inventory Alert Threshold: ${alertThreshold} %`}
                  fieldId="alert-threshold"
                  helperText="An alert is shown on the Dashboard when inventory drops below this percentage (1–50 %)"
                >
                  <Slider
                    id="alert-threshold"
                    value={alertThreshold}
                    min={1}
                    max={50}
                    step={1}
                    showBoundaries
                    isInputVisible
                    inputValue={alertThreshold ?? 0}
                    onChange={(_e, val) => this.setState({ alertThreshold: val ?? alertThreshold })}
                  />
                </FormGroup>

                <ActionGroup>
                  <Button variant="primary" onClick={this.handleSave}>Save</Button>
                  <Button
                    variant="link"
                    onClick={() => this.setState({ pollingInterval: 3, alertThreshold: 20 })}
                  >
                    Reset to Defaults
                  </Button>
                </ActionGroup>
              </Form>
            </CardBody>
          </Card>

          {/* Data Reset */}
          <Card style={{ borderLeft: '4px solid #c9190b' }}>
            <CardTitle>
              <span style={{ color: '#c9190b', fontWeight: 700 }}>
                <ExclamationTriangleIcon style={{ marginRight: '8px' }} />
                Data Reset
              </span>
            </CardTitle>
            <CardBody>
              <TextContent style={{ marginBottom: '16px' }}>
                <Text component="p">
                  Deletes all order data from the database. This action cannot be undone.
                </Text>
                <Text component="small" style={{ color: 'var(--pf-global--Color--200)' }}>
                  Targets: orders / lineItems / storeServerSales / productSales / productItemSales / averageOrderUpTime
                </Text>
              </TextContent>
              <Button
                variant="danger"
                isLoading={resetting}
                isDisabled={resetting}
                onClick={() => this.setState({ resetModalOpen: true })}
              >
                {resetting ? 'Resetting...' : 'Reset Data'}
              </Button>
            </CardBody>
          </Card>
        </PageSection>

        {/* Confirmation Modal */}
        <Modal
          variant={ModalVariant.small}
          title="Confirm Data Reset"
          titleIconVariant="warning"
          isOpen={resetModalOpen}
          onClose={() => this.setState({ resetModalOpen: false })}
          actions={[
            <Button
              key="confirm"
              variant="danger"
              onClick={this.handleReset}
            >
              Reset
            </Button>,
            <Button
              key="cancel"
              variant="link"
              onClick={() => this.setState({ resetModalOpen: false })}
            >
              Cancel
            </Button>,
          ]}
        >
          <TextContent>
            <Text component="p">
              <strong>All order data will be permanently deleted.</strong>
            </Text>
            <Text component="p">
              This action cannot be undone. Are you sure?
            </Text>
          </TextContent>
        </Modal>
      </React.Fragment>
    );
  }
}

const GeneralSettings = GeneralSettingsPage;
export { GeneralSettings };
