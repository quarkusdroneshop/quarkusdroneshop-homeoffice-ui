import React from 'react';
import { Switch } from '@patternfly/react-core';

import { gql } from '@apollo/client';
import client from 'src/apolloclient';

const GET_MOCKER_STATUS = gql`
  query {
    mockerPaused
  }
`;

const CHANGE_MOCKER = gql`
  mutation mockerTogglePause($toggle: Boolean!) {
    mockerTogglePause(toggle: $toggle)
  }
`;

export class MockerSwitch extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isChecked: false,
      loading: true,
      error: null,
    };
    this.handleChange = this.handleChange.bind(this);
  }

  componentDidMount() {
    client.query({ query: GET_MOCKER_STATUS })
      .then(response => {
        this.setState({ isChecked: response.data.mockerPaused, loading: false });
      })
      .catch(error => {
        console.error('Failed to fetch mocker status:', error);
        this.setState({ error, loading: false });
      });
  }

  handleChange(isChecked) {
    // 先に状態更新（楽観的UI）
    this.setState({ isChecked });

    client.mutate({
      mutation: CHANGE_MOCKER,
      variables: { toggle: isChecked }
    })
    .then(response => {
      // サーバー側の結果に合わせて状態を更新
      this.setState({ isChecked: response.data.mockerTogglePause });
    })
    .catch(error => {
      console.error('Failed to change mocker status:', error);
      // エラー時は元の状態に戻す
      this.setState(prevState => ({ isChecked: !prevState.isChecked }));
    });
  }

  render() {
    const { isChecked, loading, error } = this.state;

    if (loading) return <div>Loading...</div>;
    if (error) return <div></div>;

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