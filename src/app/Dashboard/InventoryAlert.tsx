import React from 'react';
import { Alert, AlertGroup, AlertActionCloseButton } from '@patternfly/react-core';
import { gql } from '@apollo/client';
import client from 'src/apolloclient';
import { SettingsContext } from '../utils/SettingsContext';

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

type State = {
  alerts: InventoryLevel[];
  dismissed: Set<string>;
};

export class InventoryAlert extends React.Component<{}, State> {
  static contextType = SettingsContext;
  context!: React.ContextType<typeof SettingsContext>;
  private intervalId: number | null = null;

  constructor(props: {}) {
    super(props);
    this.state = { alerts: [], dismissed: new Set() };
    this.loadData = this.loadData.bind(this);
    this.dismiss = this.dismiss.bind(this);
  }

  componentDidMount() {
    this.loadData();
    const interval = this.context?.settings?.pollingIntervalMs ?? 3000;
    this.intervalId = window.setInterval(this.loadData, interval);
  }

  componentWillUnmount() {
    if (this.intervalId !== null) clearInterval(this.intervalId);
  }

  loadData() {
    const threshold = this.context?.settings?.inventoryAlertThreshold ?? 20;
    client
      .query({ query: GET_INVENTORY, fetchPolicy: 'no-cache' })
      .then(res => {
        const levels: InventoryLevel[] = res?.data?.inventoryLevels ?? [];
        const lowStock = levels.filter(l => {
          const pct = l.capacity > 0 ? (l.remaining / l.capacity) * 100 : 0;
          return pct < threshold;
        });
        this.setState(prev => ({
          alerts: lowStock,
          dismissed: prev.dismissed,
        }));
      })
      .catch(() => {
        // backend unreachable - silently skip
      });
  }

  dismiss(itemName: string) {
    this.setState(prev => ({
      dismissed: new Set([...Array.from(prev.dismissed), itemName]),
    }));
  }

  render() {
    const { alerts, dismissed } = this.state;
    const threshold = this.context?.settings?.inventoryAlertThreshold ?? 20;
    const visible = alerts.filter(a => !dismissed.has(a.itemName));

    if (visible.length === 0) return null;

    return (
      <AlertGroup isToast={false} style={{ marginBottom: '16px' }}>
        {visible.map(a => {
          const pct = a.capacity > 0 ? Math.round((a.remaining / a.capacity) * 100) : 0;
          return (
            <Alert
              key={a.itemName}
              variant="warning"
              title={`在庫枯渇警告: ${a.itemName}`}
              actionClose={<AlertActionCloseButton onClose={() => this.dismiss(a.itemName)} />}
            >
              残量 {pct}%（閾値 {threshold}%）— 残り {a.remaining} / {a.capacity}
            </Alert>
          );
        })}
      </AlertGroup>
    );
  }
}
