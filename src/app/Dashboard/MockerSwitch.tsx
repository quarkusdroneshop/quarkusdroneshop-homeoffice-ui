import React from 'react';
import { Switch } from '@patternfly/react-core';

import { gql, useQuery } from '@apollo/client';
import client from 'src/apolloclient'

export class MockerSwitch extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isChecked: false
    };
    

    const GET_MOCKER_STATUS = gql`
    query {
      mockerPaused
    }
    `;

    const CHANGE_MOCKER = gql`
    query mockerTogglePause($toggle: Boolean!){
      mockerTogglePause(toggle:$toggle)
    }
    `;

    //console.log("Making GraphQL Request")
    client.query({ 
        query: GET_MOCKER_STATUS
      })
      .then(response => {
        console.log(`Mocker status from GraphQL: ${response.data.mockerPaused}`)
          this.setState({isChecked:response.data.mockerPaused})
      }
    )

    this.handleChange = isChecked => {

      this.setState({ isChecked });
      //console.log("Making GraphQL Request")
    
      client.query({ 
        query: CHANGE_MOCKER, 
        variables: {toggle: isChecked}
      })
      .then(response => {
        console.log(`Mocker change status from GraphQL: ${response.data.mockerTogglePause}`)
          this.setState({isChecked:response.data.mockerTogglePause})
      })

    };
    
  }

  render() {

    const { isChecked } = this.state;
    return (
      <Switch
        id="simple-switch"
        label="Mocker ON"
        labelOff="Mocker OFF"
        isChecked={isChecked}
        onChange={this.handleChange}
      />
    );
  }
  
}