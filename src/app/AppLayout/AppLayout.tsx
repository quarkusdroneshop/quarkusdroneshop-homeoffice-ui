import * as React from 'react';
import { NavLink, useLocation, useHistory } from 'react-router-dom';
import {
  Nav,
  NavList,
  NavItem,
  NavExpandable,
  Page,
  PageHeader,
  PageSidebar,
  SkipToContent,
  Text,
  PageHeaderTools,
  Tooltip,
} from '@patternfly/react-core';
import { routes, IAppRoute, IAppRouteGroup } from '@app/routes';
import logo from '@app/images/drone-16x16.png';
import packageJson from '/package.json';
import BellIcon from '@patternfly/react-icons/dist/js/icons/bell-icon';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/js/icons/exclamation-circle-icon';
import { gql } from '@apollo/client';
import client from 'src/apolloclient';
import '@app/app.css';

const GET_FAILED_ORDERS = gql`
  query FailedOrdersCount {
    failedOrders {
      orderId
    }
  }
`;

const GET_INVENTORY = gql`
  query InventoryHealthCheck {
    inventoryLevels {
      itemName
      remaining
      capacity
    }
  }
`;

interface IAppLayout {
  children: React.ReactNode;
}

interface NotificationState {
  dlqCount: number;
  systemAlert: boolean;
  alertMessages: string[];
}

const AppLayout: React.FunctionComponent<IAppLayout> = ({ children }) => {
  const [isNavOpen, setIsNavOpen] = React.useState(true);
  const [isMobileView, setIsMobileView] = React.useState(true);
  const [isNavOpenMobile, setIsNavOpenMobile] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationState>({
    dlqCount: 0,
    systemAlert: false,
    alertMessages: [],
  });

  const onNavToggleMobile = () => setIsNavOpenMobile(!isNavOpenMobile);
  const onNavToggle = () => setIsNavOpen(!isNavOpen);
  const onPageResize = (props: { mobileView: boolean; windowSize: number }) => {
    setIsMobileView(props.mobileView);
  };

  // 通知ポーリング（30秒ごと）
  React.useEffect(() => {
    const poll = () => {
      const msgs: string[] = [];
      let dlq = 0;
      let sysAlert = false;

      // DLQ チェック
      client
        .query({ query: GET_FAILED_ORDERS, fetchPolicy: 'no-cache' })
        .then(res => {
          dlq = (res?.data?.failedOrders ?? []).length;
          if (dlq > 0) msgs.push(`DLQ: ${dlq} 件の失敗注文があります`);
        })
        .catch(() => {
          sysAlert = true;
          msgs.push('バックエンドに接続できません');
        })
        .finally(() => {
          // Inventory チェック
          client
            .query({ query: GET_INVENTORY, fetchPolicy: 'no-cache' })
            .then(res => {
              const levels = res?.data?.inventoryLevels ?? [];
              const critical = levels.filter((i: any) => i.capacity > 0 && (i.remaining / i.capacity) < 0.1);
              if (critical.length > 0) {
                sysAlert = true;
                msgs.push(`在庫不足: ${critical.map((i: any) => i.itemName).join(', ')}`);
              }
            })
            .catch(() => {})
            .finally(() => {
              setNotifications({ dlqCount: dlq, systemAlert: sysAlert, alertMessages: msgs });
            });
        });
    };

    poll();
    const id = window.setInterval(poll, 30000);
    return () => clearInterval(id);
  }, []);

  const hasAlert = notifications.dlqCount > 0 || notifications.systemAlert;
  const tooltipMsg = notifications.alertMessages.length > 0
    ? notifications.alertMessages.join(' / ')
    : 'すべて正常';

  function LogoImg() {
    const history = useHistory();
    return (
      <div onClick={() => history.push('/')}>
        <span className="menulogo">
          <img src={logo} alt="Quarkus Droneshop Homeoffice" />
        </span>
        <span className="menutitle">
          <Text component="p">Quarkus Droneshop Homeoffice</Text>
        </span>
      </div>
    );
  }

  // 通知アイコン + Release バージョン
  const HeaderTools = (
    <PageHeaderTools>
      <div className="app-notification-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
        <Tooltip content={tooltipMsg} position="bottom">
          <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'default' }}>
            {hasAlert ? (
              <ExclamationCircleIcon
                style={{ color: '#c9190b', fontSize: '18px' }}
                aria-label="システム警告あり"
              />
            ) : (
              <BellIcon
                style={{ color: '#8a8d90', fontSize: '18px' }}
                aria-label="通知なし"
              />
            )}
            {hasAlert && <span className="app-notification-dot" />}
          </span>
        </Tooltip>
        <span>Release {packageJson.version}</span>
      </div>
    </PageHeaderTools>
  );

  const Header = (
    <PageHeader
      logo={<LogoImg />}
      headerTools={HeaderTools}
      showNavToggle
      isNavOpen={isNavOpen}
      onNavToggle={isMobileView ? onNavToggleMobile : onNavToggle}
    />
  );

  const location = useLocation();

  const renderNavItem = (route: IAppRoute, index: number) => (
    <NavItem key={`${route.label}-${index}`} id={`${route.label}-${index}`}>
      <NavLink exact to={route.path} activeClassName="pf-m-current">
        {route.label}
        {/* Support の DLQ バッジ */}
        {route.label === 'Support' && notifications.dlqCount > 0 && (
          <span style={{
            marginLeft: '8px',
            backgroundColor: '#c9190b',
            color: '#fff',
            borderRadius: '10px',
            padding: '1px 7px',
            fontSize: '11px',
            fontWeight: 700,
            verticalAlign: 'middle',
          }}>
            {notifications.dlqCount}
          </span>
        )}
      </NavLink>
    </NavItem>
  );

  const renderNavGroup = (group: IAppRouteGroup, groupIndex: number) => (
    <NavExpandable
      key={`${group.label}-${groupIndex}`}
      id={`${group.label}-${groupIndex}`}
      title={group.label}
      isActive={group.routes.some((route) => route.path === location.pathname)}
    >
      {group.routes.map((route, idx) => route.label && renderNavItem(route, idx))}
    </NavExpandable>
  );

  const Navigation = (
    <Nav id="nav-primary-simple" theme="dark">
      <NavList id="nav-list-simple">
        {routes.map(
          (route, idx) => route.label && (!route.routes ? renderNavItem(route, idx) : renderNavGroup(route, idx))
        )}
      </NavList>
    </Nav>
  );

  const Sidebar = (
    <PageSidebar
      theme="dark"
      nav={Navigation}
      isNavOpen={isMobileView ? isNavOpenMobile : isNavOpen}
    />
  );

  const PageSkipToContent = (
    <SkipToContent href="#primary-app-container">
      Skip to Content
    </SkipToContent>
  );

  return (
    <Page
      mainContainerId="primary-app-container"
      header={Header}
      sidebar={Sidebar}
      onPageResize={onPageResize}
      skipToContent={PageSkipToContent}
    >
      {children}
    </Page>
  );
};

export { AppLayout };
