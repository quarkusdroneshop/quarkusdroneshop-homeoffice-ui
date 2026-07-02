import * as React from 'react';
import {
    Title,
    DrawerActions,
    DrawerCloseButton,
    DrawerHead,
    DrawerPanelBody,
    DrawerPanelContent,
   } from '@patternfly/react-core';

interface WebItemDetailsProps {
  onCloseDrawerClick: () => void;
}

export class WebItemDetails extends React.Component<WebItemDetailsProps> {
  public render() {
    return (
      <DrawerPanelContent>
        <DrawerHead>
          <Title headingLevel="h2" size="xl">
            Web Details
          </Title>
          <DrawerActions>
            <DrawerCloseButton onClick={this.props.onCloseDrawerClick} />
          </DrawerActions>
        </DrawerHead>
        <DrawerPanelBody>
          <p>Web service detail panel.</p>
        </DrawerPanelBody>
      </DrawerPanelContent>
    );
  }
}
