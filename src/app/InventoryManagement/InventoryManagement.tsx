import React from 'react';
import {
  PageSection,
  PageSectionVariants,
  TextContent,
  Text,
  Divider,
  Card,
  CardBody,
  Spinner,
  Alert,
  TextInput,
  Button,
  Badge,
  Switch,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { gql } from '@apollo/client';
import client from 'src/apolloclient';

const GET_WAREHOUSE_INVENTORY = gql`
  query WarehouseInventoryLevels {
    warehouseInventoryLevels {
      item
      inStockQuantity
    }
  }
`;

const RESTOCK_ITEM = gql`
  mutation RestockInventoryItem($item: String!, $quantity: Int!) {
    restockInventoryItem(item: $item, quantity: $quantity) {
      success
      message
      level {
        item
        inStockQuantity
      }
    }
  }
`;

interface InventoryLevel {
  item: string;
  inStockQuantity: number;
}

// トグルを Out of Stock → In Stock に戻す際、具体的な数量入力なしで
// 復帰できるようにするためのデフォルト補充数。任意の数量に変更したい場合は
// 引き続き New Quantity 入力欄 + Update ボタンを使う。
const DEFAULT_RESTOCK_QUANTITY = 10;

type State = {
  levels: InventoryLevel[];
  loading: boolean;
  error: string | null;
  pendingQuantity: Record<string, string>;
  busyItem: string | null;
  notice: { variant: 'success' | 'danger'; message: string } | null;
};

// 在庫サービス (bsite) は inventory-in (Kafka) を asite のミラーしか
// 購読しておらず、このCクラスタ (csite) からは直接到達できないため、
// homeoffice-backend の REST プロキシ (warehouseInventoryLevels /
// restockInventoryItem, inventory サービスへの同期 HTTP 呼び出し) 経由で操作する。
export class InventoryManagement extends React.Component<{}, State> {
  private intervalId: number | null = null;

  constructor(props: {}) {
    super(props);
    this.state = { levels: [], loading: true, error: null, pendingQuantity: {}, busyItem: null, notice: null };
    this.loadData = this.loadData.bind(this);
  }

  componentDidMount() {
    this.loadData();
    this.intervalId = window.setInterval(this.loadData, 10000);
  }

  componentWillUnmount() {
    if (this.intervalId !== null) clearInterval(this.intervalId);
  }

  loadData() {
    client
      .query({ query: GET_WAREHOUSE_INVENTORY, fetchPolicy: 'no-cache' })
      .then((res) => {
        const levels: InventoryLevel[] = res?.data?.warehouseInventoryLevels ?? [];
        levels.sort((a, b) => a.item.localeCompare(b.item));
        this.setState({ levels, loading: false, error: null });
      })
      .catch((err) => {
        console.error('WarehouseInventoryLevels GraphQL error:', err);
        this.setState({ loading: false, error: String(err) });
      });
  }

  handleQuantityChange(item: string, value: string) {
    this.setState((prev) => ({ pendingQuantity: { ...prev.pendingQuantity, [item]: value } }));
  }

  restock(item: string, quantity: number) {
    if (quantity < 0 || Number.isNaN(quantity)) {
      this.setState({ notice: { variant: 'danger', message: '数量には0以上の整数を入力してください' } });
      return;
    }
    this.setState({ busyItem: item, notice: null });
    client
      .mutate({ mutation: RESTOCK_ITEM, variables: { item, quantity } })
      .then((res) => {
        const result = res?.data?.restockInventoryItem;
        if (!result?.success) {
          this.setState({ busyItem: null, notice: { variant: 'danger', message: result?.message ?? '更新に失敗しました' } });
          return;
        }
        this.setState({ busyItem: null, notice: { variant: 'success', message: result.message } });
        this.loadData();
      })
      .catch((err) => {
        console.error('RestockInventoryItem GraphQL error:', err);
        this.setState({ busyItem: null, notice: { variant: 'danger', message: String(err) } });
      });
  }

  render() {
    const { levels, loading, error, pendingQuantity, busyItem, notice } = this.state;

    return (
      <React.Fragment>
        <PageSection variant={PageSectionVariants.light}>
          <TextContent>
            <Text component="h1">Inventory Management</Text>
            <Text component="p">
              Check stock levels for each item, mark items as out of stock (0), or add inventory. (Inventory service: bsite)
            </Text>
          </TextContent>
        </PageSection>
        <Divider component="div" />
        <PageSection variant={PageSectionVariants.default}>
          {error && <Alert variant="danger" title={error} style={{ marginBottom: '16px' }} />}
          {notice && (
            <Alert
              variant={notice.variant}
              title={notice.message}
              style={{ marginBottom: '16px' }}
              isInline
            />
          )}
          {loading ? (
            <Spinner aria-label="Loading inventory" />
          ) : (
            <Card>
              <CardBody>
                <Table aria-label="Inventory levels" variant="compact">
                  <Thead>
                    <Tr>
                      <Th>Item</Th>
                      <Th>In Stock</Th>
                      <Th>Status</Th>
                      <Th>New Quantity</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {levels.map((level) => {
                      const isOutOfStock = level.inStockQuantity <= 0;
                      const pending = pendingQuantity[level.item] ?? '';
                      const busy = busyItem === level.item;
                      return (
                        <Tr key={level.item}>
                          <Td dataLabel="Item">{level.item}</Td>
                          <Td dataLabel="In Stock">{level.inStockQuantity}</Td>
                          <Td dataLabel="Status">
                            {isOutOfStock ? (
                              <Badge style={{ backgroundColor: '#c9190b', color: '#fff' }}>Out of Stock</Badge>
                            ) : (
                              <Badge style={{ backgroundColor: '#3e8635', color: '#fff' }}>In Stock</Badge>
                            )}
                          </Td>
                          <Td dataLabel="New Quantity">
                            <TextInput
                              type="number"
                              min={0}
                              value={pending}
                              placeholder="quantity"
                              onChange={(value: string) => this.handleQuantityChange(level.item, value)}
                              aria-label={`New quantity for ${level.item}`}
                              style={{ maxWidth: '120px' }}
                            />
                          </Td>
                          <Td dataLabel="Actions">
                            <Button
                              variant="primary"
                              isDisabled={busy || pending === ''}
                              isLoading={busy}
                              onClick={() => this.restock(level.item, parseInt(pending, 10))}
                              style={{ marginRight: '8px' }}
                            >
                              Update
                            </Button>
                            <Switch
                              id={`out-of-stock-switch-${level.item}`}
                              label="In Stock"
                              labelOff="Out of Stock"
                              isChecked={!isOutOfStock}
                              isDisabled={busy}
                              onChange={(_event, checked: boolean) =>
                                this.restock(level.item, checked ? DEFAULT_RESTOCK_QUANTITY : 0)
                              }
                            />
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </CardBody>
            </Card>
          )}
        </PageSection>
      </React.Fragment>
    );
  }
}
